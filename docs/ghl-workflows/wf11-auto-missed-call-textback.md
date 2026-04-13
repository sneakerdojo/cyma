# WF11: Auto Missed Call Text-Back
**Status:** Draft | **Workflow ID:** d230f8ed-ca09-43d2-bc92-bfbe9ce88969

## Trigger
- **Call Details** -- "Incoming call missed, busy..."
  - Conditions: "Call Direction is 'Incoming'" and "Call Status contains any of ['busy', ...]"

## Nodes (top to bottom, fully linear):

1. **Slight Delay (so SMS doesn't feel like a bot)** -- wait/delay step
2. **Assign to user** -- assigns the contact to a user (has orange warning indicator)
3. **Add contact tag** -- tags the contact
4. **SMS to Lead** -- sends an SMS to the lead
5. **Push Notification to Assigned User** -- notifies the assigned team member
6. **Internal SMS to Assigned User** -- sends an internal SMS alert to the assigned user
7. **END**

## Flow
Trigger --> Slight Delay --> Assign to user --> Add contact tag --> SMS to Lead --> Push Notification --> Internal SMS --> END

**Note:** Orange warning on "Assign to user" node suggests incomplete configuration.
