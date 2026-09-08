# Consumer MCP plugin synchronization

This synchronization was prepared on September 8, 2026 from public repository commit
`6d3a4d14818fd32c0fac2f2d8a891775c1830e9e`. Its Git history and pull request record
the publication of the plugin revision; the evidence below records the consumer
server catalog verified on that date.

The generated catalog has 80 default tools and 86 with both optional families
available. All 12 catalog input files match committed consumer source
`32911df3b381b20963c974031edb9f4e4c1f3d06` byte for byte. Those inputs also match
runtime commit `d00d969e2abe0ed787c7b200c844f12d82457656`, which is deployed to
`https://mcp.kept.do/mcp`. The source pin is a committed snapshot, not a dirty HEAD.

Fresh authenticated discovery on `2026-09-08T09:30:36.378Z` returned all 80 default
tools, with names, descriptions, input schemas and annotations matching the source
exactly. The MCP SDK client held only `profile:read`, made no business tool calls,
and its own issued tokens were revoked with a subsequent 401 readback. The fixture
used the documented generated-OTP path through normal consent and PKCE; this proof
does not establish real email delivery. See `catalog/deployment-verification.json`.

The catalog's `unpublished: false` records this verified server availability.
No optional flag should be enabled merely to obtain a count.
The five job tools and product-documentation search are separately gated. The full
86 count is a source/catalog capability count; it does not claim all 86 are enabled
for every production account.

The README, skill, generated catalog and validation scripts form one synchronization.
The deployment receipt is retained alongside the catalog. This plugin never targets
Kept Workplace.

The sync documents the four habit-group tools, Habit V2 fields and `groupId`,
block-level note reads/edits, Assigned-to/Ask tools, day/graph/range reads, gated
product-documentation search and Cloud Agents jobs. Installation configuration,
identity assets and license are preserved.
