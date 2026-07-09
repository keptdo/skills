---
name: kept
description: How to use the Kept MCP tools (kept_*) well. Load whenever the user asks you to capture a thought, manage tasks or calendar events, plan their day, or answer questions from their notes, goals, habits, or knowledge graph, or whenever any kept_* tool is available and personal data is involved.
---

# Using Kept well

Kept is the user's personal OS (notes, tasks, calendar, goals, habits, and focus) behind
the `kept_*` MCP tools. These idioms make the difference between an agent that "has access
to Kept" and one that actually keeps things for the user.

## Capture first, classify never

When the user says anything they want remembered, tracked, or dealt with: a thought, a
todo, an idea, "note that...", "remind me...", "I should..." · call `kept_capture` with
their words, lightly cleaned. Kept's router files it as a task, note, event, or memory on
its own. Do not interrogate the user about which type it is, and do not build your own
task/note out of fragments when one `kept_capture` call would do.

Only reach for the explicit constructors (`kept_create_task`, `kept_create_event`,
`kept_log_note`, `kept_remember`) when the user has been explicit about the shape or you
need fields capture can't infer (a specific due date structure, subtasks, a particular
calendar).

## The daily flow

For "what's on today?", "help me plan", or any day-shaped question: start with
`kept_get_today`. It returns the day's tasks, events, and plan in one call, usually all
the context you need. Use `kept_get_now` for "what should I be doing right now?" and
`kept_prioritize_day` when the user wants the day (re)planned rather than just read.
Read before you write: fetch today before proposing changes to it.

## Notes: match the tool to the question's shape

- Exact words or a known title → `kept_search_notes` (keyword).
- Meaning-shaped queries ("what was my thinking on pricing?", "notes about that rough
  week in March") → `kept_search_notes_semantic`.
- People, projects, and entities ("what do I know about Dana?", "everything on the Atlas
  project") → `kept_notes_about`, which walks the knowledge graph, not just text.
- "What did I decide about X?" → `kept_decisions_about`.
- Ongoing storylines across notes → `kept_list_threads`.
- Follow links from a note you already have → `kept_related_notes`.

If a semantic search comes back thin, say so. Do not pad the answer with plausible
content the tools did not return.

## Calendar etiquette

Reading the calendar (`kept_check_calendar`, `kept_list_events`) is always fine. But
anything another human will see or that moves committed time (sending an invite,
RSVPing, moving or cancelling a meeting with attendees) gets confirmed with the user
first: show who, what, and when, then act. Creating a solo event the user just asked for
does not need a second confirmation.

## Verifying the connection

`kept_get_today` is the smoke test. Call it when the user asks "is Kept connected?",
after setup, or before a long chain of Kept work. If it succeeds, tell the user what you
can now do and offer a first move (capture something on their mind, or review today).

## Honesty rules

- Never fabricate user data. If a tool returns nothing, the answer is "nothing found",
  not an invented note, task, or memory.
- If a Kept tool returns 401/unauthorized, the sign-in has expired or was never done.
  Tell the user to sign in (a browser window with a one-time email code. No passwords,
  no API keys) and stop; do not retry in a loop or guess at their data meanwhile.
- Quote the user's own words back when summarizing their notes; label your inferences
  as inferences.
