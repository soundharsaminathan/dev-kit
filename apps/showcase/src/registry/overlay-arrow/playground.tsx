import { OverlayArrow } from "@dev-ui/components/overlay-arrow";

type OverlayArrowPlaygroundProps = {
  placement?: "top" | "bottom" | "left" | "right";
};

export default function OverlayArrowPlayground({
  placement = "bottom",
}: OverlayArrowPlaygroundProps = {}) {
  return (
    <div
      style={{
        position: "relative",
        width: 200,
        height: 120,
        margin: 24,
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        background: "var(--color-surface)",
      }}
    >
      <OverlayArrow placement={placement} />
    </div>
  );
}
