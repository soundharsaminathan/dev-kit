import type { Ref, RefCallback } from "react";

type PossibleRef<T> = Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, value: T): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref !== null && ref !== undefined && typeof ref === "object") {
    (ref as { current: T }).current = value;
  }
}

export function composeRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      setRef(ref, node as T);
    }
  };
}
