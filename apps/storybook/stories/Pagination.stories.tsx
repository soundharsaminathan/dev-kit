import {
  Pagination,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@dev-ui/components/pagination";
import type { Meta, StoryObj } from "@storybook/react-vite";
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

type PaginationStoryArgs = {
  totalPages: number;
  initialPage: number;
};

const meta = {
  title: "Components/Pagination",
  tags: ["ai-generated"],
  argTypes: {
    totalPages: { control: { type: "number", min: 1, max: 20 } },
    initialPage: { control: { type: "number", min: 1 } },
  },
  args: {
    totalPages: 10,
    initialPage: 2,
  },
  render: function PaginationDemo({ totalPages, initialPage }) {
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
  },
} satisfies Meta<PaginationStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
