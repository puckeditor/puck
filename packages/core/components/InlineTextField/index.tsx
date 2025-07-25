"use client";

import { memo, useEffect, useRef } from "react";
import { registerOverlayPortal } from "../../lib/overlay-portal";
import { useAppStoreApi } from "../../store";
import { ComponentData } from "../../types";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../lib";

const getClassName = getClassNameFactory("InlineTextField", styles);

const setDeep = (node: ComponentData, path: string, newVal: any) => {
  const parts = path.split(".");
  const newProps = { ...node.props };

  let cur = newProps;

  for (let i = 0; i < parts.length; i++) {
    // Separate the “prop” piece and an optional “[index]” part.
    const [prop, idxStr] = parts[i].replace("]", "").split("[");
    const isLast = i === parts.length - 1;

    // --- Handle the *array* form (prop[index]) ----------------------------
    if (idxStr !== undefined) {
      // Ensure the property exists and is an array.
      if (!Array.isArray(cur[prop])) cur[prop] = [];
      const idx = Number(idxStr);

      if (isLast) {
        // We’ve reached the leaf → assign.
        cur[prop][idx] = newVal;
        continue;
      }

      // Ensure the next level container exists.
      if (cur[prop][idx] === undefined) cur[prop][idx] = {};
      cur = cur[prop][idx];
      continue;
    }

    // --- Handle the plain “prop” form -------------------------------------
    if (isLast) {
      cur[prop] = newVal;
      continue;
    }

    // Ensure the next level container exists.
    if (cur[prop] === undefined) cur[prop] = {};
    cur = cur[prop];
  }

  return { ...node, props: newProps };
};

const InlineTextFieldInternal = ({
  propPath,
  componentId,
  value,
  opts = {},
}: {
  propPath: string;
  value: string;
  componentId: string;
  opts?: { disableLineBreaks?: boolean };
}) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const appStoreApi = useAppStoreApi();
  const disableLineBreaks = opts.disableLineBreaks ?? false;

  useEffect(() => {
    const appStore = appStoreApi.getState();
    const data = appStore.state.indexes.nodes[componentId].data;
    const componentConfig = appStore.getComponentConfig(data.type);

    if (!componentConfig) {
      throw new Error(
        `InlineTextField Error: No config defined for ${data.type}`
      );
    }

    if (ref.current) {
      if (value !== ref.current.innerText) {
        ref.current.replaceChildren(value);
      }

      const cleanupPortal = registerOverlayPortal(ref.current);

      const handleInput = async (e: any) => {
        const appStore = appStoreApi.getState();
        const node = appStore.state.indexes.nodes[componentId];

        const zoneCompound = `${node.parentId}:${node.zone}`;
        const index =
          appStore.state.indexes.zones[zoneCompound]?.contentIds.indexOf(
            componentId
          );

        const newData = setDeep(node.data, propPath, e.target.innerText);

        const resolvedData = await appStore.resolveComponentData(
          newData,
          "replace"
        );

        appStore.dispatch({
          type: "replace",
          data: resolvedData.node,
          destinationIndex: index,
          destinationZone: zoneCompound,
        });
      };

      ref.current.addEventListener("input", handleInput);

      return () => {
        ref.current?.removeEventListener("input", handleInput);

        cleanupPortal?.();
      };
    }
  }, [appStoreApi, ref.current, value]);

  return (
    <span
      className={getClassName()}
      ref={ref}
      contentEditable="plaintext-only"
      style={{ cursor: "text" }}
      onClick={(e) => e.stopPropagation()}
      onClickCapture={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (disableLineBreaks && e.key === "Enter") {
          e.preventDefault();
        }
      }}
    />
  );
};

export const InlineTextField = memo(InlineTextFieldInternal);
