import type { Confidence, Status } from "./types";

const nf = new Intl.NumberFormat("ru-RU");
const CURRENCY: Record<string, string> = { RUB: "₽", RUR: "₽", USD: "$", EUR: "€" };

export const money = (n: number, currency = "RUB") => `${nf.format(Math.round(n))} ${CURRENCY[currency] ?? currency}`;

export function salary(from: number | null, to: number | null, currency = "RUB"): string | null {
  const c = CURRENCY[currency] ?? currency;
  if (from && to) return from === to ? `${nf.format(from)} ${c}` : `${nf.format(from)} – ${nf.format(to)} ${c}`;
  if (from) return `от ${nf.format(from)} ${c}`;
  if (to) return `до ${nf.format(to)} ${c}`;
  return null;
}

export function date(s: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!s) return "—";
  const d = parseDate(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ru-RU", opts);
}

function parseDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
}

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function relativeDate(s: string | null | undefined): string {
  if (!s) return "";
  const days = Math.floor((Date.now() - parseDate(s).getTime()) / 86_400_000);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} ${plural(days, "день", "дня", "дней")} назад`;
  return date(s, { day: "numeric", month: "short" });
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const STATUS: Record<Status, { label: string; tone: string; dot: string }> = {
  plan: { label: "Планирую", tone: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  prep: { label: "Готовлю", tone: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  sent: { label: "Отправлен", tone: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  seen: { label: "Просмотрен", tone: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  inv: { label: "Приглашение", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  int: { label: "Собеседование", tone: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  offer: { label: "Оффер", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  hired: { label: "Принят", tone: "bg-green-100 text-green-800", dot: "bg-green-600" },
  rej: { label: "Отказ", tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  closed: { label: "Закрыт", tone: "bg-zinc-100 text-zinc-500", dot: "bg-zinc-400" },
};
export const STATUS_ORDER: Status[] = ["plan", "prep", "sent", "seen", "inv", "int", "offer", "hired", "rej", "closed"];

export const CONFIDENCE: Record<Confidence, string> = {
  high: "Высокая уверенность",
  medium: "Средняя уверенность",
  low: "Низкая уверенность",
};

export const WORK_FORMAT: Record<string, string> = {
  any: "Любой",
  remote: "Удалённо",
  hybrid: "Гибрид",
  office: "Офис",
  unknown: "Не указан",
};

export const SOURCE_TITLE: Record<string, string> = { trudvsem: "Работа России", hh: "hh.ru", superjob: "SuperJob" };
export const sourceTitle = (c: string) => SOURCE_TITLE[c] ?? c;

export function scoreTone(score: number | null) {
  if (score === null) return { ring: "stroke-slate-300", text: "text-slate-500", bg: "bg-slate-100" };
  if (score >= 75) return { ring: "stroke-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" };
  if (score >= 50) return { ring: "stroke-amber-500", text: "text-amber-600", bg: "bg-amber-50" };
  return { ring: "stroke-rose-400", text: "text-rose-500", bg: "bg-rose-50" };
}
