// Formula helpers for the xlsx export.
//
// Deviations from the master template (we silently correct broken formulas
// in the master, since the user said to report numbers exactly as they are —
// referring to underlying figures, not buggy formula references):
//
// - master O35: =B35/M35  -> =B35/L35 (cost-per-conv divides Paid Conversions, not LW PC)
// - master H38: =B38/E38 with empty operands -> blank when values absent
// - master K26: literal "746.0" -> proper =(I26-J26)/J26
// - country-total cost-per-click: master used =AVERAGE(H17:H18) (unweighted average)
//   -> we use =B{row}/E{row} (weighted: total spend / total clicks)

export function deltaFormula(curCell: string, lwCell: string): string {
  return `=IFERROR((${curCell}-${lwCell})/${lwCell},"")`;
}

export function divideFormula(numerator: string, denominator: string): string {
  return `=IFERROR(${numerator}/${denominator},"")`;
}

export function sumCells(addresses: string[]): string {
  return `=SUM(${addresses.join(",")})`;
}

export function sumChannelRange(col: string, paidSearchRow: number, displayRow: number): string {
  return `=SUM(${col}${paidSearchRow},${col}${displayRow})`;
}

export function colLetter(index1: number): string {
  let n = index1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
