import { DropZone, DropZoneLabel } from "@dev-ui/components/drop-zone";
import { useState } from "react";

type DropZonePlaygroundProps = {
  label?: string;
  isDisabled?: boolean;
};

export default function DropZonePlayground({
  label = "Drop files here",
  isDisabled = false,
}: DropZonePlaygroundProps = {}) {
  const [message, setMessage] = useState(label);

  return (
    <DropZone
      isDisabled={isDisabled}
      onDrop={async (event) => {
        if (!("items" in event)) {
          return;
        }

        const names = await Promise.all(
          [...event.items]
            .filter((item) => item.kind === "file")
            .map(async (item) => {
              const file = await item.getFile();
              return file.name;
            }),
        );
        setMessage(names.filter(Boolean).join(", ") || "Dropped");
      }}
    >
      <DropZoneLabel>{message}</DropZoneLabel>
    </DropZone>
  );
}
