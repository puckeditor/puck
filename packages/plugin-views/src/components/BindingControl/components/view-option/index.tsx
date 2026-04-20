import { Fragment, memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/core";
import getClassNameFactory from "@/core/lib/get-class-name-factory";

import { ViewValueOption } from "../../../../types";

import styles from "./style.module.css";
import DataTable from "../../../DataTable";

const getClassName = getClassNameFactory("ViewOption", styles);

export type ViewOptionProps = {
  /** The option to show */
  option: ViewValueOption;
  /** Callback function that gets called when the option is connected */
  onConnect: (option: ViewValueOption) => void;
};

/** Renders a single view option for connecting a field to view data */
const ViewOption = ({ option, onConnect }: ViewOptionProps) => {
  const [expanded, setExpanded] = useState(false);
  const expression = String(option.path);
  const labelSegments = useMemo(
    () => expression.split(".").filter(Boolean),
    [expression]
  );

  const labelNodes = labelSegments.map((segment, index) => {
    const key = `${expression}-${index}`;

    return (
      <Fragment key={key}>
        {index > 0 && (
          <ChevronRight
            className={getClassName("pathSeparator")}
            size={14}
            strokeWidth={1.75}
          />
        )}
        <code className={getClassName("segment")}>{segment}</code>
      </Fragment>
    );
  });

  return (
    <div className={getClassName()}>
      <div
        className={[
          getClassName("summary"),
          expanded && getClassName("summaryActive"),
        ]
          .filter(Boolean)
          .join(" ")}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded((current) => !current);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className={getClassName("summaryMain")}>
          <div className={getClassName("summaryNodes")}>{labelNodes}</div>
          <div className={getClassName("summaryHeader")}>
            <div className={getClassName("summaryToggle")}>
              {expanded ? (
                <ChevronDown size={15} strokeWidth={1.9} />
              ) : (
                <ChevronRight size={15} strokeWidth={1.9} />
              )}
            </div>
            <span className={getClassName("valueType")}>
              {expanded ? "Hide" : "Show"} preview
            </span>
          </div>
        </div>
        <div className={getClassName("actions")}>
          <Button
            variant="primary"
            onClick={(event) => {
              event.stopPropagation();
              onConnect(option);
            }}
          >
            Connect
          </Button>
        </div>
      </div>
      {expanded && (
        <div className={getClassName("expandedContent")}>
          <div className={getClassName("expandedContentBody")}>
            <DataTable
              data={option.value}
              className={getClassName("expandedContentPreview")}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ViewOption);
