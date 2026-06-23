import { Skeleton } from "@dev-ui/components/skeleton";
import { Text } from "@dev-ui/components/text";

type SkeletonPlaygroundProps = {
  variant?: "placeholder" | "content";
  isLoading?: boolean;
  animation?: "shimmer" | "pulse" | "none";
};

const frameStyle = { width: "100%", maxWidth: 280 } as const;

export default function SkeletonPlayground({
  variant = "content",
  isLoading = true,
  animation = "shimmer",
}: SkeletonPlaygroundProps = {}) {
  if (variant === "placeholder") {
    return (
      <div style={frameStyle}>
        <Skeleton animation={animation} />
      </div>
    );
  }

  return (
    <div style={frameStyle}>
      <Skeleton isLoading={isLoading} animation={animation}>
        <Text>Loading text</Text>
      </Skeleton>
    </div>
  );
}
