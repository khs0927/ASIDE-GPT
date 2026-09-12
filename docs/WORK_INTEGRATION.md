# ChatGPT Work integration

## What the repository provides

ASIDE-GPT is a skills-only plugin package. Its `SKILL.md` files tell Work how to classify a request, select an executor, protect credentials, handle untrusted web content, pause before risky actions, verify outcomes, and report evidence. The TypeScript packages provide testable versions of the same boundaries.

The plugin does not invoke Work’s native cloud browser through an MCP tool. OpenAI’s current documentation describes Work as selecting a connected plugin/app, the cloud browser, or both based on the request; no private browser endpoint is required by this design.

## Expected Work behavior

- A Gmail, calendar, GitHub, or document task should use the matching connected app when available.
- A general website, dashboard, or web-only operation should use Work’s native cloud browser.
- A cross-service request should be planned as a hybrid workflow with minimal data passed between sources.
- Work should ask for sign-in through its secure browser UI, never through secrets pasted into chat.
- Work should ask before consequential actions and should pause when the user must make a decision.
- A task report should include evidence rather than only a success assertion.

The user should not need to specify “browser,” “MCP,” or the exact executor in every request. If an app is unavailable or a site blocks browser automation, Work may ask for a supported alternative or report the limitation.

## Mobile setup

1. Sign in to ChatGPT on the iPhone or Android app with a plan/workspace that has Work and the desired plugin/app features.
2. Install or enable the ASIDE-GPT skills package through the supported plugin directory/submission flow.
3. Connect the official apps needed for structured work, such as email or GitHub, using their OAuth flow.
4. Start a Work task from mobile and describe the goal, constraints, and approval boundary in natural language.
5. Complete only the sign-in, MFA, CAPTCHA, or confirmation UI that Work presents.

Cloud-browser availability, site support, session lifetime, confirmation settings, and background continuation are host-product features and can vary by account, workspace, rollout, and site. This repository does not promise them independently.

## Official references

- [ChatGPT browser and cloud-browser behavior](https://learn.chatgpt.com/docs/browser)
- [ChatGPT plugins](https://learn.chatgpt.com/docs/plugins)
- [MCP server concepts](https://developers.openai.com/plugins/concepts/mcp-server)
- [Plugin skills](https://developers.openai.com/plugins/concepts/skills)
