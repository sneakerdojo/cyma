# WF1: Conversational AI: Appointment Booking
**Status:** Draft | **Workflow ID:** 8668f3b3-a386-44f3-8e79-ce0dd8aab2b1

## Trigger
- **No trigger configured** -- "Add New Trigger" placeholder

## Nodes (top to bottom):

1. **Appointment Booking Conversation AI Bot** -- AI-powered conversation bot for booking appointments
2. **3-way branch:**
   - **Time Out** --> END
   - **Appointment Was Booked** --> END
   - **Appointment Not Booked** --> END

## Flow
(No Trigger) --> Appointment Booking Conversation AI Bot --> (Time Out / Appointment Was Booked / Appointment Not Booked) --> END

## Summary
Simple workflow with a single AI bot node that handles appointment booking conversations. The bot has 3 possible outcomes: timeout, successful booking, or failed booking. All branches currently end without further actions - this appears to be a template/starting point that needs additional actions added to each branch (e.g., confirmation SMS on booking, follow-up on no-book).
