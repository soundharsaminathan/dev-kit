import { Link } from "@dev-ui/components/link";

type LinkPlaygroundProps = {
  children?: string;
  href?: string;
  variant?: "accent" | "quiet" | "unstyled";
  isDisabled?: boolean;
};

export default function LinkPlayground({
  children = "Learn more",
  href = "https://example.com",
  variant = "accent",
  isDisabled = false,
}: LinkPlaygroundProps = {}) {
  return (
    <Link href={href} variant={variant} isDisabled={isDisabled}>
      {children}
    </Link>
  );
}
