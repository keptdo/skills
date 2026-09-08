# keptdo/skills

Public Claude/Cursor plugin for **consumer** Kept MCP (`https://mcp.kept.do/mcp`).

Do not document or install Kept Workplace MCP (`https://mcp.enterprise.kept.do/mcp`)
here. Do not add enterprise tool names.

Catalog bytes live in `catalog/consumer-mcp.json`. Refresh from `apps/mcp` in the
consumer tree (tsx resolves workspace packages from that cwd):

```sh
cd "$KEPT_CONSUMER_SOURCE/apps/mcp"
KEPT_CONSUMER_SOURCE="$KEPT_CONSUMER_SOURCE" KEPT_CONSUMER_COMMIT="$REVIEWED_SOURCE_SHA" \
  KEPT_SKILLS_ROOT=/path/to/skills \
  node --import tsx /path/to/skills/scripts/generate-catalog.mjs
KEPT_CONSUMER_SOURCE="$KEPT_CONSUMER_SOURCE" node /path/to/skills/scripts/check-catalog-parity.mjs
```

Every input must match the pinned source commit. Leave `unpublished: true` until
the matching MCP deployment and authenticated default catalog are verified. No secrets in this
repo. Setup copy stays aligned with `apps/web/lib/marketing/agent-setup-prompt.ts`.

The deployment receipt pins exact default wire descriptors and source input hashes.
Keep omitted annotations omitted. Do not turn omitted protocol hints into false.
A refresh refuses a stale receipt instead of silently calling a new catalog live.
