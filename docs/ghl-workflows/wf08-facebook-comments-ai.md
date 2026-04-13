# WF8: Facebook Comments + Workflow AI
**Status:** Draft | **Workflow ID:** 5f800aea-b282-4327-8611-7e384e7f66ec

## Trigger
- **Facebook - Comment(s) On...** -- Page filter + Post Type includes "Pub..." + 2 more conditions
- Has orange error indicator

## Nodes (top to bottom):

1. **#1 Comment Response** -- automated comment response
2. **Respond On Comment** -- public reply on the comment
3. **#2 Analyse comment sentiment** -- analyzes sentiment of the comment
4. **Condition** -- evaluates sentiment
5. **Branch:**
   - **Positive** -- If "#2 Analyse comment sentiment - is..." --> **Facebook Interactive Messenger** --> **Default Timeout** (branch continues below)
   - **Negative** -- When none of the conditions are met --> **END**

## Flow
```
Trigger (Facebook Comment)
  --> #1 Comment Response
  --> Respond On Comment
  --> #2 Analyse comment sentiment
  --> Condition
      |-- Positive --> Facebook Interactive Messenger --> Default Timeout --> (more nodes below viewport)
      |-- Negative --> END
```

## Summary
AI-powered Facebook comment automation. When someone comments on a post, it responds publicly, then analyzes the sentiment. Positive commenters get an interactive Facebook Messenger conversation (likely for lead capture). Negative commenters' path ends. The workflow uses AI sentiment analysis to route engagement.
