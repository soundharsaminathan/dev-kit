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
import { useStudioId } from "@/lib/use-studio-id";

export type StudioStudent = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
};

type StudentSearchComboboxProps = {
  label?: string;
  selectedKey: string | null;
  onSelectionChange: (student: StudioStudent | null) => void;
  excludeIds?: Iterable<string>;
  isDisabled?: boolean;
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

export function StudentSearchCombobox({
  label = "Student",
  selectedKey,
  onSelectionChange,
  excludeIds,
  isDisabled,
  placeholder = "Search by name or email",
}: StudentSearchComboboxProps) {
  const api = useApi();
  const studioId = useStudioId();
  const [inputValue, setInputValue] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(inputValue.trim(), 300);

  const excluded = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);

  const studentsQuery = useQuery({
    queryKey: ["studio-students-search", studioId, debouncedSearch],
    queryFn: async () => {
      const qs = debouncedSearch
        ? `?q=${encodeURIComponent(debouncedSearch)}`
        : "";
      const page = await api.get<{ items: StudioStudent[] }>(
        `/users/studio/${studioId}/students${qs}`,
      );
      return page.items;
    },
    placeholderData: (previous) => previous,
  });

  const students = useMemo(
    () =>
      (studentsQuery.data ?? []).filter((student) => !excluded.has(student.id)),
    [studentsQuery.data, excluded],
  );

  const comboboxItems = useMemo(
    () =>
      students.map((student) => ({
        id: student.id,
        label: student.name,
        textValue: [student.name, student.email, student.phone]
          .filter(Boolean)
          .join(" "),
      })),
    [students],
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
        const selected = students.find((student) => student.id === id) ?? null;
        onSelectionChange(selected);
        if (selected) {
          setSelectedName(selected.name);
          setInputValue(selected.name);
        }
      }}
    >
      <InputGroup>
        <ComboboxInput placeholder={placeholder} />
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
