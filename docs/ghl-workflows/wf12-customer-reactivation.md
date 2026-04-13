# WF12: Customer Reactivation Campaign (Dentist)
**Status:** Draft | **Workflow ID:** 675c16c8-599c-41ed-b27c-760c00015a8d

## Nodes and Flow (top to bottom):

1. **TRIGGER: Contact Tag** -- Tag Added includes "a" (placeholder filter)
2. **Free Whitening Offer** (SMS/message action)
3. **Wait Until Reply (Or 1 Hour)** (wait/timer node)
4. **Did they reply within an hour?** (If/Else condition)
5. **Branch (If/Else):**
   - **Branch: If "Contact replied" is "True"** -->
     - **Was reply positive?** (condition node)
     - **Branch: If "Intent Type" is "Positive/Yes"** -->
       - **Positive Reply - Next Steps** (SMS) --> **END**
     - **None: When none of the conditions are met** -->
       - **Sms** (follow-up SMS) --> **END**
   - **None: When none of the conditions are met** (no reply path) -->
     - **2nd Attempt** (SMS)
     - **Wait for reply** (timer)
     - **Was reply positive?** (condition node)
     - **Branch: If "Intent Type" is "Positive/Yes"** -->
       - **Positive Reply - Next Steps** (SMS) --> **END**
     - **None: When none of the conditions are met** -->
       - **Sms** --> **END**

## Summary:
A two-attempt reactivation campaign for dentist patients. Triggered by a contact tag, it sends a free whitening offer, waits up to 1 hour for a reply. If the contact replies positively, they get next-step instructions. If negative/no intent, they get a follow-up SMS. If no reply at all, a 2nd attempt SMS is sent, followed by another wait-and-evaluate cycle with the same positive/negative branching logic.
