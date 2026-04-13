# WF14: New Lead Nurture (Fast 5) - Claim Offer
**Status:** Draft | **Workflow ID:** 103769ae-f5cc-46d8-afd9-786755a72504

## Nodes and Flow (top to bottom):

1. **TRIGGERS (two triggers):**
   - **Facebook Lead Form Submission** -- Page is "Any", Form is any of "Any"
   - **Form Submitted: Claim Offer Form Submission** -- Form is any of ""
2. **Create Opportunity in New Lead Stage** (pipeline action)
3. **Add to Long Term Nurture Workflow** (workflow action, has an orange error indicator)
4. **Conversational Email** (email)
5. **Conversational SMS** (SMS)
6. **Wait for reply (or proceed after 2 mins)** (timer)
7. **Did the contact reply?** (If/Else condition)
8. **Branch:**
   - **Contact replied: If "Contact replied" is "True"** -->
     - **Update Opportunity to Hot Lead** (pipeline update)
     - **Was the reply positive or negative?** (condition node)
     - **3-way Branch:**
       - **Positive: If "Intent Type" is "Positive/Yes"** -->
         - **Booking Link SMS** --> **END**
       - **Negative: If "Intent Type" is not "Positive/Yes"** -->
         - **Survey Link SMS** --> **END**
       - **None: When none of the conditions are met** --> **END**
   - **Contact didn't reply: When none of the conditions are met** -->
     - **Call Connect** (phone call action)
     - **Voicemail** (voicemail drop, has orange error indicator)
     - **Wait 1 day** (timer)
     - **Any questions SMS** --> **END**

## Summary:
A new lead nurture workflow triggered by either a Facebook Lead Form or a Claim Offer Form submission. It immediately creates an opportunity in the "New Lead" pipeline stage and adds the contact to a long-term nurture workflow. Then it sends a conversational email and SMS, waits 2 minutes for a reply. If the contact replies, the opportunity is updated to "Hot Lead" and the reply intent is analyzed -- positive replies get a booking link SMS, negative replies get a survey link SMS. If the contact does not reply, the workflow initiates a Call Connect, drops a voicemail, waits 1 day, then sends a final "any questions" SMS.

**Note:** Two nodes have orange error indicators suggesting configuration issues (the "Add to Long Term Nurture Workflow" and "Voicemail" nodes).
