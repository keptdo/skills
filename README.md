# Kept for AI agents

[Kept](https://kept.do) is a personal OS · notes, tasks, calendar, goals, habits, and
focus. This repo connects Kept to your AI agent: a remote MCP server at
`https://mcp.kept.do/mcp` plus a skill that teaches the agent Kept's fast-capture and
daily-planning idioms.

This is the **consumer** plugin (personal Kept). It is not Kept Workplace. Do not point
this plugin at a Workplace MCP host or mix Workplace tool names into a consumer
session.

Once connected, your agent can capture thoughts (Kept's router files them), manage tasks
and events, search notes semantically, and answer questions from your knowledge graph,
with your explicit sign-in and scoped, revocable permissions.

The fastest path for any agent: paste this one-liner into it.

```
Fetch https://kept.do/agent-setup/prompt.md and follow its instructions to connect Kept (my notes, tasks, and calendar) to this agent over MCP.
```

Full setup guide and tool list: [kept.do/agent-setup](https://kept.do/agent-setup)

## Installing

### Claude Code

```
claude plugin marketplace add keptdo/skills
claude plugin install kept@kept
```

Inside a session, that's `/plugin marketplace add keptdo/skills` and
`/plugin install kept@kept`, then `/reload-plugins --force`. The `--force` matters:
without it a mid-conversation reload can stop with a warning and load nothing.

### Claude (claude.ai or Claude Desktop)

Settings → Connectors → Add custom connector → paste `https://mcp.kept.do/mcp`.

### Codex

```
codex mcp add kept --url https://mcp.kept.do/mcp
codex mcp login kept
```

### Cursor · `.cursor/mcp.json` (or global `~/.cursor/mcp.json`)

Add under `"mcpServers"`:

```json
"kept": { "url": "https://mcp.kept.do/mcp" }
```

### Windsurf · `~/.codeium/windsurf/mcp_config.json` (note `serverUrl`)

Add under `"mcpServers"`:

```json
"kept": { "serverUrl": "https://mcp.kept.do/mcp" }
```

### OpenCode · `~/.config/opencode/opencode.jsonc`

Add under `"mcp"`:

```json
"kept": { "type": "remote", "url": "https://mcp.kept.do/mcp", "enabled": true, "oauth": {} }
```

### GitHub Copilot (VS Code) · `.vscode/mcp.json`

Add under `"servers"`:

```json
"kept": { "type": "http", "url": "https://mcp.kept.do/mcp" }
```

### Any other agent

Point any MCP-capable client at `https://mcp.kept.do/mcp`: streamable HTTP, OAuth 2.1
with dynamic client registration, no pre-shared credentials.

## What's inside

The consumer catalog this plugin documents is **80 tools** available by default and an
**86-tool** full catalog when both gated families are on.

Five Cloud Agents job tools appear only when the distinct server flag
`FEATURE_CLOUD_AGENTS_MCP` is the literal `1`. `kept_search_docs` appears only when
product-documentation search is enabled for that account. Turning on the Kept web Cloud
Agents beta does not expose those job tools here. A gated name that is off fails as
`unknown_tool`, the same code as a tool that does not exist.

Longitudinal weight, sleep, mood, and personal metric history require a separate
`health:read` grant. It is not in the default read-and-capture bundle and not in Full
organizer access. Cloud Agents scopes (`jobs:read`, `jobs:write`, `approvals:write`) are
also outside those one-click presets.

There are **no delete tools** over MCP. Archive and forget are reversible. Account
deletion stays in the Kept iOS and Mac apps (Settings → Delete account), not in this
catalog.

Exact names, scopes, and input fields are pinned in
[`catalog/consumer-mcp.json`](catalog/consumer-mcp.json).

Authenticated discovery on September 8, 2026 verified all 80 default tool
descriptors against the deployed consumer server. The six optional tools stayed
gated; the 86 count describes the full source catalog. See the
[discovery receipt](catalog/deployment-verification.json).

| Group | Tools |
| --- | --- |
| Reads | `kept_get_today` `kept_list_tasks` `kept_list_asks` `kept_search_notes` `kept_read_note` `kept_list_goals` `kept_get_goal` `kept_list_habits` `kept_list_habit_groups` `kept_list_areas` `kept_list_calendars` `kept_check_calendar` `kept_search_events` `kept_recall` `kept_whoami` |
| Capture & routing | `kept_capture` `kept_route` |
| Typed writes | `kept_create_task` `kept_complete_task` `kept_assign_task` `kept_update_ask` `kept_log_note` `kept_create_event` `kept_complete_habit` `kept_create_goal` `kept_remember` `kept_forget` |
| Reversible edits | `kept_update_task` `kept_reopen_task` `kept_update_note` `kept_update_event` `kept_update_goal` `kept_set_goal_progress` `kept_archive_goal` `kept_create_habit` `kept_update_habit` `kept_create_habit_group` `kept_update_habit_group` `kept_reorder_habit_groups` `kept_archive_habit` `kept_uncomplete_habit` |
| Day / plan | `kept_get_now` `kept_prioritize_day` `kept_get_briefing` `kept_list_focus_sessions` |
| Export & search | `kept_export_tasks` `kept_list_events` `kept_list_memories` `kept_search` |
| Notes graph | `kept_search_notes_semantic` `kept_notes_about` `kept_decisions_about` `kept_related_notes` `kept_list_threads` `kept_note_chips` |
| Notes library | `kept_list_note_folders` `kept_move_note_to_folder` `kept_link_note_to_task` `kept_list_note_templates` `kept_read_daily_note` `kept_append_daily_note` `kept_note_blocks_read` `kept_note_blocks_edit` |
| Task depth | `kept_list_subtasks` `kept_add_subtask` `kept_set_subtask_done` `kept_list_task_comments` `kept_add_task_comment` |
| Calendar depth | `kept_event_details` `kept_get_event_guests` `kept_invite_to_event` `kept_rsvp_event` `kept_move_event_to_calendar` `kept_find_free_slots` |
| Trends | `kept_get_weight_trend` `kept_get_sleep_range` `kept_get_mood_range` `kept_get_habit_history` `kept_get_metric_series` `kept_search_tasks` |
| Product docs (gated) | `kept_search_docs` |
| Cloud Agents (gated) | `kept_create_job` `kept_get_job` `kept_list_jobs` `kept_get_run_events` `kept_submit_approval` |

`kept` skill: capture-first, the daily flow, which note-search tool fits which question,
habit design and groups, block-level notes, asks, gated docs and jobs, calendar
etiquette, and honesty rules.

## Security

- Sign-in is OAuth 2.1 with PKCE, in your browser, with a one-time email code. No
  passwords, no API keys.
- Config files only ever contain the server URL. No secrets are stored in your agent's
  config, and none are needed.
- Access tokens are scoped and short-lived; refresh tokens rotate, and reuse is detected
  and revoked. Every tool call is scope-checked, rate-limited, and audited.
- Disconnect any agent at any time: Kept app → Settings → AI Agents → Connected agents →
  Disconnect. Revocation is immediate and cascades to all tokens for that agent.

## License

MIT © Thesis Labs LLC · see [LICENSE](LICENSE).
