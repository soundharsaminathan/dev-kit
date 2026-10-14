import { FormInput } from "@/modules/ui/form-input";
import styles from "./studio-ai-fields.module.scss";

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

export const AI_PROVIDER_OPTIONS = [
  { value: "groq", label: "Groq" },
  { value: "gemini", label: "Gemini" },
  { value: "openai", label: "OpenAI" },
] as const;

export type AiProviderValue = (typeof AI_PROVIDER_OPTIONS)[number]["value"];

export type StudioAiFieldsProps = {
  aiProvider: AiProviderValue | "";
  aiApiKey: string;
  aiChatModel: string;
  configured?: boolean;
  onProviderChange: (value: AiProviderValue | "") => void;
  onApiKeyChange: (value: string) => void;
  onChatModelChange: (value: string) => void;
  onRemoveKey?: (() => void) | undefined;
  className?: string | undefined;
  titleClassName?: string | undefined;
  descClassName?: string | undefined;
};

export function StudioAiFields({
  aiProvider,
  aiApiKey,
  aiChatModel,
  configured = false,
  onProviderChange,
  onApiKeyChange,
  onChatModelChange,
  onRemoveKey,
  className,
  titleClassName,
  descClassName,
}: StudioAiFieldsProps) {
  const secretPlaceholder = configured
    ? "•••••••••••• (saved — enter a new key to replace)"
    : "Paste provider API key";

  return (
    <div className={className ?? styles.fields}>
      <p className={titleClassName}>AI agent</p>
      <p className={descClassName}>
        {configured
          ? "Connected. The API key stays hidden after save."
          : "Not configured. Choose a provider and paste an API key so staff can use the studio agent."}
      </p>
      <label className={styles.selectField}>
        <span className={styles.selectLabel}>Provider</span>
        <select
          className={styles.select}
          value={aiProvider}
          onChange={(event) =>
            onProviderChange(event.target.value as AiProviderValue | "")
          }
          data-testid="studio-ai-provider"
        >
          <option value="">Select provider</option>
          {AI_PROVIDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <FormInput
        label="API key"
        type="text"
        className={styles.secret}
        value={aiApiKey}
        onChange={onApiKeyChange}
        placeholder={secretPlaceholder}
        data-testid="studio-ai-api-key"
        {...API_KEY_FIELD}
      />
      <FormInput
        label="Model override (optional)"
        type="text"
        value={aiChatModel}
        onChange={onChatModelChange}
        placeholder="Leave blank for the provider default"
        data-testid="studio-ai-chat-model"
      />
      {configured && onRemoveKey ? (
        <button
          type="button"
          className={styles.removeBtn}
          data-testid="studio-ai-remove-key"
          onClick={onRemoveKey}
        >
          Remove API key
        </button>
      ) : null}
    </div>
  );
}
