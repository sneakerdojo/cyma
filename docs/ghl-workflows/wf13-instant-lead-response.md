# WF13: Instant Lead Response (Speed-to-Lead)
**Status:** Draft | **Workflow ID:** 33647d50-36f8-46de-ab4c-02c0c52dc9ea

## Nodes and Flow (top to bottom):

1. **TRIGGER: Form Submitted** -- No filters applied
2. **Internal Notification** (notification action)
3. **SMS** (initial speed-to-lead SMS)
4. **Wait (30 Min)** (timer)
5. **Qualified (Yes/No)** (If/Else condition)
6. **Branch:**
   - **Qualified (Yes): If "Tags" includes "qualified"** -->
     - **Qualified (Yes) - Send Email** (email action)
     - **Wait (24 Hours)** (timer)
     - **Appointment Booked (Yes/No)** (condition node)
     - **Branch:**
       - **Appointment Booked (Yes): If "Last Appointment At" is in the Ne...** --> **END**
       - **Appointment Booked (No): When none of the conditions are met** -->
         - **SMS** (follow-up)
         - **Wait (48 Hours)**
         - **SMS** (another follow-up)
         - **Wait (48 Hours)**
         - **Add Tag "Nurture"** --> **END**
   - **Qualified (No): When none of the conditions are met** -->
     - **Qualified (No) - Send Email** --> **END**

## Summary:
A speed-to-lead workflow triggered on form submission. Immediately sends an internal notification and an SMS. After 30 minutes, it checks if the lead is qualified (by tag). Qualified leads get an email, then after 24 hours checks if they booked an appointment. If booked, the workflow ends. If not booked, it sends two more SMS follow-ups spaced 48 hours apart, then tags the contact for "Nurture." Unqualified leads receive a different email and the workflow ends.
