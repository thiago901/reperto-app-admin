import { useEffect, useState, type ReactNode } from 'react';
import { LuLoader, LuPencil, LuPlus, LuSettings2, LuTrash2, LuTriangleAlert, LuX } from 'react-icons/lu';
import { useDeleteEntry, useFinance, useSaveEntry, useSaveFinanceSettings } from '../lib/api';
import { brl, brlAxis, month, monthLong, signedBrl } from '../lib/format';
import type { EntryCategory, FinanceEntry, FinanceEntryInput, FinanceMonth, FinanceSettings } from '../lib/types';
import { PageHeader } from '../components/Shell';
import { Card, CardHeader, Dot, Empty, ErrorState, PageSkeleton, Stat, STATUS } from '../components/ui';
import { LineChart, Meter, SERIES } from '../charts/Charts';

export const CATEGORY_META: Record<EntryCategory, { label: string; color: string }> = {
  infra: { label: 'Infraestrutura', color: '#3987e5' },
  ia: { label: 'IA (Replicate)', color: '#d95926' },
  stores: { label: 'Lojas e contas', color: '#199e70' },
  marketing: { label: 'Marketing', color: '#c98500' },
  tools: { label: 'Ferramentas', color: '#d55181' },
  taxes: { label: 'Impostos', color: '#9085e9' },
  other: { label: 'Outros', color: '#8b8b96' },
};

const RECURRENCE: Record<FinanceEntryInput['recurrence'], string> = {
  monthly: 'por mês',
  yearly: 'por ano',
  once: 'uma vez',
};

const thisMonth = () => new Date().toISOString().slice(0, 7);

/** Atalhos para os custos que todo app como o Repertô tem. */
const PRESETS: (Partial<FinanceEntryInput> & { name: string })[] = [
  { name: 'Supabase', category: 'infra', currency: 'USD', amount: 25, recurrence: 'monthly' },
  { name: 'Netlify', category: 'infra', currency: 'USD', amount: 19, recurrence: 'monthly' },
  { name: 'Firebase', category: 'infra', currency: 'USD', amount: 0, recurrence: 'monthly' },
  { name: 'Servidor do backend', category: 'infra', currency: 'BRL', amount: 0, recurrence: 'monthly' },
  { name: 'Domínio', category: 'infra', currency: 'BRL', amount: 40, recurrence: 'yearly' },
  { name: 'Google Play (conta)', category: 'stores', currency: 'USD', amount: 25, recurrence: 'once' },
  { name: 'Apple Developer', category: 'stores', currency: 'USD', amount: 99, recurrence: 'yearly' },
];

export function FinancePage() {
  const q = useFinance();
  const [editing, setEditing] = useState<Partial<FinanceEntry> | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const { months, entries, settings, generatedAt } = q.data;
  const cur = months[months.length - 1];
  const prev = months[months.length - 2];
  const subs = cur.subscribers ? cur.subscribers.stripe + cur.subscribers.play : 0;
  const ytd = months.reduce((s, m) => s + m.net, 0);

  const categories = Object.entries(cur.expenses.byCategory)
    .map(([k, v]) => ({ key: k as EntryCategory, value: v }))
    .concat(cur.expenses.storeFees ? [{ key: 'stores' as EntryCategory, value: cur.expenses.storeFees }] : [])
    .reduce<{ key: EntryCategory; value: number }[]>((acc, c) => {
      const hit = acc.find((a) => a.key === c.key);
      if (hit) hit.value += c.value;
      else acc.push({ ...c });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title="Finanças" subtitle="Receitas, despesas e se o Repertô está se pagando." generatedAt={generatedAt}>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.04]"
        >
          <LuSettings2 size={15} /> Preço e taxas
        </button>
      </PageHeader>

      {settings.planPriceBrl === 0 && (
        <Card className="mb-4 flex items-start gap-3 px-5 py-4">
          <LuTriangleAlert size={18} className="mt-0.5 shrink-0" style={{ color: STATUS.warning }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-100">Preço do plano não configurado</p>
            <p className="mt-0.5 text-xs text-zinc-400">Sem ele a receita das assinaturas fica zerada.</p>
          </div>
          <button type="button" onClick={() => setSettingsOpen(true)} className="text-sm font-medium text-primary-300 hover:text-primary-200">
            Configurar
          </button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={`Resultado em ${month(cur.month)}`}
          value={<span>{signedBrl(cur.net)}</span>}
          accent
          foot={cur.net >= 0 ? 'Lucro no mês' : 'Prejuízo no mês'}
        />
        <Stat label="Receita no mês" value={brl(cur.revenue.total)} foot={<Compare now={cur.revenue.total} before={prev?.revenue.total} />} />
        <Stat label="Despesas no mês" value={brl(cur.expenses.total)} foot={<Compare now={cur.expenses.total} before={prev?.expenses.total} />} />
        <Stat label="Últimos 12 meses" value={signedBrl(Math.round(ytd * 100) / 100)} foot={`${subs} assinante(s) pagando agora`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Receitas e despesas" hint="Últimos 12 meses, em reais" />
          <div className="px-3 pb-4 pt-3">
            <LineChart
              label="Receitas e despesas por mês"
              axis={months.map((m) => month(m.month))}
              titles={months.map((m) => monthLong(m.month))}
              axisEvery={2}
              format={brl}
              axisFormat={brlAxis}
              series={[
                { name: 'Receitas', color: SERIES[0], values: months.map((m) => m.revenue.total) },
                { name: 'Despesas', color: SERIES[1], values: months.map((m) => m.expenses.total) },
              ]}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title={`Para onde vai o dinheiro`} hint={monthLong(cur.month)} />
          {categories.length ? (
            <ul className="mt-3 flex flex-col gap-4 px-5 pb-5">
              {categories.map((c) => (
                <li key={c.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-zinc-200">
                      <Dot color={CATEGORY_META[c.key]?.color ?? '#8b8b96'} />
                      {CATEGORY_META[c.key]?.label ?? c.key}
                    </span>
                    <span className="tabular-nums text-zinc-300">{brl(c.value)}</span>
                  </div>
                  <div className="mt-1.5">
                    <Meter value={c.value} max={cur.expenses.total} color={CATEGORY_META[c.key]?.color} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhuma despesa neste mês.</Empty>
          )}
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Mês a mês" hint="Assinaturas = pagantes do mês × preço do plano. Taxas da loja entram como despesa." />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-white/[0.06] text-xs text-zinc-500">
              <tr>
                <th className="py-2.5 pl-5 pr-3 text-left font-medium">Mês</th>
                <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Pagantes</th>
                <th className="px-3 py-2.5 text-right font-medium">Receitas</th>
                <th className="px-3 py-2.5 text-right font-medium">Despesas</th>
                <th className="py-2.5 pl-3 pr-5 text-right font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[...months].reverse().map((m) => (
                <MonthRow key={m.month} m={m} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mb-3 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Lançamentos</h2>
          <p className="text-xs text-zinc-500">O custo do Replicate entra sozinho, pelo uso real.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ kind: 'expense' })}
          className="inline-flex h-10 items-center gap-2 self-start rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-500"
        >
          <LuPlus size={16} /> Novo lançamento
        </button>
      </div>

      <EntriesList entries={entries} settings={settings} onEdit={setEditing} />

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-zinc-500">Adicionar rápido</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.filter((p) => !entries.some((e) => e.name.toLowerCase() === p.name.toLowerCase())).map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setEditing({ kind: 'expense', start: thisMonth(), ...p })}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/[0.08] px-3 text-xs text-zinc-300 hover:border-white/[0.14] hover:text-white"
            >
              <LuPlus size={12} /> {p.name}
            </button>
          ))}
        </div>
      </div>

      {editing && <EntryForm initial={editing} onClose={() => setEditing(null)} />}
      {settingsOpen && <SettingsForm initial={settings} onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

function Compare({ now, before }: { now: number; before?: number }) {
  if (before == null) return null;
  const d = Math.round((now - before) * 100) / 100;
  if (!d) return <span>igual ao mês anterior</span>;
  return (
    <span>
      {d > 0 ? '+' : '−'}
      {brl(Math.abs(d))} vs. mês anterior
    </span>
  );
}

function MonthRow({ m }: { m: FinanceMonth }) {
  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="whitespace-nowrap py-2.5 pl-5 pr-3 text-zinc-200 first-letter:uppercase">{monthLong(m.month)}</td>
      <td className="hidden px-3 py-2.5 text-right tabular-nums text-zinc-400 sm:table-cell">
        {m.subscribers ? m.subscribers.stripe + m.subscribers.play : <span className="text-zinc-600">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">{brl(m.revenue.total)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">{brl(m.expenses.total)}</td>
      <td
        className="whitespace-nowrap py-2.5 pl-3 pr-5 text-right font-medium tabular-nums"
        style={{ color: m.net > 0 ? '#3fbf5a' : m.net < 0 ? '#ec835a' : undefined }}
      >
        {signedBrl(m.net)}
      </td>
    </tr>
  );
}

function EntriesList({
  entries,
  settings,
  onEdit,
}: {
  entries: FinanceEntry[];
  settings: FinanceSettings;
  onEdit: (e: FinanceEntry) => void;
}) {
  const remove = useDeleteEntry();
  if (!entries.length) {
    return (
      <Card>
        <Empty>Nenhum lançamento ainda. Comece pelos atalhos abaixo.</Empty>
      </Card>
    );
  }
  const now = thisMonth();
  const active = (e: FinanceEntry) => e.start <= now && (!e.end || e.end >= now);

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-white/[0.05]">
        {entries.map((e) => {
          const monthly =
            (e.currency === 'USD' ? e.amount * settings.usdToBrl : e.amount) / (e.recurrence === 'yearly' ? 12 : 1);
          return (
            <li key={e.id} className={`flex items-center gap-3 px-5 py-3 ${active(e) ? '' : 'opacity-60'}`}>
              <Dot color={e.kind === 'revenue' ? STATUS.good : CATEGORY_META[e.category].color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-100">
                  {e.name}
                  {e.kind === 'revenue' && <span className="ml-2 text-xs text-zinc-500">receita</span>}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {CATEGORY_META[e.category].label} · desde {month(e.start)}
                  {e.end ? ` até ${month(e.end)}` : ''}
                  {!active(e) && ' · encerrado'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm tabular-nums text-zinc-100">
                  {e.currency === 'USD' ? `US$ ${e.amount.toFixed(2)}` : brl(e.amount)}{' '}
                  <span className="text-xs text-zinc-500">{RECURRENCE[e.recurrence]}</span>
                </p>
                {e.recurrence !== 'once' && (e.currency === 'USD' || e.recurrence === 'yearly') && (
                  <p className="text-xs tabular-nums text-zinc-500">≈ {brl(monthly)}/mês</p>
                )}
              </div>
              <div className="flex shrink-0 gap-0.5">
                <IconButton label={`Editar ${e.name}`} onClick={() => onEdit(e)}>
                  <LuPencil size={15} />
                </IconButton>
                <IconButton
                  label={`Apagar ${e.name}`}
                  onClick={() => {
                    if (window.confirm(`Apagar "${e.name}"? Ele some de todos os meses.`)) remove.mutate(e.id);
                  }}
                >
                  <LuTrash2 size={15} />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- formulários --- */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-ink-900 sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <IconButton label="Fechar" onClick={onClose}>
            <LuX size={17} />
          </IconButton>
        </header>
        {children}
      </div>
    </div>
  );
}

const field =
  'mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-ink-850 px-3 text-sm text-zinc-100 focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

function Label({ text, children, hint }: { text: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-400">{text}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

function Choice<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="mt-1.5 flex gap-1 rounded-xl bg-ink-850 p-1" role="radiogroup">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-8 flex-1 rounded-lg text-xs font-medium transition-colors ${value === v ? 'bg-ink-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function EntryForm({ initial, onClose }: { initial: Partial<FinanceEntry>; onClose: () => void }) {
  const save = useSaveEntry();
  const [f, setF] = useState<FinanceEntryInput>({
    kind: initial.kind ?? 'expense',
    name: initial.name ?? '',
    category: initial.category ?? (initial.kind === 'revenue' ? 'other' : 'infra'),
    amount: initial.amount ?? 0,
    currency: initial.currency ?? 'BRL',
    recurrence: initial.recurrence ?? 'monthly',
    start: initial.start ?? thisMonth(),
    end: initial.end ?? null,
    notes: initial.notes ?? '',
  });
  const [amountText, setAmountText] = useState(initial.amount ? String(initial.amount).replace('.', ',') : '');
  const set = <K extends keyof FinanceEntryInput>(k: K, v: FinanceEntryInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    // "1.234,56" (vírgula decimal) ou "19.9" (ponto decimal).
    const raw = amountText.trim();
    const amount = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
    if (!f.name.trim() || !Number.isFinite(amount)) return;
    await save.mutateAsync({ ...f, amount, name: f.name.trim(), id: initial.id, end: f.end || null });
    onClose();
  };

  return (
    <Modal title={initial.id ? 'Editar lançamento' : 'Novo lançamento'} onClose={onClose}>
      <div className="flex flex-col gap-4 px-5 py-5">
        <Choice
          value={f.kind}
          onChange={(v) => setF((x) => ({ ...x, kind: v, category: v === 'revenue' ? 'other' : x.category }))}
          options={[
            ['expense', 'Despesa'],
            ['revenue', 'Receita'],
          ]}
        />
        <Label text="Nome">
          <input className={field} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Supabase" autoFocus />
        </Label>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Label text="Valor">
            <input
              className={`${field} tabular-nums`}
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="0,00"
            />
          </Label>
          <Label text="Moeda">
            <Choice
              value={f.currency}
              onChange={(v) => set('currency', v)}
              options={[
                ['BRL', 'R$'],
                ['USD', 'US$'],
              ]}
            />
          </Label>
        </div>
        <Label text="Repete" hint={f.recurrence === 'yearly' ? 'Entra dividido por 12 em cada mês.' : undefined}>
          <Choice
            value={f.recurrence}
            onChange={(v) => set('recurrence', v)}
            options={[
              ['monthly', 'Todo mês'],
              ['yearly', 'Todo ano'],
              ['once', 'Uma vez'],
            ]}
          />
        </Label>
        {f.kind === 'expense' && (
          <div>
            <span className="text-xs font-medium text-zinc-400">Categoria</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Categoria">
              {(Object.keys(CATEGORY_META) as EntryCategory[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={f.category === k}
                  onClick={() => set('category', k)}
                  className={[
                    'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                    f.category === k
                      ? 'border-white/[0.16] bg-ink-700 text-white'
                      : 'border-white/[0.06] text-zinc-400 hover:text-zinc-200',
                  ].join(' ')}
                >
                  <Dot color={CATEGORY_META[k].color} />
                  {CATEGORY_META[k].label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Label text={f.recurrence === 'once' ? 'Mês' : 'Começa em'}>
            <input type="month" className={field} value={f.start} onChange={(e) => set('start', e.target.value)} />
          </Label>
          {f.recurrence !== 'once' && (
            <Label text="Termina em" hint="Vazio = continua">
              <input type="month" className={field} value={f.end ?? ''} onChange={(e) => set('end', e.target.value || null)} />
            </Label>
          )}
        </div>
        {save.error && (
          <p className="text-sm text-[#ec835a]" role="alert">
            {save.error instanceof Error ? save.error.message : 'Não foi possível salvar.'}
          </p>
        )}
      </div>
      <footer className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
        <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm text-zinc-300 hover:bg-white/[0.04]">
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={save.isPending || !f.name.trim() || !amountText}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
        >
          {save.isPending && <LuLoader size={15} className="animate-spin" />}
          Salvar
        </button>
      </footer>
    </Modal>
  );
}

function SettingsForm({ initial, onClose }: { initial: FinanceSettings; onClose: () => void }) {
  const save = useSaveFinanceSettings();
  const [text, setText] = useState(() =>
    Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v).replace('.', ',')])) as Record<
      keyof FinanceSettings,
      string
    >,
  );
  const num = (s: string) => Number(s.replace(',', '.'));

  const submit = async () => {
    const s = {
      planPriceBrl: num(text.planPriceBrl),
      usdToBrl: num(text.usdToBrl),
      stripeFeePct: num(text.stripeFeePct),
      playFeePct: num(text.playFeePct),
    };
    if (Object.values(s).some((v) => !Number.isFinite(v) || v < 0)) return;
    await save.mutateAsync(s);
    onClose();
  };

  const input = (k: keyof FinanceSettings) => (
    <input
      className={`${field} tabular-nums`}
      inputMode="decimal"
      value={text[k]}
      onChange={(e) => setText((t) => ({ ...t, [k]: e.target.value }))}
    />
  );

  return (
    <Modal title="Preço e taxas" onClose={onClose}>
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
        <Label text="Preço do plano (R$/mês)" hint="O que cada assinante paga.">
          {input('planPriceBrl')}
        </Label>
        <Label text="Cotação do dólar (R$)" hint="Converte custos em US$.">
          {input('usdToBrl')}
        </Label>
        <Label text="Taxa do Stripe (%)" hint="Cartão no site.">
          {input('stripeFeePct')}
        </Label>
        <Label text="Taxa da Google Play (%)" hint="15% para assinaturas.">
          {input('playFeePct')}
        </Label>
      </div>
      <footer className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
        <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm text-zinc-300 hover:bg-white/[0.04]">
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={save.isPending}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
        >
          {save.isPending && <LuLoader size={15} className="animate-spin" />}
          Salvar
        </button>
      </footer>
    </Modal>
  );
}
