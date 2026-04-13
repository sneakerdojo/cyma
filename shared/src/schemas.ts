import { z } from 'zod';

// ---------------------------------------------------------------------------
// Contact schema
// ---------------------------------------------------------------------------

export const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Selected slot schema
// Matches TimeSlot in src/features/octo/types.ts
// ---------------------------------------------------------------------------

export const SelectedSlotSchema = z.object({
  id: z.string(),
  dateLabel: z.string(),
  time: z.string(),
  label: z.string(),
});

// ---------------------------------------------------------------------------
// Wizard intake schema
// Must match WizardState fields sent by the wizard frontend.
// Selected service values must match the service choices in the wizard.
// ---------------------------------------------------------------------------

export const WizardIntakeSchema = z.object({
  selectedService: z.enum([
    'AI Agents & Automations',
    'Custom Application',
    'Modernisation',
    'Mobile App',
    'Just Browsing',
  ]),
  budget: z.enum(['Under R50K', 'R50K-R150K', 'R150K-R500K', 'R500K+']),
  requirements: z.string(),
  contact: ContactSchema,
  selectedSlot: SelectedSlotSchema,
});

// ---------------------------------------------------------------------------
// Booking result schema — returned by POST /api/book
// ---------------------------------------------------------------------------

export const BookingResultSchema = z.object({
  ok: z.literal(true),
  meetLink: z.string().url(),
  eventId: z.string(),
  calendarLink: z.string().url(),
  scoreBand: z.enum(['hot', 'warm', 'cold']),
  warning: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type WizardIntake = z.infer<typeof WizardIntakeSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type SelectedSlot = z.infer<typeof SelectedSlotSchema>;
export type BookingResult = z.infer<typeof BookingResultSchema>;
