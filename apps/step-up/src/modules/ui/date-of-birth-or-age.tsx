import { ageFromDateOfBirth } from "@/lib/age";
import styles from "./date-of-birth-or-age.module.scss";
import { FormInput } from "./form-input";

type DateOfBirthOrAgeFieldsProps = {
  dateOfBirth: string;
  onDateOfBirthChange: (value: string) => void;
  age: string;
  onAgeChange: (value: string) => void;
  className?: string | undefined;
  hint?: string | undefined;
};

const DEFAULT_HINT = "Enter either a date of birth or an exact age.";

/** Either a date of birth or an exact age (one required). Age auto-derives from DOB; typing age clears DOB. */
export function DateOfBirthOrAgeFields({
  dateOfBirth,
  onDateOfBirthChange,
  age,
  onAgeChange,
  className,
  hint = DEFAULT_HINT,
}: DateOfBirthOrAgeFieldsProps) {
  const derivedAge = ageFromDateOfBirth(dateOfBirth);
  const ageLocked = dateOfBirth.length > 0 && derivedAge !== null;

  return (
    <div className={className}>
      <FormInput
        label="Date of birth"
        type="date"
        value={dateOfBirth}
        onChange={(value) => {
          onDateOfBirthChange(value);
          const derived = ageFromDateOfBirth(value);
          onAgeChange(derived === null ? "" : String(derived));
        }}
      />
      <FormInput
        label="Age"
        type="number"
        inputMode="numeric"
        min={0}
        max={120}
        placeholder="e.g. 14"
        value={age}
        readOnly={ageLocked}
        onChange={(value) => {
          onAgeChange(value);
          if (value) onDateOfBirthChange("");
        }}
      />
      <p className={styles.hint}>{hint}</p>
    </div>
  );
}

/** Resolve a valid write payload: DOB wins over age; age only when it is a whole 0–120. */
export function resolveAgePayload(fields: {
  dateOfBirth: string;
  age: string;
}): { dateOfBirth?: string; age?: number } {
  if (fields.dateOfBirth) {
    return { dateOfBirth: fields.dateOfBirth };
  }
  const parsed = Number(fields.age);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 120) {
    return { age: parsed };
  }
  return {};
}

/** True when either a valid DOB or a whole 0–120 age is present. */
export function hasAgeValue(fields: {
  dateOfBirth: string;
  age: string;
}): boolean {
  if (fields.dateOfBirth)
    return ageFromDateOfBirth(fields.dateOfBirth) !== null;
  const parsed = Number(fields.age);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 120;
}
