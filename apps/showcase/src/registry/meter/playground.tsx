import { Meter, MeterOutput, MeterTrack } from "@dev-ui/components/meter";

type MeterPlaygroundProps = {
  "aria-label"?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
};

export default function MeterPlayground({
  "aria-label": ariaLabel = "Storage used",
  value = 60,
  minValue = 0,
  maxValue = 100,
}: MeterPlaygroundProps = {}) {
  return (
    <Meter
      aria-label={ariaLabel}
      value={value}
      minValue={minValue}
      maxValue={maxValue}
    >
      <MeterTrack />
      <MeterOutput />
    </Meter>
  );
}
