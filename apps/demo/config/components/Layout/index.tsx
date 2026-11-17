import { CSSProperties, forwardRef, ReactNode } from "react";
import {
  ComponentConfig,
  DefaultComponentProps,
  ObjectField,
  SelectField,
} from "@/core/types";
import { spacingOptions } from "../../options";
import { getClassNameFactory } from "@/core/lib";

import { FieldTabs } from "../FieldTabs";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("Layout", styles);

type LayoutFieldProps = {
  padding?: string;
  spanCol?: number;
  spanRow?: number;
  grow?: boolean;
};

export type WithLayout<Props extends DefaultComponentProps> = Props & {
  layout?: LayoutFieldProps;
};

type LayoutProps = WithLayout<{
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}>;

/** Renders nothing, so a field label can show without an icon */
const NoIcon = () => null;

/** Field for vertical padding, shared by every component that has one */
export const verticalPaddingField: SelectField = {
  type: "select",
  label: "Vertical padding",
  options: [{ label: "0px", value: "0px" }, ...spacingOptions],
  ai: {
    required: false,
    instructions:
      "Vertical padding inside this component. Avoid padding both a parent and its child.",
  },
};

export const layoutField: ObjectField<LayoutFieldProps> = {
  type: "object",
  label: "Layout",
  // Object fields fall back to a default icon without one
  labelIcon: <NoIcon />,
  collapsible: true,
  defaultExpanded: true,
  variant: "flush",
  objectFields: {
    spanCol: {
      label: "Grid columns",
      type: "number",
      min: 1,
      max: 12,
      ai: {
        required: false,
        instructions:
          "Applies only when this component is a direct child of a Grid. Do not exceed that Grid's numColumns value.",
      },
    },
    spanRow: {
      label: "Grid rows",
      type: "number",
      min: 1,
      max: 12,
      ai: {
        required: false,
        instructions:
          "Applies only when this component is a direct child of a Grid. Sets how many rows this component spans. The Grid creates rows automatically as its items wrap.",
      },
    },
    grow: {
      label: "Flex grow",
      type: "radio",
      options: [
        { label: "True", value: true },
        { label: "False", value: false },
      ],
      ai: {
        required: false,
        instructions:
          "Applies only when this component is a direct child of a Flex. Use true to fill available space.",
      },
    },
    padding: verticalPaddingField,
  },
};

const Layout = forwardRef<HTMLDivElement, LayoutProps>(
  ({ children, className, layout, style }, ref) => {
    return (
      <div
        className={className}
        style={{
          gridColumn: layout?.spanCol
            ? `span ${Math.max(Math.min(layout.spanCol, 12), 1)}`
            : undefined,
          gridRow: layout?.spanRow
            ? `span ${Math.max(Math.min(layout.spanRow, 12), 1)}`
            : undefined,
          paddingTop: layout?.padding,
          paddingBottom: layout?.padding,
          flex: layout?.grow ? "1 1 0" : undefined,
          ...style,
        }}
        ref={ref}
      >
        {children}
      </div>
    );
  }
);

Layout.displayName = "Layout";

export { Layout };

export function withLayout<
  ThisComponentConfig extends ComponentConfig<any> = ComponentConfig
>(componentConfig: ThisComponentConfig): ThisComponentConfig {
  return {
    ...componentConfig,
    fields: {
      ...componentConfig.fields,
      layout: layoutField,
    },
    defaultProps: {
      ...componentConfig.defaultProps,
      layout: {
        spanCol: 1,
        spanRow: 1,
        padding: "0px",
        grow: false,
        ...componentConfig.defaultProps?.layout,
      },
    },
    // Components place the layout field in their own tabs. Otherwise, it goes
    // under Appearance and the rest under Content
    renderFields:
      componentConfig.renderFields ??
      (({ fields: { layout, ...otherFields } }) => (
        <FieldTabs content={Object.values(otherFields)} appearance={layout} />
      )),
    resolveFields: async (data, params) => {
      // Let the wrapped component adjust its own fields first
      const fields = componentConfig.resolveFields
        ? await componentConfig.resolveFields(data, params)
        : componentConfig.fields;

      if (params.parent?.type === "Grid") {
        return {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: {
              spanCol: layoutField.objectFields.spanCol,
              spanRow: layoutField.objectFields.spanRow,
              padding: layoutField.objectFields.padding,
            },
          },
        };
      }
      if (params.parent?.type === "Flex") {
        return {
          ...fields,
          layout: {
            ...layoutField,
            objectFields: {
              grow: layoutField.objectFields.grow,
              padding: layoutField.objectFields.padding,
            },
          },
        };
      }

      return {
        ...fields,
        layout: {
          ...layoutField,
          objectFields: {
            padding: layoutField.objectFields.padding,
          },
        },
      };
    },
    inline: true,
    render: (props) => (
      <Layout
        className={getClassName()}
        layout={props.layout as LayoutFieldProps}
        ref={props.puck.dragRef}
      >
        {componentConfig.render(props)}
      </Layout>
    ),
  };
}
