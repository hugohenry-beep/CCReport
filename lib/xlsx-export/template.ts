export const COLUMN_WIDTHS: Array<{ col: string; width: number }> = [
  { col: "A", width: 17.63 },
  { col: "B", width: 11.0 },
  { col: "C", width: 12.5 },
  { col: "D", width: 10.88 },
  { col: "E", width: 16.88 },
  { col: "F", width: 13.25 },
  { col: "G", width: 9.0 },
  { col: "H", width: 14.63 },
  { col: "I", width: 17.0 },
  { col: "J", width: 11.63 },
  { col: "K", width: 9.75 },
  { col: "L", width: 12.0 },
  { col: "M", width: 8.13 },
  { col: "N", width: 7.63 },
  { col: "O", width: 12.13 },
  { col: "P", width: 13.25 },
  { col: "Q", width: 9.88 },
  { col: "R", width: 7.88 },
];

export const MERGED_RANGES: string[] = [
  "A4:A5",
  "A6:A7",
  "A8:A9",
  "D4:D5",
  "D6:D7",
  "D8:D9",
  "E4:F4",
  "E5:E6",
];

export const NUMBER_FORMATS = {
  currencyEur: '#,##0.00" €"',
  integer: "#,##0",
  percent: "0.00%",
} as const;
