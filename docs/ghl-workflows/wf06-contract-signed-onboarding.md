# WF6: Contract Signed > Send Onboarding Form
**Status:** Canvas Documented | **Workflow ID:** 83f2b5f3-ae5b-4826-8552-8dd3de3e6b43

## Trigger
- **Documents & Contracts** -- Status: "Signed/Accepted", Template ID: "f6e9f7d377e087d7e80..."
- Has orange error indicator

## Nodes (top to bottom, linear):

1. **Add Tag** -- tags the contact (post-signing tag)
2. **Email - Onboarding Form** -- sends onboarding form email to the new client
3. **END**

## Flow
Trigger (Documents & Contracts Signed/Accepted) --> Add Tag --> Email - Onboarding Form --> END

## Summary
Triggered when a client signs/accepts a contract or document. Tags the contact and sends them an onboarding form via email. Simple 2-step linear flow. Part of the "Client Onboarding Automation" folder alongside WF5 and WF7.
