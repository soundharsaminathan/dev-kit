import type { CertificateDocument, CertificateElement } from "../../schema";

export type DesignerState = {
  document: CertificateDocument;
  name: string;
  selectedId: string | null;
  editingTextId: string | null;
  zoom: number;
  past: CertificateDocument[];
  future: CertificateDocument[];
  dirty: boolean;
};

export type DesignerAction =
  | { type: "HYDRATE"; document: CertificateDocument; name: string }
  | { type: "SET_NAME"; name: string }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SELECT"; id: string | null }
  | { type: "START_EDIT_TEXT"; id: string }
  | { type: "STOP_EDIT_TEXT" }
  | {
      type: "SET_DOCUMENT";
      document: CertificateDocument;
      pushHistory?: boolean;
    }
  | { type: "UPDATE_ELEMENT"; id: string; patch: Partial<CertificateElement> }
  | {
      type: "UPDATE_ELEMENT_LIVE";
      id: string;
      patch: Partial<CertificateElement>;
    }
  | { type: "BEGIN_GESTURE" }
  | { type: "ADD_ELEMENT"; element: CertificateElement }
  | { type: "REMOVE_ELEMENT"; id: string }
  | { type: "BRING_FORWARD"; id: string }
  | { type: "SEND_BACKWARD"; id: string }
  | { type: "NUDGE"; id: string; dx: number; dy: number }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "MARK_SAVED" };

const HISTORY_CAP = 50;

function cloneDoc(doc: CertificateDocument): CertificateDocument {
  return structuredClone(doc);
}

function pushPast(
  state: DesignerState,
  nextDoc: CertificateDocument,
): Pick<DesignerState, "past" | "future" | "document" | "dirty"> {
  return {
    document: nextDoc,
    past: [...state.past, cloneDoc(state.document)].slice(-HISTORY_CAP),
    future: [],
    dirty: true,
  };
}

function replaceElement(
  doc: CertificateDocument,
  id: string,
  patch: Partial<CertificateElement>,
): CertificateDocument {
  return {
    ...doc,
    elements: doc.elements.map((el) => {
      if (el.id !== id) return el;
      return { ...el, ...patch } as CertificateElement;
    }),
  };
}

export function createInitialDesignerState(
  document: CertificateDocument,
  name = "",
): DesignerState {
  return {
    document,
    name,
    selectedId: null,
    editingTextId: null,
    zoom: 1,
    past: [],
    future: [],
    dirty: false,
  };
}

export function designerReducer(
  state: DesignerState,
  action: DesignerAction,
): DesignerState {
  switch (action.type) {
    case "HYDRATE":
      return createInitialDesignerState(action.document, action.name);

    case "SET_NAME":
      return { ...state, name: action.name, dirty: true };

    case "SET_ZOOM":
      return {
        ...state,
        zoom: Math.min(2, Math.max(0.5, action.zoom)),
      };

    case "SELECT":
      return {
        ...state,
        selectedId: action.id,
        editingTextId:
          action.id === state.editingTextId ? state.editingTextId : null,
      };

    case "START_EDIT_TEXT":
      return { ...state, selectedId: action.id, editingTextId: action.id };

    case "STOP_EDIT_TEXT":
      return { ...state, editingTextId: null };

    case "SET_DOCUMENT": {
      if (action.pushHistory === false) {
        return { ...state, document: action.document, dirty: true };
      }
      return { ...state, ...pushPast(state, action.document) };
    }

    case "UPDATE_ELEMENT": {
      const next = replaceElement(state.document, action.id, action.patch);
      return { ...state, ...pushPast(state, next) };
    }

    case "UPDATE_ELEMENT_LIVE": {
      const next = replaceElement(state.document, action.id, action.patch);
      return { ...state, document: next, dirty: true };
    }

    case "BEGIN_GESTURE":
      return {
        ...state,
        past: [...state.past, cloneDoc(state.document)].slice(-HISTORY_CAP),
        future: [],
      };

    case "ADD_ELEMENT": {
      const next = {
        ...state.document,
        elements: [...state.document.elements, action.element],
      };
      return {
        ...state,
        ...pushPast(state, next),
        selectedId: action.element.id,
      };
    }

    case "REMOVE_ELEMENT": {
      const next = {
        ...state.document,
        elements: state.document.elements.filter((el) => el.id !== action.id),
      };
      return {
        ...state,
        ...pushPast(state, next),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        editingTextId:
          state.editingTextId === action.id ? null : state.editingTextId,
      };
    }

    case "BRING_FORWARD": {
      const maxZ = Math.max(0, ...state.document.elements.map((e) => e.zIndex));
      const el = state.document.elements.find((e) => e.id === action.id);
      if (!el || el.zIndex >= maxZ) return state;
      return {
        ...state,
        ...pushPast(
          state,
          replaceElement(state.document, action.id, { zIndex: el.zIndex + 1 }),
        ),
      };
    }

    case "SEND_BACKWARD": {
      const el = state.document.elements.find((e) => e.id === action.id);
      if (!el || el.zIndex <= 1) return state;
      return {
        ...state,
        ...pushPast(
          state,
          replaceElement(state.document, action.id, {
            zIndex: Math.max(1, el.zIndex - 1),
          }),
        ),
      };
    }

    case "NUDGE": {
      const el = state.document.elements.find((e) => e.id === action.id);
      if (!el || el.locked) return state;
      return {
        ...state,
        ...pushPast(
          state,
          replaceElement(state.document, action.id, {
            x: el.x + action.dx,
            y: el.y + action.dy,
          }),
        ),
      };
    }

    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1]!;
      return {
        ...state,
        document: previous,
        past: state.past.slice(0, -1),
        future: [cloneDoc(state.document), ...state.future].slice(
          0,
          HISTORY_CAP,
        ),
        dirty: true,
        editingTextId: null,
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        document: next!,
        past: [...state.past, cloneDoc(state.document)].slice(-HISTORY_CAP),
        future: rest,
        dirty: true,
        editingTextId: null,
      };
    }

    case "MARK_SAVED":
      return { ...state, dirty: false };

    default:
      return state;
  }
}

export function snapValue(value: number, size: number, enabled: boolean) {
  if (!enabled || size <= 0) return value;
  return Math.round(value / size) * size;
}

export function newElementId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
