import { Button } from "@dev-ui/components/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemDescription,
  MenuItemLabel,
} from "@dev-ui/components/menu";
import {
  CERTIFICATE_VARIABLES,
  type CertificateVariableKey,
} from "../../variables";
import styles from "./variable-picker.module.scss";

type VariablePickerProps = {
  onInsert: (key: CertificateVariableKey) => void;
  disabled?: boolean;
};

function firstKey(keys: "all" | Set<string | number>): string | null {
  if (keys === "all") return null;
  const [key] = keys;
  return key == null ? null : String(key);
}

export function VariablePicker({ onInsert, disabled }: VariablePickerProps) {
  return (
    <Menu className={styles.root}>
      <Button
        variant="quiet"
        size="sm"
        className={styles.trigger}
        isDisabled={disabled}
        aria-label="Insert variable"
      >
        Insert variable
      </Button>
      <MenuContent
        selectionMode="single"
        onSelectionChange={(keys) => {
          const next = firstKey(keys as "all" | Set<string | number>);
          if (
            next &&
            CERTIFICATE_VARIABLES.some((variable) => variable.key === next)
          ) {
            onInsert(next as CertificateVariableKey);
          }
        }}
      >
        {CERTIFICATE_VARIABLES.map((variable) => (
          <MenuItem
            key={variable.key}
            id={variable.key}
            textValue={`${variable.label} ${variable.key}`}
          >
            <MenuItemLabel>{variable.label}</MenuItemLabel>
            <MenuItemDescription>{`{{${variable.key}}}`}</MenuItemDescription>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
