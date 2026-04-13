# WF18: Simple - Send Review Request
**Status:** Draft | **Workflow ID:** 84f05b19-1dab-4a05-83c4-08c2c23d0fd1

## Trigger
- **Contact Tag** -- "Job Complete" -- Tag Added includes "job-complete"

## Nodes (top to bottom):

1. **SMS 1 (check-in, no link)** -- initial check-in SMS without review link
2. **Wait (2 Hours)** -- waits 2 hours for reply
3. **Branch: Contact Reply / Time Out (2 hours)**

### Contact Reply path:
4. **Condition (Positive/Negative Reply)** -- evaluates reply intent
   - **Positive** -- If "Intent Type" is "Positive/Yes" --> **SMS (review link)** --> END
   - **Negative** -- When none of the conditions are met --> **SMS (complaint)** --> END

### Time Out path (no reply after 2 hours):
4. **SMS 2 (on reply, 2-hours later)** -- follow-up SMS
5. **Wait (48 Hours)**
6. **SMS** -- final follow-up SMS --> END

## Flow
```
Trigger (Contact Tag: job-complete)
  --> SMS 1 (check-in, no link)
  --> Wait (2 Hours)
  --> Branch:
      |-- Contact Reply:
      |     --> Condition (Positive/Negative)
      |         |-- Positive --> SMS (review link) --> END
      |         |-- Negative --> SMS (complaint) --> END
      |
      |-- Time Out (2 hours):
            --> SMS 2 (follow-up)
            --> Wait (48 Hours)
            --> SMS (final follow-up) --> END
```

## Summary
A review request workflow triggered when a job is marked complete. Sends an initial check-in SMS (no review link), waits 2 hours. If the contact replies positively, they get the review link. If negative, they get a complaint handling SMS. If no reply, sends a follow-up after 2 hours, then another final SMS after 48 hours.
