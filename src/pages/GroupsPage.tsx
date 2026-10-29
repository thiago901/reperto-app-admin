import { useMemo, useState } from 'react';
import { useGroups } from '../lib/api';
import { ago, date, num, searchKey, usd } from '../lib/format';
import type { AdminGroup } from '../lib/types';
import { PageHeader } from '../components/Shell';
import { Card, Empty, ErrorState, PageSkeleton, PlanBadge, SearchInput, Segmented, SortTh } from '../components/ui';

type SortKey = 'name' | 'members' | 'musics' | 'schedules' | 'stemRuns' | 'lastActivityAt' | 'createdAt';
type Filter = 'all' | 'active' | 'team' | 'stems' | 'idle';

const DAY = 86_400_000;

export function GroupsPage() {
  const q = useGroups();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'lastActivityAt', dir: -1 });

  const groups = q.data?.groups ?? [];
  const now = q.data?.generatedAt ?? 0;
  const active = (g: AdminGroup) => !!g.lastActivityAt && now - g.lastActivityAt < 30 * DAY;
  const tests: Record<Filter, (g: AdminGroup) => boolean> = {
    all: () => true,
    active,
    team: (g) => g.members >= 2,
    stems: (g) => g.stemRuns > 0,
    idle: (g) => !active(g),
  };

  const rows = useMemo(() => {
    const k = searchKey(query.trim());
    const list = groups.filter(
      (g) => tests[filter](g) && (!k || searchKey(`${g.name} ${g.ownerEmail ?? ''}`).includes(k)),
    );
    return [...list].sort((a, b) => {
      const va = sort.key === 'name' ? searchKey(a.name) : (a[sort.key] ?? 0);
      const vb = sort.key === 'name' ? searchKey(b.name) : (b[sort.key] ?? 0);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [groups, query, filter, sort]);

  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'name' ? 1 : -1 }));

  return (
    <>
      <PageHeader
        title="Grupos"
        subtitle={`${num(groups.length)} ministérios e equipes usando o app.`}
        generatedAt={q.data.generatedAt}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todos', count: groups.length },
            { value: 'active', label: 'Ativos (30 d)', count: groups.filter(tests.active).length },
            { value: 'team', label: 'Com equipe', count: groups.filter(tests.team).length },
            { value: 'stems', label: 'Usam faixas', count: groups.filter(tests.stems).length },
            { value: 'idle', label: 'Parados', count: groups.filter(tests.idle).length },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar grupo ou dono" />
      </div>

      <Card className="overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr>
                <SortTh k="name" sort={sort} onSort={onSort}>
                  Grupo
                </SortTh>
                <SortTh k="members" sort={sort} onSort={onSort} align="right">
                  Membros
                </SortTh>
                <SortTh k="musics" sort={sort} onSort={onSort} align="right">
                  Músicas
                </SortTh>
                <SortTh k="schedules" sort={sort} onSort={onSort} align="right">
                  Escalas
                </SortTh>
                <SortTh k="stemRuns" sort={sort} onSort={onSort} align="right">
                  Separações
                </SortTh>
                <SortTh k="lastActivityAt" sort={sort} onSort={onSort}>
                  Última atividade
                </SortTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((g) => (
                <tr key={g.id} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 pl-5 pr-3">
                    <p className="truncate font-medium text-zinc-100">{g.name}</p>
                    <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-zinc-500">
                      {g.ownerEmail ?? 'dono removido'}
                      <PlanBadge plan={g.ownerPlan} />
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">{g.members}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">{num(g.musics)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">
                    {num(g.schedules)}
                    {g.upcoming > 0 && <span className="block text-xs text-zinc-500">{g.upcoming} por vir</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">
                    {g.stemRuns || <span className="text-zinc-600">—</span>}
                    {g.stemRuns > 0 && <span className="block text-xs text-zinc-500">{usd(g.stemCostUsd)}</span>}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pl-3 pr-5">
                    <p className={active(g) ? 'text-zinc-200' : 'text-zinc-500'}>{ago(g.lastActivityAt, now)}</p>
                    <p className="text-xs text-zinc-500">criado {date(g.createdAt)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-white/[0.05] md:hidden">
          {rows.map((g) => (
            <li key={g.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-sm font-medium text-zinc-100">{g.name}</p>
                <span className="shrink-0 text-xs text-zinc-500">{ago(g.lastActivityAt, now)}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-500">{g.ownerEmail}</p>
              <p className="mt-1.5 text-xs tabular-nums text-zinc-400">
                {g.members} membros · {g.musics} músicas · {g.schedules} escalas
                {g.stemRuns > 0 && ` · ${g.stemRuns} separações`}
              </p>
            </li>
          ))}
        </ul>

        {!rows.length && <Empty>Nenhum grupo com esses filtros.</Empty>}
      </Card>
    </>
  );
}
