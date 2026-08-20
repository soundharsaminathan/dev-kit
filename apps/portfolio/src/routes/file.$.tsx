import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { getFile } from "@/content/workspace";
import { IdeShell } from "@/shell/IdeShell";
import { useIde } from "@/state/IdeContext";

export const Route = createFileRoute("/file/$")({
  component: FileDeepLinkPage,
});

function FileDeepLinkPage() {
  const { _splat: path } = Route.useParams();
  return (
    <>
      <DeepLinkOpener path={path ?? "README.md"} />
      <IdeShell />
    </>
  );
}

function DeepLinkOpener({ path }: { path: string }) {
  const { openFile } = useIde();
  useEffect(() => {
    const id = path.startsWith("/") ? path.slice(1) : path;
    if (getFile(id)) {
      openFile(id);
    }
  }, [path, openFile]);
  return null;
}
