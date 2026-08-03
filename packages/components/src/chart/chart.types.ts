import type { ComponentProps, ComponentType, ReactNode } from "react";
import type { TooltipContentProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

export type ChartConfig = Record<
  string,
  {
    label?: ReactNode;
    icon?: ComponentType;
    color?: string;
    theme?: { light: string; dark: string };
  }
>;

export type ChartContainerProps = ComponentProps<"div"> & {
  config: ChartConfig;
  children: ComponentProps<
    typeof import("recharts").ResponsiveContainer
  >["children"];
};

export type ChartTooltipContentProps = Partial<
  TooltipContentProps<ValueType, NameType>
> & {
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelKey?: string;
  className?: string;
};

export type ChartLegendContentProps = {
  className?: string;
  hideIcon?: boolean;
  nameKey?: string;
  payload?: Array<{
    value?: string;
    dataKey?: string | number;
    color?: string;
  }>;
  verticalAlign?: "top" | "bottom";
};
