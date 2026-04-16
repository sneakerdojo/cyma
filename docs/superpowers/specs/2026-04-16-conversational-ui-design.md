# Conversational UI — Design Spec

**Date:** 2026-04-16
**Status:** Final
**Scope:** Replace text-based freechat with an agent-driven interactive wizard
**Mockup:** `/public/mockup.html` (8 interactive component demos)
**Architecture diagrams:** `/public/architecture.html` (4 Mermaid diagrams)

---

## 1. Problem

The freechat is a plain text chat box. No structure, no interactive components, no visual feedback. It feels disconnected from the polished wizard. The agent asks questions but the user has to type everything.

**Solution:** The freechat becomes an **unstructured wizard** — same visual components as the current wizard (buttons, forms, uploads, scheduling) but the **agent decides what to show next** via tool calls instead of a hardcoded state machine.

---

## 2. Design Decisions

| Aspect | Decision |
|---|---|
| Interaction model | Agent-driven guided flow — agent decides sequence via tool calls |
| UI appearance | Same as current wizard (OctoChoices-style buttons, OctoTextInput, etc.) |
| Previous steps | Hidden by default. "History" button toggles drawer. "Edit" re-renders component. |
| Orb | Current size, pinned to top of screen (above center), floating animation |
| Orb states | `idle` (normal float), `listening` (scale pulse + bright glow), `thinking` (fast float + intense glow + dots), `speaking` (during typewriter reveal) |
| Text fallback | Always visible, integrated INTO each component — not a separate bottom bar |
| Voice input | Mic button on text fallback. Tapping shows waveform overlay covering component area (not full screen). Orb enters `listening` state. On stop → orb `thinking` → transcription result fills text input. |
| Detail text | Always visible — main question bold 20px, detail muted 13px below |
| Agent text output | Rendered as markdown via react-markdown |
| Agent diagrams | `show_diagram` tool renders Mermaid inline, tap-to-expand. Multiple diagrams per response supported. |
| Per-step lifecycle | User answers → components hide → orb thinks → stream buffered → question typewriters → component slides in |

---

## 3. Screen Layout

### Active Step

```
┌──────────────────────────────────────────┐
│  [x]                        [History]    │  ← Header (always visible)
│                                          │
│              ┌──────────┐                │
│              │   ORB    │                │  ← 3D orb, current size, pinned top
│              │  (eyes)  │                │
│              └──────────┘                │
│               mina.                      │
│                                          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  ← Step zone below
│                                          │
│  Main question text here                 │  ← Question (20px, bold)
│                                          │
│  More context about why we ask this      │  ← Detail (13px, muted)
│                                          │
│  ┌───────────┐ ┌────────────────┐        │
│  │ Option A  │ │   Option B     │        │  ← Interactive component
│  └───────────┘ └────────────────┘        │     (varies by tool call)
│  ┌───────────┐ ┌────────────────┐        │
│  │ Option C  │ │   Option D     │        │
│  └───────────┘ └────────────────┘        │
│                                          │
│  Or type your answer                     │  ← Integrated text fallback
│  ┌──────────────────────┐ [mic] [send]   │     (part of each component)
│  │ placeholder text     │                │
│  └──────────────────────┘                │
└──────────────────────────────────────────┘
```

### Voice Recording (overlay covers component area only)

```
┌──────────────────────────────────────────┐
│  [x]                        [History]    │
│                                          │
│              ┌──────────┐                │
│              │   ORB    │                │  ← Orb in 'listening' state
│              │(pulsing) │                │     (scale 1→1.06, bright glow)
│              └──────────┘                │
│               mina.                      │
│                                          │
│  Main question text here                 │  ← Question stays visible
│  More context about why we ask           │  ← Detail stays visible
│                                          │
│  ┌──────────────────────────────────┐    │
│  │                                  │    │
│  │    ▎▍▌▋█▋▌▍▎▍▌▋█▋▌▍▎▍▌▋█▋▌    │    │  ← Animated waveform
│  │                                  │    │
│  │              0:04                │    │  ← Timer
│  │           Listening...           │    │  ← Status label
│  │                                  │    │
│  │             [■ Stop]             │    │  ← Stop button
│  │                                  │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

### After Transcription

```
│  ┌──────────────────────────────────┐    │
│  │    ▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎        │    │  ← Waveform flattened
│  │              0:04                │    │
│  │          Transcribed ✓           │    │  ← Status
│  │                                  │    │
│  │  "We need an AI agent that       │    │  ← Result shown
│  │   qualifies leads from our       │    │
│  │   website automatically"         │    │
│  └──────────────────────────────────┘    │

  → overlay disappears after 2s
  → transcribed text placed in the text input field
  → orb returns to idle
```

### History Drawer (toggled)

```
┌──────────────────────────────────────────┐
│  [x]                      [History ✓]    │
│                                          │
│  ┌ Your answers ─────────────────────┐   │
│  │ Service: AI Agents        [Edit]  │   │  ← Compact pills
│  │ Budget: R150K–R500K       [Edit]  │   │
│  │ Problem: Manual processes [Edit]  │   │
│  │ Team: 5 people            [Edit]  │   │
│  └───────────────────────────────────┘   │
│                                          │
│  ... orb + current step below ...        │
└──────────────────────────────────────────┘
```

### Thinking State

```
│              ┌──────────┐                │
│              │   ORB    │                │  ← Fast pulse, intense glow
│              │(thinking)│                │
│              └──────────┘                │
│               mina.                      │
│                                          │
│              ●  ●  ●                     │  ← Bouncing dots
│            thinking...                   │  ← Label
```

### Multiple Diagrams Response

```
│  Two approaches for your pipeline:       │  ← Agent markdown text
│                                          │
│  Approach A — Full Automation            │  ← Diagram label (orange, bold)
│  ┌──────────────────────────────────┐    │
│  │  [Form] → [AI Agent] → [CRM]    │    │  ← Mermaid diagram 1
│  │   auto-qualify → auto-book       │    │
│  │            Tap to expand ↗       │    │
│  └──────────────────────────────────┘    │
│  Zero human touch until the call.        │  ← Brief description
│                                          │
│  Approach B — Human-Reviewed             │  ← Diagram label
│  ┌──────────────────────────────────┐    │
│  │  [Form] → [AI] → [Human Review] │    │  ← Mermaid diagram 2
│  │   auto-qualify → human approves  │    │
│  │            Tap to expand ↗       │    │
│  └──────────────────────────────────┘    │
│  AI qualifies, human approves.           │
│                                          │
│  [Full automation]  [Human-reviewed]     │  ← Choice buttons
│                                          │
│  Or type your answer                     │
│  [________________________] [mic] [>]    │
```

### Scheduler

```
│  Pick a time for your discovery call     │  ← Question
│  30 min via Google Meet. All SAST.       │  ← Detail
│                                          │
│  [MON 14] [TUE 15] [WED 16] [THU 17]   │  ← Day picker (scroll horizontal)
│                                          │
│  ┌──────────┐ ┌──────────┐              │
│  │ 09:00 AM │ │ 11:00 AM │              │  ← Time slot grid
│  └──────────┘ └──────────┘              │
│  ┌──────────┐ ┌──────────┐              │
│  │ 02:00 PM │ │ ▬▬▬▬▬▬▬▬ │              │  ← Unavailable = greyed + strikethrough
│  └──────────┘ └──────────┘              │
│  ○ Unavailable  ● Selected              │  ← Legend
│                                          │
│  Or type a preferred time                │
│  [________________________] [mic] [>]    │
```

---

## 4. Architecture

### 4.1 Tool-Driven Rendering

The agent writes text (question + detail, rendered as markdown) AND calls a UI tool to specify what interactive component to render below it. UI tools are **pass-throughs** — they do nothing on the backend. Their purpose is to appear in the SSE stream so the frontend can detect them and render the matching React component.

**Exception:** `show_scheduler` fetches real Google Calendar availability before returning.

```
Agent response stream:
├── text parts → rendered as markdown (question + detail + explanatory content)
├── tool-invocation parts:
│   ├── show_choices     → ChoiceSelector
│   ├── show_multi_select → MultiSelector
│   ├── show_text_input  → TextInputPanel
│   ├── show_file_upload → FileUploadPanel
│   ├── show_form        → FormPanel
│   ├── show_scheduler   → SchedulerPanel (fetches real slots)
│   └── show_diagram     → MermaidDiagram (can appear multiple times)
└── stream end → trigger render lifecycle
```

### 4.2 Frontend Stream Parsing

```tsx
const lastAssistant = messages.filter(m => m.role === 'assistant').at(-1);

// Extract text
const textContent = lastAssistant?.parts
  ?.filter(p => p.type === 'text')
  .map(p => p.text).join('');

// Extract UI tool calls
const uiToolCalls = lastAssistant?.parts
  ?.filter(p => p.type === 'tool-invocation' && p.toolName.startsWith('show_'));

// Render each tool call as its matching component
{uiToolCalls.map(tc => {
  switch (tc.toolName) {
    case 'show_choices':    return <ChoiceSelector {...tc.args} />;
    case 'show_multi_select': return <MultiSelector {...tc.args} />;
    case 'show_scheduler':  return <SchedulerPanel slots={tc.result.slots} />;
    case 'show_diagram':    return <MermaidDiagram {...tc.args} />;
    // ...etc
  }
})}
```

### 4.3 Per-Step Lifecycle

```
1. User answers (button / text / voice / file / form / slot)
2. Current step content hides
3. Store step in local history: { question, answer, toolId, toolInput }
4. Orb → thinking (fast pulse + dots + "thinking...")
5. POST /chat/stream (user message)
6. Agent streams response (BUFFERED — not shown until complete)
7. Stream complete:
   a. Orb → speaking
   b. Question typewriters in
   c. Detail fades in
   d. Markdown content renders (if any)
   e. Diagrams render inline (if show_diagram called)
   f. Interactive component slides up
   g. Text fallback + mic appears below component
8. Orb → idle
```

### 4.4 Voice Input Lifecycle

```
1. User taps mic button
2. Orb → listening (scale pulse 1→1.06, bright glow)
3. Component area hides, waveform overlay appears (covers component zone only)
4. Waveform animates, timer counts, "Listening..." status
5. User taps stop
6. Orb → thinking (fast float, intense glow)
7. Waveform flattens, "Transcribing..." status
8. Audio sent to backend → transcribed (Whisper / Kimi audio)
9. Result text fades in on overlay: "Transcribed ✓" + text preview
10. After 2s: overlay disappears, text placed in input field
11. Orb → idle
12. User can edit the transcription in the text field, then send
```

### 4.5 History + Edit

```
1. Each completed step stored locally:
   { stepId, question, answer, toolId, toolInput, timestamp }
2. "History" button in top-right toggles drawer open/closed
3. Drawer shows compact pills: "Service: AI Agents [Edit]"
4. Tap "Edit" → original component re-renders with previous value pre-filled
5. User changes answer → new value replaces old in history
6. Sent to agent: "[Edited: {field} changed from '{old}' to '{new}']"
7. Agent re-evaluates downstream
```

---

## 5. Tool Reference

### Input Tools (pass-through — frontend renders component)

| Tool | Component | User Action | Response Sent |
|---|---|---|---|
| `show_choices` | Button grid (single select) | Tap button | Button label |
| `show_multi_select` | Checkbox list + Confirm | Check items, confirm | Comma-joined selections |
| `show_text_input` | Textarea | Type + send | Typed text |
| `show_file_upload` | Drag-and-drop + Skip | Upload or skip | File or "Skipped" |
| `show_form` | Dynamic labeled fields + Submit | Fill + submit | Structured JSON |

### Scheduling Tool (fetches real data)

| Tool | Component | Backend Action | User Action |
|---|---|---|---|
| `show_scheduler` | Day picker + time slot grid | Calls `getAvailabilityForNextBusinessDays()` | Tap a slot → label sent |

### Output Tools (render rich content)

| Tool | Component | Behavior |
|---|---|---|
| `show_diagram` | Mermaid renderer | Inline at readable size, tap-to-expand overlay. Can be called multiple times per response. |

Text/markdown rendering uses `react-markdown` (already installed) — no tool needed.

---

## 6. Tool Schemas

### `show_choices`
```
question: string              — Main question (bold, 20px)
detail?: string               — Context (muted, 13px)
options: string[]             — Button labels
allowCustom: boolean = true   — Show "or type" + mic
```

### `show_multi_select`
```
question: string
detail?: string
options: string[]             — Checkbox labels
minSelect: number = 1
maxSelect?: number
```

### `show_text_input`
```
question: string
detail?: string
placeholder?: string
multiline: boolean = false
```

### `show_file_upload`
```
question: string
detail?: string
acceptTypes: string = ".pdf,.doc,.docx,.txt,image/*"
allowSkip: boolean = true
```

### `show_form`
```
question: string
detail?: string
fields: Array<{
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea'
  required?: boolean
  placeholder?: string
}>
```

### `show_scheduler`
```
question: string
detail?: string
daysAhead: number = 5         — Business days to show

execute: calls getAvailabilityForNextBusinessDays(daysAhead)
returns: { rendered: true, slots: AvailableSlot[] }
```

### `show_diagram`
```
title?: string                — Caption above diagram
mermaidCode: string           — Raw Mermaid syntax
expandable: boolean = true    — Show "tap to expand"
```

---

## 7. Component Hierarchy

```
InteractiveChat (root)
├── Header
│   ├── CloseButton
│   └── HistoryToggle
├── OrbZone
│   ├── OctoOrb (Three.js — idle/listening/thinking/speaking)
│   ├── OrbLabel ("mina.")
│   └── ThinkingIndicator (dots + "thinking..." — during thinking state)
├── HistoryDrawer (hidden by default)
│   └── HistoryItem × N ({ label, value, onEdit })
├── StepZone (current step — one at a time)
│   ├── QuestionText (bold, typewriter reveal)
│   ├── DetailText (muted, fade in)
│   ├── AgentContent (markdown via react-markdown)
│   │   └── MermaidDiagram × N (if show_diagram called)
│   ├── ComponentPanel (one component type rendered)
│   │   ├── ChoiceSelector
│   │   ├── MultiSelector
│   │   ├── TextInputPanel
│   │   ├── FileUploadPanel
│   │   ├── FormPanel
│   │   └── SchedulerPanel
│   ├── TextFallback (always visible — "or type" + input + mic + send)
│   └── VoiceOverlay (covers component area when recording)
│       ├── Waveform (20 animated bars)
│       ├── Timer
│       ├── StatusLabel ("Listening..." / "Transcribing..." / "Transcribed")
│       ├── TranscriptionResult (fade in on complete)
│       └── StopButton
└── DiagramOverlay (full-screen when user expands a diagram)
```

---

## 8. File Structure

### New frontend files
```
src/features/chat/
├── InteractiveChat.tsx              — Root orchestrator
├── ChatMessage.tsx                  — Question + detail + agent markdown
├── components/
│   ├── ChoiceSelector.tsx           — Button grid
│   ├── MultiSelector.tsx            — Checkbox list + confirm
│   ├── TextInputPanel.tsx           — Styled textarea
│   ├── FileUploadPanel.tsx          — Drag-and-drop zone
│   ├── FormPanel.tsx                — Dynamic labeled form
│   ├── SchedulerPanel.tsx           — Day picker + time slot grid
│   ├── MermaidDiagram.tsx           — Inline diagram + expand overlay
│   ├── HistoryDrawer.tsx            — Collapsible answer history
│   ├── ThinkingState.tsx            — Dots + "thinking..."
│   ├── TextFallback.tsx             — Input + mic + send
│   └── VoiceOverlay.tsx             — Waveform + timer + transcription
```

### New backend tools
```
worker/src/mastra/tools/
├── show-choices.ts
├── show-multi-select.ts
├── show-text-input.ts
├── show-file-upload.ts
├── show-form.ts
├── show-scheduler.ts
└── show-diagram.ts
```

### Modified files
```
src/features/octo/OctoFreeChat.tsx       — Mount InteractiveChat
src/features/octo/OctoConversation.tsx    — Adjust layout
src/components/Hero.tsx                   — Orb pinned to top
worker/src/mastra/agents/octo.ts          — Register 7 UI tools
worker/src/prompts/octo-freechat.md       — UI tool usage rules per phase
```

### Reused existing code
```
src/features/octo/OctoScene.tsx           — 3D orb (reused, repositioned)
src/features/octo/OctoOrb.tsx             — Orb states (idle/listening/thinking/speaking)
src/features/octo/OctoEyes.tsx            — Eye tracking
src/features/octo/OctoParticles.tsx        — Ambient particles
src/features/octo/OctoTextInput.tsx        — MediaRecorder code (reuse for voice)
worker/src/services/calendar.ts           — getAvailabilityForNextBusinessDays()
```

---

## 9. Orb State Mapping

| State | Trigger | Animation | Glow |
|---|---|---|---|
| `idle` | Waiting for user input | 4s float cycle | Normal (25% opacity) |
| `listening` | User tapped mic, recording | 0.8s scale pulse 1→1.06 | Bright (50% opacity) |
| `thinking` | Waiting for agent response | 1.5s fast float | Intense (40% opacity) |
| `speaking` | Agent response rendering (typewriter) | Normal float | Normal |

---

## 10. Conversation Phases × Tools

| Phase | Agent Goal | Typical Tools Used |
|---|---|---|
| **1. Qualify** | Understand service need + core problem | `show_choices` (service, problem type), `show_text_input` (describe problem) |
| **2. Position** | Frame Octio as the solution | Markdown text + `show_diagram` (proposed architecture), `show_choices` (which approach) |
| **3. Deepen** | BANT qualification | `show_choices` (team, timeline, decision makers), `show_multi_select` (pain points), `show_file_upload` (specs), `show_form` (add person to call) |
| **4. Close** | Bridge to discovery call | `show_scheduler` (pick call time), `show_choices` (want a blueprint?), `prepare_call_brief` + `generate_blueprint` (backend tools) |

---

## 11. Verification

1. Orb pinned to top, question + component below, no separate bottom bar
2. `show_choices` → buttons render, tap sends label, "or type" + mic integrated
3. `show_multi_select` → checkboxes render, confirm sends selections
4. `show_text_input` → textarea IS the component (no buttons above, no duplication)
5. `show_file_upload` → drop zone + skip + "or describe" text field
6. `show_form` → dynamic labeled fields + submit
7. `show_scheduler` → real Google Calendar slots, day picker + time grid, unavailable greyed out
8. `show_diagram` → Mermaid inline, tap-to-expand. Multiple diagrams per response.
9. Voice → mic tapped → waveform overlay covers component area (not full screen) → orb `listening` → stop → orb `thinking` → "Transcribing..." → result in text field → overlay disappears
10. History hidden by default → "History" toggle → drawer with answer pills → "Edit" re-renders component
11. Thinking → orb fast pulse + dots + "thinking..." between steps
12. Agent text rendered as markdown (bold, lists, headings, code)
13. Mobile: 44px min tap targets, responsive, touch-friendly
