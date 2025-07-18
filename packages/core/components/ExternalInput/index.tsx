import {
  useMemo,
  useEffect,
  useState,
  useCallback,
  isValidElement,
} from "react";
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { ExternalField } from "../../types";
import {
  ChevronLeft,
  ChevronRight,
  Link,
  Search,
  SlidersHorizontal,
  Unlock,
} from "lucide-react";
import { Modal } from "../Modal";
import { Heading } from "../Heading";
import { Loader } from "../Loader";
import { Button } from "../Button";
import { AutoFieldPrivate } from "../AutoField";
import { IconButton } from "../IconButton";

const getClassName = getClassNameFactory("ExternalInput", styles);
const getClassNameModal = getClassNameFactory("ExternalInputModal", styles);

const dataCache: Record<string, any> = {};

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

  const [data, setData] = useState<Record<string, any>[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = field.itemsPerPage || 10;

  const hasFilterFields = !!filterFields;

  const [filters, setFilters] = useState(field.initialFilters || {});
  const [filtersToggled, setFiltersToggled] = useState(hasFilterFields);

  const mappedData = useMemo(() => {
    return data.map(mapRow);
  }, [data, mapRow]);

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

  const search = useCallback(
    async (query: string, filters: object, page = 1) => {
      setIsLoading(true);

      const cacheKey = `${id}-${query}-${JSON.stringify(
        filters
      )}-${page}-${itemsPerPage}`;

      const listData =
        dataCache[cacheKey] ||
        (await field.fetchList({
          query,
          filters,
          pagination: { page, itemsPerPage },
        }));

      if (listData) {
        const newData = Array.isArray(listData)
          ? listData
          : listData.data || [];
        setData(newData);

        // Update totalPages if available
        if (!Array.isArray(listData)) {
          if (listData.totalPages) {
            setTotalPages(listData.totalPages);
          } else if (listData.total) {
            // Calculate total pages if only total count is provided
            setTotalPages(Math.ceil(listData.total / itemsPerPage));
          }
        }

        setIsLoading(false);

        dataCache[cacheKey] = listData;
      }
    },
    [id, field, itemsPerPage]
  );

  const ResultsInfo = useCallback(
    (props: { items: any[] }) => {
      return field.renderFooter ? (
        field.renderFooter(props)
      ) : (
        <span>
          {props.items.length} result{props.items.length === 1 ? "" : "s"}
        </span>
      );
    },
    [field.renderFooter]
  );

  useEffect(() => {
    search(searchQuery, filters, currentPage);
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    search(searchQuery, filters, newPage);
  };

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
          {/* NB this is hardcoded to strapi for now */}
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
          onSubmit={(e) => {
            e.preventDefault();

            search(searchQuery, filters, 1);
            setCurrentPage(1);
          }}
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
                          onChange={(value) => {
                            const newFilters = {
                              ...filters,
                              [fieldName]: value,
                            };

                            setFilters(newFilters);

                            search(searchQuery, newFilters, 1);
                            setCurrentPage(1);
                          }}
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
                    {keys.map((key) => (
                      <th
                        key={key}
                        className={getClassNameModal("th")}
                        style={{ textAlign: "left" }}
                      >
                        {key}
                      </th>
                    ))}
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
          <div className={getClassNameModal("footerContainer")}>
            <div className={getClassNameModal("footerLeft")}>
              <ResultsInfo items={mappedData} />
            </div>
            <div className={getClassNameModal("footerCenter")}>
              {totalPages > 1 && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoading}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className={getClassNameModal("paginationInfo")}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoading}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </>
              )}
            </div>
            <div className={getClassNameModal("footerRight")}></div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
