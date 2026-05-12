import type { Context } from 'hono';

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------

export class MissingFieldError extends Error {
  constructor(public readonly fieldName: string) {
    super(
      `Required multipart field "${fieldName}" is missing from the request body.`,
    );
    this.name = 'MissingFieldError';
  }
}

export class WrongFieldTypeError extends Error {
  constructor(
    public readonly fieldName: string,
    public readonly expected: 'string' | 'File',
  ) {
    super(
      `Multipart field "${fieldName}" must be a ${expected} but received a different type.`,
    );
    this.name = 'WrongFieldTypeError';
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParsedBookingMultipart {
  /** Raw JSON string — validated and parsed by the calling route handler (Task #9). */
  intake: string;
  /** Optional voice note blob from MediaRecorder. */
  voiceNote?: File;
  /** Optional PDF / doc / image attachment. */
  attachment?: File;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Parse a multipart/form-data booking request.
 *
 * Responsibilities:
 *  - Delegates body parsing to Hono's built-in `parseBody`.
 *  - Validates that `intake` is present and is a string (not a File blob).
 *  - Coerces `voiceNote` and `attachment` to `File` when present.
 *  - Throws typed errors for missing / wrong-type fields.
 *
 * Note: converting a `File` to a Buffer for the storage service is the
 * responsibility of the caller — use `await file.arrayBuffer()`.
 */
export async function parseBookingMultipart(
  c: Context,
): Promise<ParsedBookingMultipart> {
  // `all: true` ensures repeated field names are returned as arrays rather
  // than silently discarding duplicates — we don't use arrays here, but it's
  // the safer default.
  const body = await c.req.parseBody({ all: true });

  // ------------------------------------------------------------------
  // intake — required string
  // ------------------------------------------------------------------
  const intakeRaw = body['intake'];

  if (intakeRaw === undefined || intakeRaw === null || intakeRaw === '') {
    throw new MissingFieldError('intake');
  }

  // If the user accidentally sent a File blob for `intake` that's an error.
  if (intakeRaw instanceof File || Array.isArray(intakeRaw)) {
    throw new WrongFieldTypeError('intake', 'string');
  }

  const intake: string = intakeRaw;

  // ------------------------------------------------------------------
  // voiceNote — optional File
  // ------------------------------------------------------------------
  const voiceNoteRaw = body['voiceNote'];
  let voiceNote: File | undefined;

  if (voiceNoteRaw !== undefined && voiceNoteRaw !== '') {
    if (!(voiceNoteRaw instanceof File)) {
      throw new WrongFieldTypeError('voiceNote', 'File');
    }
    voiceNote = voiceNoteRaw;
  }

  // ------------------------------------------------------------------
  // attachment — optional File
  // ------------------------------------------------------------------
  const attachmentRaw = body['attachment'];
  let attachment: File | undefined;

  if (attachmentRaw !== undefined && attachmentRaw !== '') {
    if (!(attachmentRaw instanceof File)) {
      throw new WrongFieldTypeError('attachment', 'File');
    }
    attachment = attachmentRaw;
  }

  return { intake, voiceNote, attachment };
}
