import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

test("all skills have official-style metadata and mobile-only guidance", async () => {
  const root = join(process.cwd(), "plugin", "skills");
  const dirs = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  assert.equal(dirs.length, 7);
  for (const dir of dirs) {
    const source = await readFile(join(root, dir.name, "SKILL.md"), "utf8");
    assert.match(source, new RegExp(`name: ${dir.name}`));
    assert.match(source, /confirmation|confirm/);
    assert.doesNotMatch(source, /ASIDE_GPT_NODE_SECRET|localhost|127\.0\.0\.1/);
  }
});
