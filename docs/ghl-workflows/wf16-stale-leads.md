# WF16: Stale Leads
**Status:** Draft | **Workflow ID:** afdd8fbc-da91-4e42-8e1b-5b75a9726d90

## Triggers (3 triggers)
1. **Stale Opportunities - "New Lead" 7 days** -- In pipeline "7ACszfxU7uDPFig9Yh3..." + Pipeline stage is "hUTfRr2..." + 1 more
2. **Stale Opportunities - "Booked" 7 Days** -- In pipeline "7ACszfxU7uDPFig9Yh3..." + Pipeline stage is "96f1398..." + 1 more
3. **Stale Opportunities - "Hot Lead" 7 days** -- In pipeline "7ACszfxU7uDPFig9Yh3..." + Pipeline stage is "9ku5099..." + 1 more

All 3 triggers have orange error indicators.

## Nodes (top to bottom, linear):

1. **Update Opportunity Status to Abandoned** -- updates the opportunity status (has orange error indicator)
2. **END**

## Flow
Any of 3 Triggers (Stale 7 days in New Lead / Booked / Hot Lead stages) --> Update Opportunity Status to Abandoned --> END

## Summary
Cleanup workflow that monitors for stale opportunities across 3 pipeline stages (New Lead, Booked, Hot Lead). If an opportunity sits in any of these stages for 7 days without activity, it's automatically marked as "Abandoned." Simple single-action workflow for pipeline hygiene.
