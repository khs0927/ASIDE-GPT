import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

test("Aside remote adapter contract does not invent transport or credentials", async () => {
  const source = await readFile(
    join(process.cwd(), "packages", "providers", "remote-contract.ts"),
    "utf8",
  );

  assert.match(source, /interface AsideRemoteAdapter/);
  assert.match(source, /submitTask/);
  assert.match(source, /getTask/);
  assert.match(source, /respondToInput/);
  assert.match(source, /cancelTask/);
  assert.match(source, /getResult/);
  assert.doesNotMatch(source, /https?:\/\//i);
  assert.doesNotMatch(source, /bearer\s+[A-Za-z0-9._-]+/i);
  assert.doesNotMatch(source, /localhost|127\.0\.0\.1/);
});
