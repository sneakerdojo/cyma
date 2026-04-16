import InteractiveChat, { type OrbState } from '../chat/InteractiveChat';
import { useChatSession } from '../chat/useChatSession';
import type { WizardState } from './types';

/**
 * Props mirror the subset of WizardState that OctoConversation supplies when
 * rendering the 'freechat' step.  The `visible` flag and `history`/
 * `onAddMessage`/`onThinking` callbacks from the old canned-response
 * implementation are intentionally removed — useChat owns message state now.
 *
 * OctoConversation passes `visible`, `history`, `onAddMessage`, `onThinking`
 * today. To keep the mount point compatible without touching OctoConversation,
 * we accept (but ignore) those legacy props alongside the wizard state fields.
 */
interface OctoFreeChatProps {
  /** From OctoConversation — controls whether the panel is rendered */
  visible: boolean;
  /** Wizard-collected data forwarded to the AI agent as context */
  wizardState: Pick<
    WizardState,
    'selectedService' | 'budget' | 'requirements' | 'contact' | 'meetLink' | 'calendarLink'
  >;
  /**
   * Forwarded from OctoConversation so orb state changes from the freechat
   * agent are reflected in the 3D orb (Task #63).
   */
  onOrbStateChange?: (state: OrbState) => void;
  /** Legacy props kept for interface compatibility — not used by FreeChatWidget */
  history?: unknown;
  onAddMessage?: unknown;
  onThinking?: unknown;
}

/**
 * OctoFreeChat is the mount point for the freechat step of OctoConversation.
 * It provides session persistence and wizard context to FreeChatWidget.
 * OctoScene (the 3D orb) continues to be rendered by OctoConversation.
 */
export default function OctoFreeChat({
  visible,
  wizardState,
  onOrbStateChange,
}: OctoFreeChatProps) {
  const { sessionId } = useChatSession();

  if (!visible) return null;

  return (
    <InteractiveChat
      sessionId={sessionId}
      wizardContext={{
        selectedService: wizardState.selectedService,
        budget: wizardState.budget,
        requirements: wizardState.requirements,
        contact: wizardState.contact,
        meetLink: wizardState.meetLink,
        calendarLink: wizardState.calendarLink,
      }}
      onOrbStateChange={onOrbStateChange}
    />
  );
}
