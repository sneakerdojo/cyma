# WF2: Voice AI End Of Call
**Status:** Canvas Documented | **Workflow ID:** 4e1fb6c1-0157-4463-af21-69532cb03f47

## Trigger
- **Add New Trigger** -- (no trigger configured yet)

## Nodes (top to bottom):

1. **Add Voice AI Tag** -- tags contact with Voice AI tag
2. **Call Reason** -- custom values/code node `{}` - determines the call intent

### 6-Way Branch (Call Reason):

#### Branch 1: Estimate
- Condition: If "JLjQYbj7WZWXnYGtFfso" contains "..."
3. **Qualified?** -- sub-condition checking if "Full Name" is not empty and if "A..."
   - **Yes branch:**
     4a. **Add Qualified & ai off Tag**
     5a. **Create Or Update Opportunity - Qualified** (has error indicator)
     6a. **Internal Notification - QUALIFIED Lead**
     7a. **Reset Intent Estimate field** (has error indicator)
     8a. **END**
   - **None branch** (when none of the conditions are met):
     4b. **Add Qualified & ai off Tag**
     5b. **Create Or Update Opportunity - New Lead** (has error indicator)
     6b. **Internal Notification - UNQUALIFIED**
     7b. **Reset Intent Estimate field** (has error indicator)
     8b. **END**

#### Branch 2: Cancel or Reschedule
- Condition: If "TgkhTqVg0KEf5ogmQui3" contains "..."
9. **Add Voice Ai Cancel or Reschedule Tag**
10. **Internal Notification - Cancel Reschedule**
11. **Reset Intent Cancel or Reschedule field** (has error indicator)
12. **END**

#### Branch 3: Complaint
- Condition: If "WbBsyYZYyWRdszQm4i2v" contains "..."
13. **Add Voice Ai Complaint Tag**
14. **Internal Notification - Complaint**
15. **Reset Intent Compliant field** (has error indicator)
16. **END**

#### Branch 4: General Inquiry
- Condition: If "7jYjORAnAvYKPL4Jxh7l" contains "..."
17. **Add Voice Ai General Inquiry Tag**
18. **Reset Intent General Inquiry field** (has error indicator)
19. **END**

#### Branch 5: Call Transfer
- Condition: If "RjoxxxEnDxj55BjZNCv2" contains "t..."
20. **Add Voice Ai Call Transfer Tag**
21. **Reset Intent Call Transfer field** (has error indicator)
22. **END**

#### Branch 6: None
- Condition: When none of the conditions are met
23. **END**

## Flow
```
Trigger (not configured)
  --> Add Voice AI Tag
  --> Call Reason (custom values)
  --> 6-way Branch:
      |-- Estimate --> Qualified?
      |   |-- Yes --> Add Qualified Tag --> Create Opportunity (Qualified) --> Notification (QUALIFIED) --> Reset Estimate field --> END
      |   |-- None --> Add Qualified Tag --> Create Opportunity (New Lead) --> Notification (UNQUALIFIED) --> Reset Estimate field --> END
      |-- Cancel/Reschedule --> Add Tag --> Notification --> Reset field --> END
      |-- Complaint --> Add Tag --> Notification --> Reset field --> END
      |-- General Inquiry --> Add Tag --> Reset field --> END
      |-- Call Transfer --> Add Tag --> Reset field --> END
      |-- None --> END
```

## Summary
Complex post-Voice AI call processing workflow (~23 nodes). After a Voice AI call ends, it tags the contact and evaluates the call reason/intent across 6 categories. The Estimate branch has additional qualification logic that creates opportunities differently for qualified vs unqualified leads. Each branch adds appropriate tags, sends internal notifications where needed, and resets the intent fields. Multiple nodes have orange error indicators suggesting configuration issues. Part of the "AI" folder alongside WF1.

## Total Node Count: ~23 (including ENDs)
