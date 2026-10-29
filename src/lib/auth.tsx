import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { api, ApiError, DEMO } from './api';

type State =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** Logado, mas o servidor não reconhece como administrador. */
  | { status: 'denied'; user: User; reason: string }
  | { status: 'admin'; user: User };

interface AuthValue {
  state: State;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

/**
 * Quem decide se você é administrador é o servidor (`/admin/check`): o front
 * só mostra o resultado. Tirar seu e-mail de `admins` fecha o painel na hora.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (DEMO) {
      setState({ status: 'admin', user: { displayName: 'Admin Demo', email: 'admin@exemplo.com' } as User });
      return;
    }
    return onIdTokenChanged(auth, async (user) => {
      if (!user) return setState({ status: 'signedOut' });
      try {
        const res = await api<{ admin: boolean; emailVerified: boolean }>('/admin/check');
        if (res.admin) setState({ status: 'admin', user });
        else
          setState({
            status: 'denied',
            user,
            reason: res.emailVerified
              ? 'Esta conta não está na lista de administradores do servidor.'
              : 'Confirme o e-mail desta conta no app antes de entrar no painel.',
          });
      } catch (e) {
        setState({
          status: 'denied',
          user,
          reason: e instanceof ApiError ? e.message : 'Não foi possível confirmar o acesso.',
        });
      }
    });
  }, []);

  const value: AuthValue = {
    state,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    // Mesmo e-mail = mesma conta: o Firebase liga o Google à conta que já existe.
    signInWithGoogle: async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    },
    resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
    signOut: () => signOut(auth),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}
