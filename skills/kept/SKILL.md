---
name: kept
description: How to use the Kept MCP tools (kept_*) well. Load whenever the user asks you to capture a thought, manage tasks or calendar events, plan their day, or answer questions from their notes, goals, habits, or knowledge graph, or whenever any kept_* tool is available and personal data is involved.
---

# Using Kept well

Kept is the user's personal OS (notes, tasks, calendar, goals, habits, and focus) behind
the `kept_*` MCP tools at `https://mcp.kept.do/mcp`. These idioms make the difference
between an agent that "has access to Kept" and one that actually keeps things for the
user.

This skill is for **consumer** Kept. Do not call Workplace MCP hosts, and do not invent
Workplace tool names here.

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
`kept_get_briefing` is the written brief; `kept_read_daily_note` / `kept_append_daily_note`
are the day's note. Read before you write: fetch today before proposing changes to it.

## Tasks you carry, and asks

For work you will carry yourself, create the task with `assignee: "this_client"`. When
you need the person to act, call `kept_create_task` with `assignee: "owner"` and a nested
`ask` object. That object requires `ask`, `done_looks_like`, and `idempotency_key`;
attach supporting notes by their ids in `ask.resource_note_ids`. Generate and retain
one idempotency key for the same intended ask. Read `kept_list_asks` before asking
again, and revise an open ask with `kept_update_ask` instead of creating a duplicate.
Updates take `ask_id` and the changed fields (`ask` and `done_looks_like` are top-level
there). `kept_assign_task` can only hand back or take on a task **this connection**
created.

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

For a surgical edit, call `kept_note_blocks_read` first and change only the ids it
returned with `kept_note_blocks_edit`. Never guess a block id. Prefer that pair over
`kept_update_note` unless the person asked for a full rewrite. Shared docs are out of
reach here. For another page of blocks, pass the returned `next_cursor` value as the
`cursor` argument to `kept_note_blocks_read`.

## Habits

Call `kept_list_habits` before creating or redesigning one. Prefer `kept_update_habit`
when an existing habit already serves the same intention. Present a complete draft
(cue, target action, worst-day minimum, cadence, recovery plan, review rule), wait for
approval, then make **exactly one** create or update write. Do not create then update in
the same turn.

Use the tool's exact argument names:

| Draft field | `kept_create_habit` | `kept_update_habit` |
|---|---|---|
| Name | `title` (required) | `label` |
| Cue | `anchorCue` | `anchor` |
| Target action | `targetAction` | `targetAction` |
| Worst-day minimum | `minimumAction` | `minimumAction` |
| Cadence | `cadence` | `cadence` |
| Recovery plan | `recoveryPlan` | `recoveryPlan` |
| Review rule | `reviewRule` | `reviewRule` |

Create also requires `category`; legacy create can still send only `title` and
`category`. New designs should include the draft fields above and a caller-persisted
UUID in `idempotency_key`. Update requires the existing habit's `id` and at least one
changed field. `groupId` is optional: omit it to leave grouping unchanged on update, pass
`null` to clear it, and pass an id only after `kept_list_habit_groups` shows an active
group this person owns. Groups are labels, not part of day; Kept does not regroup on its
own.

`kept_list_habit_groups`, `kept_create_habit_group`, `kept_update_habit_group`, and
`kept_reorder_habit_groups` manage those labels. List before creating so a normalized
name can be reused. Archiving is reversible and does not unassign habits. Reorder writes
each position separately and is not an atomic swap; if it reports
`habit_group_catalog_changed`, use the `groups` it returned instead of claiming the
requested order landed.

A scheduled-time edit on `kept_update_habit` changes the habit's default for every day.
Per-day overrides are not an MCP tool.

## Calendar etiquette

Reading the calendar (`kept_check_calendar`, `kept_list_events`) is always fine. But
anything another human will see or that moves committed time (sending an invite,
RSVPing, moving or cancelling a meeting with attendees) gets confirmed with the user
first: show who, what, and when, then act. Creating a solo event the user just asked for
does not need a second confirmation.

## Product docs and Cloud Agents

`kept_search_docs` answers questions about Kept from verified product documentation. It
is off until documentation search is enabled for that account. Five Cloud Agents job
tools (`kept_create_job`, `kept_get_job`, `kept_list_jobs`, `kept_get_run_events`,
`kept_submit_approval`) are off unless `FEATURE_CLOUD_AGENTS_MCP` is `1`. If either
family is off, the name fails as `unknown_tool` — not a special "disabled" code. Do not
retry a guessed Workplace job API. High-consequence approvals cannot be approved here.

Weight, sleep, mood, and metric history tools need `health:read`. If those calls are
denied, say the health-history grant is missing; do not invent readings.

## Verifying the connection

`kept_get_today` is the smoke test. Call it when the user asks "is Kept connected?",
after setup, or before a long chain of Kept work. If it succeeds, tell the user what you
can now do and offer a first move (capture something on their mind, or review today).
Do not recite the tool list.

## Honesty rules

- Never fabricate user data. If a tool returns nothing, the answer is "nothing found",
  not an invented note, task, or memory.
- If a Kept tool returns 401/unauthorized, the sign-in has expired or was never done.
  Tell the user to sign in (a browser window with a one-time email code. No passwords,
  no API keys) and stop; do not retry in a loop or guess at their data meanwhile.
- Quote the user's own words back when summarizing their notes; label your inferences
  as inferences.
- Identity comes from the signed-in token. Never send `userId`, `user_id`, `uid`, `sub`,
  or `account_id` as a tool argument.
- There is no MCP delete tool. Prefer archive and forget. Account deletion is only in
  the Kept apps.
