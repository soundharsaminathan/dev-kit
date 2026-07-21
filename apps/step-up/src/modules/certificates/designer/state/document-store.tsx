import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { CertificateDocument, CertificateElement } from "../../schema";
import {
  createInitialDesignerState,
  type DesignerAction,
  type DesignerState,
  designerReducer,
} from "./history";

type DesignerContextValue = {
  state: DesignerState;
  dispatch: (action: DesignerAction) => void;
  selected: CertificateElement | null;
  updateSelected: (patch: Partial<CertificateElement>) => void;
  setPage: (patch: Partial<CertificateDocument["page"]>) => void;
  setGrid: (patch: Partial<CertificateDocument["grid"]>) => void;
  setCertificateNumber: (
    patch: Partial<CertificateDocument["certificateNumber"]>,
  ) => void;
};

const DesignerContext = createContext<DesignerContextValue | null>(null);

export function DesignerProvider({
  document,
  name,
  children,
}: {
  document: CertificateDocument;
  name: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    designerReducer,
    createInitialDesignerState(document, name),
  );

  const selected = useMemo(
    () =>
      state.document.elements.find((el) => el.id === state.selectedId) ?? null,
    [state.document.elements, state.selectedId],
  );

  const updateSelected = useCallback(
    (patch: Partial<CertificateElement>) => {
      if (!state.selectedId) return;
      dispatch({ type: "UPDATE_ELEMENT", id: state.selectedId, patch });
    },
    [state.selectedId],
  );

  const setPage = useCallback(
    (patch: Partial<CertificateDocument["page"]>) => {
      dispatch({
        type: "SET_DOCUMENT",
        document: {
          ...state.document,
          page: { ...state.document.page, ...patch },
        },
      });
    },
    [state.document],
  );

  const setGrid = useCallback(
    (patch: Partial<CertificateDocument["grid"]>) => {
      dispatch({
        type: "SET_DOCUMENT",
        document: {
          ...state.document,
          grid: { ...state.document.grid, ...patch },
        },
      });
    },
    [state.document],
  );

  const setCertificateNumber = useCallback(
    (patch: Partial<CertificateDocument["certificateNumber"]>) => {
      dispatch({
        type: "SET_DOCUMENT",
        document: {
          ...state.document,
          certificateNumber: {
            ...state.document.certificateNumber,
            ...patch,
            style: {
              ...state.document.certificateNumber.style,
              ...(patch.style ?? {}),
            },
          },
        },
      });
    },
    [state.document],
  );

  const value = useMemo(
    () => ({
      state,
      dispatch,
      selected,
      updateSelected,
      setPage,
      setGrid,
      setCertificateNumber,
    }),
    [state, selected, updateSelected, setPage, setGrid, setCertificateNumber],
  );

  return (
    <DesignerContext.Provider value={value}>
      {children}
    </DesignerContext.Provider>
  );
}

export function useDesigner() {
  const ctx = useContext(DesignerContext);
  if (!ctx) {
    throw new Error("useDesigner must be used within DesignerProvider");
  }
  return ctx;
}

export function useDesignerAutosave(
  save: (payload: {
    name: string;
    layoutJson: CertificateDocument;
  }) => Promise<void>,
  enabled: boolean,
  debounceMs = 1000,
) {
  const { state, dispatch } = useDesigner();
  const saveRef = useRef(save);
  saveRef.current = save;
  const [saving, setSaving] = useState(false);
  const saveGeneration = useRef(0);

  useEffect(() => {
    if (!enabled || !state.dirty) return;

    const timer = window.setTimeout(() => {
      const generation = ++saveGeneration.current;
      const payload = {
        name: state.name,
        layoutJson: state.document,
      };
      setSaving(true);
      void saveRef
        .current(payload)
        .then(() => {
          if (generation !== saveGeneration.current) return;
          dispatch({ type: "MARK_SAVED" });
        })
        .catch(() => {
          // Keep dirty so autosave can retry; label returns to Saving.
        })
        .finally(() => {
          if (generation === saveGeneration.current) {
            setSaving(false);
          }
        });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [state.dirty, state.name, state.document, enabled, debounceMs, dispatch]);

  return { saving: enabled ? saving || state.dirty : false };
}

export function useDesignerShortcuts() {
  const { state, dispatch, selected } = useDesigner();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (state.editingTextId && inField) {
        if (event.key === "Escape") {
          event.preventDefault();
          dispatch({ type: "STOP_EDIT_TEXT" });
        }
        return;
      }

      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }
      if (
        meta &&
        (event.key.toLowerCase() === "y" ||
          (event.key.toLowerCase() === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      if (!selected || selected.locked) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        if (inField) return;
        event.preventDefault();
        dispatch({ type: "REMOVE_ELEMENT", id: selected.id });
        return;
      }

      if (event.key === "Escape") {
        dispatch({ type: "SELECT", id: null });
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        dispatch({ type: "NUDGE", id: selected.id, dx: -step, dy: 0 });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        dispatch({ type: "NUDGE", id: selected.id, dx: step, dy: 0 });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        dispatch({ type: "NUDGE", id: selected.id, dx: 0, dy: -step });
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        dispatch({ type: "NUDGE", id: selected.id, dx: 0, dy: step });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, selected, state.editingTextId]);
}
