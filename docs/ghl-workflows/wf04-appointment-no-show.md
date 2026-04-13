# WF4: Appointment No Show
**Status:** Draft | **Workflow ID:** d602ee3b-aa73-4f22-b7a2-a41b6578b6b1

## Trigger
- **Appointment Status** -- fires when appointment status is "No Show"
- Event Type is "Normal" + 1 more filter
- Has orange error indicator on trigger

## Nodes (top to bottom, linear):

1. **Reschedule Follow Up Link** -- sets up/sends a reschedule link
2. **SMS** -- sends SMS (likely with reschedule link)
3. **Wait for 1 day** -- waits 1 day
4. **SMS** -- sends follow-up SMS
5. **END**

## Flow
Trigger --> Reschedule Follow Up Link --> SMS --> Wait 1 Day --> SMS --> END
