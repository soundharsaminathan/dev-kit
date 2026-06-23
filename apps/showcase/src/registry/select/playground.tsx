import { Label } from "@dev-ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@dev-ui/components/select";

type SelectPlaygroundProps = {
  placeholder?: string;
  label?: string;
  description?: string;
  errorMessage?: string;
  labelMode?: "prop" | "element";
  defaultSelectedKey?: "none" | "perplexity" | "replicate" | "together-ai";
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
};

export default function SelectPlayground({
  labelMode = "element",
  label = "Provider",
  placeholder = "Select a provider",
  description = "",
  errorMessage = "",
  defaultSelectedKey = "none",
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
}: SelectPlaygroundProps = {}) {
  return (
    <Select
      label={labelMode === "prop" ? label : undefined}
      placeholder={placeholder}
      description={description || undefined}
      errorMessage={errorMessage || undefined}
      {...(defaultSelectedKey !== "none" ? { defaultSelectedKey } : {})}
      isDisabled={isDisabled}
      isRequired={isRequired}
      isInvalid={isInvalid}
    >
      {labelMode === "element" ? <Label>{label}</Label> : null}
      <SelectTrigger />
      <SelectContent>
        <SelectItem id="perplexity">Perplexity</SelectItem>
        <SelectItem id="replicate">Replicate</SelectItem>
        <SelectItem id="together-ai">Together AI</SelectItem>
      </SelectContent>
    </Select>
  );
}
