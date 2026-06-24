import { Description, Label } from "@dev-ui/components/field";
import { TextArea } from "@dev-ui/components/text-area";
import { TextField } from "@dev-ui/components/text-field";

type TextAreaPlaygroundProps = {
  placeholder?: string;
  "aria-label"?: string;
  showField?: boolean;
  labelText?: string;
  descriptionText?: string;
  size?: "sm" | "md" | "lg";
  rows?: number;
  disabled?: boolean;
};

export default function TextAreaPlayground({
  showField = false,
  labelText = "Message",
  descriptionText = "We never share your messages.",
  placeholder = "Type your message here.",
  size = "md",
  rows = 4,
  disabled = false,
  "aria-label": ariaLabel = "Message",
}: TextAreaPlaygroundProps = {}) {
  return showField ? (
    <TextField>
      <Label>{labelText}</Label>
      <Description>{descriptionText}</Description>
      <TextArea
        placeholder={placeholder}
        size={size}
        rows={rows}
        disabled={disabled}
      />
    </TextField>
  ) : (
    <TextArea
      aria-label={ariaLabel}
      placeholder={placeholder}
      size={size}
      rows={rows}
      disabled={disabled}
    />
  );
}
