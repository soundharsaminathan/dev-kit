import { Badge } from "@dev-ui/components/badge";

type BadgePlaygroundProps = {
  children?: string;
  appearance?: "solid" | "subtle";
  variant?: "neutral" | "accent" | "danger" | "success" | "warning" | "info";
  size?: "sm" | "md" | "lg";
};

export default function BadgePlayground({
  children = "Badge",
  appearance = "solid",
  variant = "neutral",
  size = "md",
}: BadgePlaygroundProps = {}) {
  return (
    <Badge appearance={appearance} variant={variant} size={size}>
      {children}
    </Badge>
  );
}
