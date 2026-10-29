import { useState, type FormEvent } from 'react';
import { LuLoader, LuLock, LuShieldAlert } from 'react-icons/lu';
import { useAuth } from '../lib/auth';

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
};

export function LoginPage() {
  const { state, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setError(FIREBASE_ERRORS[code] ?? 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-ink-950 px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary-600/10 blur-3xl"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/favicon.svg" alt="" className="h-11 w-11" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-white">Repertô Admin</h1>
          <p className="mt-1 text-sm text-zinc-400">Painel de operação. Acesso restrito.</p>
        </div>

        {state.status === 'denied' ? (
          <div className="rounded-2xl border border-white/[0.08] bg-ink-900 p-6 text-center">
            <LuShieldAlert size={22} className="mx-auto text-[#fab219]" />
            <p className="mt-3 text-sm font-medium text-white">Sem acesso ao painel</p>
            <p className="mt-1 text-sm text-zinc-400">{state.reason}</p>
            <p className="mt-3 truncate text-xs text-zinc-500">{state.user.email}</p>
            <button
              type="button"
              onClick={signOut}
              className="mt-5 h-10 w-full rounded-xl border border-white/[0.1] text-sm font-medium text-zinc-200 hover:bg-white/[0.04]"
            >
              Entrar com outra conta
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-white/[0.08] bg-ink-900 p-6">
            <label className="block">
              <span className="text-xs font-medium text-zinc-400">E-mail</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-white/[0.08] bg-ink-850 px-3 text-sm text-white focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-medium text-zinc-400">Senha</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-white/[0.08] bg-ink-850 px-3 text-sm text-white focus:border-primary-500/60 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </label>
            {error && (
              <p className="mt-3 text-sm text-[#ec835a]" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-60"
            >
              {busy ? <LuLoader size={16} className="animate-spin" /> : <LuLock size={15} />}
              Entrar
            </button>
            <p className="mt-4 text-center text-xs text-zinc-500">Use a mesma conta do app Repertô.</p>
          </form>
        )}
      </div>
    </div>
  );
}
