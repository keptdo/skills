import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = JSON.parse(readFileSync(join(root, "catalog/consumer-mcp.json"), "utf8"));

function check(mutate) {
  const fixture = mkdtempSync(join(tmpdir(), "kept-skill-parity-"));
  try {
    for (const folder of ["scripts", "catalog", "skills/kept"]) mkdirSync(join(fixture, folder), { recursive: true });
    for (const file of ["scripts/check-catalog-parity.mjs", "README.md", "skills/kept/SKILL.md"]) {
      copyFileSync(join(root, file), join(fixture, file));
    }
    const catalog = structuredClone(source);
    const verified = JSON.parse(readFileSync(join(root, "catalog/deployment-verification.json"), "utf8"));
    mutate(catalog, verified);
    writeFileSync(join(fixture, "catalog/consumer-mcp.json"), JSON.stringify(catalog));
    writeFileSync(join(fixture, "catalog/deployment-verification.json"), JSON.stringify(verified));
    const env = { ...process.env };
    delete env.KEPT_CONSUMER_SOURCE;
    return spawnSync(process.execPath, [join(fixture, "scripts/check-catalog-parity.mjs")], { env, encoding: "utf8" });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test("both unpublished candidates and published catalogs pass the same parity gate", () => {
  for (const unpublished of [true, false]) {
    const result = check(catalog => { catalog.unpublished = unpublished; });
    assert.equal(result.status, 0, result.stderr);
  }
});

test("publication metadata must use an explicit boolean", () => {
  assert.notEqual(check(catalog => { catalog.unpublished = "false"; }).status, 0);
});

test("required-property order has no schema meaning", () => {
  const result = check(catalog => {
    catalog.unpublished = true; // This tests candidate shape; published evidence pins exact wire bytes.
    catalog.tools.find(tool => tool.name === "kept_create_habit").inputSchema.required.reverse();
  });
  assert.equal(result.status, 0, result.stderr);
});

test("source provenance cannot claim an uncommitted or malformed pin", () => {
  for (const mutate of [catalog => { catalog.source.commit = "HEAD"; }, catalog => { catalog.source.filesMatchCommit = false; }]) {
    assert.notEqual(check(mutate).status, 0);
  }
});

test("published catalog requires matching live default discovery without enabling optional flags", () => {
  for (const change of [
    proof => { proof.pass = false; }, proof => { proof.defaultTools = 76; },
    proof => { proof.fullCatalogEnabled = true; }, proof => { proof.descriptorSHA256 = "0".repeat(64); },
    proof => { proof.catalogSourceCommit = "0".repeat(40); }, proof => { proof.catalogInputSHA256 = {}; },
  ]) {
    assert.notEqual(check((catalog, proof) => { catalog.unpublished = false; change(proof); }).status, 0);
  }
});

test("a changed annotation cannot reuse the published discovery receipt", () => {
  assert.notEqual(check(catalog => {
    catalog.unpublished = false;
    catalog.tools.find(tool => !tool.defaultOff).annotations.destructiveHint = false;
  }).status, 0);
});

test("parity rejects wrong endpoint, duplicate tools, identity arguments and missing group assignment", () => {
  for (const mutate of [
    catalog => { catalog.endpoint = "https://mcp.enterprise.kept.do/mcp"; },
    catalog => { catalog.tools[1] = structuredClone(catalog.tools[0]); },
    catalog => { catalog.tools[0].inputSchema.properties.userId = { type: "string" }; },
    catalog => { delete catalog.tools.find(tool => tool.name === "kept_create_habit").inputSchema.properties.groupId; },
  ]) {
    const result = check(mutate);
    assert.notEqual(result.status, 0, result.stdout);
  }
});
