import { Button } from "@dev-ui/components/button";
import { useFieldContext } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { InputGroup, InputGroupAddon } from "@dev-ui/components/input-group";
import { Icon } from "@dev-ui/icons";
import {
  type ChangeEvent,
  type FocusEventHandler,
  useId,
  useState,
} from "react";

type PasswordInputProps = {
  name: string;
  value: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onChange: (value: string) => void;
  autoComplete?: string;
  isInvalid?: boolean;
  required?: boolean;
  isDisabled?: boolean;
};

export function PasswordInput({
  name,
  value,
  onBlur,
  onChange,
  autoComplete = "current-password",
  isInvalid,
  required,
  isDisabled,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const field = useFieldContext();
  const fallbackId = useId();
  const inputId = field?.inputId ?? fallbackId;

  return (
    <InputGroup isInvalid={isInvalid} isDisabled={isDisabled}>
      <Input
        id={inputId}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onBlur={onBlur}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        autoComplete={autoComplete}
        aria-invalid={isInvalid ? true : undefined}
        required={required}
        disabled={isDisabled}
      />
      <InputGroupAddon>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          isIconOnly
          isDisabled={isDisabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={inputId}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon name={visible ? "eye-off" : "eye"} aria-hidden />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
