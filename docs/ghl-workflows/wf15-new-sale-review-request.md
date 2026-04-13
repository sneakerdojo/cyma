# WF15: New Sale - Send Review Request
**Status:** Draft | **Workflow ID:** 77226531-88a3-402d-87dc-766a0e571e6e

## Trigger
- **Opportunity Status Changed** -- Pipeline filter + status = "won"

## Nodes (top to bottom, linear):

1. **Remove from Workflow** -- Removes the contact from this workflow
2. **Send Review Request - Email** -- Sends a review request via email
3. **Send Review Request - SMS** -- Sends a review request via SMS
4. **Wait 3 Days** -- Waits 3 days before proceeding
5. **Internal Notification** -- Sends an internal notification
6. **END**

## Flow
Trigger --> Remove from Workflow --> Send Review Request Email --> Send Review Request SMS --> Wait 3 Days --> Internal Notification --> END
