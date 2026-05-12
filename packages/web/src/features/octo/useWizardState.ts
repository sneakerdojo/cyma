import { useReducer, useCallback, useEffect, useRef } from 'react';
import type { WizardState, WizardAction, WizardStep } from './types';
import { generateOctoResponse, submitBooking, saveLead } from './octoApi';
import { loadSession, saveSession, clearSession } from './sessionStorage';

const STEP_ORDER: WizardStep[] = [
  'greeting',
  'requirements',
  'contact',
  'schedule',
  'budget',
  'complete',
];

const initialState: WizardState = {
  step: 'greeting',
  octoState: 'idle',
  selectedService: null,
  budget: null,
  requirements: '',
  voiceNote: null,
  attachedFile: null,
  contact: { name: '', email: '', company: '' },
  selectedSlot: null,
  aiMessage: '',
  showChoices: false,
  chatHistory: [],
};

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SELECT_SERVICE':
      return { ...state, selectedService: action.payload, showChoices: false };
    case 'SELECT_BUDGET':
      return { ...state, budget: action.payload, showChoices: false };
    case 'SUBMIT_REQUIREMENTS':
      return {
        ...state,
        requirements: action.payload.text,
        voiceNote: action.payload.voiceNote ?? null,
        attachedFile: action.payload.file ?? null,
        showChoices: false,
      };
    case 'SUBMIT_CONTACT':
      return { ...state, contact: action.payload, showChoices: false };
    case 'SELECT_SLOT':
      return { ...state, selectedSlot: action.payload, showChoices: false };
    case 'SET_OCTO_STATE':
      return { ...state, octoState: action.payload };
    case 'SET_AI_MESSAGE':
      return { ...state, aiMessage: action.payload };
    case 'SHOW_CHOICES':
      return { ...state, showChoices: true };
    case 'NEXT_STEP': {
      const idx = STEP_ORDER.indexOf(state.step);
      const next = STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
      return { ...state, step: next, showChoices: false, aiMessage: '' };
    }
    case 'GO_TO_FREECHAT':
      return { ...state, step: 'freechat', showChoices: false, aiMessage: '' };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case 'SET_BOOKING_RESULT':
      return {
        ...state,
        meetLink: action.payload.meetLink,
        calendarLink: action.payload.calendarLink,
        bookingError: undefined,
      };
    case 'SET_BOOKING_ERROR':
      return { ...state, bookingError: action.payload };
    case 'CLEAR_BOOKING_ERROR':
      return { ...state, bookingError: undefined };
    default:
      return state;
  }
}

/**
 * Lazy initialiser — merges any resumable session from localStorage over the
 * initial state. Used by useReducer so restoration happens synchronously on
 * first render and the UI never flashes the "greeting" step before restoring.
 */
function init(): WizardState {
  const saved = loadSession();
  if (!saved) return initialState;
  return { ...initialState, ...saved };
}

export function useWizardState() {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // Track whether the user resumed a session so the UI can acknowledge it.
  // We compute this once on mount (not derived from state) so later state
  // changes don't flip the flag.
  const resumedRef = useRef<boolean>(state.step !== 'greeting' || !!state.contact.email);

  // Persist on every state change. Runs after the reducer commits, so the
  // latest state is always on disk. Skip the 'complete' → 'freechat' window
  // because we want free chat state to survive page reloads too.
  useEffect(() => {
    saveSession(state);
  }, [state]);

  const startGreeting = useCallback(async () => {
    dispatch({ type: 'SET_OCTO_STATE', payload: 'thinking' });

    await new Promise((r) => setTimeout(r, 800));

    try {
      const response = await generateOctoResponse('greeting', {
        service: null,
        budget: null,
        requirements: '',
        slot: null,
      });

      dispatch({ type: 'SET_AI_MESSAGE', payload: response });
      dispatch({ type: 'SET_OCTO_STATE', payload: 'speaking' });
    } catch (error) {
      console.error('startGreeting failed:', error);
      dispatch({
        type: 'SET_AI_MESSAGE',
        payload: 'Something went wrong — please try again or refresh the page.',
      });
      dispatch({ type: 'SET_OCTO_STATE', payload: 'idle' });
    }
  }, []);

  const transitionToStep = useCallback(
    async (action: WizardAction) => {
      dispatch(action);
      dispatch({ type: 'SET_OCTO_STATE', payload: 'thinking' });
      dispatch({ type: 'NEXT_STEP' });

      // Lead capture: the moment the user submits contact info, save it to
      // the backend (or dev console). Fire-and-forget — don't block the
      // animation or downstream AI call. Failures are logged but non-fatal.
      if (action.type === 'SUBMIT_CONTACT') {
        void saveLead(action.payload, state.selectedService).catch((err) => {
          console.error('saveLead background error:', err);
        });
      }

      const currentIdx = STEP_ORDER.indexOf(state.step);
      const nextStep = STEP_ORDER[Math.min(currentIdx + 1, STEP_ORDER.length - 1)];

      const context = {
        service: action.type === 'SELECT_SERVICE' ? action.payload : state.selectedService,
        budget: action.type === 'SELECT_BUDGET' ? action.payload : state.budget,
        requirements:
          action.type === 'SUBMIT_REQUIREMENTS' ? action.payload.text : state.requirements,
        slot: action.type === 'SELECT_SLOT' ? action.payload : state.selectedSlot,
      };

      // When the budget step is confirmed the user is fully booked.
      // Fire submitBooking concurrently with the AI message generation so
      // neither blocks the other. The booking result (or error) is stored in
      // state and rendered on the complete step.
      if (action.type === 'SELECT_BUDGET') {
        // Build the projected state for submitBooking because the reducer
        // hasn't flushed yet (dispatch is async in React).
        const projectedState = {
          ...state,
          budget: action.payload,
        };

        try {
          const [response] = await Promise.all([
            generateOctoResponse(nextStep, context),
            new Promise((r) => setTimeout(r, 1500)),
            submitBooking(projectedState)
              .then((result) => {
                dispatch({ type: 'SET_BOOKING_RESULT', payload: result });
              })
              .catch((err: unknown) => {
                const message =
                  err instanceof Error ? err.message : 'Something went wrong — please try again.';
                dispatch({ type: 'SET_BOOKING_ERROR', payload: message });
              }),
          ]);

          dispatch({ type: 'SET_AI_MESSAGE', payload: response });
          dispatch({ type: 'SET_OCTO_STATE', payload: 'speaking' });
        } catch (error) {
          console.error('transitionToStep (SELECT_BUDGET) failed:', error);
          dispatch({
            type: 'SET_AI_MESSAGE',
            payload: 'Something went wrong — please try again or refresh the page.',
          });
          dispatch({ type: 'SET_OCTO_STATE', payload: 'idle' });
        }
        return;
      }

      try {
        const [response] = await Promise.all([
          generateOctoResponse(nextStep, context),
          new Promise((r) => setTimeout(r, 1500)),
        ]);

        dispatch({ type: 'SET_AI_MESSAGE', payload: response });
        dispatch({ type: 'SET_OCTO_STATE', payload: 'speaking' });
      } catch (error) {
        console.error('transitionToStep failed:', error);
        dispatch({
          type: 'SET_AI_MESSAGE',
          payload: 'Something went wrong — please try again or refresh the page.',
        });
        dispatch({ type: 'SET_OCTO_STATE', payload: 'idle' });
      }
    },
    [state]
  );

  const showChoices = useCallback(() => {
    dispatch({ type: 'SHOW_CHOICES' });
    dispatch({ type: 'SET_OCTO_STATE', payload: 'idle' });
  }, []);

  const goToFreeChat = useCallback(async () => {
    dispatch({ type: 'GO_TO_FREECHAT' });
    dispatch({ type: 'SET_OCTO_STATE', payload: 'thinking' });

    await new Promise((r) => setTimeout(r, 800));

    dispatch({
      type: 'SET_AI_MESSAGE',
      payload:
        "Anything else you want to know about Octio? Ask me — our team, our work, our approach — whatever's on your mind.",
    });
    dispatch({ type: 'SET_OCTO_STATE', payload: 'speaking' });
  }, []);

  const retryBooking = useCallback(async () => {
    dispatch({ type: 'CLEAR_BOOKING_ERROR' });
    dispatch({ type: 'SET_OCTO_STATE', payload: 'thinking' });

    submitBooking(state)
      .then((result) => {
        dispatch({ type: 'SET_BOOKING_RESULT', payload: result });
        dispatch({ type: 'SET_OCTO_STATE', payload: 'speaking' });
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Something went wrong — please try again.';
        dispatch({ type: 'SET_BOOKING_ERROR', payload: message });
        dispatch({ type: 'SET_OCTO_STATE', payload: 'speaking' });
      });
  }, [state]);

  /**
   * Discard the saved session and reset the wizard to its initial state.
   * Called when the user explicitly finishes the flow or closes the wizard.
   */
  const resetSession = useCallback(() => {
    clearSession();
  }, []);

  return {
    state,
    dispatch,
    transitionToStep,
    showChoices,
    startGreeting,
    goToFreeChat,
    retryBooking,
    resetSession,
    hasResumedSession: resumedRef.current,
  };
}
