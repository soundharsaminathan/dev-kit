import { Separator } from "@dev-ui/components/separator";

type SeparatorPlaygroundProps = {
  orientation?: "horizontal" | "vertical";
};

export default function SeparatorPlayground({
  orientation = "horizontal",
}: SeparatorPlaygroundProps = {}) {
  return orientation === "vertical" ? (
    <div style={{ display: "flex", height: 48 }}>
      <Separator orientation={orientation} />
    </div>
  ) : (
    <div style={{ width: 240 }}>
      <Separator orientation={orientation} />
    </div>
  );
}
