import { createFileRoute } from "@tanstack/react-router";
import { BatchDetailPage } from "@/modules/discover/batch-detail";

export const Route = createFileRoute("/me/batches/$id")({
  component: BatchDetailPage,
});
