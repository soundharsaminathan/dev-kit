import { ScrollFade } from "@dev-ui/components/scroll-fade";

type ScrollFadePlaygroundProps = {
  direction?: "vertical" | "horizontal";
  itemCount?: number;
  width?: number;
  height?: number;
};

export default function ScrollFadePlayground({
  direction = "vertical",
  itemCount = 20,
  width = 240,
  height = 160,
}: ScrollFadePlaygroundProps = {}) {
  const items = Array.from(
    { length: itemCount },
    (_, index) => `Item ${index + 1}`,
  );

  if (direction === "horizontal") {
    return (
      <ScrollFade
        style={{ width, overflowX: "auto", border: "1px solid #ccc" }}
      >
        <div
          style={{ display: "flex", gap: 8, width: width * 2.5, padding: 8 }}
        >
          {items.map((id, index) => (
            <div
              key={id}
              style={{
                minWidth: 80,
                padding: 16,
                background: "#eee",
                borderRadius: 8,
              }}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </ScrollFade>
    );
  }

  return (
    <ScrollFade style={{ height, width, border: "1px solid #ccc" }}>
      {items.map((label) => (
        <p key={label} style={{ margin: "0 0 8px" }}>
          {label}
        </p>
      ))}
    </ScrollFade>
  );
}
