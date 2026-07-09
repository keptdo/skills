# Kept for AI agents

[Kept](https://kept.do) is a personal OS · notes, tasks, calendar, goals, habits, and
focus. This repo connects Kept to your AI agent: a remote MCP server at
`https://mcp.kept.do/mcp` plus a skill that teaches the agent Kept's fast-capture and
daily-planning idioms.

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
`/plugin install kept@kept`, then `/reload-plugins`.

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

| Piece             | What it does                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kept` MCP server | Over 60 tools across capture, tasks, notes (keyword + semantic search, the knowledge graph), calendar (including invites and RSVPs), goals, habits, memory, and daily planning |
| `kept` skill      | Teaches the agent capture-first, the daily flow, which note-search tool fits which question, calendar etiquette, and honesty rules                                         |

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
