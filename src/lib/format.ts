const numberFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });
const moneyFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatMoney(value: number): string {
  return `${moneyFormatter.format(value)}원`;
}

export function formatAppliedRate(value: number | null): string {
  return value === null ? "—" : percentFormatter.format(value);
}

export function formatLengthRange(lengths: number[]): string {
  if (lengths.length === 0) return "—";
  const minimum = Math.min(...lengths);
  const maximum = Math.max(...lengths);
  return minimum === maximum ? `${minimum}칸` : `${minimum}~${maximum}칸`;
}

function parts(value: Date): Record<string, string> {
  return Object.fromEntries(dateFormatter.formatToParts(value).map((part) => [part.type, part.value]));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return "—";
  const result = parts(date);
  return `${result.year}.${result.month}.${result.day} ${result.hour}:${result.minute}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return "—";
  const result = parts(date);
  return `${result.year}.${result.month}.${result.day}`;
}

export function formatDateInput(value: string | Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) throw new RangeError("날짜가 올바르지 않습니다.");
  const result = parts(date);
  return `${result.year}-${result.month}-${result.day}`;
}

export function formatDateKey(value: string | Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) throw new RangeError("날짜가 올바르지 않습니다.");
  const result = parts(date);
  return `${result.year}${result.month}${result.day}-${result.hour}${result.minute}${result.second}`;
}
