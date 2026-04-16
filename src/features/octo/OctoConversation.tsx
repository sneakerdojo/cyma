import { useEffect, useCallback } from 'react';
import { MessageCircle, Video, CalendarPlus, AlertTriangle, RefreshCw, X } from 'lucide-react';
import type { OrbState } from '../chat/InteractiveChat';
import OctoMessage from './OctoMessage';
import OctoChoices from './OctoChoices';
import OctoTextInput from './OctoTextInput';
import OctoContactForm from './OctoContactForm';
import OctoTimeSlot from './OctoTimeSlot';
import OctoFreeChat from './OctoFreeChat';
import OctoStepIndicator from './OctoStepIndicator';
import { useWizardState } from './useWizardState';
import type {
  OctoAnimState,
  ContactInfo,
  RequirementsPayload,
  TimeSlot,
} from './types';

const SERVICE_CHOICES = [
  { label: 'AI Agents & Automations', value: 'AI Agents & Automations' },
  { label: 'Custom Application', value: 'Custom Application' },
  { label: 'Modernisation', value: 'Modernisation' },
  { label: 'Mobile App', value: 'Mobile App' },
  { label: 'Just Browsing', value: 'Just Browsing' },
];

const BUDGET_CHOICES = [
  { label: 'Under R50K', value: 'Under R50K' },
  { label: 'R50K - R150K', value: 'R50K-R150K' },
  { label: 'R150K - R500K', value: 'R150K-R500K' },
  { label: 'R500K+', value: 'R500K+' },
];

interface OctoConversationProps {
  onClose: () => void;
  onStateChange?: (state: OctoAnimState) => void;
}

export default function OctoConversation({ onClose, onStateChange }: OctoConversationProps) {
  const {
    state,
    dispatch,
    transitionToStep,
    showChoices,
    startGreeting,
    goToFreeChat,
    retryBooking,
    resetSession,
    hasResumedSession,
  } = useWizardState();

  useEffect(() => {
    // If the user is picking up a resumed session, don't overwrite their
    // progress with a fresh greeting. Jump straight to showing choices for
    // whatever step they were on.
    if (hasResumedSession) {
      showChoices();
      return;
    }
    startGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user closes the wizard after completing, clear the saved
  // session so the next visit starts fresh.
  const handleClose = useCallback(() => {
    resetSession();
    onClose();
  }, [resetSession, onClose]);

  useEffect(() => {
    onStateChange?.(state.octoState);
  }, [state.octoState, onStateChange]);

  // Task #63 — map freechat OrbState ('idle'|'listening'|'thinking'|'speaking')
  // to the wizard's OctoAnimState ('idle'|'thinking'|'speaking').
  // 'listening' has no direct equivalent in OctoAnimState so we map it to
  // 'thinking' (orb visually indicates it is waiting/processing audio).
  const handleFreeChatOrbState = useCallback(
    (state: OrbState) => {
      const mapped: OctoAnimState =
        state === 'listening' ? 'thinking' : state;
      dispatch({ type: 'SET_OCTO_STATE', payload: mapped });
    },
    [dispatch],
  );

  const handleMessageComplete = useCallback(() => {
    showChoices();
  }, [showChoices]);

  const handleServiceSelect = useCallback(
    (value: string) => {
      if (value === 'Just Browsing') {
        handleClose();
        return;
      }
      transitionToStep({ type: 'SELECT_SERVICE', payload: value });
    },
    [transitionToStep, handleClose]
  );

  const handleBudgetSelect = useCallback(
    (value: string) => {
      transitionToStep({ type: 'SELECT_BUDGET', payload: value });
    },
    [transitionToStep]
  );

  const handleRequirementsSubmit = useCallback(
    (payload: RequirementsPayload) => {
      transitionToStep({ type: 'SUBMIT_REQUIREMENTS', payload });
    },
    [transitionToStep]
  );

  const handleContactSubmit = useCallback(
    (contact: ContactInfo) => {
      transitionToStep({ type: 'SUBMIT_CONTACT', payload: contact });
    },
    [transitionToStep]
  );

  const handleSlotSelect = useCallback(
    (slot: TimeSlot) => {
      transitionToStep({ type: 'SELECT_SLOT', payload: slot });
    },
    [transitionToStep]
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-6">

      {/* Global error banner — shown for errors that occur outside the complete step */}
      {state.bookingError && state.step !== 'complete' && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border border-orange/30 bg-orange/5 animate-fade-in">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange-light" />
          <p className="flex-1 text-sm text-orange-light leading-relaxed">{state.bookingError}</p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLEAR_BOOKING_ERROR' })}
            className="shrink-0 text-text-muted hover:text-text transition-colors"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <OctoMessage text={state.aiMessage} onComplete={handleMessageComplete} />

      {state.octoState === 'thinking' && (
        <div className="flex justify-center gap-1.5 mt-4">
          <span className="w-2 h-2 rounded-full bg-orange animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-orange animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-orange animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {state.step === 'greeting' && (
        <OctoChoices choices={SERVICE_CHOICES} onSelect={handleServiceSelect} visible={state.showChoices} />
      )}
      {state.step === 'budget' && (
        <OctoChoices choices={BUDGET_CHOICES} onSelect={handleBudgetSelect} visible={state.showChoices} />
      )}
      {state.step === 'requirements' && (
        <OctoTextInput
          onSubmit={handleRequirementsSubmit}
          visible={state.showChoices}
          placeholder="Tell me about your project — what's the vision?"
        />
      )}
      {state.step === 'contact' && (
        <OctoContactForm onSubmit={handleContactSubmit} visible={state.showChoices} />
      )}
      {state.step === 'schedule' && (
        <OctoTimeSlot onSelect={handleSlotSelect} visible={state.showChoices} />
      )}

      {/* Complete step: show booking confirmation + unlock free chat */}
      {state.step === 'complete' && state.showChoices && (
        <div className="mt-8 flex flex-col items-center gap-5 animate-fade-up">

          {/* Booking error state */}
          {state.bookingError && (
            <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 flex flex-col gap-3">
              <div className="flex items-start gap-3 text-red-400">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <p className="text-sm leading-relaxed">{state.bookingError}</p>
              </div>
              <button
                onClick={retryBooking}
                className="self-start flex items-center gap-2 px-4 py-2 border border-red-500/40 text-red-400 hover:border-red-400 hover:text-red-300 transition-all duration-200 rounded-full text-sm font-medium"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          )}

          {/* Meeting links — only shown when booking succeeded */}
          {state.meetLink && (
            <div className="w-full max-w-md rounded-xl border border-border bg-surface/50 px-5 py-4 flex flex-col gap-3">
              <a
                href={state.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-orange hover:text-orange-light transition-colors duration-200"
              >
                <Video size={16} className="shrink-0" />
                <span className="text-sm font-medium">Join via Google Meet</span>
              </a>
              {state.calendarLink && (
                <a
                  href={state.calendarLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-text-muted hover:text-text transition-colors duration-200"
                >
                  <CalendarPlus size={16} className="shrink-0" />
                  <span className="text-sm">Add to Google Calendar</span>
                </a>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={goToFreeChat}
              className="btn-glow group flex items-center gap-2 px-7 py-3.5 bg-orange text-bg font-semibold rounded-full transition-all duration-300 hover:bg-orange-light hover:shadow-lg hover:shadow-orange/20"
            >
              <MessageCircle size={16} />
              Ask me anything else
            </button>
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-7 py-3.5 border border-border text-text-muted hover:text-text hover:border-orange/40 transition-all duration-300 rounded-full text-sm font-medium"
            >
              We're done
            </button>
          </div>
        </div>
      )}

      {/* Free chat step: only reachable after booking */}
      {state.step === 'freechat' && (
        <OctoFreeChat
          visible={state.showChoices}
          wizardState={{
            selectedService: state.selectedService,
            budget: state.budget,
            requirements: state.requirements,
            contact: state.contact,
            meetLink: state.meetLink,
            calendarLink: state.calendarLink,
          }}
          onOrbStateChange={handleFreeChatOrbState}
        />
      )}

      <OctoStepIndicator step={state.step} />
    </div>
  );
}
