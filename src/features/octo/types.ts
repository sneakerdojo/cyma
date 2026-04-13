export type WizardStep =
  | 'greeting'
  | 'budget'
  | 'requirements'
  | 'contact'
  | 'schedule'
  | 'complete'
  | 'freechat';

export interface ChatMessage {
  id: string;
  from: 'user' | 'octio';
  text: string;
}

export type OctoAnimState = 'idle' | 'thinking' | 'speaking';

export interface ContactInfo {
  name: string;
  email: string;
  company: string;
}

export interface RequirementsPayload {
  text: string;
  voiceNote?: Blob | null;
  file?: File | null;
}

export interface TimeSlot {
  id: string;
  dateLabel: string; // "Mon 14 Apr"
  time: string; // "09:00"
  label: string; // "Mon 14 Apr · 9:00 AM"
}

export interface WizardState {
  step: WizardStep;
  octoState: OctoAnimState;
  selectedService: string | null;
  budget: string | null;
  requirements: string;
  voiceNote: Blob | null;
  attachedFile: File | null;
  contact: ContactInfo;
  selectedSlot: TimeSlot | null;
  aiMessage: string;
  showChoices: boolean;
  chatHistory: ChatMessage[];
  meetLink?: string;
  calendarLink?: string;
  bookingError?: string;
}

export interface BookingSuccess {
  meetLink: string;
  calendarLink: string;
}

export type WizardAction =
  | { type: 'SELECT_SERVICE'; payload: string }
  | { type: 'SELECT_BUDGET'; payload: string }
  | { type: 'SUBMIT_REQUIREMENTS'; payload: RequirementsPayload }
  | { type: 'SUBMIT_CONTACT'; payload: ContactInfo }
  | { type: 'SELECT_SLOT'; payload: TimeSlot }
  | { type: 'SET_OCTO_STATE'; payload: OctoAnimState }
  | { type: 'SET_AI_MESSAGE'; payload: string }
  | { type: 'SHOW_CHOICES' }
  | { type: 'NEXT_STEP' }
  | { type: 'GO_TO_FREECHAT' }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_BOOKING_RESULT'; payload: BookingSuccess }
  | { type: 'SET_BOOKING_ERROR'; payload: string }
  | { type: 'CLEAR_BOOKING_ERROR' };
