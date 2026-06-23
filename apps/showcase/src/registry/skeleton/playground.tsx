import { Skeleton } from "@dev-ui/components/skeleton";
import { Text } from "@dev-ui/components/text";

type SkeletonPlaygroundProps = {
  animation?: "shimmer" | "pulse" | "none";
  isLoading?: boolean;
};

export default function SkeletonPlayground({
  isLoading = false,
  animation,
}: SkeletonPlaygroundProps = {}) {
  if (isLoading) {
    return (
      <Skeleton isLoading>
        <Text>Loading text</Text>
      </Skeleton>
    );
  }

  return <Skeleton {...(animation !== undefined ? { animation } : {})} />;
}
