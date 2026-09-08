#!/usr/bin/env node
/**
 * Static consumer-catalog parity checks for keptdo/skills.
 * Uses catalog/consumer-mcp.json plus README.md and skills/kept/SKILL.md.
 * No network, no MCP deploy, no new packages.
 *
 * When KEPT_CONSUMER_SOURCE is set, also re-hashes the pinned source files
 * so a dirty integration tree cannot silently drift from this snapshot.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));
const catalogPath = join(root, "catalog/consumer-mcp.json");
const readme = readFileSync(join(root, "README.md"), "utf8");
const skill = readFileSync(join(root, "skills/kept/SKILL.md"), "utf8");
const docs = `${readme}\n${skill}`;
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const canonical = value => Array.isArray(value) ? `[${value.map(canonical)}]`
  : value && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`)}}`
  : JSON.stringify(value);

const failures = [];

function fail(message) {
  failures.push(message);
}

function mustInclude(haystack, needle, label = needle) {
  if (!haystack.includes(needle)) fail(`missing ${label}`);
}

function mustNotInclude(haystack, needle, label = needle) {
  if (haystack.includes(needle)) fail(`must not contain ${label}`);
}

function collectPropertyNames(schema, acc = new Set()) {
  if (!schema || typeof schema !== "object") return acc;
  if (schema.properties && typeof schema.properties === "object") {
    for (const [key, value] of Object.entries(schema.properties)) {
      acc.add(key);
      collectPropertyNames(value, acc);
    }
  }
  for (const key of ["items", "anyOf", "allOf", "oneOf"]) {
    const value = schema[key];
    if (Array.isArray(value)) value.forEach((item) => collectPropertyNames(item, acc));
    else if (value) collectPropertyNames(value, acc);
  }
  return acc;
}

if (catalog.surface !== "consumer") fail("snapshot surface must be consumer");
if (catalog.endpoint !== "https://mcp.kept.do/mcp") fail("snapshot endpoint must be consumer MCP");
if (catalog.notEndpoint !== "https://mcp.enterprise.kept.do/mcp") {
  fail("snapshot must name the enterprise endpoint as not this plugin");
}
if (catalog.counts.full !== 86) fail(`full count ${catalog.counts.full}, expected 86`);
if (catalog.counts.default !== 80) fail(`default count ${catalog.counts.default}, expected 80`);
if (typeof catalog.unpublished !== "boolean") {
  fail("snapshot unpublished must be an explicit boolean");
}
if (!/^[a-f0-9]{40}$/.test(catalog.source?.commit ?? "") || catalog.source?.filesMatchCommit !== true) {
  fail("catalog inputs must be pinned to an exact committed source");
}

const tools = catalog.tools;
const names = tools.map((tool) => tool.name);
if (new Set(names).size !== names.length) fail("duplicate tool names in snapshot");
if (names.length !== 86) fail(`snapshot tools ${names.length}, expected 86`);

const defaultOn = tools.filter((tool) => tool.defaultOff !== true).map((tool) => tool.name);
if (defaultOn.length !== 80) fail(`default-on tools ${defaultOn.length}, expected 80`);

const jobTools = catalog.gated.cloudAgentsMcp.tools;
const searchDocs = catalog.gated.selfKnowledge.tool;
const expectedOff = new Set([...jobTools, searchDocs]);
for (const tool of tools) {
  const off = expectedOff.has(tool.name);
  if (tool.defaultOff !== off) fail(`${tool.name} defaultOff=${tool.defaultOff}, expected ${off}`);
  if (!tool.name.startsWith("kept_")) fail(`non-kept tool ${tool.name}`);
  if (/kept_(delete|remove)_/.test(tool.name)) fail(`delete tool in snapshot: ${tool.name}`);
  const props = collectPropertyNames(tool.inputSchema);
  for (const identity of ["user_id", "userId", "uid", "sub", "account_id"]) {
    if (props.has(identity)) fail(`${tool.name} schema includes identity field ${identity}`);
  }
}

if (catalog.unpublished === false) {
  if (catalog.deploymentVerification !== "catalog/deployment-verification.json") {
    fail("published catalog requires the exact live discovery receipt");
  } else {
    try {
      const verified = JSON.parse(readFileSync(join(root, catalog.deploymentVerification), "utf8"));
      const descriptors = tools.filter(tool => !tool.defaultOff).map(tool => ({
        name: tool.name, description: tool.description,
        inputSchema: tool.inputSchema, annotations: tool.annotations,
      })).sort((a, b) => a.name.localeCompare(b.name));
      const digest = createHash("sha256").update(canonical(descriptors)).digest("hex");
      if (verified.pass !== true || verified.endpoint !== catalog.endpoint
          || verified.defaultTools !== 80 || verified.fullCatalogEnabled !== false
          || !/^[a-f0-9]{40}$/.test(verified.sourceCommit ?? "")
          || verified.catalogSourceCommit !== catalog.source.commit
          || canonical(verified.catalogInputSHA256) !== canonical(catalog.source.files)
          || verified.descriptorSHA256 !== digest) fail("live discovery receipt differs from catalog");
    } catch {
      fail("live discovery receipt missing or unreadable");
    }
  }
}

for (const name of [
  ...catalog.habitGroupTools,
  ...catalog.assignedToMcpToolNames,
  ...Object.values(catalog.assistantMcpParity),
  "kept_update_habit",
  "kept_create_habit",
  "kept_list_habits",
  "kept_search_docs",
]) {
  if (!names.includes(name)) fail(`snapshot missing ${name}`);
}

const byName = new Map(tools.map((tool) => [tool.name, tool]));
const createHabit = byName.get("kept_create_habit");
const updateHabit = byName.get("kept_update_habit");
const createProps = collectPropertyNames(createHabit.inputSchema);
const updateProps = collectPropertyNames(updateHabit.inputSchema);
for (const field of [
  "idempotency_key",
  "title",
  "category",
  "kind",
  "cadence",
  "anchorCue",
  "targetAction",
  "minimumAction",
  "recoveryPlan",
  "celebration",
  "reviewRule",
  "designBottleneck",
  "groupId",
  "goalId",
]) {
  if (!createProps.has(field)) fail(`kept_create_habit missing ${field}`);
}
for (const field of ["id", "label", "targetAction", "minimumAction", "recoveryPlan", "groupId"]) {
  if (!updateProps.has(field)) fail(`kept_update_habit missing ${field}`);
}
if (!Array.isArray(createHabit.inputSchema.required) || [...createHabit.inputSchema.required].sort().join() !== "category,title") {
  fail("kept_create_habit must keep legacy required title,category");
}

mustInclude(readme, "80 tools");
mustInclude(readme, "86");
mustInclude(readme, "https://mcp.kept.do/mcp");
mustInclude(readme, "/reload-plugins --force");
mustInclude(readme, "health:read");
mustInclude(readme, "FEATURE_CLOUD_AGENTS_MCP");
mustInclude(readme, "unknown_tool");
mustInclude(readme, "no delete tools");
mustInclude(readme, "not Kept Workplace");
mustNotInclude(readme, "Over 60 tools");
mustNotInclude(readme, "73 tools");
mustNotInclude(readme, "76 tools");
mustNotInclude(readme, "82-tool");
mustNotInclude(docs, "currently live on mcp.kept.do");
mustNotInclude(docs, "already deployed");
if (/"url": "https:\/\/mcp\.enterprise\.kept\.do/.test(readme)) {
  fail("README must not install the enterprise MCP URL");
}
if (/mcp add[^\n]*mcp\.enterprise\.kept\.do/.test(readme)) {
  fail("README must not add the enterprise MCP host");
}

for (const name of names) mustInclude(readme, name, `README tool ${name}`);

for (const name of [
  "kept_list_habit_groups",
  "kept_create_habit_group",
  "kept_update_habit_group",
  "kept_reorder_habit_groups",
  "kept_update_habit",
  "kept_note_blocks_read",
  "kept_note_blocks_edit",
  "kept_search_docs",
  "kept_assign_task",
  "kept_list_asks",
  "kept_update_ask",
  "kept_get_now",
  "kept_prioritize_day",
  "kept_get_briefing",
  "kept_create_job",
]) {
  mustInclude(skill, name, `SKILL.md ${name}`);
}

mustInclude(skill, "groupId");
mustInclude(skill, "targetAction");
mustInclude(skill, "health:read");
mustInclude(skill, "unknown_tool");
mustInclude(skill, "https://mcp.kept.do/mcp");
mustInclude(skill, "consumer");
if (/"url": "https:\/\/mcp\.enterprise\.kept\.do/.test(skill)) {
  fail("SKILL.md must not install the enterprise MCP URL");
}

const sourceRoot = process.env.KEPT_CONSUMER_SOURCE
  ? resolve(process.env.KEPT_CONSUMER_SOURCE)
  : "";
if (sourceRoot) {
  for (const [relative, expected] of Object.entries(catalog.source.files)) {
    const committed = execFileSync("git", ["-C", sourceRoot, "show", `${catalog.source.commit}:${relative}`]);
    if (createHash("sha256").update(committed).digest("hex") !== expected) {
      fail(`pinned commit hash drift ${relative}`);
    }
    const actual = createHash("sha256")
      .update(readFileSync(join(sourceRoot, relative)))
      .digest("hex");
    if (actual !== expected) fail(`source hash drift ${relative}`);
  }
}

if (failures.length) {
  process.stderr.write(`catalog parity failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  `catalog parity passed: ${catalog.counts.default} default / ${catalog.counts.full} full, unpublished=${catalog.unpublished}\n`,
);
