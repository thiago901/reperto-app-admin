import { useEffect, useMemo, useState } from 'react';
import {
  LuArrowLeft,
  LuCircleCheck,
  LuInbox,
  LuLoader,
  LuMail,
  LuRotateCcw,
  LuSend,
  LuStickyNote,
} from 'react-icons/lu';
import { useSupport, useUpdateTicket } from '../lib/api';
import { ago, dateTime, searchKey } from '../lib/format';
import type { Ticket, TicketStatus, TicketType } from '../lib/types';
import { PageHeader } from '../components/Shell';
import { Avatar, Card, Dot, Empty, ErrorState, PageSkeleton, SearchInput, Segmented, STATUS } from '../components/ui';

export const TYPE_META: Record<TicketType, { label: string; color: string }> = {
  problem: { label: 'Problema', color: '#3987e5' },
  complaint: { label: 'Reclamação', color: '#d95926' },
  suggestion: { label: 'Sugestão', color: '#199e70' },
  question: { label: 'Dúvida', color: '#c98500' },
  praise: { label: 'Elogio', color: '#d55181' },
};

const STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  new: { label: 'Aguardando você', color: STATUS.warning },
  answered: { label: 'Respondido', color: '#8b8b96' },
  resolved: { label: 'Resolvido', color: STATUS.good },
};

type Filter = 'open' | TicketStatus | 'all';

export function SupportPage() {
  const q = useSupport();
  const [filter, setFilter] = useState<Filter>('new');
  const [type, setType] = useState<TicketType | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const tickets = q.data?.tickets ?? [];
  const rows = useMemo(() => {
    const k = searchKey(query.trim());
    return tickets.filter(
      (t) =>
        (filter === 'all' || (filter === 'open' ? t.status !== 'resolved' : t.status === filter)) &&
        (type === 'all' || t.type === type) &&
        (!k || searchKey(`${t.name ?? ''} ${t.email ?? ''} ${t.messages.map((m) => m.text).join(' ')}`).includes(k)),
    );
  }, [tickets, filter, type, query]);

  // Desktop abre a primeira conversa; no celular a lista vem primeiro.
  useEffect(() => {
    if (!selected && rows[0] && window.matchMedia('(min-width: 1024px)').matches) setSelected(rows[0].id);
  }, [rows, selected]);

  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const count = (s: TicketStatus) => tickets.filter((t) => t.status === s).length;
  const current = tickets.find((t) => t.id === selected) ?? null;

  return (
    <>
      <PageHeader
        title="Atendimento"
        subtitle="Sugestões, problemas, reclamações e elogios enviados pelo app."
        generatedAt={q.data.generatedAt}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented<Filter>
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setSelected(null);
          }}
          options={[
            { value: 'new', label: 'Aguardando você', count: count('new'), color: STATUS.warning },
            { value: 'answered', label: 'Respondidos', count: count('answered') },
            { value: 'resolved', label: 'Resolvidos', count: count('resolved') },
            { value: 'all', label: 'Todos', count: tickets.length },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar pessoa ou texto" />
      </div>
      <div className="mb-4">
        <Segmented<TicketType | 'all'>
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'Todos os tipos' },
            ...(Object.keys(TYPE_META) as TicketType[]).map((k) => ({
              value: k,
              label: TYPE_META[k].label,
              color: TYPE_META[k].color,
              count: tickets.filter((t) => t.type === k).length,
            })),
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <Card className={`overflow-hidden ${current ? 'hidden lg:block' : ''}`}>
          {rows.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {rows.map((t) => {
                const last = t.messages[t.messages.length - 1];
                const on = t.id === selected;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(t.id)}
                      className={`flex w-full gap-3 px-4 py-3.5 text-left transition-colors ${on ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'}`}
                    >
                      <Avatar name={t.name} email={t.email} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-zinc-100">{t.name || t.email}</p>
                          <span className="shrink-0 text-xs text-zinc-500">{ago(t.updatedAt)}</span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                          <Dot color={TYPE_META[t.type].color} />
                          {TYPE_META[t.type].label}
                          {t.status === 'new' && (
                            <span className="ml-1 font-medium" style={{ color: STATUS.warning }}>
                              · aguardando
                            </span>
                          )}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                          {last.from === 'admin' && <span className="text-zinc-500">Você: </span>}
                          {last.text}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <LuInbox size={22} className="text-zinc-500" />
              <p className="text-sm text-zinc-400">
                {filter === 'new' ? 'Nada esperando resposta. Tudo em dia.' : 'Nenhuma mensagem aqui.'}
              </p>
            </div>
          )}
        </Card>

        {current ? (
          <TicketDetail key={current.id} ticket={current} onBack={() => setSelected(null)} />
        ) : (
          <Card className="hidden lg:block">
            <Empty>Escolha uma conversa.</Empty>
          </Card>
        )}
      </div>
    </>
  );
}

function TicketDetail({ ticket: t, onBack }: { ticket: Ticket; onBack: () => void }) {
  const update = useUpdateTicket();
  const [reply, setReply] = useState('');
  const [note, setNote] = useState(t.note ?? '');
  const noteDirty = note !== (t.note ?? '');

  const send = async (resolve = false) => {
    if (!reply.trim()) return;
    await update.mutateAsync({ id: t.id, reply: reply.trim(), ...(resolve ? { status: 'resolved' as const } : {}) });
    setReply('');
  };

  const ctx = Object.entries(t.context ?? {}).filter(([k]) => k !== 'userAgent');

  return (
    <Card className="flex min-h-[420px] flex-col">
      <header className="flex items-start gap-3 border-b border-white/[0.06] px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar para a lista"
          className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05] lg:hidden"
        >
          <LuArrowLeft size={18} />
        </button>
        <Avatar name={t.name} email={t.email} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{t.name || 'Sem nome'}</p>
          <p className="truncate text-xs text-zinc-400">{t.email}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Dot color={TYPE_META[t.type].color} />
              {TYPE_META[t.type].label}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Dot color={STATUS_META[t.status].color} />
              {STATUS_META[t.status].label}
            </span>
            <span className="text-zinc-500">aberto {dateTime(t.createdAt)}</span>
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {t.email && (
            <a
              href={`mailto:${t.email}?subject=${encodeURIComponent('Repertô: sua mensagem')}`}
              title="Responder por e-mail"
              aria-label="Responder por e-mail"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]"
            >
              <LuMail size={16} />
            </a>
          )}
          {t.status === 'resolved' ? (
            <button
              type="button"
              onClick={() => update.mutate({ id: t.id, status: 'new' })}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-sm text-zinc-200 hover:bg-white/[0.04]"
            >
              <LuRotateCcw size={15} /> Reabrir
            </button>
          ) : (
            <button
              type="button"
              onClick={() => update.mutate({ id: t.id, status: 'resolved' })}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-sm text-zinc-200 hover:bg-white/[0.04]"
            >
              <LuCircleCheck size={15} style={{ color: STATUS.good }} /> Resolver
            </button>
          )}
        </div>
      </header>

      <ol className="flex flex-1 flex-col gap-3 px-5 py-5">
        {t.messages.map((m, i) => (
          <li key={i} className={`flex ${m.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={[
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                m.from === 'admin' ? 'rounded-br-md bg-primary-600/25 text-white' : 'rounded-bl-md bg-ink-800 text-zinc-100',
              ].join(' ')}
            >
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {m.from === 'admin' ? 'Você' : 'Pessoa'} · {dateTime(m.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t border-white/[0.06] px-5 py-4">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Escreva a resposta. A pessoa recebe um aviso no sino do app."
          aria-label="Resposta"
          className="w-full resize-y rounded-xl border border-white/[0.08] bg-ink-850 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        {update.error && (
          <p className="mt-2 text-sm text-[#ec835a]" role="alert">
            {update.error instanceof Error ? update.error.message : 'Não foi possível salvar.'}
          </p>
        )}
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => send(true)}
            disabled={update.isPending || !reply.trim()}
            className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm font-medium text-zinc-200 hover:bg-white/[0.04] disabled:opacity-50"
          >
            Responder e resolver
          </button>
          <button
            type="button"
            onClick={() => send()}
            disabled={update.isPending || !reply.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          >
            {update.isPending ? <LuLoader size={15} className="animate-spin" /> : <LuSend size={15} />}
            Responder
          </button>
        </div>
      </div>

      <div className="grid gap-4 border-t border-white/[0.06] px-5 py-4 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
            <LuStickyNote size={13} /> Anotação interna
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Só você vê."
            aria-label="Anotação interna"
            className="mt-1.5 w-full resize-y rounded-lg border border-white/[0.06] bg-transparent px-2.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-primary-500/50 focus:outline-none"
          />
          {noteDirty && (
            <button
              type="button"
              onClick={() => update.mutate({ id: t.id, note })}
              className="mt-1 text-xs font-medium text-primary-300 hover:text-primary-200"
            >
              Salvar anotação
            </button>
          )}
        </div>
        {ctx.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {ctx.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-zinc-500">{CONTEXT_LABEL[k] ?? k}</dt>
                <dd className="truncate text-zinc-300">{v === 'true' ? 'sim' : v === 'false' ? 'não' : v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Card>
  );
}

const CONTEXT_LABEL: Record<string, string> = {
  platform: 'Plataforma',
  standalone: 'App instalado',
  screen: 'Tela',
};
