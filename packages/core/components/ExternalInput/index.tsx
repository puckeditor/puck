import {
  useMemo,
  useEffect,
  useState,
  useCallback,
  isValidElement,
  useRef,
} from "react";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { ExternalField } from "../../types";
import {
  Link,
  Search,
  SlidersHorizontal,
  Unlock,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Modal } from "../Modal";
import { Heading } from "../Heading";
import { Loader } from "../Loader";
import { Button } from "../Button";
import { AutoFieldPrivate } from "../AutoField";
import { IconButton } from "../IconButton";
import { Pagination, DEFAULT_PAGE_SIZE_OPTIONS } from "../Pagination";

const getClassName = getClassNameFactory("ExternalInput", styles);
const getClassNameModal = getClassNameFactory("ExternalInputModal", styles);

const dataCache: Record<string, any> = {};

const getDefaultPageSize = (
  initialPageSize: number | undefined,
  pageSizeOptions: number[] | undefined
): number => {
  const options = pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;
  if (initialPageSize !== undefined && options.includes(initialPageSize)) {
    return initialPageSize;
  }
  return options[0];
};

export const ExternalInput = ({
  field,
  onChange,
  value = null,
  name,
  id,
  readOnly,
}: {
  field: ExternalField;
  onChange: (value: any) => void;
  value: any;
  name?: string;
  id: string;
  readOnly?: boolean;
}) => {
  const {
    mapProp = (val: any) => val,
    mapRow = (val: any) => val,
    filterFields,
  } = field || {};
  const { enabled: shouldCacheData } = field.cache ?? { enabled: true };

  const [data, setData] = useState<Record<string, any>[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const hasFilterFields = !!filterFields;

  const [filters, setFilters] = useState(field.initialFilters || {});
  const [filtersToggled, setFiltersToggled] = useState(hasFilterFields);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const isPaginationEnabled = field.pagination?.enabled !== false;

  const initialPage = field.pagination?.initialPage ?? 1;
  const initialPageSize = getDefaultPageSize(
    field.pagination?.initialPageSize,
    field.pagination?.pageSizeOptions
  );

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const mappedData = useMemo(() => {
    return data.map(mapRow);
  }, [data, mapRow]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const keys = useMemo(() => {
    const validKeys: Set<string> = new Set();

    for (const item of mappedData) {
      for (const key of Object.keys(item)) {
        if (
          typeof item[key] === "string" ||
          typeof item[key] === "number" ||
          isValidElement(item[key])
        ) {
          validKeys.add(key);
        }
      }
    }

    return Array.from(validKeys);
  }, [mappedData]);

  const [searchQuery, setSearchQuery] = useState(field.initialQuery || "");

  const buildCacheKey = useCallback(
    (
      query: string,
      filters: object,
      page: number,
      limit: number,
      sort: { column: string; direction: "asc" | "desc" } | null
    ) => {
      return `${id}-${query}-${JSON.stringify(
        filters
      )}-${page}-${limit}-${JSON.stringify(sort || {})}`;
    },
    [id]
  );

  const search = useCallback(
    async (
      query: string,
      filters: object,
      page: number | undefined,
      limit: number | undefined,
      sort: { column: string; direction: "asc" | "desc" } | null
    ) => {
      setIsLoading(true);

      const effectivePage = isPaginationEnabled ? page : undefined;
      const effectiveLimit = isPaginationEnabled ? limit : undefined;

      const cacheKey = buildCacheKey(
        query,
        filters,
        effectivePage ?? 1,
        effectiveLimit ?? 10,
        sort
      );

      let result;

      if (shouldCacheData && dataCache[cacheKey]) {
        result = dataCache[cacheKey];
      } else {
        result = await field.fetchList({
          query,
          filters,
          page: effectivePage,
          limit: effectiveLimit,
          sort: sort || undefined,
        });
      }

      if (result) {
        setData(result.items);
        setTotalItems(result.total);
        setIsLoading(false);

        if (shouldCacheData) {
          dataCache[cacheKey] = result;
        }
      }
    },
    [field, shouldCacheData, isPaginationEnabled, buildCacheKey]
  );

  const getCurrentSort = useCallback(() => {
    return sortColumn ? { column: sortColumn, direction: sortDirection } : null;
  }, [sortColumn, sortDirection]);

  const performSearch = useCallback(
    (page: number = currentPage, size: number = pageSize) => {
      search(searchQuery, filters, page, size, getCurrentSort());
    },
    [searchQuery, filters, currentPage, pageSize, search, getCurrentSort]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      search(searchQuery, filters, page, pageSize, getCurrentSort());
    },
    [searchQuery, filters, pageSize, search, getCurrentSort]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      setCurrentPage(1);
      search(searchQuery, filters, 1, newSize, getCurrentSort());
    },
    [searchQuery, filters, search, getCurrentSort]
  );

  const handleFilterChange = useCallback(
    (fieldName: string, value: any) => {
      const newFilters = {
        ...filters,
        [fieldName]: value,
      };
      setFilters(newFilters);
      setCurrentPage(1);
      search(searchQuery, newFilters, 1, pageSize, getCurrentSort());
    },
    [filters, searchQuery, pageSize, search, getCurrentSort]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrentPage(1);
      performSearch(1);
    },
    [performSearch]
  );

  const handleSort = useCallback(
    (columnKey: string) => {
      const newDirection: "asc" | "desc" =
        sortColumn === columnKey && sortDirection === "asc" ? "desc" : "asc";

      setSortColumn(columnKey);
      setSortDirection(newDirection);

      const sort = { column: columnKey, direction: newDirection };
      search(searchQuery, filters, 1, pageSize, sort);
    },
    [sortColumn, sortDirection, searchQuery, filters, pageSize, search]
  );

  const isSortable = useCallback(
    (columnKey: string): boolean => {
      return field.sortableColumns?.includes(columnKey) ?? false;
    },
    [field.sortableColumns]
  );

  const Footer = useCallback(
    (props: { items: any[] }) =>
      field.renderFooter ? (
        field.renderFooter(props)
      ) : isPaginationEnabled ? null : (
        <span className={getClassNameModal("footer")}>
          {props.items.length} result{props.items.length === 1 ? "" : "s"}
        </span>
      ),
    [field.renderFooter, isPaginationEnabled]
  );

  useEffect(() => {
    search(
      searchQuery,
      filters,
      initialPage,
      initialPageSize,
      getCurrentSort()
    );
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSortColumn(null);
      setSortDirection("asc");
      setCurrentPage(initialPage);
    }
  }, [isOpen, initialPage]);

  return (
    <div
      className={getClassName({
        dataSelected: !!value,
        modalVisible: isOpen,
        readOnly,
      })}
      id={id}
    >
      <div className={getClassName("actions")}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={getClassName("button")}
          disabled={readOnly}
        >
          {value ? (
            field.getItemSummary ? (
              field.getItemSummary(value)
            ) : (
              "External item"
            )
          ) : (
            <>
              <Link size="16" />
              <span>{field.placeholder}</span>
            </>
          )}
        </button>
        {value && (
          <button
            type="button"
            className={getClassName("detachButton")}
            onClick={() => {
              onChange(null);
            }}
            disabled={readOnly}
          >
            <Unlock size={16} />
          </button>
        )}
      </div>
      <Modal onClose={() => setOpen(false)} isOpen={isOpen}>
        <form
          className={getClassNameModal({
            isLoading,
            loaded: !isLoading,
            hasData: mappedData.length > 0,
            filtersToggled,
          })}
          onSubmit={handleSearchSubmit}
        >
          <div className={getClassNameModal("masthead")}>
            {field.showSearch ? (
              <div className={getClassNameModal("searchForm")}>
                <label className={getClassNameModal("search")}>
                  <span className={getClassNameModal("searchIconText")}>
                    Search
                  </span>
                  <div className={getClassNameModal("searchIcon")}>
                    <Search size="18" />
                  </div>
                  <input
                    className={getClassNameModal("searchInput")}
                    name="q"
                    type="search"
                    placeholder={field.placeholder}
                    onChange={(e) => {
                      setSearchQuery(e.currentTarget.value);
                    }}
                    autoComplete="off"
                    value={searchQuery}
                  ></input>
                </label>
                <div className={getClassNameModal("searchActions")}>
                  <Button type="submit" loading={isLoading} fullWidth>
                    Search
                  </Button>
                  {hasFilterFields && (
                    <div className={getClassNameModal("searchActionIcon")}>
                      <IconButton
                        type="button"
                        title="Toggle filters"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFiltersToggled(!filtersToggled);
                        }}
                      >
                        <SlidersHorizontal size={20} />
                      </IconButton>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Heading rank="2" size="xs">
                {field.placeholder || "Select data"}
              </Heading>
            )}
          </div>

          <div className={getClassNameModal("grid")}>
            {hasFilterFields && (
              <div className={getClassNameModal("filters")}>
                {hasFilterFields &&
                  Object.keys(filterFields).map((fieldName) => {
                    const filterField = filterFields[fieldName];
                    return (
                      <div
                        className={getClassNameModal("field")}
                        key={fieldName}
                      >
                        <AutoFieldPrivate
                          field={filterField}
                          name={fieldName}
                          id={`external_field_${fieldName}_filter`}
                          label={filterField.label || fieldName}
                          value={filters[fieldName]}
                          onChange={(value) =>
                            handleFilterChange(fieldName, value)
                          }
                        />
                      </div>
                    );
                  })}
              </div>
            )}

            <div className={getClassNameModal("tableWrapper")}>
              <table className={getClassNameModal("table")}>
                <thead className={getClassNameModal("thead")}>
                  <tr className={getClassNameModal("tr")}>
                    {keys.map((key) => {
                      const sortable = isSortable(key);
                      const isActiveSort = sortColumn === key;
                      const showAscending =
                        isActiveSort && sortDirection === "asc";

                      const handleColumnClick = () => {
                        if (sortable) {
                          handleSort(key);
                        }
                      };

                      return (
                        <th
                          key={key}
                          className={
                            sortable
                              ? `${getClassNameModal("th")} ${getClassNameModal(
                                  "th--sortable"
                                )}`
                              : getClassNameModal("th")
                          }
                          onClick={handleColumnClick}
                          role={sortable ? "button" : undefined}
                          aria-sort={
                            isActiveSort
                              ? sortDirection === "asc"
                                ? "ascending"
                                : "descending"
                              : undefined
                          }
                          tabIndex={sortable ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (
                              sortable &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              handleSort(key);
                            }
                          }}
                        >
                          <div className={getClassNameModal("thContent")}>
                            <span>{key}</span>
                            {sortable && (
                              <span
                                className={
                                  isActiveSort
                                    ? `${getClassNameModal(
                                        "sortIcon"
                                      )} ${getClassNameModal(
                                        "sortIcon--active"
                                      )}`
                                    : getClassNameModal("sortIcon")
                                }
                                aria-hidden="true"
                              >
                                {showAscending ? (
                                  <ChevronUp size={16} />
                                ) : (
                                  <ChevronDown size={16} />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className={getClassNameModal("tbody")}>
                  {mappedData.map((item, i) => {
                    return (
                      <tr
                        key={i}
                        style={{ whiteSpace: "nowrap" }}
                        className={getClassNameModal("tr")}
                        onClick={() => {
                          onChange(mapProp(data[i]));
                          setOpen(false);
                        }}
                      >
                        {keys.map((key) => (
                          <td key={key} className={getClassNameModal("td")}>
                            {item[key]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className={getClassNameModal("loadingBanner")}>
                <Loader size={24} />
              </div>
            </div>
          </div>

          {isPaginationEnabled && totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={field.pagination?.pageSizeOptions}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              id={id}
            />
          )}

          <div className={getClassNameModal("footerContainer")}>
            <Footer items={mappedData} />
          </div>
        </form>
      </Modal>
    </div>
  );
};
