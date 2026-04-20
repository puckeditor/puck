import { useState, useEffect, Fragment, useMemo, memo } from "react";
import { getClassNameFactory } from "@/core/lib";

import styles from "./style.module.css";

const getClassName = getClassNameFactory("DataTable", styles);

const getObjectPreviewLabel = (value: unknown) => {
  if (Array.isArray(value)) {
    return `Array (${value.length})`;
  }

  if (value && typeof value === "object") {
    return `Object (${Object.keys(value).length})`;
  }

  return "Value";
};

const isExpandablePreviewValue = (value: unknown) =>
  typeof value === "object" && value !== null;

const Table = <Value,>({
  data,
  className,
  maxKeys = 10,
}: {
  data: Record<string, Value>[];
  className?: string;
  maxKeys?: number;
}) => {
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    setExpandedCells({});
  }, [data]);

  const keys = useMemo(() => {
    const deduplicatedKeys = new Set<string>();

    data.forEach((item) => {
      Object.keys(item || {}).forEach((key) => deduplicatedKeys.add(key));
    });

    return Array.from(deduplicatedKeys).slice(0, maxKeys);
  }, [data, maxKeys]);

  const rows = data.map((item, index) => {
    const expandedCellsForRow = keys.filter(
      (key) => expandedCells[`${index}:${key}`]
    );

    return (
      <Fragment key={index}>
        <tr>
          <td>{index}</td>
          {keys.map((key) => {
            const value = item?.[key];
            const cellId = `${index}:${key}`;

            return (
              <td key={key}>
                {isExpandablePreviewValue(value) ? (
                  <button
                    className={[
                      getClassName("expandToggle"),
                      expandedCells[cellId]
                        ? getClassName("expandToggleExpanded")
                        : "",
                    ].join(" ")}
                    onClick={() =>
                      setExpandedCells((current) => ({
                        ...current,
                        [cellId]: !current[cellId],
                      }))
                    }
                    type="button"
                  >
                    {expandedCells[cellId] ? "Hide" : "Show"}{" "}
                    {getObjectPreviewLabel(value)}
                  </button>
                ) : (
                  String(value ?? "")
                )}
              </td>
            );
          })}
        </tr>
        {expandedCellsForRow.length > 0 && (
          <tr className={getClassName("expandedRow")} key={`expanded:${index}`}>
            <td
              className={getClassName("expandedCell")}
              colSpan={keys.length + 1}
            >
              <div className={getClassName("expandedSections")}>
                {expandedCellsForRow.map((key) => (
                  <section
                    className={getClassName("expandedSection")}
                    key={key}
                  >
                    <div className={getClassName("expandedLabel")}>{key}</div>
                    <pre className={getClassName("valueJson")}>
                      {JSON.stringify(item?.[key], null, 2)}
                    </pre>
                  </section>
                ))}
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    );
  });

  return (
    <table className={[getClassName(), className].join(" ")}>
      <thead>
        <tr>
          <th>#</th>
          {keys.map((key) => (
            <th key={key}>{key}</th>
          ))}
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
};

/**
 * A simple table for previewing arrays of objects, with expandable cells for nested values.
 */
const DataTable = <Value,>({
  data,
  className,
}: {
  data: Record<string, Value> | Array<Record<string, Value>>;
  className?: string;
}) => {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return <Table data={data} className={className} />;
  }

  return (
    <div className={getClassName("value")}>
      <pre className={getClassName("valueJson")}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default memo(DataTable);
