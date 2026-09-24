import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

const skillPath = join(process.cwd(), "plugin", "skills", "gemini-web", "SKILL.md");

test("Gemini web skill keeps Aside as the executor and avoids credential replay", async () => {
  const source = await readFile(skillPath, "utf8");

  assert.match(source, /https:\/\/gemini\.google\.com\//);
  assert.match(source, /provider: gemini-web/);
  assert.match(source, /executor: aside/);
  assert.match(source, /confirmation/i);
  assert.match(source, /do not enter a rapid retry loop/i);

  assert.doesNotMatch(source, /__Secure-1PSID/);
  assert.doesNotMatch(source, /batchexecute/i);
  assert.doesNotMatch(source, /StreamGenerate/i);
});
