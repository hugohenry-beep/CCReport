import OpenAI from "openai";
import type { Metrics } from "../types";
import type { ExecutiveFacts } from "./executiveFacts";
import { validateNumericFidelity } from "./validateNumbers";

interface LlmZones {
  headline: string;
  tldr: string[];
  whatMoved: string;
  watch: string;
}

const SYSTEM_PROMPT = `You are a digital marketing analyst polishing an executive weekly briefing for a CRO/CMO/CEO who will read it on mobile in under 90 seconds.

You are given (a) a fully-rendered Markdown briefing whose numbers are the immutable source of truth, and (b) a structured facts object that mirrors those numbers. Your job is to rewrite the prose inside FOUR clearly-marked zones only:

  <!-- LLM:HEADLINE -->...<!-- /LLM:HEADLINE -->
  <!-- LLM:TLDR -->...<!-- /LLM:TLDR -->
  <!-- LLM:WHATMOVED -->...<!-- /LLM:WHATMOVED -->
  <!-- LLM:WATCH -->...<!-- /LLM:WATCH -->

HARD RULES (failure = output rejected, programmatic version shipped instead):
1. Every numeric token (digits, currency, percents, arrows ▲▼→) in your rewrites MUST already appear in the structured facts or the supplied whitelist. You may rearrange or rephrase around them. You may NOT invent, round, average, or extrapolate numbers.
2. Preserve the existing arrow direction. If facts say leads are ▼, do not write "improved" or "grew".
3. Keep each zone's role:
   - HEADLINE: one short sentence (under 25 words). Lead with the dominant business signal. Confident, plain-English. No "in this report" framing.
   - TLDR: 3 to 5 bullets. One fact per bullet. Each bullet pairs a number with its direction.
   - WHATMOVED: tight bullet list of movers. Do not editorialise about causes.
   - WATCH: bullet list of risks or actions. Action-oriented verbs. No causation speculation.
4. No fluff: ban "synergy", "leverage", "dive deep", "going forward", "in conclusion", "moving the needle", "robust", "exciting".
5. No hedging: ban "appears to", "seems to", "could potentially", "may suggest", "it looks like".
6. Frame as business outcomes, not metric names. Prefer "pipeline created" over "totalDealValue".
7. Output JSON ONLY in this exact shape — no prose outside JSON, no markdown fences:
{
  "headline": "string (no newlines, no surrounding quotes inside the value)",
  "tldr": ["string", "string", "..."],
  "whatMoved": "string (markdown bullet list, newline-separated; '-' bullets)",
  "watch": "string (markdown bullet list, newline-separated; '-' bullets)"
}`;

export async function enhanceExecutiveNarrative(
  programmaticMd: string,
  facts: ExecutiveFacts,
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

Rewrite the four LLM zones. Return JSON only — no prose outside the JSON object.`;
}

function parseZones(content: string): LlmZones {
  const parsed = JSON.parse(content) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM JSON is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const headline = obj.headline;
  const tldr = obj.tldr;
  const whatMoved = obj.whatMoved;
  const watch = obj.watch;
  if (typeof headline !== "string" || headline.length === 0) {
    throw new Error("headline missing or not a non-empty string");
  }
  if (!Array.isArray(tldr) || tldr.length < 3 || tldr.length > 5 || !tldr.every((s) => typeof s === "string")) {
    throw new Error("tldr must be an array of 3-5 strings");
  }
  if (typeof whatMoved !== "string" || whatMoved.length === 0) {
    throw new Error("whatMoved missing or not a non-empty string");
  }
  if (typeof watch !== "string" || watch.length === 0) {
    throw new Error("watch missing or not a non-empty string");
  }
  return {
    headline: headline.replace(/\n+/g, " ").trim(),
    tldr: (tldr as string[]).map((s) => s.trim()),
    whatMoved: whatMoved.trim(),
    watch: watch.trim(),
  };
}

function stitchZones(md: string, zones: LlmZones): string {
  const tldrBody = zones.tldr.map((b) => (b.startsWith("- ") ? b : `- ${b.replace(/^[-•*]\s*/, "")}`)).join("\n");
  return md
    .replace(/<!-- LLM:HEADLINE -->[\s\S]*?<!-- \/LLM:HEADLINE -->/, `<!-- LLM:HEADLINE -->\n> ${zones.headline}\n<!-- /LLM:HEADLINE -->`)
    .replace(/<!-- LLM:TLDR -->[\s\S]*?<!-- \/LLM:TLDR -->/, `<!-- LLM:TLDR -->\n${tldrBody}\n<!-- /LLM:TLDR -->`)
    .replace(/<!-- LLM:WHATMOVED -->[\s\S]*?<!-- \/LLM:WHATMOVED -->/, `<!-- LLM:WHATMOVED -->\n${zones.whatMoved}\n<!-- /LLM:WHATMOVED -->`)
    .replace(/<!-- LLM:WATCH -->[\s\S]*?<!-- \/LLM:WATCH -->/, `<!-- LLM:WATCH -->\n${zones.watch}\n<!-- /LLM:WATCH -->`);
}

function extractZoneBodies(stitched: string): Record<string, string> {
  const out: Record<string, string> = {};
  const names = ["HEADLINE", "TLDR", "WHATMOVED", "WATCH"] as const;
  for (const name of names) {
    const re = new RegExp(`<!-- LLM:${name} -->([\\s\\S]*?)<!-- /LLM:${name} -->`);
    const m = stitched.match(re);
    out[name] = m ? m[1] : "";
  }
  return out;
}
