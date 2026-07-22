import { createFileRoute } from "@tanstack/react-router";
import { DiscoverPage } from "@/modules/discover/discover-page";

type BookSearch = {
  branchId?: string;
  style?: string;
  intent?: "trial";
};

export const Route = createFileRoute("/me/book")({
  validateSearch: (search: Record<string, unknown>): BookSearch => {
    const next: BookSearch = {};
    if (typeof search.branchId === "string" && search.branchId) {
      next.branchId = search.branchId;
    }
    if (typeof search.style === "string" && search.style) {
      next.style = search.style;
    }
    if (search.intent === "trial") {
      next.intent = "trial";
    }
    return next;
  },
  component: BookPage,
});

function BookPage() {
  const { branchId, style, intent } = Route.useSearch();
  return (
    <DiscoverPage
      {...(branchId != null ? { initialBranchId: branchId } : {})}
      {...(style != null ? { initialStyle: style } : {})}
      {...(intent != null ? { initialIntent: intent } : {})}
    />
  );
}
