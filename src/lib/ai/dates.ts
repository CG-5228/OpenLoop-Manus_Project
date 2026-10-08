const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function isIsoDateTime(value: string): boolean {
  const match = ISO_DATETIME.exec(value);
  if (!match || !isIsoDate(match[1])) return false;
  if (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) return false;
  if (match[5] !== "Z" && (Number(match[6]) > 14 || Number(match[7]) > 59 || (Number(match[6]) === 14 && Number(match[7]) !== 0))) return false;
  return Number.isFinite(Date.parse(value));
}

export function isIsoDeadline(value: string): boolean {
  return isIsoDate(value) || isIsoDateTime(value);
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** No server-clock fallback, guessed offset, or guessed time-of-day. */
export function supportedDeadline(
  dueAt: string | null,
  deadlineQuote: string | null,
  text: string,
  sentAt: string | null,
  referenceDate?: string,
): string | null {
  if (!deadlineQuote || !text.includes(deadlineQuote)) return null;
  const quote = deadlineQuote.toLowerCase();
  const anchor = sentAt?.slice(0, 10) ?? referenceDate;

  // A fully explicit calendar date is sufficient even without a reference date.
  const literalDate = deadlineQuote.match(/\b\d{4}-\d{2}-\d{2}(?!\d)/)?.[0];
  if (literalDate && isIsoDate(literalDate)) {
    if (dueAt && isIsoDateTime(dueAt) && deadlineQuote.includes(dueAt)) return dueAt;
    return literalDate;
  }

  // Deterministic common relative dates override model arithmetic.
  if (/\b(day after tomorrow)\b/.test(quote)) return anchor ? addDays(anchor, 2) : null;
  if (/\btomorrow\b/.test(quote)) return anchor ? addDays(anchor, 1) : null;
  if (/\b(today|tonight|this evening)\b/.test(quote)) return anchor ?? null;
  if (/\byesterday\b/.test(quote)) return anchor ? addDays(anchor, -1) : null;
  const daysAway = quote.match(/\bin\s+(\d{1,3})\s+days?\b/);
  if (daysAway) return anchor ? addDays(anchor, Number(daysAway[1])) : null;

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const weekday = weekdays.findIndex((day) => new RegExp(`\\b${day}\\b`).test(quote));
  if (weekday !== -1) {
    if (!anchor) return null;
    // "Next Friday" and "last Friday" have regional ambiguity: do not invent precision.
    if (/\b(next|last)\b/.test(quote)) return null;
    const offset = (weekday - new Date(`${anchor}T00:00:00Z`).getUTCDay() + 7) % 7;
    return addDays(anchor, offset);
  }

  if (!dueAt || !isIsoDeadline(dueAt)) return null;
  // Named explicit dates: require date vocabulary and year or a dated anchor.
  const month = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.exec(deadlineQuote);
  const day = deadlineQuote.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/)?.[1];
  const year = deadlineQuote.match(/\b\d{4}\b/)?.[0] ?? anchor?.slice(0, 4);
  if (month && day && year) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthNumber = months.indexOf(month[1].slice(0, 3).toLowerCase()) + 1;
    const date = `${year}-${String(monthNumber).padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isIsoDate(date) && dueAt.slice(0, 10) === date ? date : null;
  }
  // Vague dates, durations, ambiguous numeric dates and unrecognised expressions stay unknown.
  return null;
}
