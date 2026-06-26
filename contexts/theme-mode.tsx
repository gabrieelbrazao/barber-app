import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';

export type ThemeMode = 'system' | 'light' | 'dark';
type Scheme = 'light' | 'dark';

const STORAGE_KEY = 'theme-mode';

type ThemeModeValue = {
  /** User preference: follow the device, or force light/dark. */
  mode: ThemeMode;
  /** Effective scheme after resolving `system` against the device. */
  scheme: Scheme;
  /** True once the saved preference has loaded (gates the splash to avoid a flash). */
  ready: boolean;
  setMode: (mode: ThemeMode) => void;
};

const DEFAULT: ThemeModeValue = {
  mode: 'system',
  scheme: 'light',
  ready: false,
  setMode: () => {},
};

const ThemeModeContext = createContext<ThemeModeValue>(DEFAULT);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const device = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      })
      .finally(() => setReady(true));
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }

  const scheme: Scheme = mode === 'system' ? (device === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeModeValue>(
    () => ({ mode, scheme, ready, setMode }),
    [mode, scheme, ready]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
