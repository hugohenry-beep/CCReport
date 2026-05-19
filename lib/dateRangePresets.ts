/** Format a Date as a yyyy-mm-dd string in local time (matches <input type="date">). */
export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type DateRange = { start: string; end: string };

export interface DateRangePreset {
  id: string;
  label: string;
  compute: (today: Date) => DateRange;
}

function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 Sun – 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: "last7",
    label: "Last 7 days",
    compute: (today) => {
      const end = new Date(today);
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start: toDateInput(start), end: toDateInput(end) };
    },
  },
  {
    id: "last14",
    label: "Last 14 days",
    compute: (today) => {
      const end = new Date(today);
      const start = new Date(today);
      start.setDate(start.getDate() - 13);
      return { start: toDateInput(start), end: toDateInput(end) };
    },
  },
  {
    id: "last30",
    label: "Last 30 days",
    compute: (today) => {
      const end = new Date(today);
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start: toDateInput(start), end: toDateInput(end) };
    },
  },
  {
    id: "lastWeek",
    label: "Last full week",
    compute: (today) => {
      const thisMon = startOfWeekMonday(today);
      const lastMon = new Date(thisMon);
      lastMon.setDate(lastMon.getDate() - 7);
      const lastSun = new Date(lastMon);
      lastSun.setDate(lastSun.getDate() + 6);
      return { start: toDateInput(lastMon), end: toDateInput(lastSun) };
    },
  },
  {
    id: "last2Weeks",
    label: "Past 2 full weeks",
    compute: (today) => {
      const thisMon = startOfWeekMonday(today);
      const twoMondaysAgo = new Date(thisMon);
      twoMondaysAgo.setDate(twoMondaysAgo.getDate() - 14);
      const lastSun = new Date(thisMon);
      lastSun.setDate(lastSun.getDate() - 1);
      return { start: toDateInput(twoMondaysAgo), end: toDateInput(lastSun) };
    },
  },
  {
    id: "thisMonth",
    label: "Month-to-date",
    compute: (today) => {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toDateInput(start), end: toDateInput(today) };
    },
  },
  {
    id: "lastMonth",
    label: "Last month",
    compute: (today) => {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toDateInput(start), end: toDateInput(end) };
    },
  },
];

export function defaultRange(): DateRange {
  return DATE_RANGE_PRESETS[0].compute(new Date());
}

export function matchPreset(range: DateRange): string | null {
  const today = new Date();
  for (const p of DATE_RANGE_PRESETS) {
    const r = p.compute(today);
    if (r.start === range.start && r.end === range.end) return p.id;
  }
  return null;
}
