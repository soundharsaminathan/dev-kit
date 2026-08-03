import { cn } from "@dev-ui/core";
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  useContext,
  useId,
  useMemo,
} from "react";
import {
  Legend as RechartsLegend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import styles from "./chart.module.scss";
import type {
  ChartConfig,
  ChartContainerProps,
  ChartLegendContentProps,
  ChartTooltipContentProps,
} from "./chart.types";

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = createContext<ChartContextValue | null>(null);

function useChart(component: string) {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error(`${component} must be used within ChartContainer`);
  }
  return context;
}

function resolveColor(
  item: ChartConfig[string] | undefined,
  theme: "light" | "dark" = "light",
): string | undefined {
  if (!item) {
    return undefined;
  }
  if (item.color) {
    return item.color;
  }
  if (item.theme) {
    return item.theme[theme];
  }
  return undefined;
}

function chartColorVars(config: ChartConfig): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, item] of Object.entries(config)) {
    const color = resolveColor(item);
    if (color) {
      vars[`--color-${key}`] = color;
    }
  }
  return vars as CSSProperties;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  style,
  ...props
}: ChartContainerProps) {
  const uniqueId = useId().replace(/:/g, "");
  const chartId = `chart-${id ?? uniqueId}`;
  const contextValue = useMemo(() => ({ config }), [config]);
  const colorStyle = useMemo(() => chartColorVars(config), [config]);

  return (
    <ChartContext.Provider value={contextValue}>
      <div
        data-chart={chartId}
        className={cn(styles.container, className)}
        style={{ ...colorStyle, ...(style as CSSProperties) }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartTooltip(props: ComponentProps<typeof RechartsTooltip>) {
  return <RechartsTooltip {...props} />;
}

function getPayloadConfig(
  config: ChartConfig,
  payload: unknown,
  key: string,
): ChartConfig[string] | undefined {
  if (typeof payload !== "object" || payload === null) {
    return config[key];
  }

  const record = payload as Record<string, unknown>;
  const configLabelKey =
    typeof record[key] === "string" ? (record[key] as string) : key;

  return config[configLabelKey] ?? config[key];
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelKey,
  nameKey,
  formatter,
  labelFormatter,
}: ChartTooltipContentProps) {
  const { config } = useChart("ChartTooltipContent");

  if (!active || !payload?.length) {
    return null;
  }

  const firstItem = payload[0];
  const key = `${labelKey ?? firstItem?.dataKey ?? firstItem?.name ?? "value"}`;
  const itemConfig = getPayloadConfig(config, firstItem?.payload, key);
  const resolvedLabel = hideLabel
    ? null
    : labelFormatter && label != null
      ? labelFormatter(label, payload)
      : (itemConfig?.label ?? label);

  return (
    <div className={cn(styles.tooltip, className)}>
      {resolvedLabel ? (
        <div className={styles.tooltipLabel}>{resolvedLabel}</div>
      ) : null}
      <div className={styles.tooltipItems}>
        {payload.map((item, index) => {
          const itemKey = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
          const configItem = getPayloadConfig(config, item.payload, itemKey);
          const indicatorColor = item.color ?? configItem?.color;
          const value =
            formatter && item.value != null
              ? formatter(item.value, item.name ?? "", item, index, payload)
              : item.value?.toLocaleString();
          const rowKey =
            typeof item.dataKey === "string" || typeof item.dataKey === "number"
              ? String(item.dataKey)
              : String(index);

          return (
            <div key={rowKey} className={styles.tooltipItem}>
              {!hideIndicator ? (
                <span
                  className={styles.tooltipIndicator}
                  data-indicator={indicator}
                  style={
                    {
                      backgroundColor: indicatorColor,
                      borderColor: indicatorColor,
                    } as CSSProperties
                  }
                />
              ) : null}
              <div className={styles.tooltipItemBody}>
                <span className={styles.tooltipItemLabel}>
                  {configItem?.label ?? item.name}
                </span>
                {value != null ? (
                  <span className={styles.tooltipItemValue}>{value}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegend(props: ComponentProps<typeof RechartsLegend>) {
  return <RechartsLegend {...props} />;
}

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  nameKey,
}: ChartLegendContentProps) {
  const { config } = useChart("ChartLegendContent");

  if (!payload?.length) {
    return null;
  }

  return (
    <div className={cn(styles.legend, className)}>
      {payload.map((item) => {
        const key = `${nameKey ?? item.dataKey ?? "value"}`;
        const itemConfig = getPayloadConfig(config, item, key);
        return (
          <div key={item.value ?? key} className={styles.legendItem}>
            {!hideIcon ? (
              itemConfig?.icon ? (
                <itemConfig.icon />
              ) : (
                <span
                  className={styles.legendSwatch}
                  style={{ backgroundColor: item.color }}
                />
              )
            ) : null}
            {itemConfig?.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
}

export type { ChartConfig, ChartContainerProps };
export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
};
