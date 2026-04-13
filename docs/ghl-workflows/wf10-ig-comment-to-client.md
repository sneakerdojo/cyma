# WF10: [IG] Comment-to-Client
**Status:** Draft | **Workflow ID:** 1e3f144f-07ba-4514-b24d-718e115d17d0

## Trigger
- **Instagram - Comment(s)** -- Conditions: "Post Type Is includes 'published'" and "Contains Phrase contains any of ['A...']"

## Nodes (top to bottom):

1. **DM Link** (Instagram DM action) -- has orange warning indicator
2. **Respond On Comment** -- replies publicly on the comment
3. **Add Tag** -- tags the contact
4. **Wait** -- wait step
5. **Branch** splitting into two paths:
   - **Contact Reply** -- "What will happen when a contact replies" --> END
   - **Time Out** -- "What will happen after 4 hours" --> **INSTAGRAM-DM** (has orange warning) --> END

## Flow
Trigger --> DM Link --> Respond On Comment --> Add Tag --> Wait --> (branch: Contact Reply --> END | Time Out --> INSTAGRAM-DM --> END)

**Note:** Orange warning indicators on DM Link and INSTAGRAM-DM nodes suggest incomplete configuration.
