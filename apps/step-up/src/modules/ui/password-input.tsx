import { Button } from "@dev-ui/components/button";
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
};

export function PasswordInput({
  name,
  value,
  onBlur,
  onChange,
  autoComplete = "current-password",
  isInvalid,
  required,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const toggleId = useId();

  return (
    <InputGroup isInvalid={isInvalid}>
      <Input
        id={toggleId}
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
      />
      <InputGroupAddon>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          isIconOnly
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={toggleId}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon name={visible ? "eye-off" : "eye"} aria-hidden />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
