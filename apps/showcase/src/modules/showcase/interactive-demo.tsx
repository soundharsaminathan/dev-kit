import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dev-ui/components/card";
import {
  type ComponentType,
  createElement,
  useCallback,
  useMemo,
  useState,
} from "react";
import type { NormalizeControlValues } from "@/registry/types";
import { Controls } from "./controls";
import { DemoFrame } from "./demo-frame";
import styles from "./interactive-demo.module.scss";
import {
  type ControlValues,
  defaultControlValues,
  type SerializableControl,
} from "./types";

interface InteractiveDemoProps {
  Playground: ComponentType<Record<string, unknown>>;
  controls: SerializableControl[];
  title?: string;
  normalizeControlValues?: NormalizeControlValues;
}

export function InteractiveDemo({
  Playground,
  controls,
  title = "Playground",
  normalizeControlValues,
}: InteractiveDemoProps) {
  const initialValues = useMemo(() => {
    const defaults = defaultControlValues(controls);
    return normalizeControlValues?.(defaults) ?? defaults;
  }, [controls, normalizeControlValues]);
  const [values, setValues] = useState<ControlValues>(initialValues);

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        return normalizeControlValues?.(next) ?? next;
      });
    },
    [normalizeControlValues],
  );

  const previewValues = useMemo(
    () => normalizeControlValues?.(values) ?? values,
    [normalizeControlValues, values],
  );

  const remountPlaygroundOnChange = useMemo(
    () => controls.some((control) => control.name === "defaultOpen"),
    [controls],
  );

  const previewElement = useMemo(
    () =>
      createElement(Playground, {
        ...previewValues,
        ...(remountPlaygroundOnChange
          ? { key: JSON.stringify(previewValues) }
          : null),
      }),
    [Playground, previewValues, remountPlaygroundOnChange],
  );

  return (
    <Card className={styles.root}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        <DemoFrame>{previewElement}</DemoFrame>
        <aside className={styles.controls} data-testid="controls-panel">
          <Controls
            controls={controls}
            values={values}
            onChange={handleChange}
          />
        </aside>
      </CardContent>
    </Card>
  );
}
