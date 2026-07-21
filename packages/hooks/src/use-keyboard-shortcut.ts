import { useEffect } from "react";

export type UseKeyboardShortcutOptions = {
  key: string;
  metaKey?: boolean;
  ignoreInputFocus?: boolean;
  onPress: () => void;
  enabled?: boolean;
};

export function useKeyboardShortcut({
  key,
  metaKey = true,
  ignoreInputFocus = false,
  onPress,
  enabled = true,
}: UseKeyboardShortcutOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (metaKey && !event.metaKey && !event.ctrlKey) {
        return;
      }

      if (event.key !== key) {
        return;
      }

      if (ignoreInputFocus) {
        const target = event.target;
        if (
          (target instanceof HTMLElement && target.isContentEditable) ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        ) {
          return;
        }
      }

      event.preventDefault();
      onPress();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, ignoreInputFocus, key, metaKey, onPress]);
}
