import { google } from 'googleapis';
import { getOAuth2Client } from './google-auth.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateLeadContactInput {
  contact: { name: string; email: string; company?: string };
  selectedService: string;
  budget: string;
  requirements: string;
  olsScore: number;
  scoreBand: 'hot' | 'warm' | 'cold';
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Split a full name into given/family parts.
 * Uses last whitespace as the split point. Single-word names go into givenName.
 */
function splitName(fullName: string): { givenName: string; familyName?: string } {
  const trimmed = fullName.trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace === -1) {
    return { givenName: trimmed };
  }
  return {
    givenName: trimmed.slice(0, lastSpace),
    familyName: trimmed.slice(lastSpace + 1),
  };
}

function buildNoteText(input: CreateLeadContactInput): string {
  const { selectedService, budget, requirements, olsScore, scoreBand } = input;
  const requirementsPreview =
    requirements.length > 200 ? `${requirements.slice(0, 200)}...` : requirements;

  return [
    `Octio Lead | ${scoreBand.toUpperCase()} | OLS ${olsScore}/20`,
    `Service: ${selectedService}`,
    `Budget: ${budget}`,
    `Requirements: ${requirementsPreview}`,
  ].join('\n');
}

/**
 * Locate the "Leads" contact group, creating it if absent.
 * Returns the resource name (e.g. `contactGroups/abc123`).
 */
async function resolveLeadsGroupResourceName(
  people: ReturnType<typeof google.people>,
): Promise<string | null> {
  try {
    const listResp = await people.contactGroups.list({});
    const groups = listResp.data.contactGroups ?? [];
    const existing = groups.find((g) => g.name === 'Leads');

    if (existing?.resourceName) {
      return existing.resourceName;
    }

    // Group doesn't exist — create it
    const createResp = await people.contactGroups.create({
      requestBody: { contactGroup: { name: 'Leads' } },
    });
    return createResp.data.resourceName ?? null;
  } catch (err) {
    logger.warn({ err }, 'google-contacts: could not resolve Leads group');
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a Google Contact for the lead with a "Leads" label.
 * If a contact with this email already exists, update the biography notes.
 * Non-fatal: logs errors but never throws.
 */
export async function createLeadContact(
  input: CreateLeadContactInput,
): Promise<void> {
  try {
    const auth = getOAuth2Client();
    const people = google.people({ version: 'v1', auth });

    const { contact, selectedService } = input;
    const noteText = buildNoteText(input);
    const { givenName, familyName } = splitName(contact.name);

    // ── Search for existing contact by email ──────────────────────────────
    let personResourceName: string | null = null;
    let foundEtag: string | undefined;

    try {
      const searchResp = await people.people.searchContacts({
        query: contact.email,
        readMask: 'emailAddresses,names,metadata',
        pageSize: 5,
      });

      const results = searchResp.data.results ?? [];
      const match = results.find((r) =>
        (r.person?.emailAddresses ?? []).some(
          (e) => e.value?.toLowerCase() === contact.email.toLowerCase(),
        ),
      );

      if (match?.person?.resourceName) {
        personResourceName = match.person.resourceName;
        foundEtag = match.person.metadata?.sources?.[0]?.etag ?? undefined;
      }
    } catch (searchErr) {
      // People API searchContacts can fail if scope not yet granted or API
      // unavailable — treat as "not found" and attempt creation.
      logger.warn(
        { searchErr, email: contact.email },
        'google-contacts: searchContacts failed — will attempt creation',
      );
    }

    // ── Update existing or create new ─────────────────────────────────────
    if (personResourceName) {
      // Update biography notes on the existing contact
      await people.people.updateContact({
        resourceName: personResourceName,
        updatePersonFields: 'biographies',
        requestBody: {
          etag: foundEtag,
          biographies: [{ value: noteText, contentType: 'TEXT_PLAIN' }],
        },
      });

      logger.info(
        { email: contact.email, resourceName: personResourceName },
        'google-contacts: existing contact updated',
      );
    } else {
      // Build the new contact payload
      const names: Array<{ givenName: string; familyName?: string }> = [
        { givenName, ...(familyName ? { familyName } : {}) },
      ];

      const requestBody: Record<string, unknown> = {
        names,
        emailAddresses: [{ value: contact.email, type: 'work' }],
        biographies: [{ value: noteText, contentType: 'TEXT_PLAIN' }],
      };

      if (contact.company) {
        requestBody['organizations'] = [{ name: contact.company }];
      }

      const createResp = await people.people.createContact({
        requestBody,
      });

      personResourceName = createResp.data.resourceName ?? null;

      logger.info(
        { email: contact.email, resourceName: personResourceName, service: selectedService },
        'google-contacts: new contact created',
      );
    }

    // ── Add to "Leads" contact group ──────────────────────────────────────
    if (personResourceName) {
      const groupResourceName = await resolveLeadsGroupResourceName(people);

      if (groupResourceName) {
        try {
          await people.contactGroups.members.modify({
            resourceName: groupResourceName,
            requestBody: {
              resourceNamesToAdd: [personResourceName],
            },
          });

          logger.info(
            { email: contact.email },
            'google-contacts: contact added to Leads group',
          );
        } catch (groupErr) {
          logger.warn(
            { groupErr, email: contact.email },
            'google-contacts: could not add contact to Leads group — non-fatal',
          );
        }
      }
    }
  } catch (err) {
    logger.error(
      { err, email: input.contact.email },
      'google-contacts: createLeadContact failed — non-fatal',
    );
  }
}
