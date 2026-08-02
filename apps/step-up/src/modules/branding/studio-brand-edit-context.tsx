import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type StudioBrandEditContextValue = {
  isEditing: boolean;
  setEditing: (editing: boolean) => void;
};

const StudioBrandEditContext =
  createContext<StudioBrandEditContextValue | null>(null);

export function StudioBrandEditProvider({ children }: { children: ReactNode }) {
  const [isEditing, setEditingState] = useState(false);
  const setEditing = useCallback((editing: boolean) => {
    setEditingState(editing);
  }, []);

  const value = useMemo(
    () => ({ isEditing, setEditing }),
    [isEditing, setEditing],
  );

  return (
    <StudioBrandEditContext.Provider value={value}>
      {children}
    </StudioBrandEditContext.Provider>
  );
}

export function useStudioBrandEdit() {
  const context = useContext(StudioBrandEditContext);
  if (!context) {
    throw new Error(
      "useStudioBrandEdit must be used within StudioBrandEditProvider",
    );
  }
  return context;
}
