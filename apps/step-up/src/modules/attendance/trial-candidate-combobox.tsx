import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxPopover,
} from "@dev-ui/components/combobox";
import { InputGroup, InputGroupAddon } from "@dev-ui/components/input-group";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";

export type TrialCandidate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  priority: number | boolean;
  trialBookingStatus: "PENDING" | "CONFIRMED" | null;
  alreadyOnRoster: boolean;
};

type TrialCandidateComboboxProps = {
  sessionId: string;
  label?: string;
  selectedKey: string | null;
  onSelectionChange: (candidate: TrialCandidate | null) => void;
  isDisabled?: boolean;
  isOpen?: boolean;
  placeholder?: string;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function candidateStatusLabel(candidate: TrialCandidate): string | null {
  if (candidate.alreadyOnRoster) return "On roster";
  if (candidate.trialBookingStatus === "CONFIRMED") return "Confirmed";
  if (candidate.trialBookingStatus === "PENDING") return "Pending";
  return null;
}

export function TrialCandidateCombobox({
  sessionId,
  label = "Search students",
  selectedKey,
  onSelectionChange,
  isDisabled,
  isOpen = true,
  placeholder = "Search by name, email, or phone",
}: TrialCandidateComboboxProps) {
  const api = useApi();
  const [inputValue, setInputValue] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(inputValue.trim(), 300);

  const candidatesQuery = useQuery({
    queryKey: ["trial-candidates", sessionId, debouncedSearch],
    queryFn: () => {
      const qs = debouncedSearch
        ? `?q=${encodeURIComponent(debouncedSearch)}`
        : "";
      return api.get<TrialCandidate[]>(
        `/attendance/session/${sessionId}/trial-candidates${qs}`,
      );
    },
    enabled: isOpen,
    placeholderData: (previous) => previous,
  });

  const candidates = candidatesQuery.data ?? [];

  const comboboxItems = useMemo(
    () =>
      candidates.map((candidate) => {
        const status = candidateStatusLabel(candidate);
        return {
          id: candidate.id,
          label: status ? `${candidate.name} · ${status}` : candidate.name,
          textValue: [candidate.name, candidate.email, candidate.phone]
            .filter(Boolean)
            .join(" "),
          isDisabled: candidate.alreadyOnRoster,
        };
      }),
    [candidates],
  );

  return (
    <Combobox
      label={label}
      items={comboboxItems}
      selectedKey={selectedKey}
      inputValue={inputValue}
      menuTrigger="focus"
      {...(isDisabled != null ? { isDisabled } : {})}
      onInputChange={(value) => {
        setInputValue(value);
        if (selectedKey && selectedName != null && selectedName !== value) {
          onSelectionChange(null);
          setSelectedName(null);
        }
      }}
      onSelectionChange={(key) => {
        if (key == null) {
          onSelectionChange(null);
          setSelectedName(null);
          return;
        }
        const id = String(key);
        const selected =
          candidates.find((candidate) => candidate.id === id) ?? null;
        if (selected?.alreadyOnRoster) {
          return;
        }
        onSelectionChange(selected);
        if (selected) {
          setSelectedName(selected.name);
          setInputValue(selected.name);
        }
      }}
    >
      <InputGroup>
        <ComboboxInput
          placeholder={placeholder}
          data-testid="add-trial-search"
        />
        <InputGroupAddon>
          <ComboboxButton aria-label="Show students">
            <Icon name="chevron-down" />
          </ComboboxButton>
        </InputGroupAddon>
      </InputGroup>
      <ComboboxPopover />
    </Combobox>
  );
}
