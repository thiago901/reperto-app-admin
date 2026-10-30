import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { auth } from './firebase';
import type {
  AdminGroup,
  AdminStemJob,
  AdminUser,
  FinanceEntryInput,
  FinanceReport,
  FinanceSettings,
  MonthPoint,
  Overview,
  StemsSummary,
  SystemInfo,
  Ticket,
  TicketStatus,
  TopGroup,
} from './types';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const APP_ID = import.meta.env.VITE_APP_ID || 'reperto';
/** Dados fictícios, só em desenvolvimento (VITE_DEMO=true). */
export const DEMO = import.meta.env.DEV && import.meta.env.VITE_DEMO === 'true';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  if (DEMO) {
    const { demoResponse } = await import('./demo');
    await new Promise((r) => setTimeout(r, 300));
    return demoResponse(path, init) as T;
  }
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'Sessão encerrada.');
  const token = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}/v1/${APP_ID}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível falar com o servidor. Confira a URL da API e as origens (CORS).');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Erro ${res.status}`);
  return body as T;
}

/**
 * Leituras do painel. O servidor guarda o retrato por 1 minuto; "Atualizar"
 * pede um novo (`fresh=1`) e repõe todas as telas.
 */
function useAdmin<T>(key: string, path: string) {
  return useQuery({
    queryKey: ['admin', key],
    queryFn: () => api<T>(path),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export const useOverview = () => useAdmin<Overview>('overview', '/admin/overview');
export const useUsers = () => useAdmin<{ generatedAt: number; users: AdminUser[] }>('users', '/admin/users');
export const useGroups = () => useAdmin<{ generatedAt: number; groups: AdminGroup[] }>('groups', '/admin/groups');
export const useStems = () =>
  useAdmin<{
    generatedAt: number;
    summary: StemsSummary;
    byMonth: MonthPoint[];
    topGroups: TopGroup[];
    jobs: AdminStemJob[];
  }>('stems', '/admin/stems');
export const useSystem = () => useAdmin<SystemInfo>('system', '/admin/system');
export const useSupport = () => useAdmin<{ generatedAt: number; tickets: Ticket[] }>('support', '/admin/support');
export const useFinance = () => useAdmin<FinanceReport>('finance', '/admin/finance');

/** Escritas do painel: ao terminar, recarrega a tela (e a visão geral). */
function useWrite<V>(fn: (v: V) => Promise<unknown>, keys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: ['admin', k] }))),
  });
}

export const useUpdateTicket = () =>
  useWrite(
    ({ id, ...body }: { id: string; status?: TicketStatus; note?: string; reply?: string }) =>
      api(`/admin/support/${id}`, { method: 'POST', body }),
    ['support', 'overview'],
  );

export const useSaveEntry = () =>
  useWrite(
    ({ id, ...body }: FinanceEntryInput & { id?: string }) =>
      id
        ? api(`/admin/finance/entries/${id}`, { method: 'PUT', body })
        : api('/admin/finance/entries', { method: 'POST', body }),
    ['finance'],
  );

export const useDeleteEntry = () =>
  useWrite((id: string) => api(`/admin/finance/entries/${id}`, { method: 'DELETE' }), ['finance']);

export const useSaveFinanceSettings = () =>
  useWrite((body: FinanceSettings) => api('/admin/finance/settings', { method: 'PUT', body }), ['finance']);

/** Refaz o retrato no servidor e recarrega o que estiver na tela. */
export function useRefresh() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    try {
      await api('/admin/overview?fresh=1');
      await qc.invalidateQueries({ queryKey: ['admin'] });
    } finally {
      setBusy(false);
    }
  };
  return { refresh, busy };
}
