import { useCallback, useState } from 'react';
import OctoFreeChat from './OctoFreeChat';
import { useWizard } from './WizardContext';
import type { OctoAnimState, ContactInfo } from './types';
import type { OrbState } from '../chat/InteractiveChat';

interface OctoConversationProps {
  onClose: () => void;
  onStateChange?: (state: OctoAnimState) => void;
}

/**
 * The chat experience.
 *
 * Previously this rendered a 9-step structured wizard (greeting → service →
 * budget → requirements → contact → schedule → complete → freechat) as
 * a forced funnel before the conversational AI. That model has been
 * removed in favour of "the conversation IS the product" — clicking
 * any "Talk to our AI agent" / "Let's get you started!" CTA now opens
 * the conversational agent directly. Octo handles qualification through
 * conversation, using the existing UI tools (show_choices, show_form,
 * show_scheduler, etc.) when structured input is helpful.
 *
 * Identity is captured by the agent in-conversation (via show_form or
 * show_text_input) when it becomes relevant — typically before booking
 * a discovery call — rather than as an upfront gate.
 *
 * The legacy wizard reducer (useWizardState.ts) is no longer mounted;
 * it remains in the codebase as deprecated until we're confident no
 * other surface needs it.
 */
export default function OctoConversation({
  onClose,
  onStateChange,
}: OctoConversationProps) {
  const { prefilledService } = useWizard();
  const [orbState, setOrbState] = useState<OctoAnimState>('idle');

  // Map InteractiveChat's OrbState (idle/listening/thinking/speaking)
  // to OctoAnimState (idle/thinking/speaking) so the parent Hero can
  // animate the 3D orb in sync. 'listening' maps to 'thinking' since
  // OctoAnimState has no listening state of its own.
  const handleFreeChatOrbState = useCallback(
    (state: OrbState) => {
      const mapped: OctoAnimState = state === 'listening' ? 'thinking' : state;
      setOrbState(mapped);
      onStateChange?.(mapped);
    },
    [onStateChange],
  );

  // Forward any state-change pings to the parent so the page-level orb
  // can react even before the conversation produces explicit transitions.
  // void unused-state to satisfy lint without changing behaviour.
  void orbState;
  void onClose;

  // Wizard context (selectedService etc.) is empty by default — the agent
  // infers context from `prefilledService` when present (passed by a CTA
  // like the future Services-card "talk about this product" intent) and
  // otherwise opens with a cold-start qualification flow.
  const wizardState: {
    selectedService: string | null;
    budget: string | null;
    requirements: string;
    contact: ContactInfo;
    meetLink?: string;
    calendarLink?: string;
  } = {
    selectedService: prefilledService,
    budget: null,
    requirements: '',
    contact: { name: '', email: '', company: '' },
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6">
      <OctoFreeChat
        visible
        wizardState={wizardState}
        onOrbStateChange={handleFreeChatOrbState}
      />
    </div>
  );
}
