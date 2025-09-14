import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { ReactNode, useEffect } from "react";
import { useAppStore } from "../../store";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Drawer } from "../Drawer";

const getClassName = getClassNameFactory("ComponentList", styles);

const ComponentListItem = ({
  name,
  label,
}: {
  name: string;
  label?: string;
  index?: number; // TODO deprecate
}) => {
  const overrides = useAppStore((s) => s.overrides);
  const canInsert = useAppStore(
    (s) => s.permissions.getPermissions({ type: name }).insert
  );

  // DEPRECATED
  useEffect(() => {
    if (overrides.componentItem) {
      console.warn(
        "The `componentItem` override has been deprecated and renamed to `drawerItem`"
      );
    }
  }, [overrides]);

  return (
    <Drawer.Item label={label} name={name} isDragDisabled={!canInsert}>
      {overrides.componentItem ?? overrides.drawerItem}
    </Drawer.Item>
  );
};

const normalize = (v: string) =>
  v
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const highlight = (text: string, query: string) => {
  if (!query) return text;
  const t = text ?? "";
  const a = normalize(t);
  const b = normalize(query);
  const i = a.indexOf(b);
  if (i === -1) return t;
  const pre = t.slice(0, i);
  const mid = t.slice(i, i + query.length);
  const post = t.slice(i + query.length);
  return (
    <>
      {pre}
      <mark className={getClassName("mark")}>{mid}</mark>
      {post}
    </>
  );
};

const ComponentList = ({
  children,
  title,
  id,
}: {
  id: string;
  children?: ReactNode;
  title?: string;
}) => {
  const config = useAppStore((s) => s.config);
  const setUi = useAppStore((s) => s.setUi);
  const ui = useAppStore(
    (s) =>
      (s.state.ui as {
        componentList?: Record<string, { expanded?: boolean }>;
        componentsQuery?: string;
      }) ?? {}
  );

  const componentList = ui.componentList ?? {};
  const query = (ui.componentsQuery ?? "").trim();
  const qn = normalize(query);
  const isSearching = qn.length > 0;

  const { expanded = true } = componentList[id] || {};
  const showExpanded = expanded || isSearching;

  // Build items (children first if provided)
  let items: ReactNode[] = [];

  if (children) {
    const arr = Array.isArray(children) ? children : [children];
    items = arr
      .filter((child: any) => {
        if (!isSearching) return true;
        const name: string | undefined = child?.props?.name;
        const rawLabel: unknown = child?.props?.label;
        const label =
          typeof rawLabel === "string"
            ? rawLabel
            : (name as string | undefined);
        const hay = `${label ?? ""} ${name ?? ""}`;
        return normalize(hay).includes(qn);
      })
      .map((child: any) => {
        const name: string | undefined = child?.props?.name;
        const rawLabel: unknown = child?.props?.label;
        const label =
          typeof rawLabel === "string"
            ? rawLabel
            : (name as string | undefined);
        return (
          <ComponentListItem
            key={name ?? label}
            name={name ?? ""}
            label={
              typeof label === "string"
                ? (highlight(label, query) as any)
                : (label as any)
            }
          />
        );
      });
  } else {
    items = Object.keys(config.components)
      .filter((key) => {
        if (!isSearching) return true;
        const raw = config.components[key]?.label as unknown;
        const label = typeof raw === "string" ? raw : key;
        return normalize(`${label} ${key}`).includes(qn);
      })
      .map((key) => {
        const raw = config.components[key]?.label as unknown;
        const label = typeof raw === "string" ? raw : key;
        return (
          <ComponentListItem
            key={key}
            name={key}
            label={
              typeof label === "string"
                ? (highlight(label, query) as any)
                : (label as any)
            }
          />
        );
      });
  }

  // Hide empty groups entirely during search
  if (isSearching && items.length === 0) return null;

  return (
    <div className={getClassName({ isExpanded: showExpanded })}>
      {title && (
        <button
          type="button"
          className={getClassName("title")}
          onClick={() =>
            setUi({
              componentList: {
                ...componentList,
                [id]: {
                  ...componentList[id],
                  expanded: !expanded,
                },
              },
            })
          }
          title={
            showExpanded
              ? `Collapse${title ? ` ${title}` : ""}`
              : `Expand${title ? ` ${title}` : ""}`
          }
        >
          <div>{title}</div>
          <div className={getClassName("titleIcon")}>
            {showExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
        </button>
      )}

      <div className={getClassName("content")}>
        {items.length > 0 ? (
          <Drawer>{items}</Drawer>
        ) : (
          <div className={getClassName("empty")}>No components found</div>
        )}
      </div>
    </div>
  );
};

ComponentList.Item = ComponentListItem;

export { ComponentList };
