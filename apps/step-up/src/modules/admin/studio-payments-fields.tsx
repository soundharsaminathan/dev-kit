import { FormInput } from "@/modules/ui/form-input";
import styles from "./studio-payments-fields.module.scss";

const API_KEY_FIELD = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
  "data-form-type": "other",
} as const;

export type StudioPaymentsFieldsProps = {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  savedKeyId?: string;
  configured?: boolean;
  onKeyIdChange: (value: string) => void;
  onKeySecretChange: (value: string) => void;
  className?: string | undefined;
  titleClassName?: string | undefined;
  descClassName?: string | undefined;
};

export function StudioPaymentsFields({
  razorpayKeyId,
  razorpayKeySecret,
  savedKeyId = "",
  configured = false,
  onKeyIdChange,
  onKeySecretChange,
  className,
  titleClassName,
  descClassName,
}: StudioPaymentsFieldsProps) {
  const secretPlaceholder = configured
    ? "•••••••••••• (saved — enter a new secret to replace)"
    : "Paste Razorpay key secret";

  return (
    <div className={className}>
      <p className={titleClassName}>Razorpay</p>
      <p className={descClassName}>
        {configured
          ? "Studio keys are saved. The secret stays hidden after save."
          : "Optional. Add both key ID and secret to enable live checkout; otherwise the studio runs in demo mode."}
      </p>
      <FormInput
        label="Razorpay key ID"
        name="razorpayKeyId"
        value={razorpayKeyId || savedKeyId}
        onChange={onKeyIdChange}
        placeholder="rzp_test_… or rzp_live_…"
        {...API_KEY_FIELD}
      />
      <FormInput
        label="Razorpay key secret"
        name="razorpayKeySecret"
        type="text"
        value={razorpayKeySecret}
        onChange={onKeySecretChange}
        placeholder={secretPlaceholder}
        className={styles.secret}
        {...API_KEY_FIELD}
      />
      <p className={descClassName}>
        {configured && !razorpayKeySecret
          ? "A secret is already on file. Leave blank to keep it, or paste a new one to replace."
          : "Paste Key ID and Key Secret from the same Razorpay API Keys page. The secret is never shown again after save."}
      </p>
    </div>
  );
}
