export const LIBRARY_TIME_ZONE = "Asia/Shanghai";

export const LIBRARY_TIME_SLOTS = [
  "08:30—12:00",
  "14:30—18:00",
  "18:00—21:30",
] as const;

export type LibraryTimeSlot = (typeof LIBRARY_TIME_SLOTS)[number];

type LibraryDateParts = {
  year: string;
  month: string;
  day: string;
};

function libraryDateParts(now: Date): LibraryDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIBRARY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: values.year, month: values.month, day: values.day };
}

export function libraryDate(now = new Date()) {
  const { year, month, day } = libraryDateParts(now);
  return `${year}-${month}-${day}`;
}

export function libraryDateLabel(now = new Date()) {
  const { month, day } = libraryDateParts(now);
  return `今天 · ${Number(month)}月${Number(day)}日`;
}

export function isLibraryToday(value: string, now = new Date()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value === libraryDate(now);
}

export function isLibraryTimeSlot(value: string): value is LibraryTimeSlot {
  return (LIBRARY_TIME_SLOTS as readonly string[]).includes(value);
}
