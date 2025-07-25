"use client";

import { memo, useEffect, useRef } from "react";
import { registerOverlayPortal } from "../../lib/overlay-portal";
import { useAppStoreApi } from "../../store";
import styles from "./styles.module.css";
import { getClassNameFactory } from "../../lib";

const getClassName = getClassNameFactory("InlineTextField", styles);

function setDeep<T extends Record<string, any>>(
  node: T,
  path: string,
  newVal: any
): T {
  const parts = path.split(".");
  const newNode = { ...node };

  let cur: Record<string, any> = newNode;

  for (let i = 0; i < parts.length; i++) {
    // Separate the “prop” piece and an optional “[index]” part.
    const [prop, idxStr] = parts[i].replace("]", "").split("[");
    const isLast = i === parts.length - 1;

    if (idxStr !== undefined) {
      if (!Array.isArray(cur[prop])) {
        cur[prop] = [];
      }

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

    if (isLast) {
      cur[prop] = newVal;
      continue;
    }

    if (cur[prop] === undefined) {
      cur[prop] = {};
    }

    cur = cur[prop];
  }

  return { ...node, ...newNode };
}

const InlineTextFieldInternal = ({
  propPath,
  componentId,
  value,
  isReadOnly,
  opts = {},
}: {
  propPath: string;
  value: string;
  componentId: string;
  isReadOnly: boolean;
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

        const newProps = setDeep(node.data.props, propPath, e.target.innerText);

        const resolvedData = await appStore.resolveComponentData(
          { ...node.data, props: newProps },
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
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if ((disableLineBreaks && e.key === "Enter") || isReadOnly) {
          e.preventDefault();
        }
      }}
    />
  );
};

export const InlineTextField = memo(InlineTextFieldInternal);
