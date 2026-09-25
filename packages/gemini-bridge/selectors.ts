/**
 * Every gemini.google.com DOM assumption lives here.
 *
 * When Google changes the page, fix this file only. Each entry is a list of
 * candidate CSS selectors tried in order; English and Korean UI labels are
 * both covered where the selector depends on visible text or aria-labels.
 */
export const SELECTORS = {
  /** Prompt editor (Quill contenteditable inside <rich-textarea>). */
  input: [
    "rich-textarea .ql-editor[contenteditable='true']",
    "div.ql-editor[contenteditable='true']",
    "div[contenteditable='true'][role='textbox']",
  ],
  send: [
    "button.send-button:not([disabled])",
    "button[aria-label='Send message']",
    "button[aria-label='메시지 보내기']",
    "button[aria-label*='Send']",
    "button[aria-label*='보내기']",
  ],
  /** Visible only while a response is being generated. */
  stop: [
    "button[aria-label='Stop response']",
    "button[aria-label='대답 생성 중지']",
    "button.send-button.stop",
    "button[aria-label*='Stop']",
    "button[aria-label*='중지']",
  ],
  /** One element per model turn. */
  response: ["model-response"],
  /** Rendered markdown container inside a model turn. */
  responseBody: ["message-content .markdown", ".model-response-text .markdown", "message-content"],
  newChat: [
    "[data-test-id='new-chat-button'] a",
    "[data-test-id='new-chat-button']",
    "a[aria-label='New chat']",
    "a[aria-label='새 채팅']",
  ],
  modePicker: [
    "[data-test-id='bard-mode-menu-button']",
    "button[aria-label*='mode picker']",
    "button[aria-label*='모드 선택']",
  ],
  modeItem: ["[role='menuitemradio']", "[role='menuitem']", "mat-option"],
  fileInput: ["input[type='file']"],
  uploadMenu: [
    "button[aria-label*='Upload']",
    "button[aria-label*='upload']",
    "button[aria-label*='업로드']",
    "button[aria-label*='파일']",
  ],
  /** Present when the profile is signed out. */
  signIn: [
    "a[href*='accounts.google.com/ServiceLogin']",
    "a[href*='accounts.google.com/v3/signin']",
    "a[aria-label='Sign in']",
    "a[aria-label='로그인']",
  ],
} as const satisfies Record<string, readonly string[]>;

/** Visible text that means the account hit a usage limit or cooldown. */
export const LIMIT_PATTERNS: readonly RegExp[] = [
  /reached your (?:daily |usage )?limit/i,
  /you've reached/i,
  /try again (?:later|tomorrow|in)/i,
  /한도(?:에|를)? (?:도달|초과)/,
  /나중에 다시 (?:시도|사용)/,
];

export const GEMINI_ORIGIN = "https://gemini.google.com";
