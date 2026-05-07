import OpenAI from "openai";
import type { Metrics } from "../types";

export async function rewriteAsNarrative(templatedMd: string, metrics: Metrics): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const system = `You rewrite a templated business reporting document into a richer, more narrative version.
RULES:
- Preserve EVERY number, percentage, and dollar amount EXACTLY as written. Never invent figures.
- Keep the same Markdown section headings and tables.
- Replace bullet lists or terse statements with concise prose paragraphs where it adds clarity. Tables stay as tables.
- Use a confident, concise business-update tone — no fluff, no clichés ("synergy", "dive deep", etc.).
- Where the templated text shows a comparison vs prior period, weave the comparison naturally into the narrative.
- Do not add commentary or speculation about causes; stick to what the data shows.
- Output Markdown only. Do not wrap in backticks.`;

  const user = `Here is the templated report. Rewrite it into a narrative version following the rules. The raw metrics object is also provided for reference (do not invent any values not present in either).

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
