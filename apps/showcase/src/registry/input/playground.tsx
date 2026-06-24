import { Input } from "@dev-ui/components/input";

type InputPlaygroundProps = {
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  "aria-label"?: string;
};

export default function InputPlayground({
  placeholder = "Enter text",
  size = "md",
  disabled = false,
  "aria-label": ariaLabel = "Name",
}: InputPlaygroundProps = {}) {
  return (
    <Input
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  );
}
