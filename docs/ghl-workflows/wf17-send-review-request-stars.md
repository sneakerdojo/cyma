# WF17: Send Review Request (4-5 Stars Only)
**Status:** Draft | **Workflow ID:** b124d00e-dbca-4d1d-8f37-610f3746712c

## Trigger
- **Contact Tag** -- "Tag is added" -- fires when a tag that includes "send review re..." is added to a contact

## Nodes (top to bottom):

1. **Wait (24 Hours)** -- Waits 24 hours
2. **Review SMS** -- Sends personalized SMS using {{contact.first_name}}, from [YOUR NAME] at [YOUR BUSINESS], asking for feedback on a 1-5 star scale (255 chars, 46 words)
3. **Wait 2 Days (Contact Reply)** -- Waits 2 days for the contact to reply
4. **Condition** -- Evaluates the reply with branches:
   - **4-5 Stars** -- If "Replied message" contains "4" or "5" etc. (routes positive reviews)
   - **1-3 Stars** -- If "Replied message" contains "1", "2", "3" etc. (routes negative reviews)
   - **Not Replied** -- Follow Up SMS

## Partial data from previous manual extraction:
- Node 5 (Not Replied branch): **Follow Up SMS** -- sends follow-up message
- Still missing: exact actions on 4-5 Stars branch (likely Google review link) and 1-3 Stars branch (likely internal notification or apology)

## Flow
Trigger --> Wait 24h --> Review SMS --> Wait 2 Days --> Condition --> (4-5 Stars / 1-3 Stars / Not Replied branches)
