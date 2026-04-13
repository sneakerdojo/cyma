# WF3: Appointment Confirmation (No-Show Prevention)
**Status:** Draft | **Workflow ID:** 117a0186-0d05-41fa-ba92-4c4326a48b04

## Trigger
- **Appointment Status** -- fires when "Appointment Confirmed"
- Event Type is "Normal", Appointment status is "confirmed" + 1 more filter
- Has orange error indicator on trigger

## Nodes (top to bottom, linear):

1. **Remove from New Lead Workflow** -- removes contact from the new lead workflow
2. **Update Opportunity to Booking Stage** -- updates pipeline stage to "Booking"
3. **Confirmation Email** -- sends confirmation email to contact
4. **24 Hours before The appointment** -- waits until 24 hours before appointment time
5. **24 hr Reminder Email** -- sends 24-hour reminder email
6. *(2-3 more nodes visible in minimap but cut off -- likely SMS reminder or shorter wait + reminder)*
7. **END**

## Flow
Trigger --> Remove from New Lead Workflow --> Update Opportunity to Booking --> Confirmation Email --> Wait 24h before appt --> 24hr Reminder Email --> (additional reminder nodes) --> END

**Note:** Bottom nodes cut off in screenshot. Orange error on trigger suggests config issue.
