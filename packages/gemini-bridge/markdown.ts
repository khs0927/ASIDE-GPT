/**
 * In-page DOM -> Markdown conversion for a rendered Gemini response.
 *
 * Kept as plain JavaScript source (not a TS function) so that no transpiler
 * helper leaks into the page when it is sent through page.evaluate().
 * Evaluates to `(element) => ({ markdown, sources })`.
 */
export const DOM_TO_MARKDOWN_SOURCE = String.raw`(root) => {
  const BT = String.fromCharCode(96);
  const FENCE = BT + BT + BT;
  const sources = [];
  const inline = (node) => {
    if (node.nodeType === 3) return node.textContent.replace(/\s+/g, " ");
    if (node.nodeType !== 1) return "";
    const tag = node.tagName.toLowerCase();
    if (tag === "br") return "\n";
    if (tag === "button" || tag === "mat-icon" || tag === "svg" || tag === "sources-carousel-inline") return "";
    const inner = () => Array.from(node.childNodes).map(inline).join("");
    if (tag === "code") return BT + node.textContent + BT;
    if (tag === "strong" || tag === "b") { const t = inner().trim(); return t ? "**" + t + "**" : ""; }
    if (tag === "em" || tag === "i") { const t = inner().trim(); return t ? "*" + t + "*" : ""; }
    if (tag === "a") {
      const href = node.getAttribute("href") || "";
      const t = inner().trim();
      if (/^https?:/.test(href)) { if (!sources.includes(href)) sources.push(href); return "[" + (t || href) + "](" + href + ")"; }
      return t;
    }
    return inner();
  };
  const codeLanguage = (pre) => {
    const code = pre.querySelector("code");
    const cls = (code && code.className) || "";
    const m = cls.match(/language-([\w+#-]+)/);
    if (m) return m[1];
    const block = pre.closest("code-block, .code-block");
    const label = block && block.querySelector(".code-block-decoration span, .code-block-decoration");
    return label ? label.textContent.trim().toLowerCase().split(/\s+/)[0] : "";
  };
  const table = (el) => {
    const rows = Array.from(el.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.children).map((c) => inline(c).trim().replace(/\|/g, "\\|")));
    if (rows.length === 0) return "";
    const width = Math.max(...rows.map((r) => r.length));
    const pad = (r) => r.concat(Array(width - r.length).fill(""));
    const line = (r) => "| " + pad(r).join(" | ") + " |";
    return [line(rows[0]), line(Array(width).fill("---")), ...rows.slice(1).map(line)].join("\n");
  };
  const list = (el, depth) => {
    const ordered = el.tagName.toLowerCase() === "ol";
    let n = Number(el.getAttribute("start") || 1);
    return Array.from(el.children).filter((li) => li.tagName.toLowerCase() === "li").map((li) => {
      const marker = ordered ? (n++) + "." : "-";
      const own = [];
      const nested = [];
      for (const child of li.childNodes) {
        const t = child.nodeType === 1 ? child.tagName.toLowerCase() : "";
        if (t === "ul" || t === "ol") nested.push(list(child, depth + 1));
        else if (t === "p") own.push(inline(child).trim());
        else own.push(inline(child));
      }
      const indent = "  ".repeat(depth);
      const text = own.join(" ").replace(/\s+/g, " ").trim();
      return [indent + marker + " " + text, ...nested].join("\n");
    }).join("\n");
  };
  const block = (el) => {
    const out = [];
    for (const node of el.childNodes) {
      if (node.nodeType === 3) { const t = node.textContent.trim(); if (t) out.push(t); continue; }
      if (node.nodeType !== 1) continue;
      const tag = node.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) out.push("#".repeat(Number(tag[1])) + " " + inline(node).trim());
      else if (tag === "p") { const t = inline(node).trim(); if (t) out.push(t); }
      else if (tag === "pre") out.push(FENCE + codeLanguage(node) + "\n" + node.textContent.replace(/\n$/, "") + "\n" + FENCE);
      else if (tag === "ul" || tag === "ol") out.push(list(node, 0));
      else if (tag === "table") out.push(table(node));
      else if (tag === "blockquote") out.push(block(node).split("\n").map((l) => "> " + l).join("\n"));
      else if (tag === "hr") out.push("---");
      else if (tag === "button" || tag === "mat-icon" || tag === "svg" || node.classList.contains("code-block-decoration")) continue;
      else if (node.querySelector("p, pre, ul, ol, table, h1, h2, h3, h4, h5, h6, blockquote, hr")) { const t = block(node); if (t) out.push(t); }
      else { const t = inline(node).trim(); if (t) out.push(t); }
    }
    return out.join("\n\n");
  };
  return { markdown: block(root).replace(/\n{3,}/g, "\n\n").trim(), sources };
}`;
