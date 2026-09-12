# Work-native browser

ChatGPT Work's native browser is an **explicit non-Aside fallback**, not the ASIDE-GPT primary provider.

ChatGPT Work owns its cloud computer, browser session, navigation, authentication UI, confirmation UI, and continuation behavior. ASIDE-GPT does not call an undocumented Cloud Browser endpoint.

Using this provider can be useful when the user explicitly asks to proceed without Aside, but the result must be labeled `non-Aside fallback`. It must never be reported as successful ASIDE-GPT/Aside browser execution.
