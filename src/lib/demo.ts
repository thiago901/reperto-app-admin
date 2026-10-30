import type {
  AdminGroup,
  AdminStemJob,
  AdminUser,
  DayPoint,
  FinanceEntry,
  FinanceEntryInput,
  FinanceMonth,
  FinanceSettings,
  Overview,
  PlanStatus,
  SystemInfo,
  Ticket,
} from './types';

/**
 * Dados fictícios para ver o painel sem backend (`npm run dev` com
 * VITE_DEMO=true). Só existe em desenvolvimento.
 */

const DAY = 86_400_000;
const now = Date.now();
let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

const FIRST = ['Ana', 'Bruno', 'Carla', 'Davi', 'Elisa', 'Felipe', 'Gabriela', 'Hugo', 'Isabela', 'João', 'Larissa', 'Mateus', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sara', 'Tiago'];
const LAST = ['Souza', 'Lima', 'Costa', 'Alves', 'Ribeiro', 'Martins', 'Rocha', 'Barbosa', 'Freitas', 'Moreira'];
const GROUPS = ['Louvor Central', 'Ministério Vida', 'Jovens Adoração', 'Coral Esperança', 'Banda Domingo', 'Equipe Manhã', 'Igreja Nova Aliança', 'Música & Fé', 'Célula Norte', 'Ministério Shalom', 'Grupo Ágape'];
const MUSICS = ['Bondade de Deus', 'Lugar Secreto', 'Ousado Amor', 'Grande é o Senhor', 'Aquieta Minh’alma', 'Santo Espírito', 'Tua Graça me Basta', 'Galileu', 'Rei Meu', 'Deus de Promessas'];

const plans: PlanStatus[] = ['paid', 'paid', 'trial', 'grandfathered', 'free', 'free', 'free', 'free', 'free'];

const users: AdminUser[] = Array.from({ length: 64 }, (_, i) => {
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const createdAt = now - Math.floor(rand() * 200) * DAY - Math.floor(rand() * DAY);
  const last = rand() < 0.15 ? null : Math.max(createdAt, now - Math.floor(rand() * rand() * 60 * DAY));
  const plan = pick(plans);
  return {
    uid: `u${i}`,
    email: `${name.toLowerCase().replace(/\s/g, '.').normalize('NFD').replace(/\p{M}/gu, '')}@exemplo.com`,
    name: rand() < 0.1 ? null : name,
    createdAt,
    lastActiveAt: last,
    verified: rand() < 0.7,
    disabled: false,
    provider: 'password',
    plan,
    planSource: plan === 'paid' ? pick(['stripe', 'revenuecat']) : null,
    planEndsAt: plan === 'trial' ? now + Math.floor(rand() * 7) * DAY : plan === 'paid' ? now + 20 * DAY : null,
    cancelling: plan === 'paid' && rand() < 0.15,
    groups: 1 + Math.floor(rand() * 2),
    ownedGroups: rand() < 0.3 ? 1 : 0,
  };
}).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

const groups: AdminGroup[] = GROUPS.map((name, i) => {
  const owner = users[(i * 5) % users.length];
  const stemRuns = rand() < 0.5 ? Math.floor(rand() * 12) : 0;
  return {
    id: `g${i}`,
    name,
    ownerId: owner.uid,
    ownerEmail: owner.email,
    ownerPlan: owner.plan,
    members: 1 + Math.floor(rand() * 9),
    musics: Math.floor(rand() * 80),
    schedules: Math.floor(rand() * 40),
    upcoming: Math.floor(rand() * 4),
    stemRuns,
    stemCostUsd: Number((stemRuns * 0.044).toFixed(4)),
    createdAt: now - Math.floor(rand() * 300) * DAY,
    lastActivityAt: now - Math.floor(rand() * rand() * 70) * DAY,
  };
});

const jobs: AdminStemJob[] = Array.from({ length: 38 }, (_, i) => {
  const g = pick(groups);
  const status = rand() < 0.08 ? 'failed' : i === 0 ? 'processing' : 'succeeded';
  const gpu = 150 + rand() * 120;
  return {
    id: `j${i}`,
    createdAt: now - i * 2.6 * DAY - rand() * DAY,
    completedAt: null,
    status,
    groupId: g.id,
    groupName: g.name,
    musicId: `m${i}`,
    musicName: pick(MUSICS),
    email: users[i % users.length].email,
    sourceLabel: 'Música completa',
    sourceDuration: 200 + rand() * 180,
    gpuSeconds: status === 'processing' ? null : Number(gpu.toFixed(1)),
    costUsd: status === 'processing' ? null : Number((gpu * 0.000225).toFixed(4)),
    error: status === 'failed' ? 'Prediction failed: CUDA out of memory' : null,
  };
});

const daily: DayPoint[] = Array.from({ length: 30 }, (_, i) => {
  const t = now - (29 - i) * DAY;
  return {
    date: new Date(t).toISOString().slice(0, 10),
    signups: Math.floor(rand() * 4),
    active: Math.floor(rand() * 9),
    musics: Math.floor(rand() * 7),
    schedules: Math.floor(rand() * 4),
    stems: Math.floor(rand() * 3),
  };
});

const month = new Date(now).toISOString().slice(0, 7);
const byMonth = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(now);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - (5 - i));
  const runs = i < 2 ? 0 : Math.floor(4 + rand() * 14);
  return { month: d.toISOString().slice(0, 7), runs, failed: Math.floor(runs * 0.08), costUsd: Number((runs * 0.044).toFixed(4)) };
});

const count = (p: PlanStatus) => users.filter((u) => u.plan === p).length;
const within = (t: number | null, d: number) => !!t && now - t < d * DAY;
const done = jobs.filter((j) => j.costUsd != null);
const totalCost = done.reduce((s, j) => s + (j.costUsd ?? 0), 0);
const monthJobs = jobs.filter((j) => new Date(j.createdAt).toISOString().startsWith(month));

const summary = {
  month,
  monthRuns: monthJobs.length,
  monthSucceeded: monthJobs.filter((j) => j.status === 'succeeded').length,
  monthFailed: monthJobs.filter((j) => j.status === 'failed').length,
  monthCostUsd: Number(monthJobs.reduce((s, j) => s + (j.costUsd ?? 0), 0).toFixed(4)),
  totalRuns: jobs.length,
  totalCostUsd: Number(totalCost.toFixed(4)),
  avgGpuSeconds: 196.4,
  avgCostUsd: Number((totalCost / done.length).toFixed(4)),
  running: 1,
  limitPerGroup: 20,
};

const alerts: Overview['alerts'] = [
  { level: 'warning', title: '2 separação(ões) falharam nas últimas 24h', detail: 'Último erro: Prediction failed: CUDA out of memory' },
  { level: 'warning', title: `${users.filter((u) => u.cancelling).length} assinatura(s) cancelando`, detail: 'Pagaram, mas não vão renovar. Vale um contato antes do fim do período.' },
  { level: 'info', title: `${count('trial')} teste(s) grátis acabam em 7 dias`, detail: 'Boa hora para lembrar dessas pessoas do que o plano pago oferece.' },
];

const topGroups = groups
  .filter((g) => g.stemRuns)
  .sort((a, b) => b.stemRuns - a.stemRuns)
  .slice(0, 5)
  .map((g) => ({ groupId: g.id, name: g.name, runs: g.stemRuns, costUsd: g.stemCostUsd }));

const overview: Overview = {
  generatedAt: now,
  app: { id: 'reperto', name: 'Reperto' },
  overview: {
    users: {
      total: users.length,
      verified: users.filter((u) => u.verified).length,
      disabled: 0,
      new7: users.filter((u) => within(u.createdAt, 7)).length,
      new30: users.filter((u) => within(u.createdAt, 30)).length,
      active1: users.filter((u) => within(u.lastActiveAt, 1)).length,
      active7: users.filter((u) => within(u.lastActiveAt, 7)).length,
      active30: users.filter((u) => within(u.lastActiveAt, 30)).length,
      returning7: users.filter((u) => !within(u.createdAt, 30) && within(u.lastActiveAt, 7)).length,
    },
    plans: {
      paid: count('paid'),
      trial: count('trial'),
      grandfathered: count('grandfathered'),
      free: count('free'),
      cancelling: users.filter((u) => u.cancelling).length,
      trialsEnding7: count('trial'),
      bySource: { stripe: 5, revenuecat: 3 },
    },
    groups: { total: groups.length, withTeam: groups.filter((g) => g.members > 1).length, active30: 7, avgMembers: 4.2, new30: 2 },
    content: { musics: 412, musicsNew30: 38, schedules: 196, schedulesNew30: 21, upcomingSchedules: 9, musicsWithStems: 31 },
    stems: summary,
    deletions30: 1,
    pushDevices: 48,
    support: { new: 3, answered: 2, total: 7 },
  },
  daily,
  stemsByMonth: byMonth,
  topGroupsByStems: topGroups,
  alerts,
  recentUsers: users.slice(0, 6),
  recentStemJobs: jobs.slice(0, 6),
};

const system: SystemInfo = {
  generatedAt: now,
  alerts,
  pushDevices: 48,
  system: {
    startedAt: now - 3.4 * DAY,
    uptimeSec: Math.round(3.4 * 86400),
    node: 'v22.11.0',
    memoryMb: 142,
    config: {
      stripe: true,
      revenueCat: true,
      storage: true,
      stems: true,
      stemsOpenToManagers: false,
      stemsAllowEmails: 1,
      stemsMonthlyLimit: 20,
      stemsCostPerSecondUsd: 0.000225,
      trialDays: 7,
      origins: ['https://repertoapp.com.br', 'https://repertomusic.netlify.app', 'http://localhost:5174'],
    },
  },
};

/* ----------------------------------------------------------- atendimento --- */

const TEXTS: [Ticket['type'], string][] = [
  ['problem', 'Quando abro a aba Faixas no celular o áudio fica travando depois de uns 30 segundos.'],
  ['suggestion', 'Seria ótimo poder exportar a escala do mês em PDF para mandar no grupo do WhatsApp.'],
  ['complaint', 'Paguei o plano mas ainda aparece que estou no teste grátis.'],
  ['praise', 'O modo apresentação salvou nosso ensaio de domingo, parabéns!'],
  ['question', 'Como faço para transpor a cifra só para o violão?'],
  ['suggestion', 'Dava para ter um metrônomo junto do player?'],
  ['problem', 'Não consigo convidar uma pessoa pelo link, diz que expirou.'],
];
let tickets: Ticket[] = TEXTS.map(([type, text], i) => {
  const u = users[i * 3];
  const at = now - i * 0.9 * DAY - 3600_000;
  const answered = i === 3 || i === 4;
  return {
    id: `t${i}`,
    uid: u.uid,
    email: u.email,
    name: u.name,
    type,
    status: i === 5 ? 'resolved' : answered ? 'answered' : 'new',
    messages: [
      { from: 'user', text, at },
      ...(answered ? [{ from: 'admin' as const, text: 'Oi! Obrigado por escrever. Já estamos vendo isso.', at: at + 3600_000 }] : []),
    ],
    context: { platform: i % 2 ? 'android' : 'web', standalone: String(i % 2 === 0), screen: '412x915' },
    unreadForUser: answered,
    createdAt: at,
    updatedAt: answered ? at + 3600_000 : at,
  };
});

/* -------------------------------------------------------------- finanças --- */

let financeSettings: FinanceSettings = { planPriceBrl: 19.9, usdToBrl: 5.5, stripeFeePct: 4.99, playFeePct: 15 };
let entries: FinanceEntry[] = [
  { id: 'e1', createdAt: now, kind: 'expense', name: 'Supabase', category: 'infra', amount: 25, currency: 'USD', recurrence: 'monthly', start: byMonth[1].month, end: null },
  { id: 'e2', createdAt: now, kind: 'expense', name: 'Domínio repertoapp.com.br', category: 'infra', amount: 40, currency: 'BRL', recurrence: 'yearly', start: byMonth[0].month, end: null },
  { id: 'e3', createdAt: now, kind: 'expense', name: 'Netlify Pro', category: 'infra', amount: 19, currency: 'USD', recurrence: 'monthly', start: byMonth[3].month, end: null },
  { id: 'e4', createdAt: now, kind: 'expense', name: 'Anúncio Instagram', category: 'marketing', amount: 150, currency: 'BRL', recurrence: 'once', start: byMonth[4].month, end: null },
  { id: 'e5', createdAt: now, kind: 'revenue', name: 'Oferta da igreja parceira', category: 'other', amount: 200, currency: 'BRL', recurrence: 'once', start: byMonth[5].month, end: null },
];

function financeMonths(): FinanceMonth[] {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - (11 - i));
    return d.toISOString().slice(0, 7);
  });
  return months.map((month, i) => {
    const subs = i < 6 ? null : { stripe: 3 + i - 6, play: 1 + Math.floor((i - 6) / 2) };
    const n = subs ? subs.stripe + subs.play : 0;
    const subscriptions = n * financeSettings.planPriceBrl;
    const storeFees = subs
      ? subs.stripe * financeSettings.planPriceBrl * (financeSettings.stripeFeePct / 100) +
        subs.play * financeSettings.planPriceBrl * (financeSettings.playFeePct / 100)
      : 0;
    const byCategory: Record<string, number> = {};
    let other = 0;
    for (const e of entries) {
      if (month < e.start || (e.end && month > e.end)) continue;
      const brl = e.currency === 'USD' ? e.amount * financeSettings.usdToBrl : e.amount;
      const v = e.recurrence === 'monthly' ? brl : e.recurrence === 'yearly' ? brl / 12 : month === e.start ? brl : 0;
      if (!v) continue;
      if (e.kind === 'revenue') other += v;
      else byCategory[e.category] = (byCategory[e.category] ?? 0) + v;
    }
    const replicate = (byMonth.find((m) => m.month === month)?.costUsd ?? 0) * financeSettings.usdToBrl;
    if (replicate) byCategory.ia = (byCategory.ia ?? 0) + replicate;
    const exp = Object.values(byCategory).reduce((a, b) => a + b, 0) + storeFees;
    const r2 = (x: number) => Math.round(x * 100) / 100;
    return {
      month,
      subscribers: subs,
      revenue: { subscriptions: r2(subscriptions), other: r2(other), total: r2(subscriptions + other) },
      expenses: { byCategory, storeFees: r2(storeFees), replicate: r2(replicate), total: r2(exp) },
      net: r2(subscriptions + other - exp),
    };
  });
}

export function demoResponse(path: string, init?: { method?: string; body?: unknown }): unknown {
  const p = path.split('?')[0];
  const method = init?.method ?? 'GET';
  const body = init?.body as Record<string, unknown> | undefined;
  if (p === '/admin/support') return { generatedAt: Date.now(), tickets };
  if (p.startsWith('/admin/support/')) {
    const id = p.split('/').pop();
    tickets = tickets.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, updatedAt: Date.now() };
      if (body?.reply) {
        next.messages = [...t.messages, { from: 'admin', text: String(body.reply), at: Date.now() }];
        next.status = 'answered';
      }
      if (body?.status) next.status = body.status as Ticket['status'];
      if (body?.note !== undefined) next.note = String(body.note);
      return next;
    });
    return { ok: true };
  }
  if (p === '/admin/finance') return { generatedAt: Date.now(), settings: financeSettings, entries, months: financeMonths() };
  if (p === '/admin/finance/settings') {
    financeSettings = body as unknown as FinanceSettings;
    return { ok: true };
  }
  if (p.startsWith('/admin/finance/entries')) {
    const id = p.split('/')[4];
    if (method === 'DELETE') entries = entries.filter((e) => e.id !== id);
    else if (id) entries = entries.map((e) => (e.id === id ? { ...e, ...(body as unknown as FinanceEntryInput) } : e));
    else entries = [...entries, { ...(body as unknown as FinanceEntryInput), id: `e${Date.now()}`, createdAt: Date.now() }];
    return { ok: true };
  }
  if (p === '/admin/check') return { admin: true, email: 'admin@exemplo.com', emailVerified: true };
  if (p === '/admin/overview') return overview;
  if (p === '/admin/users') return { generatedAt: now, users };
  if (p === '/admin/groups') return { generatedAt: now, groups };
  if (p === '/admin/stems') return { generatedAt: now, summary, byMonth, topGroups, jobs };
  if (p === '/admin/system') return system;
  throw new Error(`demo: ${p}`);
}
