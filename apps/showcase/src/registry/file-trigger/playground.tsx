import { Button } from "@dev-ui/components/button";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { useState } from "react";

type FileTriggerPlaygroundProps = {
  buttonLabel?: string;
  accept?: string;
  allowsMultiple?: boolean;
  allowsClearing?: boolean;
  clearLabel?: string;
  isDisabled?: boolean;
};

export default function FileTriggerPlayground({
  buttonLabel = "Choose file",
  accept = "image/*",
  allowsMultiple = false,
  allowsClearing = true,
  clearLabel = "Clear selection",
  isDisabled = false,
}: FileTriggerPlaygroundProps = {}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <FileTrigger
        accept={accept}
        allowsMultiple={allowsMultiple}
        allowsClearing={allowsClearing}
        clearLabel={clearLabel}
        isDisabled={isDisabled}
        onSelect={(files) => {
          if (allowsMultiple) {
            setFileNames(files ? Array.from(files, (file) => file.name) : []);
            return;
          }
          setFileName(files?.[0]?.name ?? null);
        }}
      >
        <Button>
          {allowsMultiple
            ? fileNames.length > 0
              ? `${fileNames.length} file${fileNames.length === 1 ? "" : "s"} selected`
              : buttonLabel
            : (fileName ?? buttonLabel)}
        </Button>
      </FileTrigger>
      {allowsMultiple && fileNames.length > 0 ? (
        <ul style={{ margin: 0, paddingInlineStart: 20 }}>
          {fileNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
