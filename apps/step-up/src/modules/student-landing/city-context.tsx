import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_CITY_ID, isLiveCity, LAUNCH_CITY_IDS } from "./types";

const STORAGE_KEY = "classa-city";

const CITY_LABELS: Record<string, string> = {
  chennai: "Chennai",
  bengaluru: "Bengaluru",
  hyderabad: "Hyderabad",
  mumbai: "Mumbai",
  delhi: "Delhi",
  coimbatore: "Coimbatore",
};

function readStoredCity() {
  if (typeof window === "undefined") return DEFAULT_CITY_ID;
  try {
    const stored = window.localStorage
      .getItem(STORAGE_KEY)
      ?.trim()
      .toLowerCase();
    if (stored && isLiveCity(stored)) return stored;
  } catch {
    return DEFAULT_CITY_ID;
  }
  return DEFAULT_CITY_ID;
}

function writeStoredCity(id: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

export type CityOption = {
  id: string;
  label: string;
  available: boolean;
};

type DiscoverCityContextValue = {
  cityId: string;
  cityLabel: string;
  cities: CityOption[];
  selectCity: (id: string) => boolean;
};

const DiscoverCityContext = createContext<DiscoverCityContextValue | null>(
  null,
);

export function DiscoverCityProvider({ children }: { children: ReactNode }) {
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);

  useEffect(() => {
    setCityId(readStoredCity());
  }, []);

  const cities = useMemo<CityOption[]>(
    () =>
      LAUNCH_CITY_IDS.map((id) => ({
        id,
        label: CITY_LABELS[id] ?? id,
        available: isLiveCity(id),
      })),
    [],
  );

  const selectCity = useCallback((id: string) => {
    const next = id.trim().toLowerCase();
    if (!isLiveCity(next)) return false;
    setCityId(next);
    writeStoredCity(next);
    return true;
  }, []);

  const value = useMemo(
    () => ({
      cityId,
      cityLabel: CITY_LABELS[cityId] ?? "Chennai",
      cities,
      selectCity,
    }),
    [cityId, cities, selectCity],
  );

  return (
    <DiscoverCityContext.Provider value={value}>
      {children}
    </DiscoverCityContext.Provider>
  );
}

export function useDiscoverCity() {
  const value = useContext(DiscoverCityContext);
  if (!value) {
    return {
      cityId: DEFAULT_CITY_ID,
      cityLabel: "Chennai",
      cities: LAUNCH_CITY_IDS.map((id) => ({
        id,
        label: CITY_LABELS[id] ?? id,
        available: isLiveCity(id),
      })),
      selectCity: () => false,
    };
  }
  return value;
}
