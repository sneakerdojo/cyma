# WF9: Instagram Comment Automation
**Status:** Draft | **Workflow ID:** dcfa924e-d0ab-403b-b947-ca6f838ddca7

## Trigger
- **Instagram - Comment(s)** -- Conditions: "Is First Level Comment is Yes" and "Contains Phrase contains any of 'Ag...'"

## Nodes (top to bottom):

1. **Respond On Comment** -- replies to the Instagram comment
2. **Instagram Interactive Messenger** -- sends an interactive DM via Instagram
3. **3-way branch** splitting into:
   - **Default Timeout** --> END
   - **Sign Up** --> END
   - **Book a Call** --> END

## Flow
Trigger --> Respond On Comment --> Instagram Interactive Messenger --> (branch) Default Timeout / Sign Up / Book a Call, each ending.
