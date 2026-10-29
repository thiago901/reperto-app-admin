import { Link } from 'react-router-dom';
import { LuArrowRight } from 'react-icons/lu';
import { useOverview } from '../lib/api';
import { ago, day, month, monthLong, num, pct, usd } from '../lib/format';
import { PageHeader } from '../components/Shell';
import {
  AlertRow,
  Avatar,
  Card,
  CardHeader,
  Delta,
  Empty,
  ErrorState,
  JobStatus,
  PageSkeleton,
  PLAN_META,
  PlanBadge,
  Stat,
} from '../components/ui';
import { BarChart, LineChart, Meter, SERIES, SplitBar } from '../charts/Charts';

export function OverviewPage() {
  const q = useOverview();
  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const { overview: o, daily, stemsByMonth, alerts, recentUsers, recentStemJobs, generatedAt } = q.data;
  const paying = o.plans.paid;

  return (
    <>
      <PageHeader title="Visão geral" subtitle="Como o Repertô está agora." generatedAt={generatedAt} />

      {alerts.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="Precisa da sua atenção" />
          <ul className="mt-2 divide-y divide-white/[0.05]">
            {alerts.slice(0, 4).map((a) => (
              <AlertRow key={a.title} alert={a} />
            ))}
          </ul>
          {alerts.length > 4 && (
            <Link to="/sistema" className="block border-t border-white/[0.05] px-5 py-3 text-xs text-zinc-400 hover:text-white">
              Ver todos os {alerts.length} avisos
            </Link>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Contas"
          value={num(o.users.total)}
          foot={<Delta value={o.users.new30} label="nos últimos 30 dias" />}
        />
        <Stat
          label="Ativos em 7 dias"
          value={num(o.users.active7)}
          foot={
            <span>
              {pct(o.users.active7, o.users.total)} das contas · {num(o.users.active1)} hoje
            </span>
          }
        />
        <Stat
          label="Assinantes pagos"
          value={num(paying)}
          accent
          foot={
            <span>
              {num(o.plans.trial)} em teste · {num(o.plans.grandfathered)} cortesia
            </span>
          }
        />
        <Stat
          label="Custo das faixas no mês"
          value={usd(o.stems.monthCostUsd)}
          foot={
            <span>
              {num(o.stems.monthRuns)} separações · {usd(o.stems.totalCostUsd)} no total
            </span>
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Novas contas por dia" hint={`${num(o.users.new30)} nos últimos 30 dias`} />
          <div className="px-3 pb-4 pt-2">
            <BarChart
              label="Novas contas por dia nos últimos 30 dias"
              data={daily.map((d) => ({ key: d.date, axis: day(d.date), title: day(d.date), value: d.signups }))}
              axisEvery={7}
              format={(v) => num(Math.round(v))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Contas por plano" hint={`${num(o.users.total)} contas`} />
          <div className="px-5 pb-5 pt-5">
            <SplitBar
              label="Distribuição das contas por plano"
              parts={(['paid', 'trial', 'grandfathered', 'free'] as const).map((k) => ({
                key: k,
                label: PLAN_META[k].label,
                value: o.plans[k],
                color: PLAN_META[k].color,
              }))}
            />
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.05] pt-4 text-xs">
              <div>
                <dt className="text-zinc-500">Cancelando</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-white">{num(o.plans.cancelling)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Testes acabando (7 d)</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-white">{num(o.plans.trialsEnding7)}</dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Uso do app por dia" hint="O que as equipes criaram nos últimos 30 dias" />
          <div className="px-3 pb-4 pt-3">
            <LineChart
              label="Músicas, escalas e separações criadas por dia"
              axis={daily.map((d) => day(d.date))}
              titles={daily.map((d) => day(d.date))}
              axisEvery={7}
              series={[
                { name: 'Músicas', color: SERIES[0], values: daily.map((d) => d.musics) },
                { name: 'Escalas', color: SERIES[1], values: daily.map((d) => d.schedules) },
                { name: 'Separações', color: SERIES[2], values: daily.map((d) => d.stems) },
              ]}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Grupos e conteúdo" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 px-5 pb-5 pt-5">
            <Fact label="Grupos" value={num(o.groups.total)} hint={`${num(o.groups.new30)} novos em 30 d`} />
            <Fact label="Ativos em 30 d" value={num(o.groups.active30)} hint={pct(o.groups.active30, o.groups.total)} />
            <Fact label="Com equipe" value={num(o.groups.withTeam)} hint={`média ${o.groups.avgMembers} membros`} />
            <Fact label="Músicas" value={num(o.content.musics)} hint={`${num(o.content.musicsNew30)} em 30 d`} />
            <Fact label="Escalas" value={num(o.content.schedules)} hint={`${num(o.content.upcomingSchedules)} por vir`} />
            <Fact label="Com faixas" value={num(o.content.musicsWithStems)} hint="músicas separadas" />
          </dl>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Custo das faixas por mês"
            hint={`média ${usd(o.stems.avgCostUsd)} por separação`}
            action={<MoreLink to="/faixas" />}
          />
          <div className="px-3 pb-4 pt-2">
            <BarChart
              label="Custo da separação de faixas nos últimos 6 meses"
              data={stemsByMonth.map((m) => ({
                key: m.month,
                axis: month(m.month),
                title: `${monthLong(m.month)} · ${m.runs} separações`,
                value: m.costUsd,
              }))}
              format={(v) => usd(v)}
              axisFormat={(v) => `$${v.toFixed(2)}`}
              floor={0.1}
              height={180}
            />
          </div>
          {o.stems.limitPerGroup != null && (
            <p className="border-t border-white/[0.05] px-5 py-3 text-xs text-zinc-500">
              Limite por grupo: {o.stems.limitPerGroup} separações/mês
            </p>
          )}
        </Card>

        <Card>
          <CardHeader title="Cadastros recentes" action={<MoreLink to="/usuarios" />} />
          {recentUsers.length ? (
            <ul className="mt-2 divide-y divide-white/[0.05]">
              {recentUsers.map((u) => (
                <li key={u.uid} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={u.name} email={u.email} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-100">{u.name || u.email}</p>
                    <p className="truncate text-xs text-zinc-500">{ago(u.createdAt)}</p>
                  </div>
                  <PlanBadge plan={u.plan} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhuma conta ainda.</Empty>
          )}
        </Card>

        <Card>
          <CardHeader title="Últimas separações" action={<MoreLink to="/faixas" />} />
          {recentStemJobs.length ? (
            <ul className="mt-2 divide-y divide-white/[0.05]">
              {recentStemJobs.map((j) => (
                <li key={j.id} className="px-5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-zinc-100">{j.musicName || 'Música removida'}</p>
                    <JobStatus status={j.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {j.groupName ?? '—'} · {ago(j.createdAt)}
                    {j.costUsd != null && ` · ${usd(j.costUsd)}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhuma separação ainda.</Empty>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Voltaram em 7 d" value={num(o.users.returning7)} hint="contas com mais de 30 dias" />
        <MiniStat label="E-mail confirmado" value={pct(o.users.verified, o.users.total)} meter={[o.users.verified, o.users.total]} />
        <MiniStat label="Aparelhos com notificação" value={num(o.pushDevices)} />
        <MiniStat label="Contas excluídas (30 d)" value={num(o.deletions30)} />
      </div>
    </>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-white">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-zinc-500">{hint}</dd>}
    </div>
  );
}

function MiniStat({ label, value, hint, meter }: { label: string; value: string; hint?: string; meter?: [number, number] }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
      {meter && (
        <div className="mt-2">
          <Meter value={meter[0]} max={meter[1]} />
        </div>
      )}
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </Card>
  );
}

function MoreLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-zinc-400 hover:bg-white/[0.04] hover:text-white"
    >
      Ver tudo <LuArrowRight size={13} />
    </Link>
  );
}
