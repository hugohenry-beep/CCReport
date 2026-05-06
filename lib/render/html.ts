import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export async function markdownToHtml(md: string): Promise<string> {
  return marked.parse(md) as string;
}

export async function fullHtmlDocument(md: string, title: string): Promise<string> {
  const body = await markdownToHtml(md);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; max-width: 880px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1d23; line-height: 1.55; }
  h1 { font-size: 1.85rem; margin-bottom: 0.25rem; border-bottom: 2px solid #4f46e5; padding-bottom: 0.5rem; }
  h2 { font-size: 1.35rem; margin-top: 2rem; color: #1a1d23; }
  h3 { font-size: 1.05rem; margin-top: 1.25rem; }
  table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 1rem; font-size: 0.92rem; }
  th, td { border: 1px solid #d4d7dd; padding: 0.5rem 0.7rem; text-align: left; }
  th { background: #f4f5f8; font-weight: 600; }
  ul { padding-left: 1.4rem; }
  li { margin: 0.25rem 0; }
  hr { border: none; border-top: 1px solid #d4d7dd; margin: 2rem 0 1rem; }
  blockquote { border-left: 3px solid #4f46e5; padding-left: 1rem; color: #5a6370; margin: 0.5rem 0; }
  strong { color: #0b0d10; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}
