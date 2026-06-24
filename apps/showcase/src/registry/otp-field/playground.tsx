import { Label } from "@dev-ui/components/field";
import { Group } from "@dev-ui/components/group";
import { Input } from "@dev-ui/components/input";
import { OTPField, OTPFieldSeparator } from "@dev-ui/components/otp-field";

type OTPFieldPlaygroundProps = {
  length?: number;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  labelText?: string;
  showSeparator?: boolean;
};

function getDigitKeys(length: number) {
  return Array.from({ length }, (_, position) => `otp-digit-${position + 1}`);
}

export default function OTPFieldPlayground({
  labelText = "Verification code",
  showSeparator = false,
  length = 6,
  ...props
}: OTPFieldPlaygroundProps = {}) {
  return (
    <OTPField {...props} length={length} aria-label={labelText}>
      <Label>{labelText}</Label>
      {showSeparator ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          <Group>
            <Input />
            <Input aria-label="Digit 2" />
            <Input aria-label="Digit 3" />
          </Group>
          <OTPFieldSeparator>-</OTPFieldSeparator>
          <Group>
            <Input aria-label="Digit 4" />
            <Input aria-label="Digit 5" />
            <Input aria-label="Digit 6" />
          </Group>
        </div>
      ) : (
        <Group>
          {getDigitKeys(length).map((digitKey, position) => (
            <Input
              key={digitKey}
              aria-label={position === 0 ? undefined : `Digit ${position + 1}`}
            />
          ))}
        </Group>
      )}
    </OTPField>
  );
}
