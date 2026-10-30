import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import {
  LuActivity,
  LuAudioLines,
  LuHeadphones,
  LuWallet,
  LuLayoutDashboard,
  LuLogOut,
  LuRefreshCw,
  LuServer,
  LuUsers,
  LuUsersRound,
} from 'react-icons/lu';
import { useAuth } from '../lib/auth';
import { useOverview, useRefresh } from '../lib/api';
import { ago } from '../lib/format';
import { Avatar } from './ui';

const NAV = [
  { to: '/', label: 'Visão geral', Icon: LuLayoutDashboard, end: true },
  { to: '/usuarios', label: 'Usuários', Icon: LuUsers },
  { to: '/grupos', label: 'Grupos', Icon: LuUsersRound },
  { to: '/faixas', label: 'Faixas (IA)', Icon: LuAudioLines },
  { to: '/atendimento', label: 'Atendimento', Icon: LuHeadphones, badge: 'support' as const },
  { to: '/financas', label: 'Finanças', Icon: LuWallet },
  { to: '/sistema', label: 'Sistema', Icon: LuServer },
];

/** Quantas mensagens esperam resposta (vem da visão geral, já em cache). */
function useSupportBadge() {
  const q = useOverview();
  return q.data?.overview.support?.new ?? 0;
}

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-primary-600 px-1.5 text-center text-[11px] font-semibold leading-5 text-white tabular-nums">
      {n}
    </span>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">Repertô</p>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">Admin</p>
      </div>
    </div>
  );
}

export function Shell() {
  const { state, signOut } = useAuth();
  const user = state.status === 'admin' ? state.user : null;
  const pending = useSupportBadge();

  return (
    <div className="min-h-dvh bg-ink-950 text-zinc-100 lg:grid lg:grid-cols-[240px_1fr]">
      {/* desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-white/[0.06] px-3 py-5 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav className="mt-8 flex flex-col gap-0.5" aria-label="Seções">
          {NAV.map(({ to, label, Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-white/[0.06] text-white' : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-primary-400' : ''} />
                  {label}
                  {badge && <Badge n={pending} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="mt-auto flex items-center gap-2.5 rounded-xl border border-white/[0.06] p-2.5">
            <Avatar name={user.displayName} email={user.email} size={30} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-200">{user.displayName ?? 'Administrador'}</p>
              <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sair"
              aria-label="Sair"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
            >
              <LuLogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* celular */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-950/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Brand />
          <button
            type="button"
            onClick={signOut}
            aria-label="Sair"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05]"
          >
            <LuLogOut size={18} />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]" aria-label="Seções">
          {NAV.map(({ to, label, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
                  isActive ? 'bg-white/[0.08] text-white' : 'text-zinc-400',
                ].join(' ')
              }
            >
              {label}
              {badge && <Badge n={pending} />}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-[1200px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/** Título da página + "atualizado há…" + Atualizar. */
export function PageHeader({
  title,
  subtitle,
  generatedAt,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  generatedAt?: number;
  children?: ReactNode;
}) {
  const { refresh, busy } = useRefresh();
  const fetching = useIsFetching({ queryKey: ['admin'] }) > 0;
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const spinning = busy || fetching;

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {generatedAt && (
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <LuActivity size={13} />
            Dados {ago(generatedAt)}
          </span>
        )}
        <button
          type="button"
          onClick={refresh}
          disabled={spinning}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.04] disabled:opacity-60"
        >
          <LuRefreshCw size={15} className={spinning ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>
    </div>
  );
}
