import { STAGE_KEYWORDS, type StageTarget } from "../types";

export function matchStage(label: string | null | undefined, target: StageTarget): boolean {
  if (!label) return false;
  const lower = label.toLowerCase();
  return STAGE_KEYWORDS[target].some((kw) => lower.includes(kw));
}

export function classifyStage(label: string | null | undefined): StageTarget | null {
  if (!label) return null;
  for (const target of Object.keys(STAGE_KEYWORDS) as StageTarget[]) {
    if (matchStage(label, target)) return target;
  }
  return null;
}
