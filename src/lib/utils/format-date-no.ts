// Norwegian date formatters for event / application dates rendered in the UI.
// Format convention: "20. Juni 2026" for single dates; for ranges:
//   same month/year      → "20. - 21. Juni 2026"
//   same year, diff month → "30. Juni - 2. Juli 2026"
//   different years      → "30. Desember 2025 - 2. Januar 2026"
// Input is expected to be ISO YYYY-MM-DD (date only); parsing avoids Date
// to sidestep timezone-induced day shifts.

const MONTHS_NO_FULL = [
  "Januar",
  "Februar",
  "Mars",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTHS_NO_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

function parseParts(iso: string): DateParts {
  const [y, m, d] = iso.split("-").map((p) => Number.parseInt(p, 10));
  return { year: y ?? 1970, month: m ?? 1, day: d ?? 1 };
}

export function formatDateNo(iso: string): string {
  const { year, month, day } = parseParts(iso);
  return `${day}. ${MONTHS_NO_FULL[month - 1] ?? ""} ${year}`;
}

export function formatDateRangeNo(start: string, end: string | null): string {
  const s = parseParts(start);
  if (!end || start === end) {
    return `${s.day}. ${MONTHS_NO_FULL[s.month - 1] ?? ""} ${s.year}`;
  }
  const e = parseParts(end);
  const sMonth = MONTHS_NO_FULL[s.month - 1] ?? "";
  const eMonth = MONTHS_NO_FULL[e.month - 1] ?? "";

  if (s.year === e.year && s.month === e.month) {
    return `${s.day}. - ${e.day}. ${sMonth} ${s.year}`;
  }
  if (s.year === e.year) {
    return `${s.day}. ${sMonth} - ${e.day}. ${eMonth} ${s.year}`;
  }
  return `${s.day}. ${sMonth} ${s.year} - ${e.day}. ${eMonth} ${e.year}`;
}

// Short month abbreviation used by the cover-rail date stamp.
export function monthAbbrNo(iso: string): string {
  const { month } = parseParts(iso);
  return MONTHS_NO_SHORT[month - 1] ?? "";
}
