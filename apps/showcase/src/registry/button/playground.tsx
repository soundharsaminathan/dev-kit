import { Button, type ButtonProps } from "@dev-ui/components/button";

export default function ButtonPlayground({
  children = "Button",
  variant = "default",
  size = "md",
  disabled = false,
  isPending = false,
}: ButtonProps = {}) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      isPending={isPending}
    >
      {children}
    </Button>
  );
}
