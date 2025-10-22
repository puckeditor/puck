import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { Button } from "../Button";

const getClassName = getClassNameFactory("Pagination", styles);

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50];

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions?: number[];
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  id?: string;
};

export const Pagination = ({
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  totalItems,
  onPageChange,
  onPageSizeChange,
  id = "pagination",
}: PaginationProps) => {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const handlePageSizeChange = (newSize: number) => {
    onPageSizeChange(newSize);
    onPageChange(1);
  };

  return (
    <div className={getClassName()}>
      <span className={getClassName("overview")}>
        Showing {startIndex + 1} to {endIndex} of {totalItems} result
        {totalItems > 1 ? "s" : ""}
      </span>

      {totalPages > 1 && (
        <div className={getClassName("itemPrevious")}>
          <Button
            type="button"
            variant="outline"
            className={getClassName("itemButton")}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            Previous
          </Button>
        </div>
      )}

      <div className={getClassName("pageSize")}>
        <label
          htmlFor={`${id}-page-size`}
          className={getClassName("pageSizeLabel")}
        >
          Per page :
        </label>
        <select
          id={`${id}-page-size`}
          className={getClassName("pageSizeSelect")}
          value={pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {totalPages > 1 && (
        <ol className={getClassName("items")}>
          {currentPage > 1 && (
            <li>
              <Button
                type="button"
                variant="outline"
                className={getClassName("itemButton")}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </Button>
            </li>
          )}

          {(() => {
            const pageNumbers = [];
            const delta = 0;

            const createPageButton = (pageNum: number) => (
              <li key={pageNum}>
                <Button
                  type="button"
                  variant="outline"
                  className={`${getClassName("itemButton")} ${
                    pageNum === currentPage
                      ? getClassName("itemButton-active")
                      : ""
                  }`}
                  onClick={() => onPageChange(pageNum)}
                  aria-label={`Page ${pageNum}`}
                  aria-current={pageNum === currentPage ? "page" : undefined}
                >
                  {pageNum}
                </Button>
              </li>
            );

            const createEllipsis = (key: string) => (
              <li key={key}>
                <Button
                  type="button"
                  variant="outline"
                  className={getClassName("itemButton")}
                  disabled
                  aria-hidden="true"
                >
                  ...
                </Button>
              </li>
            );

            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(createPageButton(i));
              }
            } else if (currentPage <= 3) {
              for (let i = 1; i <= 3; i++) {
                pageNumbers.push(createPageButton(i));
              }
              pageNumbers.push(createEllipsis("ellipsis-end"));
              pageNumbers.push(createPageButton(totalPages - 1));
              pageNumbers.push(createPageButton(totalPages));
            } else if (currentPage >= totalPages - 2) {
              pageNumbers.push(createPageButton(1));
              pageNumbers.push(createPageButton(2));
              pageNumbers.push(createEllipsis("ellipsis-start"));
              for (let i = totalPages - 2; i <= totalPages; i++) {
                pageNumbers.push(createPageButton(i));
              }
            } else {
              pageNumbers.push(createPageButton(1));
              pageNumbers.push(createPageButton(2));
              pageNumbers.push(createEllipsis("ellipsis-start"));

              for (let i = currentPage - delta; i <= currentPage + delta; i++) {
                if (i > 2 && i < totalPages - 1) {
                  pageNumbers.push(createPageButton(i));
                }
              }

              pageNumbers.push(createEllipsis("ellipsis-end"));
              pageNumbers.push(createPageButton(totalPages - 1));
              pageNumbers.push(createPageButton(totalPages));
            }

            return pageNumbers;
          })()}

          {currentPage < totalPages && (
            <li>
              <Button
                type="button"
                variant="outline"
                className={getClassName("itemButton")}
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </Button>
            </li>
          )}
        </ol>
      )}

      {totalPages > 1 && (
        <div className={getClassName("itemNext")}>
          <Button
            type="button"
            variant="outline"
            className={getClassName("itemButton")}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
