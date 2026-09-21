import type { CountryBreakdown } from "../types";

export const NORTH_AM_ROLLUP_LABEL = "NorthAm";
export const EU_UK_ROLLUP_LABEL = "EU + UK";

interface RollupGroup {
  label: string;
  /** Used in the footnote under the table / chart. */
  note: string;
  /** Raw HubSpot country display strings, matched through fold(). */
  countryValues: readonly string[];
}

// NorthAm is the USA and Canada only. Mexico stays out, which matches the
// existing REGION_GROUP_MAP in compute.ts (Mexico sits in LATAM there). US
// territories are also out: "Puerto Rico" appears in real exports and is not
// counted here.
const NORTH_AM_COUNTRY_VALUES: readonly string[] = [
  "usa", "united states", "united states of america", "us", "u.s.", "u.s.a.", "america",
  "canada", "ca", "can",
];

// The 27 EU member states plus the United Kingdom, spelled the way HubSpot's
// country picker emits them ("Czechia", not "Czech Republic"), plus common
// aliases and ISO alpha-2 codes as a defensive layer.
//
// Included: the EU outermost regions (Réunion, Guadeloupe, Martinique, Mayotte,
// French Guiana, Saint Martin, the Azores, Madeira, the Canary Islands). They are
// legally part of France / Portugal / Spain and inside the EU. "Réunion" appears
// in real exports.
//
// Excluded: EFTA/EEA states (Switzerland, Norway, Iceland, Liechtenstein) and
// every other non-member (Turkey, the Western Balkans, Ukraine, Moldova, Russia,
// Belarus, the European microstates); Gibraltar and the Crown dependencies
// (Jersey, Guernsey, Isle of Man); and the overseas countries and territories,
// which are associated with but not part of the EU — Aruba, Curaçao, Sint
// Maarten and the Caribbean Netherlands (NL), Greenland and the Faroe Islands
// (DK), New Caledonia, French Polynesia, Wallis & Futuna, Saint Pierre &
// Miquelon and Saint Barthélemy (FR). "Aruba" also appears in real exports.
const EU_UK_COUNTRY_VALUES: readonly string[] = [
  "austria", "österreich",
  "belgium", "belgique", "belgië",
  "bulgaria",
  "croatia",
  "cyprus",
  "czechia", "czech republic",
  "denmark",
  "estonia",
  "finland",
  "france",
  "germany", "deutschland",
  "greece",
  "hungary",
  "ireland", "republic of ireland",
  "italy", "italia",
  "latvia",
  "lithuania",
  "luxembourg",
  "malta",
  "netherlands", "the netherlands", "netherlands (the)", "holland",
  "poland",
  "portugal",
  "romania",
  "slovakia", "slovak republic",
  "slovenia",
  "spain", "españa",
  "sweden",
  // United Kingdom and its constituent countries
  "united kingdom", "united kingdom of great britain and northern ireland",
  "great britain", "england", "scotland", "wales", "northern ireland",
  // EU outermost regions
  "réunion", "guadeloupe", "martinique", "mayotte",
  "french guiana", "guyane",
  "saint martin (french part)", "saint-martin",
  "azores", "madeira", "canary islands",
  // ISO alpha-2 codes
  "at", "be", "bg", "hr", "cy", "cz", "dk", "ee", "fi", "fr", "de", "gr",
  "hu", "ie", "it", "lv", "lt", "lu", "mt", "nl", "pl", "pt", "ro", "sk",
  "si", "es", "se", "gb", "uk", "u.k.",
];

// Declaration order is render order: roll-ups appear in this order after the
// per-country rows, in the table, the chart and the PDF.
const ROLLUP_GROUPS: readonly RollupGroup[] = [
  {
    label: NORTH_AM_ROLLUP_LABEL,
    note: "the USA and Canada",
    countryValues: NORTH_AM_COUNTRY_VALUES,
  },
  {
    label: EU_UK_ROLLUP_LABEL,
    note: "the EU-27 member states plus the United Kingdom",
    countryValues: EU_UK_COUNTRY_VALUES,
  },
];

// Like classifyLeadCountry's trim+lowercase, but also folds diacritics: the data
// contains "Réunion", and the xlsx -> JSON -> Postgres -> JSON round-trip does
// not guarantee NFC over NFD.
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const LOOKUPS: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  ROLLUP_GROUPS.map((g) => [g.label, new Set(g.countryValues.map(fold))]),
);

const NOTES: ReadonlyMap<string, string> = new Map(
  ROLLUP_GROUPS.map((g) => [g.label, g.note]),
);

export function rollupMemberRows(
  label: string,
  rows: CountryBreakdown[] | null | undefined,
): CountryBreakdown[] {
  const lookup = LOOKUPS.get(label);
  if (!lookup) return [];
  return (rows ?? []).filter((r) => r.country && lookup.has(fold(r.country)));
}

// Additive summary rows for a byCountry breakdown: their counts deliberately
// overlap the member rows. A group with no leads in the period is left out,
// mirroring the Other-bucket suppression in breakdownByDayOfWeekAndCountry.
//
// pct is the sum of the member pcts, which is exact rather than an
// approximation: every row divides by the same denominator (all sourced leads
// in the period), so the sum of ci/T equals (sum of ci)/T.
export function deriveCountryRollups(
  rows: CountryBreakdown[] | null | undefined,
): CountryBreakdown[] {
  const out: CountryBreakdown[] = [];
  for (const group of ROLLUP_GROUPS) {
    const members = rollupMemberRows(group.label, rows);
    const count = members.reduce((s, r) => s + r.count, 0);
    if (count === 0) continue;
    out.push({
      country: group.label,
      count,
      pct: members.reduce((s, r) => s + r.pct, 0),
    });
  }
  return out;
}

// One sentence explaining that the roll-ups overlap the rows above them.
// `emphasize` wraps each label, e.g. in markdown bold.
export function describeCountryRollups(
  rollups: CountryBreakdown[],
  emphasize: (label: string) => string = (l) => l,
): string | null {
  if (rollups.length === 0) return null;
  const parts = rollups.map(
    (r) => `${emphasize(r.country)} (${NOTES.get(r.country) ?? "a group of countries"})`,
  );
  const subject = parts.length === 1 ? `${parts[0]} is a roll-up` : `${joinList(parts)} are roll-ups`;
  const tail =
    parts.length === 1
      ? "not an additional country. Its count intentionally overlaps those entries."
      : "not additional countries. Their counts intentionally overlap those entries.";
  return `${subject} of countries already shown above — ${tail}`;
}

function joinList(parts: string[]): string {
  if (parts.length <= 2) return parts.join(" and ");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
