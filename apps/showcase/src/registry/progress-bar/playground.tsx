import {
  ProgressBar,
  ProgressBarOutput,
  ProgressBarTrack,
} from "@dev-ui/components/progress-bar";

type ProgressBarPlaygroundProps = {
  "aria-label"?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
  isIndeterminate?: boolean;
};

export default function ProgressBarPlayground({
  "aria-label": ariaLabel = "Upload progress",
  value = 60,
  minValue = 0,
  maxValue = 100,
  isIndeterminate = false,
}: ProgressBarPlaygroundProps = {}) {
  return (
    <ProgressBar
      aria-label={ariaLabel}
      value={value}
      minValue={minValue}
      maxValue={maxValue}
      isIndeterminate={isIndeterminate}
    >
      <ProgressBarTrack />
      <ProgressBarOutput />
    </ProgressBar>
  );
}
