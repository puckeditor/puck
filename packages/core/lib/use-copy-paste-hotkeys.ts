import { useCallback } from "react";
import { useHotkey } from "./use-hotkey";
import { useAppStore, useAppStoreApi } from "../store";
import { useClipboardStore } from "./clipboard-store";

export const useCopyPasteHotkeys = () => {
  const appStore = useAppStoreApi();

  // Check if we're in a context where copy-paste should work
  const isValidContext = useCallback(() => {
    // Get fresh state to ensure we have the latest selection
    const currentState = appStore.getState();
    const { itemSelector } = currentState.state.ui;
    const currentSelectedItem = currentState.selectedItem;
    
    // Only allow copy-paste when we have a selected item
    // and we're not focused on an input field
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true'
    );
    
    // Check if we have either selectedItem or itemSelector
    const hasSelection = currentSelectedItem || (itemSelector && typeof itemSelector.index !== 'undefined');
    
    return hasSelection && !isInputFocused;
  }, [appStore]);

  const copy = useCallback(() => {
    if (!isValidContext()) return;
    
    const { state, dispatch } = appStore.getState();
    const { index, zone } = state.ui.itemSelector || {};
    
    if (typeof index !== "undefined" && zone) {
      dispatch({
        type: "copy",
        sourceIndex: index,
        sourceZone: zone,
        recordHistory: false,
      });
    }
  }, [appStore, isValidContext]);

  const cut = useCallback(() => {
    if (!isValidContext()) return;
    
    const { state, dispatch } = appStore.getState();
    const { index, zone } = state.ui.itemSelector || {};
    
    if (typeof index !== "undefined" && zone) {
      dispatch({
        type: "cut",
        sourceIndex: index,
        sourceZone: zone,
        recordHistory: true,
      });
    }
  }, [appStore, isValidContext]);

  const paste = useCallback(() => {
    if (!isValidContext()) return;
    
    // Get fresh clipboard data instead of using the hook data
    const freshClipboardData = useClipboardStore.getState().clipboardData;
    
    if (!freshClipboardData.component) return;
    
    const { state, dispatch, selectedItem } = appStore.getState();
    const { index, zone } = state.ui.itemSelector || {};
    
    
    if (typeof index !== "undefined" && zone) {
      // Get the actually selected component from selectedItem
      if (selectedItem) {
        // Check if the selected component has slot fields (dropzones)
        const componentConfig = appStore.getState().config.components[selectedItem.type];
        const hasSlotFields = componentConfig?.fields && Object.values(componentConfig.fields).some(
          (field: any) => field.type === 'slot'
        );
        
        if (hasSlotFields && componentConfig?.fields) {
          // Find the first slot field and paste into it
          const slotField = Object.entries(componentConfig.fields).find(
            ([_, field]: any) => field.type === 'slot'
          );
          
          if (slotField) {
            const [slotFieldName] = slotField;
            const targetZone = `${selectedItem.props.id}:${slotFieldName}`;
            
            // Paste at the beginning of the slot
            dispatch({
              type: "paste",
              destinationIndex: 0,
              destinationZone: targetZone,
              recordHistory: true,
            });
            return;
          }
        }
      }
      
      // Default behavior: paste after the selected item
      dispatch({
        type: "paste",
        destinationIndex: index + 1,
        destinationZone: zone,
        recordHistory: true,
      });
    } else {
      // If no selection, paste at the end of content
      dispatch({
        type: "paste",
        destinationIndex: state.data.content.length,
        destinationZone: "root",
        recordHistory: true,
      });
    }
  }, [appStore, isValidContext]);

  // Copy shortcuts
  useHotkey({ meta: true, c: true }, copy);
  useHotkey({ ctrl: true, c: true }, copy); // Windows

  // Cut shortcuts
  useHotkey({ meta: true, x: true }, cut);
  useHotkey({ ctrl: true, x: true }, cut); // Windows

  // Paste shortcuts
  useHotkey({ meta: true, v: true }, paste);
  useHotkey({ ctrl: true, v: true }, paste); // Windows
};
