import { useState } from 'react';
import { useStems } from '../lib/api';
import { dateTime, duration, month, monthLong, num, pct, usd } from '../lib/format';
import { PageHeader } from '../components/Shell';
import { Card, CardHeader, Empty, ErrorState, JobStatus, PageSkeleton, Segmented, Stat, STATUS } from '../components/ui';
import { BarChart, Meter } from '../charts/Charts';

type Filter = 'all' | 'succeeded' | 'failed' | 'running';

export function StemsPage() {
  const q = useStems();
  const [filter, setFilter] = useState<Filter>('all');

  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const { summary: s, byMonth, topGroups, jobs, generatedAt } = q.data;
  const finished = s.monthSucceeded + s.monthFailed;
  const running = (st: string) => st === 'processing' || st === 'saving';
  const rows = jobs.filter((j) =>
    filter === 'all' ? true : filter === 'running' ? running(j.status) : filter === 'failed' ? j.status === 'failed' || j.status === 'canceled' : j.status === filter,
  );

  return (
    <>
      <PageHeader
        title="Faixas (IA)"
        subtitle="Separação de faixas no Replicate: uso, custo e falhas."
        generatedAt={generatedAt}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Custo no mês" value={usd(s.monthCostUsd)} accent foot={`${usd(s.totalCostUsd)} desde o início`} />
        <Stat label="Separações no mês" value={num(s.monthRuns)} foot={`${num(s.totalRuns)} no total`} />
        <Stat
          label="Taxa de sucesso"
          value={finished ? pct(s.monthSucceeded, finished) : '—'}
          foot={
            <div className="flex items-center gap-2">
              <Meter value={s.monthSucceeded} max={finished} color={STATUS.good} />
              <span className="shrink-0">{num(s.monthFailed)} falhas</span>
            </div>
          }
        />
        <Stat
          label="Custo médio"
          value={usd(s.avgCostUsd)}
          foot={`${duration(s.avgGpuSeconds)} de GPU por música${s.running ? ` · ${s.running} rodando` : ''}`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Custo por mês" hint="Últimos 6 meses, em dólar (cobrança do Replicate)" />
          <div className="px-3 pb-4 pt-2">
            <BarChart
              label="Custo de separação por mês"
              data={byMonth.map((m) => ({
                key: m.month,
                axis: month(m.month),
                title: `${monthLong(m.month)} · ${m.runs} separações${m.failed ? `, ${m.failed} falharam` : ''}`,
                value: m.costUsd,
              }))}
              format={(v) => usd(v)}
              axisFormat={(v) => `$${v.toFixed(2)}`}
              floor={0.1}
              height={220}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Grupos que mais usam" hint="Desde o início" />
          {topGroups.length ? (
            <ol className="mt-3 flex flex-col gap-4 px-5 pb-5">
              {topGroups.map((g) => (
                <li key={g.groupId}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-zinc-100">{g.name}</span>
                    <span className="shrink-0 tabular-nums text-zinc-400">
                      {g.runs} · {usd(g.costUsd)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Meter value={g.runs} max={topGroups[0].runs} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Nenhum grupo separou faixas ainda.</Empty>
          )}
          {s.limitPerGroup != null && (
            <p className="border-t border-white/[0.05] px-5 py-3 text-xs text-zinc-500">
              Limite atual: {s.limitPerGroup} separações por grupo/mês
            </p>
          )}
        </Card>
      </div>

      <div className="mb-3 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-white">Execuções</h2>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todas', count: jobs.length },
            { value: 'succeeded', label: 'Concluídas', count: jobs.filter((j) => j.status === 'succeeded').length },
            { value: 'failed', label: 'Falharam', count: jobs.filter((j) => j.status === 'failed' || j.status === 'canceled').length },
            { value: 'running', label: 'Rodando', count: jobs.filter((j) => running(j.status)).length },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
              <tr>
                <th className="py-2.5 pl-5 pr-3 font-medium">Música</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Quem pediu</th>
                <th className="px-3 py-2.5 text-right font-medium">Áudio</th>
                <th className="px-3 py-2.5 text-right font-medium">GPU</th>
                <th className="px-3 py-2.5 text-right font-medium">Custo</th>
                <th className="py-2.5 pl-3 pr-5 font-medium">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((j) => (
                <tr key={j.id} className="align-top hover:bg-white/[0.02]">
                  <td className="max-w-[260px] py-2.5 pl-5 pr-3">
                    <p className="truncate text-zinc-100">{j.musicName || 'Música removida'}</p>
                    <p className="truncate text-xs text-zinc-500">{j.groupName ?? '—'}</p>
                    {j.error && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#ec835a]" title={j.error}>
                        {j.error}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <JobStatus status={j.status} />
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-zinc-400">{j.email ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">{duration(j.sourceDuration)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">{duration(j.gpuSeconds)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-200">{j.costUsd != null ? usd(j.costUsd) : '—'}</td>
                  <td className="whitespace-nowrap py-2.5 pl-3 pr-5 text-zinc-400">{dateTime(j.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-white/[0.05] md:hidden">
          {rows.map((j) => (
            <li key={j.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm text-zinc-100">{j.musicName || 'Música removida'}</p>
                <JobStatus status={j.status} />
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {j.groupName ?? '—'} · {dateTime(j.createdAt)}
              </p>
              <p className="mt-1 text-xs tabular-nums text-zinc-400">
                {duration(j.gpuSeconds)} de GPU · {j.costUsd != null ? usd(j.costUsd) : '—'}
              </p>
              {j.error && <p className="mt-1 line-clamp-2 text-xs text-[#ec835a]">{j.error}</p>}
            </li>
          ))}
        </ul>

        {!rows.length && <Empty>Nenhuma execução aqui.</Empty>}
      </Card>
    </>
  );
}
