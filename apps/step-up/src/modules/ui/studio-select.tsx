import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { getPublic } from "@/lib/api";
import styles from "./studio-select.module.scss";

export type StudioDirectoryItem = {
  id: string;
  name: string;
};

type StudioSelectProps = {
  label?: string;
  selectedKey: string | null;
  onSelectionChange: (studioId: string | null) => void;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string | undefined;
  "data-testid"?: string;
};

export function useStudioDirectory() {
  return useQuery({
    queryKey: ["studios", "directory"],
    queryFn: () => getPublic<StudioDirectoryItem[]>("/studios/directory"),
  });
}

export function StudioSelect({
  label = "Studio",
  selectedKey,
  onSelectionChange,
  isRequired = false,
  isInvalid = false,
  errorMessage,
  "data-testid": testId,
}: StudioSelectProps) {
  const directory = useStudioDirectory();
  const studios = directory.data ?? [];

  return (
    <div>
      <Select
        label={label}
        placeholder={
          directory.isLoading ? "Loading studios…" : "Select a studio"
        }
        selectedKey={selectedKey}
        onSelectionChange={(key) => {
          onSelectionChange(key == null ? null : String(key));
        }}
        isRequired={isRequired}
        isInvalid={isInvalid || directory.isError}
        isDisabled={directory.isLoading || studios.length === 0}
        errorMessage={
          errorMessage ??
          (directory.isError
            ? directory.error instanceof Error
              ? directory.error.message
              : "Could not load studios."
            : undefined)
        }
      >
        <SelectTrigger data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {studios.map((studio) => (
            <SelectItem key={studio.id} id={studio.id} textValue={studio.name}>
              {studio.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {directory.isFetched && !directory.isError && studios.length === 0 ? (
        <p className={styles.hint}>No studios are available yet.</p>
      ) : null}
    </div>
  );
}
