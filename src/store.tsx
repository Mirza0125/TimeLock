import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import ScreenGuard from '../modules/screen-guard';

export type AppLimit = {
  id: string;
  name: string;
  category: string;
  color: string;
  icon: string;
  limit: number;
  used: number;
  enabled: boolean;
};

export type Child = {
  id: string;
  name: string;
  age: number;
  time: string;
  goal: string;
  progress: number;
};

type State = {
  mode: string;
  user: { name: string; email: string } | null;
  permissions: { usage: boolean; restrictions: boolean; notifications: boolean };
  apps: AppLimit[];
  children: Child[];
  selectedApp: string | null;
  selectedChild: string | null;
  focusActive: boolean;
  focusRemaining: number;
};

type Actions = {
  setMode: (m: string) => void;
  setUser: (u: { name: string; email: string } | null) => void;
  setPermission: (k: keyof State['permissions'], v: boolean) => void;
  toggleApp: (id: string) => void;
  setAppLimit: (id: string, limit: number) => void;
  setSelectedApp: (id: string | null) => void;
  setSelectedChild: (id: string | null) => void;
  startFocus: (minutes: number) => void;
  stopFocus: () => void;
  tickFocus: () => void;
};

const Ctx = createContext<(State & Actions) | null>(null);

const initialApps: AppLimit[] = [
  {
    id: 'yt',
    name: 'YouTube',
    category: 'Video',
    color: '#ff355d',
    icon: '▶',
    limit: 90,
    used: 45,
    enabled: true,
  },
  {
    id: 'ig',
    name: 'Instagram',
    category: 'Social',
    color: '#ce3fff',
    icon: '◎',
    limit: 60,
    used: 32,
    enabled: true,
  },
  {
    id: 'tt',
    name: 'TikTok',
    category: 'Short videos',
    color: '#111827',
    icon: '♪',
    limit: 45,
    used: 19,
    enabled: true,
  },
  {
    id: 'fb',
    name: 'Facebook',
    category: 'Social',
    color: '#2b79ff',
    icon: 'f',
    limit: 0,
    used: 12,
    enabled: false,
  },
  {
    id: 'wa',
    name: 'WhatsApp',
    category: 'Messaging',
    color: '#13c98a',
    icon: '↗',
    limit: 60,
    used: 28,
    enabled: true,
  },
];

const initialChildren: Child[] = [
  { id: 'emma', name: 'Emma', age: 12, time: '3h 12m', goal: '4h daily goal', progress: 0.79 },
  { id: 'noah', name: 'Noah', age: 8, time: '1h 45m', goal: '2h daily goal', progress: 0.87 },
];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useRef(false);
  const [state, setState] = useState<State>({
    mode: 'personal',
    user: null,
    permissions: { usage: false, restrictions: false, notifications: false },
    apps: initialApps,
    children: initialChildren,
    selectedApp: null,
    selectedChild: null,
    focusActive: false,
    focusRemaining: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await ScreenGuard.loadAppState();
        if (raw) {
          const parsed = JSON.parse(raw);
          setState((s) => ({ ...s, ...parsed }));
        }
      } catch {
        // ignore
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    (async () => {
      try {
        const { apps, children, user, mode, permissions, selectedApp, selectedChild } = state;
        await ScreenGuard.saveAppState(
          JSON.stringify({ apps, children, user, mode, permissions, selectedApp, selectedChild }),
        );
      } catch {
        // ignore
      }
    })();
  }, [state]);

  const actions: Actions = {
    setMode: (m) => setState((s) => ({ ...s, mode: m })),
    setUser: (u) => setState((s) => ({ ...s, user: u })),
    setPermission: (k, v) => setState((s) => ({ ...s, permissions: { ...s.permissions, [k]: v } })),
    toggleApp: (id) =>
      setState((s) => ({
        ...s,
        apps: s.apps.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
      })),
    setAppLimit: (id, limit) =>
      setState((s) => ({ ...s, apps: s.apps.map((a) => (a.id === id ? { ...a, limit } : a)) })),
    setSelectedApp: (id) => setState((s) => ({ ...s, selectedApp: id })),
    setSelectedChild: (id) => setState((s) => ({ ...s, selectedChild: id })),
    startFocus: (minutes) =>
      setState((s) => ({ ...s, focusActive: true, focusRemaining: minutes * 60 })),
    stopFocus: () => setState((s) => ({ ...s, focusActive: false, focusRemaining: 0 })),
    tickFocus: () => setState((s) => ({ ...s, focusRemaining: Math.max(0, s.focusRemaining - 1) })),
  };

  return <Ctx.Provider value={{ ...state, ...actions }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}
