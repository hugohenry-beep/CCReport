export interface ValidationResult {
  ok: boolean;
  offending: string[];
}

// Matches:
//  - currency:   $1,234   $1,234.56   $1.5K   $1.5M
//  - percents:   12.3%    +0.5%    -4%
//  - decimals:   0.123
//  - comma ints: 1,234    12,345,678
// Comma-grouped ints require the structure `\d{1,3}(?:,\d{3})+` so trailing
// commas in prose (e.g. "$18,400,") are NOT swallowed into the token.
const NUMERIC_TOKEN_RE =
  /\$\s?-?\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMB]?|[+-]?\d+(?:\.\d+)?%|-?\d+\.\d+|-?\d{1,3}(?:,\d{3})+/g;

export function validateNumericFidelity(text: string, whitelist: string[]): ValidationResult {
  const normalized = buildNormalizedWhitelist(whitelist);
  const offending: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(NUMERIC_TOKEN_RE)) {
    const raw = m[0];
    const tok = normalize(raw);
    if (!tok) continue;
    if (seen.has(tok)) continue;
    seen.add(tok);
    if (!normalized.has(tok)) offending.push(raw);
  }
  return { ok: offending.length === 0, offending };
}

function buildNormalizedWhitelist(whitelist: string[]): Set<string> {
  const set = new Set<string>();
  for (const entry of whitelist) {
    if (!entry) continue;
    // Add the whole entry (after normalization) — useful for non-numeric
    // tokens like dates that may contain commas/numerals.
    set.add(normalize(entry));
    // Also extract every numeric sub-token so that a whitelist entry like
    // "▲ +12.3%" matches LLM output that emits the bare "12.3%" without the
    // arrow prefix.
    for (const m of entry.matchAll(NUMERIC_TOKEN_RE)) {
      set.add(normalize(m[0]));
    }
  }
  set.delete("");
  return set;
}

function normalize(s: string): string {
  return s.replace(/\s/g, "").replace(/^\+/, "");
}
