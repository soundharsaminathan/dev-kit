"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  cachePackModule,
  getActivePack,
  getCachedPack,
  setActivePack,
} from "./icon-cache";
import { getCustomPackLoader } from "./register-icon-pack";
import type { IconContextValue, IconPackModule, IconTheme } from "./types";
import { resolvePackId } from "./types";

const IconContext = createContext<IconContextValue | undefined>(undefined);
const EMPTY_LOADERS: Record<
  string,
  () => Promise<{ default: IconPackModule }>
> = {};

export interface IconProviderProps {
  children: React.ReactNode;
  icons?: IconTheme | undefined;
  initialPack?: IconPackModule | undefined;
  loaders?: Record<string, () => Promise<{ default: IconPackModule }>>;
}

async function loadPackModule(
  packId: string,
  loaders: Record<string, () => Promise<{ default: IconPackModule }>>,
): Promise<IconPackModule> {
  const customLoader = getCustomPackLoader(packId);
  if (customLoader) {
    const mod = await customLoader();
    return mod.default;
  }

  const loader = loaders[packId];
  if (!loader) {
    throw new Error(`Unknown icon pack: ${packId}`);
  }

  const mod = await loader();
  return mod.default;
}

function hasPackLoader(
  packId: string,
  loaders: Record<string, () => Promise<{ default: IconPackModule }>>,
): boolean {
  return Boolean(getCustomPackLoader(packId) || loaders[packId]);
}

export function IconProvider({
  children,
  icons,
  initialPack,
  loaders: loadersProp,
}: IconProviderProps) {
  const loaders = loadersProp ?? EMPTY_LOADERS;
  const defaultTheme = useMemo<IconTheme>(
    () => icons ?? { library: "lucide" },
    [icons],
  );

  const [theme, setTheme] = useState<IconTheme>(defaultTheme);
  const [pack, setPack] = useState<IconPackModule | null>(() => {
    if (initialPack) {
      const packId = resolvePackId(defaultTheme);
      setActivePack(packId, initialPack);
      return initialPack;
    }
    return getActivePack();
  });
  const [isLoading, setIsLoading] = useState(false);

  const packId = resolvePackId(theme);

  useEffect(() => {
    if (initialPack && resolvePackId(defaultTheme) === packId) {
      setActivePack(packId, initialPack);
      setPack(initialPack);
      return;
    }

    const cached = getCachedPack(packId);
    if (cached) {
      setActivePack(packId, cached);
      setPack(cached);
      setIsLoading(false);
      return;
    }

    if (!hasPackLoader(packId, loaders)) {
      setPack(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const promise = cachePackModule(packId, loadPackModule(packId, loaders));

    promise
      .then((loadedPack) => {
        if (!cancelled) {
          setActivePack(packId, loadedPack);
          setPack(loadedPack);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [defaultTheme, initialPack, loaders, packId]);

  useEffect(() => {
    setTheme(defaultTheme);
  }, [defaultTheme]);

  const getIcon = useCallback(
    (name: import("../generated/icon-names").IconName) => {
      const renderPack = pack ?? getActivePack();
      return renderPack?.icons[name] ?? null;
    },
    [pack],
  );

  const value = useMemo<IconContextValue>(
    () => ({
      packId,
      theme,
      pack,
      isLoading,
      setTheme,
      getIcon,
    }),
    [getIcon, isLoading, pack, packId, theme],
  );

  return <IconContext.Provider value={value}>{children}</IconContext.Provider>;
}

export function useIcons(): IconContextValue {
  const context = useContext(IconContext);
  if (!context) {
    throw new Error("useIcons must be used within an IconProvider");
  }
  return context;
}
