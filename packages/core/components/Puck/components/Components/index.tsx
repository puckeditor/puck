// Components wrapper (same file you posted)
"use client";

import { useComponentList } from "../../../../lib/use-component-list";
import { useAppStore } from "../../../../store";
import { ComponentList } from "../../../ComponentList";
import { Search, X } from "lucide-react";
import { useMemo, useDeferredValue } from "react";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../../../lib";

const getClassName = getClassNameFactory("ComponentsWrapper", styles);

const normalize = (v: string) =>
  v
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const Components = () => {
  const overrides = useAppStore((s) => s.overrides);
  const setUi = useAppStore((s) => s.setUi);
  const config = useAppStore((s) => s.config);
  const query = useAppStore((s) => (s.state.ui as any).componentsQuery ?? "");

  // Keep typing snappy under load
  const deferredQuery = useDeferredValue(query);
  const qn = normalize(deferredQuery).trim();
  const isSearching = qn.length > 0;

  // Compute the visible component names ONCE
  const visibleSet = useMemo<Set<string> | undefined>(() => {
    if (!isSearching) return undefined; // no filtering
    const set = new Set<string>();
    for (const [name, conf] of Object.entries(config.components)) {
      const raw = (conf as any)?.label as unknown;
      const label = typeof raw === "string" ? raw : name;
      if (normalize(`${label} ${name}`).includes(qn)) set.add(name);
    }
    return set;
  }, [config.components, qn, isSearching]);

  const componentList = useComponentList(visibleSet); // ← pass matches

  const Wrapper = useMemo(() => {
    if (overrides.components) {
      console.warn(
        "The `components` override has been deprecated and renamed to `drawer`"
      );
    }
    return overrides.components || overrides.drawer || "div";
  }, [overrides]);

  const matchCount = visibleSet?.size ?? 0;

  return (
    <Wrapper>
      {/* Persistent search */}
      <div className={getClassName("search")} role="search">
        <label className={getClassName("srOnly")} htmlFor="components-search">
          Search components
        </label>
        <div className={getClassName("searchWrap")}>
          <Search
            size={16}
            className={getClassName("searchIcon")}
            aria-hidden="true"
          />
          <input
            id="components-search"
            className={getClassName("searchInput")}
            placeholder="Search components…"
            value={query}
            spellCheck={false}
            onChange={(e) => setUi({ componentsQuery: e.target.value }, false)} // no history spam
          />
          {query ? (
            <button
              type="button"
              className={getClassName("searchClearBtn")}
              aria-label="Clear search"
              onClick={() => setUi({ componentsQuery: "" }, false)}
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        {isSearching && (
          <div className={getClassName("meta")} aria-live="polite">
            {matchCount} match{matchCount === 1 ? "" : "es"}
          </div>
        )}
      </div>

      {/* Grouped lists below—already filtered */}
      {componentList ? componentList : <ComponentList id="all" />}

      {isSearching && matchCount === 0 && (
        <div className={getClassName("globalEmpty")}>
          No components match “{deferredQuery}”
        </div>
      )}
    </Wrapper>
  );
};
