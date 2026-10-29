import { useMemo, useState } from 'react';
import { LuBadgeCheck, LuBan } from 'react-icons/lu';
import { useUsers } from '../lib/api';
import { ago, date, num, searchKey } from '../lib/format';
import type { AdminUser, PlanStatus } from '../lib/types';
import { PageHeader } from '../components/Shell';
import { Avatar, Card, Empty, ErrorState, PageSkeleton, PLAN_META, PlanBadge, SearchInput, Segmented, SortTh } from '../components/ui';

type SortKey = 'name' | 'plan' | 'groups' | 'createdAt' | 'lastActiveAt';
type Filter = 'all' | PlanStatus | 'inactive';

const PLAN_ORDER: Record<PlanStatus, number> = { paid: 0, trial: 1, grandfathered: 2, free: 3 };
const INACTIVE_DAYS = 30;

export function UsersPage() {
  const q = useUsers();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'createdAt', dir: -1 });

  const users = q.data?.users ?? [];
  const now = q.data?.generatedAt ?? 0;
  const inactive = (u: AdminUser) => !u.lastActiveAt || now - u.lastActiveAt > INACTIVE_DAYS * 86_400_000;

  const rows = useMemo(() => {
    const k = searchKey(query.trim());
    const list = users.filter((u) => {
      if (filter === 'inactive' ? !inactive(u) : filter !== 'all' && u.plan !== filter) return false;
      return !k || searchKey(`${u.name ?? ''} ${u.email ?? ''}`).includes(k);
    });
    const val = (u: AdminUser): string | number => {
      switch (sort.key) {
        case 'name':
          return searchKey(u.name || u.email || '');
        case 'plan':
          return PLAN_ORDER[u.plan];
        case 'groups':
          return u.groups;
        default:
          return u[sort.key] ?? 0;
      }
    };
    return [...list].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [users, query, filter, sort]);

  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const count = (p: PlanStatus) => users.filter((u) => u.plan === p).length;
  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'name' ? 1 : -1 }));

  return (
    <>
      <PageHeader title="Usuários" subtitle={`${num(users.length)} contas no Repertô.`} generatedAt={q.data.generatedAt} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todas', count: users.length },
            ...(['paid', 'trial', 'grandfathered', 'free'] as const).map((p) => ({
              value: p,
              label: PLAN_META[p].label,
              count: count(p),
              color: PLAN_META[p].color,
            })),
            { value: 'inactive', label: `Sumidas há ${INACTIVE_DAYS}+ dias`, count: users.filter(inactive).length },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nome ou e-mail" />
      </div>

      <Card className="overflow-hidden">
        {/* tabela (tablet/desktop) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr>
                <SortTh k="name" sort={sort} onSort={onSort}>
                  Pessoa
                </SortTh>
                <SortTh k="plan" sort={sort} onSort={onSort}>
                  Plano
                </SortTh>
                <SortTh k="groups" sort={sort} onSort={onSort} align="right">
                  Grupos
                </SortTh>
                <SortTh k="createdAt" sort={sort} onSort={onSort}>
                  Conta criada
                </SortTh>
                <SortTh k="lastActiveAt" sort={sort} onSort={onSort}>
                  Último acesso
                </SortTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((u) => (
                <tr key={u.uid} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} email={u.email} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-zinc-100">
                          {u.name || <span className="text-zinc-400">Sem nome</span>}
                          {u.verified && <LuBadgeCheck size={14} className="shrink-0 text-zinc-500" aria-label="E-mail confirmado" />}
                          {u.disabled && <LuBan size={14} className="shrink-0 text-[#d03b3b]" aria-label="Conta desativada" />}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <PlanBadge plan={u.plan} cancelling={u.cancelling} />
                    {u.plan === 'trial' && u.planEndsAt && (
                      <p className="mt-1 text-xs text-zinc-500">até {date(u.planEndsAt)}</p>
                    )}
                    {u.plan === 'paid' && u.planSource && <p className="mt-1 text-xs text-zinc-500">{sourceLabel(u.planSource)}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">
                    {u.groups}
                    {u.ownedGroups > 0 && <span className="text-xs text-zinc-500"> · dono de {u.ownedGroups}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-zinc-400">{date(u.createdAt)}</td>
                  <td className="whitespace-nowrap py-2.5 pl-3 pr-5">
                    <span className={inactive(u) ? 'text-zinc-500' : 'text-zinc-200'}>{ago(u.lastActiveAt, now)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* cartões (celular) */}
        <ul className="divide-y divide-white/[0.05] md:hidden">
          {rows.map((u) => (
            <li key={u.uid} className="flex items-start gap-3 px-4 py-3">
              <Avatar name={u.name} email={u.email} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-100">{u.name || u.email}</p>
                <p className="truncate text-xs text-zinc-500">{u.email}</p>
                <p className="mt-1.5 text-xs text-zinc-500">
                  {u.groups} grupo{u.groups === 1 ? '' : 's'} · visto {ago(u.lastActiveAt, now)}
                </p>
              </div>
              <PlanBadge plan={u.plan} />
            </li>
          ))}
        </ul>

        {!rows.length && <Empty>Ninguém encontrado com esses filtros.</Empty>}
      </Card>
      <p className="mt-3 text-xs text-zinc-500">
        "Último acesso" é a última vez que o app renovou a sessão da pessoa (acontece sozinho a cada uso).
      </p>
    </>
  );
}

function sourceLabel(s: string) {
  return s === 'stripe' ? 'Cartão (Stripe)' : s === 'revenuecat' ? 'Google Play' : s === 'manual' ? 'Liberado à mão' : s;
}
