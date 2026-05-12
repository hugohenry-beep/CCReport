import OpenAI from "openai";
import type { Metrics } from "../types";

export async function rewriteAsNarrative(templatedMd: string, metrics: Metrics): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const system = `You rewrite a templated business reporting document into an email-friendly summary that the user will paste directly into Outlook or Gmail.
RULES:
- Preserve EVERY number, percentage, and dollar amount EXACTLY as written. Never invent figures.
- Output must be optimised for copy/paste into an email body. No Markdown tables. No code fences.
- Convert EVERY Markdown table in the input into a bullet list — one bullet per row, with the row's key columns inlined (e.g. "- Stage name — 12 (34.5%)"). Use sub-bullets only when a row genuinely has more than two or three values worth separating.
- Keep the "##" section headings as-is — they render as bold lines in rich email and read fine in plain text.
- Prefer short, scannable bullets over dense prose paragraphs. One bullet = one fact. Period-over-period comparisons stay one line each (e.g. "- Inbound leads: 1,234 (▲ 12.3% vs prior).").
- Where the templated text shows a comparison vs prior period, keep the comparison on the same bullet as the metric it describes.
- Use a confident, concise business-update tone — no fluff, no clichés ("synergy", "dive deep", etc.).
- Do not add commentary or speculation about causes; stick to what the data shows.
- Output Markdown only. Do not wrap in backticks.`;

  const user = `Here is the templated report. Rewrite it into an email-friendly bullet-list summary following the rules. The raw metrics object is also provided for reference (do not invent any values not present in either).

# Templated report
${templatedMd}

# Raw metrics (JSON)
${JSON.stringify(metrics, null, 2)}`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    // Note: omit `temperature` — newer reasoning models (gpt-5.x, o-series)
    // only accept the default of 1 and 400 on any other value.
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned empty content");
  return content;
}
