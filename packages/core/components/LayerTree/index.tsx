/* eslint-disable react-hooks/rules-of-hooks */
import styles from "./styles.module.css";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { ComponentConfig } from "../../types";
import { ItemSelector } from "../../lib/data/get-item";
import { scrollIntoView } from "../../lib/scroll-into-view";
import { ChevronDown, LayoutGrid, Layers, Type } from "lucide-react";
import { rootAreaId, rootDroppableId } from "../../lib/root-droppable-id";
import { useCallback, useContext } from "react";
import { ZoneStoreContext } from "../DropZone/context";
import { getFrame } from "../../lib/get-frame";
import { onScrollEnd } from "../../lib/on-scroll-end";
import { useAppStore } from "../../store";
import { useShallow } from "zustand/react/shallow";
import { useContextStore } from "../../lib/use-context-store";

const getClassName = getClassNameFactory("LayerTree", styles);
const getClassNameLayer = getClassNameFactory("Layer", styles);

const Layer = ({
  index,
  itemId,
  zoneCompound,
}: {
  index: number;
  itemId: string;
  zoneCompound: string;
}) => {
  const config = useAppStore((s) => s.config);
  const itemSelector = useAppStore((s) => s.state.ui.itemSelector);
  const dispatch = useAppStore((s) => s.dispatch);

  const setItemSelector = useCallback(
    (itemSelector: ItemSelector | null) => {
      dispatch({ type: "setUi", ui: { itemSelector } });
    },
    [dispatch]
  );

  const selecedItemId = useAppStore((s) => s.selectedItem?.props.id);

  const isSelected =
    selecedItemId === itemId ||
    (itemSelector && itemSelector.zone === rootDroppableId && !zoneCompound);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const nodeData = useAppStore((s) => s.state.indexes.nodes[itemId]);

  const zonesForItem = useAppStore(
    useShallow((s) =>
      Object.keys(s.state.indexes.zones).filter(
        (z) => z.split(":")[0] === itemId
      )
    )
  );

  const containsZone = zonesForItem.length > 0;

  const zoneStore = useContext(ZoneStoreContext);
  const isHovering = useContextStore(
    ZoneStoreContext,
    (s) => s.hoveringComponent === itemId
  );

  const childIsSelected = useAppStore((s) => {
    const selectedData = s.state.indexes.nodes[s.selectedItem?.props.id];

    return (
      selectedData?.path.some((candidate) => {
        const [candidateId] = candidate.split(":");

        return candidateId === itemId;
      }) ?? false
    );
  });

  const componentConfig: ComponentConfig | undefined =
    config.components[nodeData.data.type];
  const label = componentConfig?.["label"] ?? nodeData.data.type.toString();

  return (
    <li
      className={getClassNameLayer({
        isSelected,
        isHovering,
        containsZone,
        childIsSelected,
      })}
    >
      <div className={getClassNameLayer("inner")}>
        <button
          type="button"
          className={getClassNameLayer("clickable")}
          onClick={() => {
            if (isSelected) {
              setItemSelector(null);
              return;
            }

            const frame = getFrame();

            const el = frame?.querySelector(
              `[data-puck-component="${itemId}"]`
            );

            if (!el) {
              setItemSelector({
                index,
                zone: zoneCompound,
              });
              return;
            }

            scrollIntoView(el as HTMLElement);

            onScrollEnd(frame, () => {
              setItemSelector({
                index,
                zone: zoneCompound,
              });
            });
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            zoneStore.setState({ hoveringComponent: itemId });
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            zoneStore.setState({ hoveringComponent: null });
          }}
        >
          {containsZone && (
            <div
              className={getClassNameLayer("chevron")}
              title={isSelected ? "Collapse" : "Expand"}
            >
              <ChevronDown size="12" />
            </div>
          )}
          <div className={getClassNameLayer("title")}>
            <div className={getClassNameLayer("icon")}>
              {nodeData.data.type === "Text" ||
              nodeData.data.type === "Heading" ? (
                <Type size="16" />
              ) : (
                <LayoutGrid size="16" />
              )}
            </div>
            <div className={getClassNameLayer("name")}>{label}</div>
          </div>
        </button>
      </div>
      {containsZone &&
        zonesForItem.map((subzone) => (
          <div key={subzone} className={getClassNameLayer("zones")}>
            <LayerTree zoneCompound={subzone} />
          </div>
        ))}
    </li>
  );
};

export const LayerTree = ({
  label: _label,
  zoneCompound,
}: {
  label?: string;
  zoneCompound: string;
}) => {
  // Use slot label if provided
  const label = useAppStore((s) => {
    if (_label) return _label;

    if (zoneCompound === rootDroppableId) return;

    const [componentId, slotId] = zoneCompound.split(":");

    const componentType = s.state.indexes.nodes[componentId]?.data.type;

    const configForComponent =
      componentType && componentType !== rootAreaId
        ? s.config.components[componentType]
        : s.config.root;

    return configForComponent?.fields?.[slotId]?.label ?? slotId;
  });

  const contentIds = useAppStore(
    useShallow((s) =>
      zoneCompound ? s.state.indexes.zones[zoneCompound]?.contentIds ?? [] : []
    )
  );

  return (
    <>
      {label && (
        <div className={getClassName("zoneTitle")}>
          <div className={getClassName("zoneIcon")}>
            <Layers size="16" />
          </div>
          {label}
        </div>
      )}
      <ul className={getClassName()}>
        {contentIds.length === 0 && (
          <div className={getClassName("helper")}>No items</div>
        )}
        {contentIds.map((itemId, i) => {
          return (
            <Layer
              index={i}
              itemId={itemId}
              zoneCompound={zoneCompound}
              key={itemId}
            />
          );
        })}
      </ul>
    </>
  );
};
