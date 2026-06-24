import {
  Pagination,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@dev-ui/components/pagination";
import { Fragment, useState } from "react";

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  return [...pages].sort((left, right) => left - right);
}

type PaginationPlaygroundProps = {
  totalPages?: number;
  initialPage?: number;
};

export default function PaginationPlayground({
  totalPages = 10,
  initialPage = 2,
}: PaginationPlaygroundProps = {}) {
  const [page, setPage] = useState(initialPage);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <Pagination>
      <PaginationList>
        <PaginationItem>
          <PaginationPrevious
            isDisabled={page === 1}
            onClick={() =>
              setPage((current: number) => Math.max(1, current - 1))
            }
          />
        </PaginationItem>

        {visiblePages.map((pageNumber, index) => {
          const previousPage = visiblePages[index - 1];
          const showLeadingEllipsis =
            index > 0 &&
            previousPage !== undefined &&
            pageNumber - previousPage > 1;

          return (
            <Fragment key={pageNumber}>
              {showLeadingEllipsis ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}
              <PaginationItem>
                <PaginationLink
                  isActive={pageNumber === page}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            </Fragment>
          );
        })}

        <PaginationItem>
          <PaginationNext
            isDisabled={page === totalPages}
            onClick={() =>
              setPage((current: number) => Math.min(totalPages, current + 1))
            }
          />
        </PaginationItem>
      </PaginationList>
    </Pagination>
  );
}
