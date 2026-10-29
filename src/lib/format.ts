const nf = new Intl.NumberFormat('pt-BR');
const usdFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const usdFine = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const monthLongFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const clean = (s: string) => s.replace(/\./g, '');

export const num = (n: number) => nf.format(n);
/** Custos pequenos (centavos) ganham uma casa a mais. */
export const usd = (n: number) => (n > 0 && n < 1 ? usdFine.format(n) : usdFmt.format(n));
export const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : '—');

export const date = (t: number | null) => (t ? clean(dateFmt.format(t)) : '—');
export const dateTime = (t: number | null) => (t ? clean(dateTimeFmt.format(t)) : '—');
/** "2026-10-29" → "29 out". */
export const day = (iso: string) => clean(dayFmt.format(new Date(`${iso}T00:00:00Z`)));
/** "2026-10" → "out". */
export const month = (ym: string) => clean(monthFmt.format(new Date(`${ym}-01T00:00:00Z`)));
export const monthLong = (ym: string) => monthLongFmt.format(new Date(`${ym}-01T00:00:00Z`));

export function ago(t: number | null, now = Date.now()): string {
  if (!t) return 'nunca';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `há ${mo} ${mo === 1 ? 'mês' : 'meses'}`;
  const y = Math.round(mo / 12);
  return `há ${y} ${y === 1 ? 'ano' : 'anos'}`;
}

export function duration(sec: number | null): string {
  if (sec == null) return '—';
  if (sec < 60) return `${Math.round(sec)} s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m} min${s ? ` ${s} s` : ''}`;
}

export function uptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d) return `${d} d ${h} h`;
  if (h) return `${h} h ${m} min`;
  return `${m} min`;
}

export function initials(name: string | null, email: string | null): string {
  const parts = (name || email || '?')
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Sem acento e minúsculo, para a busca. */
export const searchKey = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
