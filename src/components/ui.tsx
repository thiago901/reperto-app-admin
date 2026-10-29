import type { ReactNode } from 'react';
import { LuCircleAlert, LuCircleCheck, LuInfo, LuSearch, LuTriangleAlert } from 'react-icons/lu';
import type { AdminAlert, PlanStatus } from '../lib/types';
import { initials } from '../lib/format';

/* Cores por entidade (fixas: um plano tem sempre a mesma cor em todo o painel). */
export const PLAN_META: Record<PlanStatus, { label: string; color: string }> = {
  paid: { label: 'Pago', color: '#3987e5' },
  trial: { label: 'Teste grátis', color: '#d95926' },
  grandfathered: { label: 'Cortesia', color: '#199e70' },
  free: { label: 'Sem plano', color: '#5b5b66' },
};

/* Estado: verde/âmbar/vermelho reservados, sempre com ícone + texto. */
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/[0.06] bg-ink-900 ${className}`}>{children}</section>;
}

export function CardHeader({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      </div>
      {action}
    </header>
  );
}

/** Um número que responde uma pergunta, com o contexto embaixo. */
export function Stat({
  label,
  value,
  foot,
  accent,
}: {
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={`px-5 py-4 ${accent ? 'bg-gradient-to-b from-primary-600/[0.10] to-ink-900' : ''}`}>
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-white tabular-nums">{value}</p>
      {foot && <div className="mt-2.5 text-xs text-zinc-500">{foot}</div>}
    </Card>
  );
}

export function Delta({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span className={value > 0 ? 'font-medium text-zinc-200' : 'text-zinc-500'}>
        {value > 0 ? `+${value}` : value}
      </span>{' '}
      {label}
    </span>
  );
}

export function Dot({ color, className = '' }: { color: string; className?: string }) {
  return <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`} style={{ background: color }} />;
}

export function PlanBadge({ plan, cancelling }: { plan: PlanStatus; cancelling?: boolean }) {
  const m = PLAN_META[plan];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.08] px-2 py-0.5 text-xs text-zinc-200">
      <Dot color={m.color} />
      {m.label}
      {cancelling && <span className="text-zinc-500">· cancelando</span>}
    </span>
  );
}

const JOB_STATUS: Record<string, { label: string; color: string; Icon: typeof LuCircleCheck }> = {
  succeeded: { label: 'Concluída', color: STATUS.good, Icon: LuCircleCheck },
  failed: { label: 'Falhou', color: STATUS.critical, Icon: LuCircleAlert },
  canceled: { label: 'Cancelada', color: STATUS.serious, Icon: LuCircleAlert },
  processing: { label: 'Processando', color: STATUS.warning, Icon: LuInfo },
  saving: { label: 'Salvando', color: STATUS.warning, Icon: LuInfo },
};

export function JobStatus({ status }: { status: string }) {
  const m = JOB_STATUS[status] ?? { label: status, color: '#71717a', Icon: LuInfo };
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-zinc-200">
      <m.Icon size={14} style={{ color: m.color }} aria-hidden />
      {m.label}
    </span>
  );
}

export function Avatar({ name, email, size = 32 }: { name: string | null; email: string | null; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-ink-700 font-semibold text-zinc-200"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name, email)}
    </span>
  );
}

const ALERT_META = {
  critical: { Icon: LuCircleAlert, color: STATUS.critical, label: 'Crítico' },
  warning: { Icon: LuTriangleAlert, color: STATUS.warning, label: 'Atenção' },
  info: { Icon: LuInfo, color: '#8b8b96', label: 'Info' },
};

export function AlertRow({ alert }: { alert: AdminAlert }) {
  const m = ALERT_META[alert.level];
  return (
    <li className="flex gap-3 px-5 py-3.5">
      <m.Icon size={18} className="mt-0.5 shrink-0" style={{ color: m.color }} aria-label={m.label} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-100">{alert.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{alert.detail}</p>
      </div>
    </li>
  );
}

export function Check({ ok, label, detail }: { ok: boolean; label: string; detail?: ReactNode }) {
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      {ok ? (
        <LuCircleCheck size={18} className="mt-0.5 shrink-0" style={{ color: STATUS.good }} aria-label="Ligado" />
      ) : (
        <LuCircleAlert size={18} className="mt-0.5 shrink-0 text-zinc-500" aria-label="Desligado" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-100">{label}</p>
        {detail && <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>}
      </div>
      <span className="text-xs text-zinc-500">{ok ? 'Ligado' : 'Desligado'}</span>
    </li>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block w-full sm:w-72">
      <LuSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-white/[0.08] bg-ink-850 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
    </label>
  );
}

/** Filtro de uma escolha, com a contagem de cada opção. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number; color?: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={[
              'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
              on
                ? 'border-white/[0.14] bg-ink-700 text-white'
                : 'border-white/[0.06] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200',
            ].join(' ')}
          >
            {o.color && <Dot color={o.color} />}
            {o.label}
            {o.count != null && <span className="tabular-nums text-zinc-500">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.04] ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[112px]" />
        ))}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-64" />
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <LuCircleAlert size={22} style={{ color: STATUS.critical }} />
      <div>
        <p className="text-sm font-medium text-zinc-100">Não foi possível carregar</p>
        <p className="mt-1 max-w-md text-xs text-zinc-400">{error instanceof Error ? error.message : String(error)}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-9 rounded-lg border border-white/[0.1] px-3 text-sm text-zinc-200 hover:bg-white/[0.04]"
        >
          Tentar de novo
        </button>
      )}
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-zinc-500">{children}</p>;
}

/** Cabeçalho de coluna ordenável. */
export function SortTh<K extends string>({
  k,
  sort,
  onSort,
  children,
  align = 'left',
}: {
  k: K;
  sort: { key: K; dir: 1 | -1 };
  onSort: (k: K) => void;
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  const on = sort.key === k;
  return (
    <th
      scope="col"
      aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
      className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium text-zinc-500 first:pl-5 last:pr-5 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-zinc-200 ${on ? 'text-zinc-200' : ''}`}
      >
        {children}
        <span aria-hidden className={`text-[10px] ${on ? 'opacity-100' : 'opacity-0'}`}>
          {sort.dir === 1 ? '▲' : '▼'}
        </span>
      </button>
    </th>
  );
}
