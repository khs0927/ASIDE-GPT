# ASIDE-GPT skills

Each directory contains one OpenAI-style `SKILL.md` with YAML front matter and workflow instructions. Skills describe the user goal, the executor-selection boundary, safe authentication and approval behavior, verification, and evidence requirements. They do not expose a local browser command or ask the user to run one.

- `browser-task`: general browser-task lifecycle and executor selection.
- `research`: read-only research, comparison, and status checks.
- `authenticated-web`: secure sign-in and authenticated dashboards.
- `shopping`: price and condition comparisons with a hard purchase boundary.
- `multi-site-workflow`: connected-app plus cloud-browser workflows.
