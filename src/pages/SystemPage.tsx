import { useSystem } from '../lib/api';
import { dateTime, num, uptime, usd } from '../lib/format';
import { PageHeader } from '../components/Shell';
import { AlertRow, Card, CardHeader, Check, Empty, ErrorState, PageSkeleton } from '../components/ui';

export function SystemPage() {
  const q = useSystem();
  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const { alerts, system, pushDevices, generatedAt } = q.data;
  const c = system.config;

  return (
    <>
      <PageHeader title="Sistema" subtitle="Saúde do servidor e o que está ligado." generatedAt={generatedAt} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Avisos" hint={alerts.length ? `${alerts.length} no momento` : undefined} />
          {alerts.length ? (
            <ul className="mt-2 divide-y divide-white/[0.05]">
              {alerts.map((a) => (
                <AlertRow key={a.title} alert={a} />
              ))}
            </ul>
          ) : (
            <Empty>Tudo em ordem. Nenhum aviso agora.</Empty>
          )}
        </Card>

        <Card>
          <CardHeader title="Servidor" hint="reperto-backend" />
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 px-5 pb-5">
            <Item label="No ar há" value={uptime(system.uptimeSec)} hint={`desde ${dateTime(system.startedAt)}`} />
            <Item label="Memória" value={`${num(system.memoryMb)} MB`} />
            <Item label="Node" value={system.node} mono />
            <Item label="Aparelhos com notificação" value={num(pushDevices)} />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Serviços" />
          <ul className="mt-2 divide-y divide-white/[0.05]">
            <Check ok={c.stripe} label="Pagamento com cartão (Stripe)" />
            <Check ok={c.revenueCat} label="Google Play (RevenueCat)" />
            <Check ok={c.storage} label="Armazenamento de áudios (S3)" />
            <Check
              ok={c.stems}
              label="Separação de faixas (Replicate)"
              detail={
                c.stems
                  ? `${c.stemsOpenToManagers ? 'Liberada para líderes e admins de todos os grupos' : `Só ${c.stemsAllowEmails} e-mail(s) liberado(s)`} · limite ${c.stemsMonthlyLimit}/grupo/mês · ${usd((c.stemsCostPerSecondUsd ?? 0) * 60)} por minuto de GPU`
                  : undefined
              }
            />
          </ul>
        </Card>

        <Card>
          <CardHeader title="Configuração do app" />
          <dl className="mt-3 flex flex-col gap-4 px-5 pb-5">
            <Item label="Teste grátis" value={c.trialDays ? `${c.trialDays} dias` : 'Desligado'} />
            <div>
              <dt className="text-xs text-zinc-500">Origens liberadas (CORS)</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {c.origins.map((o) => (
                  <span key={o} className="rounded-md bg-white/[0.05] px-2 py-1 font-mono text-xs text-zinc-300">
                    {o}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}

function Item({ label, value, hint, mono }: { label: string; value: string; hint?: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={`mt-1 text-base font-semibold text-white ${mono ? 'font-mono text-sm' : 'tabular-nums'}`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-zinc-500">{hint}</dd>}
    </div>
  );
}
