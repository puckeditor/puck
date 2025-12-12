import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "./styles.module.css";
import { Copy, List, Plus, Trash } from "lucide-react";
import type { FieldPropsInternal } from "../..";
import { useFieldStore, useFieldStoreApi } from "../../store";
import { IconButton } from "../../../IconButton";
import { reorder, replace } from "../../../../lib";
import {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DragIcon } from "../../../DragIcon";
import {
  ArrayField as ArrayFieldType,
  ArrayState,
  Content,
  ItemWithId,
} from "../../../../types";
import { useAppStore, useAppStoreApi } from "../../../../store";
import { Sortable, SortableProvider } from "../../../Sortable";
import { useNestedFieldContext } from "../../context";
import { walkField } from "../../../../lib/data/map-fields";
import { populateIds } from "../../../../lib/data/populate-ids";
import { defaultSlots } from "../../../../lib/data/default-slots";
import { getDeep } from "../../../../lib/data/get-deep";
import { SubField } from "../../subfield";
import { setDeep } from "../../../../bundle";

const getClassName = getClassNameFactory("ArrayField", styles);
const getClassNameItem = getClassNameFactory("ArrayFieldItem", styles);

const ArrayFieldItemInternal = ({
  id,
  arrayId,
  index,
  dragIndex,
  originalIndex,
  field,
  onChange,
  onToggleExpand,
  readOnly,
  actions,
  name,
  localName,
}: {
  id: string;
  arrayId: string;
  index: number;
  dragIndex: number;
  originalIndex: number;
  field: ArrayFieldType;
  onChange: (val: any, ui: any, subName: string) => void;
  onToggleExpand: (id: string, isExpanded: boolean) => void;
  readOnly?: boolean;
  actions: ReactNode;
  name?: string;
  localName?: string;
}) => {
  // NB this will prevent array fields from being used outside of Puck
  const isExpanded = useAppStore((s) => {
    return s.state.ui.arrayState[arrayId]?.openId === id;
  });

  const itemSummary = useFieldStore((s) => {
    const path = `${[name]}[${index}]`;
    const data = getDeep(s, path);

    if (data && field.getItemSummary) {
      return field.getItemSummary(data, index);
    }

    return `Item #${originalIndex}`;
  });

  // NB this will prevent array fields from being used outside of Puck
  const canEdit = useAppStore(
    (s) => s.permissions.getPermissions({ item: s.selectedItem }).edit
  );

  return (
    <Sortable id={id} index={dragIndex} disabled={readOnly}>
      {({ isDragging, ref, handleRef }) => (
        <div
          ref={ref}
          className={getClassNameItem({
            isExpanded,
            isDragging,
            readOnly,
          })}
        >
          <div
            ref={handleRef}
            onClick={(e) => {
              if (isDragging) return;

              e.preventDefault();
              e.stopPropagation();

              onToggleExpand(id, isExpanded);
            }}
            className={getClassNameItem("summary")}
          >
            {itemSummary}
            <div className={getClassNameItem("rhs")}>
              {!readOnly && (
                <div className={getClassNameItem("actions")}>{actions}</div>
              )}
              <div>
                <DragIcon />
              </div>
            </div>
          </div>
          <div className={getClassNameItem("body")}>
            {isExpanded && (
              <fieldset className={getClassNameItem("fieldset")}>
                {Object.keys(field.arrayFields!).map((subName) => {
                  const subField = field.arrayFields![subName];

                  return (
                    <SubField
                      key={`${id}_${subName}_${index}`} // Ensure to key on index, as ID may not update when reordering
                      id={`${id}_${subName}`}
                      name={name}
                      index={index}
                      subName={subName}
                      localName={localName}
                      field={subField}
                      onChange={onChange}
                      forceReadOnly={!canEdit}
                    />
                  );
                })}
              </fieldset>
            )}
          </div>
        </div>
      )}
    </Sortable>
  );
};

const ArrayFieldItem = memo(ArrayFieldItemInternal);

export const ArrayField = ({
  field,
  onChange,
  id,
  name = id,
  label,
  labelIcon,
  readOnly,
  Label = (props) => <div {...props} />,
}: FieldPropsInternal<object[], ArrayFieldType>) => {
  const setUi = useAppStore((s) => s.setUi);
  const appStoreApi = useAppStoreApi();
  const fieldStore = useFieldStoreApi();
  const { localName = name } = useNestedFieldContext();

  const getValue = () => getDeep(fieldStore.getState(), name) ?? [];

  const getArrayState = useCallback(() => {
    const { state } = appStoreApi.getState();

    const thisState = state.ui.arrayState[id];

    if (thisState?.items?.length) return thisState;

    const value = getValue();

    return {
      items: Array.from(value || []).map((item, idx) => {
        return {
          _originalIndex: idx,
          _currentIndex: idx,
          _arrayId: `${id}-${idx}`,
        };
      }),
      openId: "",
    };
  }, [appStoreApi, id, getValue, name]);

  const numItems = useFieldStore(() => {
    return getValue().length;
  });

  const defaultArrayState = useMemo(getArrayState, [getArrayState]);

  const mirror = useAppStore((s) => {
    const thisArrayState = s.state.ui.arrayState[id];

    return thisArrayState ?? defaultArrayState;
  });

  const appStore = useAppStoreApi();

  const mapArrayStateToUi = useCallback(
    (partialArrayState: Partial<ArrayState>) => {
      const state = appStore.getState().state;

      return {
        arrayState: {
          ...state.ui.arrayState,
          [id]: { ...getArrayState(), ...partialArrayState },
        },
      };
    },
    [appStore]
  );

  const getHighestIndex = useCallback(() => {
    return getArrayState().items.reduce(
      (acc, item) => (item._originalIndex > acc ? item._originalIndex : acc),
      -1
    );
  }, []);

  const regenerateArrayState = useCallback((value: object[]) => {
    let highestIndex = getHighestIndex();

    const arrayState = getArrayState();

    const newItems = Array.from(value || []).map((item, idx) => {
      const arrayStateItem = arrayState.items[idx];

      const newItem = {
        _originalIndex: arrayStateItem?._originalIndex ?? highestIndex + 1,
        _currentIndex: arrayStateItem?._currentIndex ?? idx,
        _arrayId:
          arrayState.items[idx]?._arrayId || `${id}-${highestIndex + 1}`,
      };

      if (newItem._originalIndex > highestIndex) {
        highestIndex = newItem._originalIndex;
      }

      return newItem;
    });

    // We don't need to record history during this useEffect, as the history has already been set by onDragEnd
    return { ...arrayState, items: newItems };
  }, []);

  const [draggedItem, setDraggedItem] = useState("");
  const isDraggingAny = !!draggedItem;

  const valueRef = useRef<object[]>([]);

  useEffect(() => {
    valueRef.current = getValue();
  }, []);

  /**
   * Walk the item and ensure all slotted items have unique IDs
   */
  const uniqifyItem = useCallback(
    (val: any) => {
      if (field.type !== "array" || !field.arrayFields) return;

      const config = appStore.getState().config;

      return walkField({
        value: val,
        fields: field.arrayFields,
        mappers: {
          slot: ({ value }) => {
            const content = value as Content;

            return content.map((item) => populateIds(item, config, true));
          },
        },
        config,
      });
    },
    [appStore, field]
  );

  const syncCurrentIndexes = useCallback(() => {
    const arrayState = getArrayState();

    const newArrayStateItems = arrayState.items.map((item, index) => ({
      ...item,
      _currentIndex: index,
    }));

    const state = appStore.getState().state;

    const newUi = {
      arrayState: {
        ...state.ui.arrayState,
        [id]: { ...arrayState, items: newArrayStateItems },
      },
    };

    setUi(newUi, false);
  }, []);

  const updateValue = useCallback(
    (newValue: object[]) => {
      const newArrayState = regenerateArrayState(newValue);

      setUi(mapArrayStateToUi(newArrayState), false);
      onChange(newValue);
    },
    [regenerateArrayState, setUi, mapArrayStateToUi, onChange]
  );

  // Reset array state if number of items changes
  useEffect(() => {
    const newArrayState = regenerateArrayState(getValue());
    setUi(mapArrayStateToUi(newArrayState), false);
  }, [numItems]);

  if (field.type !== "array" || !field.arrayFields) {
    return null;
  }

  const addDisabled =
    (field.max !== undefined && mirror?.items.length >= field.max) || readOnly;

  return (
    <Label
      label={label || name}
      icon={labelIcon || <List size={16} />}
      el="div"
      readOnly={readOnly}
    >
      <SortableProvider
        onDragStart={(id) => {
          valueRef.current = getValue();

          setDraggedItem(id);

          syncCurrentIndexes();
        }}
        onDragEnd={() => {
          setDraggedItem("");

          onChange(valueRef.current);

          // Write directly to fieldStore to prevent flicker
          const currentFieldVal = fieldStore.getState();
          fieldStore.setState(setDeep(currentFieldVal, name, valueRef.current));

          syncCurrentIndexes();
        }}
        onMove={(move) => {
          const arrayState = getArrayState();

          // A race condition means we can sometimes have the wrong source element
          // so we double double check before proceeding
          if (arrayState.items[move.source]._arrayId !== draggedItem) {
            return;
          }

          const newValue = reorder(valueRef.current, move.source, move.target);

          const newArrayStateItems: ItemWithId[] = reorder(
            arrayState.items,
            move.source,
            move.target
          );

          const state = appStore.getState().state;

          const newUi = {
            arrayState: {
              ...state.ui.arrayState,
              [id]: { ...arrayState, items: newArrayStateItems },
            },
          };

          setUi(newUi, false);
          valueRef.current = newValue;
        }}
      >
        <div
          className={getClassName({
            hasItems: numItems > 0,
            addDisabled,
          })}
        >
          {mirror.items.length > 0 && (
            <div className={getClassName("inner")} data-dnd-container>
              {mirror.items.map((item, index) => {
                const {
                  _arrayId = `${id}-${index}`,
                  _originalIndex = index,
                  _currentIndex = index,
                } = item;

                return (
                  <ArrayFieldItem
                    key={_arrayId}
                    index={_currentIndex} // Get actual index for data
                    dragIndex={index}
                    originalIndex={_originalIndex}
                    arrayId={id}
                    id={_arrayId}
                    readOnly={readOnly}
                    field={field}
                    name={name}
                    localName={localName}
                    onChange={(val, ui, subName) => {
                      const value = getValue();

                      const data: any = Array.from(value || [])[index] || {};

                      onChange(
                        replace(value, index, {
                          ...data,
                          [subName]: val,
                        }),
                        ui
                      );
                    }}
                    onToggleExpand={(id, isExpanded) => {
                      if (isExpanded) {
                        setUi(
                          mapArrayStateToUi({
                            openId: "",
                          })
                        );
                      } else {
                        setUi(
                          mapArrayStateToUi({
                            openId: id,
                          })
                        );
                      }
                    }}
                    actions={
                      <>
                        <div className={getClassNameItem("action")}>
                          <IconButton
                            type="button"
                            disabled={!!addDisabled}
                            onClick={(e) => {
                              e.stopPropagation();

                              const value = getValue();
                              const existingValue = [...(value || [])];
                              const newItem = uniqifyItem(existingValue[index]);

                              existingValue.splice(index, 0, newItem);

                              updateValue(existingValue);
                            }}
                            title="Duplicate"
                          >
                            <Copy size={16} />
                          </IconButton>
                        </div>
                        <div className={getClassNameItem("action")}>
                          <IconButton
                            type="button"
                            disabled={
                              field.min !== undefined &&
                              field.min >= mirror.items.length
                            }
                            onClick={(e) => {
                              e.stopPropagation();

                              const value = getValue();
                              const existingValue = [...(value || [])];

                              existingValue.splice(index, 1);

                              updateValue(existingValue);
                            }}
                            title="Delete"
                          >
                            <Trash size={16} />
                          </IconButton>
                        </div>
                      </>
                    }
                  />
                );
              })}
            </div>
          )}

          {!addDisabled && (
            <button
              type="button"
              className={getClassName("addButton")}
              onClick={() => {
                if (isDraggingAny) return;

                const value = getValue();

                const existingValue = value || [];

                // Support defaultItemProps as a function so we can generate dynamic defaults based on the current length of the array
                const defaultProps =
                  typeof field.defaultItemProps === "function"
                    ? field.defaultItemProps(existingValue.length)
                    : field.defaultItemProps ?? {};

                const newItem = defaultSlots(
                  uniqifyItem(defaultProps),
                  field.arrayFields
                );
                const newValue = [...existingValue, newItem];

                updateValue(newValue);
              }}
            >
              <Plus size={21} />
            </button>
          )}
        </div>
      </SortableProvider>
    </Label>
  );
};
