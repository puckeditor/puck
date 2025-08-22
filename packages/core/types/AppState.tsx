import { ItemSelector } from "../lib/data/get-item";
import { Viewport } from "./API";
import { Data } from "./Data";

export type ItemWithId = {
  _arrayId: string;
  _originalIndex: number;
};

export type ArrayState = { items: ItemWithId[]; openId: string };

export type UiState = {
  leftSideBarVisible: boolean;
  rightSideBarVisible: boolean;
  leftSideBarWidth?: number | null;
  rightSideBarWidth?: number | null;
  mobilePanelExpanded?: boolean;
  itemSelector: ItemSelector | null;
  arrayState: Record<string, ArrayState | undefined>;
  previewMode: "interactive" | "edit";
  componentList: Record<
    string,
    {
      components?: string[];
      title?: string;
      visible?: boolean;
      expanded?: boolean;
    }
  >;
  isDragging: boolean;
  viewports: {
    current: {
      width: number | "100%";
      height: number | "auto";
    };
    controlsVisible: boolean;
    options: Viewport[];
  };
  field: { focus?: string | null };
  plugin: {
    current: string | null;
  };
};

export type AppState<UserData extends Data = Data> = {
  data: UserData;
  ui: UiState;
};
