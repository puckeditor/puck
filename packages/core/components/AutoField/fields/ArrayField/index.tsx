import getClassNameFactory from "../../../../lib/get-class-name-factory";
import styles from "./styles.module.css";
import { Copy, List, Plus, Trash } from "lucide-react";
import { AutoFieldPrivate, FieldPropsInternal } from "../..";
import { IconButton } from "../../../IconButton";
import { reorder, replace } from "../../../../lib";
import { useCallback, useEffect, useRef, useState } from "react";
import { DragIcon } from "../../../DragIcon";
import { ArrayState, Content, ItemWithId } from "../../../../types";
import { useAppStore, useAppStoreApi } from "../../../../store";
import { Sortable, SortableProvider } from "../../../Sortable";
import { NestedFieldProvider, useNestedFieldContext } from "../../context";
import { walkField } from "../../../../lib/data/map-fields";
import { populateIds } from "../../../../lib/data/populate-ids";
import { defaultSlots } from "../../../../lib/data/default-slots";

const getClassName = getClassNameFactory("ArrayField", styles);
const getClassNameItem = getClassNameFactory("ArrayFieldItem", styles);

export const ArrayField = ({
  field,
  onChange,
  value: _value,
  name,
  label,
  labelIcon,
  readOnly,
  id,
  Label = (props) => <div {...props} />,
}: FieldPropsInternal) => {
  const thisArrayState = useAppStore((s) => s.state.ui.arrayState[id]);
  const setUi = useAppStore((s) => s.setUi);
  const { readOnlyFields, localName = name } = useNestedFieldContext();

  const value: object[] = _value;

  const arrayState = thisArrayState || {
    items: Array.from(value || []).map((item, idx) => {
      return {
        _originalIndex: idx,
        _arrayId: `${id}-${idx}`,
      };
    }),
    openId: "",
  };

  const [localState, setLocalState] = useState({ arrayState, value });

  useEffect(() => {
    const _arrayState =
      appStore.getState().state.ui.arrayState[id] ?? arrayState;

    setLocalState({ arrayState: _arrayState, value });
  }, [value]);

  const appStore = useAppStoreApi();

  const mapArrayStateToUi = useCallback(
    (partialArrayState: Partial<ArrayState>) => {
      const state = appStore.getState().state;
      return {
        arrayState: {
          ...state.ui.arrayState,
          [id]: { ...arrayState, ...partialArrayState },
        },
      };
    },
    [arrayState, appStore]
  );

  const getHighestIndex = useCallback(() => {
    return arrayState.items.reduce(
      (acc, item) => (item._originalIndex > acc ? item._originalIndex : acc),
      -1
    );
  }, [arrayState]);

  const regenerateArrayState = useCallback(
    (value: object[]) => {
      let highestIndex = getHighestIndex();

      const newItems = Array.from(value || []).map((item, idx) => {
        const arrayStateItem = arrayState.items[idx];

        const newItem = {
          _originalIndex:
            typeof arrayStateItem?._originalIndex !== "undefined"
              ? arrayStateItem._originalIndex
              : highestIndex + 1,
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
    },
    [arrayState]
  );

  // Create a mirror of value with IDs added for drag and drop
  useEffect(() => {
    if (arrayState.items.length > 0) {
      setUi(mapArrayStateToUi(arrayState));
    }
  }, []);

  const [draggedItem, setDraggedItem] = useState("");
  const isDraggingAny = !!draggedItem;

  const canEdit = useAppStore(
    (s) => s.permissions.getPermissions({ item: s.selectedItem }).edit
  );

  const forceReadOnly = !canEdit;

  const valueRef = useRef<object[]>(value);

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

  if (field.type !== "array" || !field.arrayFields) {
    return null;
  }

  const addDisabled =
    (field.max !== undefined &&
      localState.arrayState.items.length >= field.max) ||
    readOnly;

  return (
    <Label
      label={label || name}
      icon={labelIcon || <List size={16} />}
      el="div"
      readOnly={readOnly}
    >
      <SortableProvider
        onDragStart={(id) => setDraggedItem(id)}
        onDragEnd={() => {
          setDraggedItem("");

          onChange(valueRef.current);
        }}
        onMove={(move) => {
          // A race condition means we can sometimes have the wrong source element
          // so we double double check before proceeding
          if (arrayState.items[move.source]._arrayId !== draggedItem) {
            return;
          }

          const newValue = reorder(localState.value, move.source, move.target);

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
          setLocalState({
            value: newValue,
            arrayState: { ...arrayState, items: newArrayStateItems },
          });

          valueRef.current = newValue;
        }}
      >
        <div
          className={getClassName({
            hasItems: Array.isArray(value) && value.length > 0,
            addDisabled,
          })}
        >
          {localState.arrayState.items.length > 0 && (
            <div className={getClassName("inner")} data-dnd-container>
              {localState.arrayState.items.map((item, i) => {
                const { _arrayId = `${id}-${i}`, _originalIndex = i } = item;
                const data: any = Array.from(localState.value || [])[i] || {};

                return (
                  <Sortable
                    key={_arrayId}
                    id={_arrayId}
                    index={i}
                    disabled={readOnly}
                  >
                    {({ isDragging, ref, handleRef }) => (
                      <div
                        ref={ref}
                        className={getClassNameItem({
                          isExpanded: arrayState.openId === _arrayId,
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

                            if (arrayState.openId === _arrayId) {
                              setUi(
                                mapArrayStateToUi({
                                  openId: "",
                                })
                              );
                            } else {
                              setUi(
                                mapArrayStateToUi({
                                  openId: _arrayId,
                                })
                              );
                            }
                          }}
                          className={getClassNameItem("summary")}
                        >
                          {field.getItemSummary
                            ? field.getItemSummary(data, i)
                            : `Item #${_originalIndex}`}
                          <div className={getClassNameItem("rhs")}>
                            {!readOnly && (
                              <div className={getClassNameItem("actions")}>
                                <div className={getClassNameItem("action")}>
                                  <IconButton
                                    type="button"
                                    disabled={!!addDisabled}
                                    onClick={(e) => {
                                      e.stopPropagation();

                                      const existingValue = [...(value || [])];

                                      const newItem = uniqifyItem(
                                        existingValue[i]
                                      );

                                      existingValue.splice(i, 0, newItem);

                                      const newUi = mapArrayStateToUi(
                                        regenerateArrayState(existingValue)
                                      );

                                      setUi(newUi, false);
                                      onChange(existingValue);
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
                                      field.min >=
                                        localState.arrayState.items.length
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();

                                      const existingValue = [...(value || [])];

                                      const existingItems = [
                                        ...(arrayState.items || []),
                                      ];

                                      existingValue.splice(i, 1);
                                      existingItems.splice(i, 1);

                                      setUi(
                                        mapArrayStateToUi({
                                          items: existingItems,
                                        }),
                                        false
                                      );

                                      onChange(existingValue);
                                    }}
                                    title="Delete"
                                  >
                                    <Trash size={16} />
                                  </IconButton>
                                </div>
                              </div>
                            )}
                            <div>
                              <DragIcon />
                            </div>
                          </div>
                        </div>
                        <div className={getClassNameItem("body")}>
                          {arrayState.openId === _arrayId && (
                            <fieldset className={getClassNameItem("fieldset")}>
                              {Object.keys(field.arrayFields!).map(
                                (subName) => {
                                  const subField = field.arrayFields![subName];

                                  const indexName = `${name}[${i}]`;
                                  const subPath = `${indexName}.${subName}`;

                                  const localIndexName = `${localName}[${i}]`;
                                  const localWildcardName = `${localName}[*]`;
                                  const localSubPath = `${localIndexName}.${subName}`;
                                  const localWildcardSubPath = `${localWildcardName}.${subName}`;

                                  const subReadOnly = forceReadOnly
                                    ? forceReadOnly
                                    : typeof readOnlyFields[subPath] !==
                                      "undefined"
                                    ? readOnlyFields[localSubPath]
                                    : readOnlyFields[localWildcardSubPath];

                                  const label = subField.label || subName;

                                  return (
                                    <NestedFieldProvider
                                      key={subPath}
                                      name={localIndexName}
                                      wildcardName={localWildcardName}
                                      subName={subName}
                                      readOnlyFields={readOnlyFields}
                                    >
                                      <AutoFieldPrivate
                                        name={subPath}
                                        label={label}
                                        id={`${_arrayId}_${subName}`}
                                        readOnly={subReadOnly}
                                        field={{
                                          ...subField,
                                          label, // May be used by custom fields
                                        }}
                                        value={data[subName]}
                                        onChange={(val, ui) => {
                                          onChange(
                                            replace(value, i, {
                                              ...data,
                                              [subName]: val,
                                            }),
                                            ui
                                          );
                                        }}
                                      />
                                    </NestedFieldProvider>
                                  );
                                }
                              )}
                            </fieldset>
                          )}
                        </div>
                      </div>
                    )}
                  </Sortable>
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

                const existingValue = value || [];

                const newItem = defaultSlots(
                  uniqifyItem(field.defaultItemProps ?? {}),
                  field.arrayFields
                );
                const newValue = [...existingValue, newItem];

                const newArrayState = regenerateArrayState(newValue);

                setUi(mapArrayStateToUi(newArrayState), false);
                onChange(newValue);
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
