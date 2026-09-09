const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*UTC([+-])(\d{1,2})(?::(\d{2}))?$/i;

export function parseTimeWithOffset(input) {
  const match = TIME_PATTERN.exec(input.trim());
  if (!match) return null;

  const [, hh, mm, ss, sign, offH, offM] = match;
  const hour = Number(hh);
  const minute = Number(mm);
  const second = ss ? Number(ss) : 0;
  const offsetHour = Number(offH);
  const offsetMinute = offM ? Number(offM) : 0;

  if (hour > 23 || minute > 59 || second > 59 || offsetHour > 14 || offsetMinute > 59) return null;

  const offsetMinutesTotal = (sign === "-" ? -1 : 1) * (offsetHour * 60 + offsetMinute);
  return { hour, minute, second, offsetMinutesTotal };
}

export function nextOccurrenceUnix(parsed, now = new Date()) {
  const { hour, minute, second, offsetMinutesTotal } = parsed;
  const utcMinutesOfDay = hour * 60 + minute - offsetMinutesTotal;
  const totalSeconds = (((utcMinutesOfDay * 60 + second) % 86400) + 86400) % 86400;

  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0);
  let targetMs = base + totalSeconds * 1000;

  if (targetMs <= now.getTime()) {
    targetMs += 24 * 60 * 60 * 1000;
  }

  return Math.floor(targetMs / 1000);
}
