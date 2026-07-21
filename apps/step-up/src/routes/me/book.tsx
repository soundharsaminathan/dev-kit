import { createFileRoute } from "@tanstack/react-router";
import { DiscoverPage } from "@/modules/discover/discover-page";

type BookSearch = {
  branchId?: string;
};

export const Route = createFileRoute("/me/book")({
  validateSearch: (search: Record<string, unknown>): BookSearch => {
    if (typeof search.branchId === "string" && search.branchId) {
      return { branchId: search.branchId };
    }
    return {};
  },
  component: BookPage,
});

function BookPage() {
  const { branchId } = Route.useSearch();
  return (
    <DiscoverPage
      {...(branchId != null ? { initialBranchId: branchId } : {})}
    />
  );
}
