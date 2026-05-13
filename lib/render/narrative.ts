import OpenAI from "openai";
import type { Metrics } from "../types";
import type { NarrativeFacts } from "./executiveFacts";
import { validateNumericFidelity } from "./validateNumbers";

interface LlmZones {
  insights: string;
  forwardDeals: string;
}

const SYSTEM_PROMPT = `You are a digital marketing operator polishing the weekly inbound-lead recap. The reader is an executive who wants a confident, plain-English narrative — the rhythm of "X total leads this week, Y of which came from paid search, and Z from direct and organic" — not a scorecard.

You rewrite ONLY two zones inside the deterministic Markdown briefing:

  <!-- LLM:INSIGHTS -->...<!-- /LLM:INSIGHTS -->
  <!-- LLM:FORWARD_DEALS -->...<!-- /LLM:FORWARD_DEALS -->

Tone reference (this is the voice to match):
> 75 total inbound leads this week — 44 from paid search and 31 from direct and organic traffic.
> All active regions except the Nordics and Australia saw lead volume this period.
> The US and UK led week-over-week growth on lead volume.
> LATAM had its strongest week in the comparison window with 11 inbound leads, 6 of them from paid search.
> The LATAM leads came from Colombia, Argentina, Brazil, and Chile.

HARD RULES (failure = output rejected, programmatic version shipped instead):
1. Every numeric token (digits, currency, percents) in your rewrites MUST already appear in the structured facts or the supplied whitelist. You may rearrange or rephrase around them. You may NOT invent, round, average, or extrapolate numbers.
2. Preserve direction. If facts say a region declined, do not say it "grew" or "led".
3. INSIGHTS zone — 4 to 6 short sentences in plain prose (no bullets, no headings). Cover, in order: the source split (paid search vs direct/organic), region-group coverage, top-performing region groups (only when facts.hasPrior is true and topMoverRegions is non-empty), the spotlight region (only when facts.insights.spotlight is non-null), and the spotlight region's constituent countries (only when the spotlight is non-null and has countries).
4. FORWARD_DEALS zone — when facts.advancedStageDeals is empty, output exactly: "_No leads progressed past Closed-Won this period._". When non-empty: one intro sentence stating the stage(s) involved, then one bullet per deal in the format "- {company} ({country})". Use exactly the company and country strings from facts.advancedStageDeals. No deal names, no amounts, no stage names beyond the intro.
5. No causation hypotheses: ban "driven by", "because of", "due to", "the reason is". Pattern observations ("the strongest week in the comparison window", "led growth") are fine.
6. No fluff: ban "synergy", "leverage", "dive deep", "going forward", "in conclusion", "moving the needle", "robust", "exciting".
7. No hedging: ban "appears to", "seems to", "could potentially", "may suggest", "it looks like".
8. Output JSON ONLY in this exact shape — no prose outside JSON, no markdown fences:
{
  "insights": "string (4-6 sentences, newline-separated, plain prose)",
  "forwardDeals": "string (intro sentence + bullet list, OR the empty-state line)"
}`;

export async function enhanceExecutiveNarrative(
  programmaticMd: string,
  facts: NarrativeFacts,
  metrics: Metrics,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("Executive enhancement fell back: no OPENAI_API_KEY configured");
    return programmaticMd;
  }

  let content: string;
  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const factsForPrompt = { ...facts, numericWhitelist: undefined };
    const user = buildUserPrompt(programmaticMd, factsForPrompt, facts.numericWhitelist, metrics);

    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    });
    content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      console.warn("Executive enhancement fell back: empty LLM response");
      return programmaticMd;
    }
  } catch (err) {
    console.warn("Executive enhancement fell back: LLM call failed", err);
    return programmaticMd;
  }

  let zones: LlmZones;
  try {
    zones = parseZones(content);
  } catch (err) {
    console.warn("Executive enhancement fell back: malformed JSON", err);
    return programmaticMd;
  }

  const stitched = stitchZones(programmaticMd, zones);

  for (const [zoneName, body] of Object.entries(extractZoneBodies(stitched))) {
    const result = validateNumericFidelity(body, facts.numericWhitelist);
    if (!result.ok) {
      console.warn(`Executive enhancement fell back: validator rejected ${zoneName}`, result.offending);
      return programmaticMd;
    }
  }

  return stitched;
}

function buildUserPrompt(
  programmaticMd: string,
  factsForPrompt: object,
  whitelist: string[],
  metrics: Metrics,
): string {
  const factsJson = JSON.stringify(factsForPrompt, null, 2);
  const metricsJson = JSON.stringify(metrics, null, 2);
  return `# Programmatic briefing (numbers are immutable)

${programmaticMd}

# Structured facts (numbers you may reference)

${factsJson}

# Raw metrics snapshot (for context only)

${metricsJson}

# Permitted numeric tokens (whitelist — any token you emit that looks like a number must be in this list)

${whitelist.join(" | ")}

Rewrite the INSIGHTS and FORWARD_DEALS zones. Return JSON only — no prose outside the JSON object.`;
}

function parseZones(content: string): LlmZones {
  const parsed = JSON.parse(content) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM JSON is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const insights = obj.insights;
  const forwardDeals = obj.forwardDeals;
  if (typeof insights !== "string" || insights.length === 0) {
    throw new Error("insights missing or not a non-empty string");
  }
  if (typeof forwardDeals !== "string" || forwardDeals.length === 0) {
    throw new Error("forwardDeals missing or not a non-empty string");
  }
  return {
    insights: insights.trim(),
    forwardDeals: forwardDeals.trim(),
  };
}

function stitchZones(md: string, zones: LlmZones): string {
  return md
    .replace(
      /<!-- LLM:INSIGHTS -->[\s\S]*?<!-- \/LLM:INSIGHTS -->/,
      `<!-- LLM:INSIGHTS -->\n${zones.insights}\n<!-- /LLM:INSIGHTS -->`,
    )
    .replace(
      /<!-- LLM:FORWARD_DEALS -->[\s\S]*?<!-- \/LLM:FORWARD_DEALS -->/,
      `<!-- LLM:FORWARD_DEALS -->\n${zones.forwardDeals}\n<!-- /LLM:FORWARD_DEALS -->`,
    );
}

function extractZoneBodies(stitched: string): Record<string, string> {
  const out: Record<string, string> = {};
  const names = ["INSIGHTS", "FORWARD_DEALS"] as const;
  for (const name of names) {
    const re = new RegExp(`<!-- LLM:${name} -->([\\s\\S]*?)<!-- /LLM:${name} -->`);
    const m = stitched.match(re);
    out[name] = m ? m[1] : "";
  }
  return out;
}
