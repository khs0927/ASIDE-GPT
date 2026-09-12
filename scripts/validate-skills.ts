import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function main(): Promise<void> {
  const root = join(process.cwd(), "plugin", "skills");
  const entries = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (entries.length === 0) {
    throw new Error("No skill directories found");
  }

  for (const name of entries) {
    const path = join(root, name, "SKILL.md");
    const source = await readFile(path, "utf8");
    if (!source.startsWith("---\n")) {
      throw new Error(`${path}: missing YAML front matter`);
    }
    const end = source.indexOf("\n---\n", 4);
    if (end < 0) {
      throw new Error(`${path}: unterminated YAML front matter`);
    }
    const frontMatter = source.slice(4, end).split("\n");
    const metadata = new Map(
      frontMatter
        .map((line) => line.match(/^([a-z-]+):\s*(.*)$/))
        .filter((match): match is RegExpMatchArray => match !== null)
        .map((match) => [match[1], match[2]] as const),
    );
    if (metadata.get("name") !== name) {
      throw new Error(`${path}: front matter name must be ${name}`);
    }
    if ((metadata.get("description") ?? "").length < 20) {
      throw new Error(`${path}: description is too short`);
    }
    const body = source.slice(end + 5);
    for (const forbidden of ["ASIDE_GPT_NODE_SECRET", "localhost", "127.0.0.1"]) {
      if (body.includes(forbidden)) {
        throw new Error(`${path}: active skill contains forbidden local-runtime reference ${forbidden}`);
      }
    }
    if (!body.includes("confirmation") && !body.includes("confirm")) {
      throw new Error(`${path}: missing confirmation guidance`);
    }
  }

  console.log(`Validated ${entries.length} skill(s).`);
}

void main();
