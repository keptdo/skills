#!/usr/bin/env node
/**
 * Refresh catalog/consumer-mcp.json from the consumer Kept source tree.
 * Run from that tree's apps/mcp directory:
 *
 *   KEPT_CONSUMER_SOURCE=/path/to/kept KEPT_SKILLS_ROOT=/path/to/skills \
 *     node --import tsx /path/to/skills/scripts/generate-catalog.mjs
 *
 * Does not talk to mcp.kept.do. Candidate catalogs stay unpublished until
 * the matching MCP deploy.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SOURCE_RELATIVE_FILES = [
  "apps/mcp/src/tools/catalog.ts",
  "apps/mcp/src/tools/catalog-extra.ts",
  "apps/mcp/src/tools/catalog-parity.ts",
  "apps/mcp/src/tools/catalog-jobs.ts",
  "apps/mcp/src/tools/catalog-ranges.ts",
  "apps/mcp/src/tools/registry.ts",
  "apps/mcp/src/auth/scopes.ts",
  "apps/mcp/README.md",
  "apps/mcp/test/unit/catalog-complete.test.ts",
  "apps/web/lib/marketing/agent-setup-prompt.ts",
  "packages/shared/src/tool-manifest.mjs",
  "packages/shared/src/habit-groups.ts",
];

const sourceDirectory = process.env.KEPT_CONSUMER_SOURCE?.trim();
if (!sourceDirectory) {
  throw new Error("Set KEPT_CONSUMER_SOURCE to the consumer Kept checkout.");
}
const sourceRoot = resolve(sourceDirectory);

const skillsRoot = resolve(
  process.env.KEPT_SKILLS_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), ".."),
);

const catalogModule = await import(
  pathToFileURL(join(sourceRoot, "apps/mcp/src/tools/catalog.ts")).href,
);
const jobsModule = await import(
  pathToFileURL(join(sourceRoot, "apps/mcp/src/tools/catalog-jobs.ts")).href,
);
const registryModule = await import(
  pathToFileURL(join(sourceRoot, "apps/mcp/src/tools/registry.ts")).href,
);
const manifestModule = await import(
  pathToFileURL(join(sourceRoot, "packages/shared/src/tool-manifest.mjs")).href,
);

const { CATALOG, catalogForFlags, SELF_KNOWLEDGE_TOOL_NAME } = catalogModule;
const { JOB_TOOL_NAMES } = jobsModule;
const { toolInputJsonSchema, toolDescriptor } = registryModule;
const { ASSISTANT_MCP_PARITY, ASSIGNED_TO_MCP_TOOL_NAMES } = manifestModule;

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function gitHead(cwd) {
  return execFileSync("git", ["-C", cwd, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}
const sourceCommit = process.env.KEPT_CONSUMER_COMMIT?.trim() || gitHead(sourceRoot);
if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error("An exact source commit is required.");

const jobNames = [...JOB_TOOL_NAMES].sort();
const defaultNames = catalogForFlags(false, false).map((tool) => tool.name);
const fullNames = CATALOG.map((tool) => tool.name);
const defaultSet = new Set(defaultNames);

const tools = CATALOG.map((tool) => ({
  name: tool.name,
  title: tool.annotations.title,
  description: tool.description,
  requiredScopes: [...tool.requiredScopes],
  // Omission has protocol meaning. Preserve the actual wire annotations.
  annotations: { ...tool.annotations },
  defaultOff: !defaultSet.has(tool.name),
  inputSchema: toolInputJsonSchema(tool),
}));

const snapshot = {
  unpublished: true,
  surface: "consumer",
  endpoint: "https://mcp.kept.do/mcp",
  notEndpoint: "https://mcp.enterprise.kept.do/mcp",
  counts: {
    full: fullNames.length,
    default: defaultNames.length,
  },
  gated: {
    cloudAgentsMcp: {
      env: "FEATURE_CLOUD_AGENTS_MCP",
      enabledValue: "1",
      hiddenAs: "unknown_tool",
      tools: jobNames,
    },
    selfKnowledge: {
      flag: "feature.selfKnowledge",
      tool: SELF_KNOWLEDGE_TOOL_NAME,
      scope: "profile:read",
      hiddenAs: "unknown_tool",
    },
  },
  scopes: {
    healthRead: "health:read",
    healthReadInOneClickPresets: false,
    cloudAgentsAdvertised: false,
    cloudAgentsInDefaultGrant: false,
  },
  deletion: {
    mcpDeleteTools: false,
    accountDeletion: "Kept iOS/Mac Settings → Delete account only",
  },
  assistantMcpParity: ASSISTANT_MCP_PARITY,
  assignedToMcpToolNames: [...ASSIGNED_TO_MCP_TOOL_NAMES],
  habitGroupTools: [
    "kept_list_habit_groups",
    "kept_create_habit_group",
    "kept_update_habit_group",
    "kept_reorder_habit_groups",
  ],
  source: {
    commit: sourceCommit,
    filesMatchCommit: true,
    note: "Every catalog input matches this commit; deployed discovery is verified separately.",
    files: Object.fromEntries(
      SOURCE_RELATIVE_FILES.map((relative) => {
        const committed = execFileSync("git", ["-C", sourceRoot, "show", `${sourceCommit}:${relative}`]);
        const actual = sha256(join(sourceRoot, relative));
        if (createHash("sha256").update(committed).digest("hex") !== actual) {
          throw new Error(`Uncommitted catalog input: ${relative}`);
        }
        return [relative, actual];
      }),
    ),
  },
  tools,
};

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical)}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`)}}`;
  return JSON.stringify(value);
}
const verificationPath = join(skillsRoot, "catalog/deployment-verification.json");
if (existsSync(verificationPath)) {
  const verified = JSON.parse(readFileSync(verificationPath, "utf8"));
  const descriptors = catalogForFlags(false, false).map(toolDescriptor).sort((a, b) => a.name.localeCompare(b.name));
  const descriptorSHA256 = createHash("sha256").update(canonical(descriptors)).digest("hex");
  if (verified.pass !== true || verified.endpoint !== snapshot.endpoint || verified.defaultTools !== 80
      || verified.fullCatalogEnabled !== false || verified.catalogSourceCommit !== snapshot.source.commit
      || canonical(verified.catalogInputSHA256) !== canonical(snapshot.source.files)
      || verified.descriptorSHA256 !== descriptorSHA256) {
    throw new Error("Existing live discovery receipt does not match this source catalog.");
  }
  snapshot.unpublished = false;
  snapshot.deploymentVerification = "catalog/deployment-verification.json";
}

mkdirSync(join(skillsRoot, "catalog"), { recursive: true });
const outPath = join(skillsRoot, "catalog/consumer-mcp.json");
writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
process.stdout.write(`wrote ${outPath} (${snapshot.counts.full} full / ${snapshot.counts.default} default)\n`);
