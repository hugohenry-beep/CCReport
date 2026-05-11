import { COUNTRY_KEYS, type ChannelKey, type CountryKey } from "../types";

interface CountryEntry {
  key: CountryKey;
  campaignNamePatterns: RegExp[];
  hubspotCountryValues: string[];
}

export const COUNTRY_ORDER: readonly CountryKey[] = COUNTRY_KEYS;

export const COUNTRY_TABLE: readonly CountryEntry[] = [
  {
    key: "USA",
    campaignNamePatterns: [/^USA\b/i, /^US\b/i, /^U\.S\.A?\b/i],
    hubspotCountryValues: ["united states", "usa", "us", "u.s.", "u.s.a."],
  },
  {
    key: "UK",
    campaignNamePatterns: [/^UK\b/i, /^GB\b/i],
    hubspotCountryValues: ["united kingdom", "uk", "great britain", "england", "scotland", "wales", "northern ireland", "gb"],
  },
  {
    key: "Canada",
    campaignNamePatterns: [/^CA\b/i, /^Canada\b/i, /^CAN\b/i],
    hubspotCountryValues: ["canada", "ca"],
  },
  {
    key: "France",
    campaignNamePatterns: [/^FR\b/i, /^France\b/i],
    hubspotCountryValues: ["france", "fr"],
  },
  {
    key: "DACH",
    campaignNamePatterns: [/^DACH\b/i, /^DE\b/i, /^AT\b/i, /^CH\b/i, /^Germany\b/i, /^Austria\b/i, /^Switzerland\b/i],
    hubspotCountryValues: ["germany", "austria", "switzerland", "de", "at", "ch", "dach"],
  },
  {
    key: "Spain",
    campaignNamePatterns: [/^ES\b/i, /^Spain\b/i, /^SP\b/i],
    hubspotCountryValues: ["spain", "es"],
  },
  {
    key: "Nordics",
    campaignNamePatterns: [
      /^Nordics?\b/i,
      /^NORD\b/i,
      /\(SW\)\s*NORD/i,
      /^SW\b/i,
      /^SE\b/i,
      /^NO\b/i,
      /^DK\b/i,
      /^FI\b/i,
      /^Sweden\b/i,
      /^Norway\b/i,
      /^Denmark\b/i,
      /^Finland\b/i,
    ],
    hubspotCountryValues: ["sweden", "norway", "denmark", "finland", "iceland", "se", "no", "dk", "fi", "is", "nordics"],
  },
  {
    key: "Netherlands",
    campaignNamePatterns: [/^NL\b/i, /^Netherlands\b/i, /^Holland\b/i],
    hubspotCountryValues: ["netherlands", "holland", "nl"],
  },
  {
    key: "Italy",
    campaignNamePatterns: [/^IT\b/i, /^Italy\b/i],
    hubspotCountryValues: ["italy", "it"],
  },
  {
    key: "LATAM",
    campaignNamePatterns: [/^LATAM\b/i, /^LAT\b/i, /^MX\b/i, /^BR\b/i, /^AR\b/i, /^Mexico\b/i, /^Brazil\b/i, /^Argentina\b/i],
    hubspotCountryValues: [
      "mexico",
      "brazil",
      "argentina",
      "chile",
      "colombia",
      "peru",
      "uruguay",
      "ecuador",
      "venezuela",
      "mx",
      "br",
      "ar",
      "cl",
      "co",
      "pe",
      "uy",
      "ec",
      "ve",
      "latam",
    ],
  },
  {
    key: "Australia",
    campaignNamePatterns: [/^AU\b/i, /^AUS\b/i, /^Australia\b/i, /^NZ\b/i, /^New\s+Zealand\b/i],
    hubspotCountryValues: ["australia", "new zealand", "au", "nz"],
  },
];

const HUBSPOT_LOOKUP: Map<string, CountryKey> = (() => {
  const m = new Map<string, CountryKey>();
  for (const entry of COUNTRY_TABLE) {
    for (const v of entry.hubspotCountryValues) {
      m.set(v.toLowerCase(), entry.key);
    }
  }
  return m;
})();

export const PAID_SEARCH_SOURCE_PATTERNS: RegExp[] = [
  /paid\s*search/i,
  /\bsem\b/i,
  /google\s*ads/i,
  /adwords/i,
];

export function classifyCampaignCountry(campaignName: string | null | undefined): CountryKey | null {
  if (!campaignName) return null;
  const trimmed = campaignName.trim();
  for (const entry of COUNTRY_TABLE) {
    for (const re of entry.campaignNamePatterns) {
      if (re.test(trimmed)) return entry.key;
    }
  }
  return null;
}

export function classifyCampaignChannel(campaignType: string | null | undefined): ChannelKey {
  if (!campaignType) return "display";
  return campaignType.trim().toLowerCase() === "search" ? "paidSearch" : "display";
}

export function classifyLeadCountry(country: string | null | undefined): CountryKey | null {
  if (!country) return null;
  return HUBSPOT_LOOKUP.get(country.trim().toLowerCase()) ?? null;
}

export function classifyLeadChannel(source: string | null | undefined): ChannelKey {
  if (!source) return "display";
  return PAID_SEARCH_SOURCE_PATTERNS.some((re) => re.test(source)) ? "paidSearch" : "display";
}
