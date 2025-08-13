import { ReactElement, ReactNode } from "react";
import { Field, FieldProps } from "../Fields";
import { ItemSelector } from "../../lib/data/get-item";
import { ExtractField, UserGenerics } from "../Utils";
import { Config } from "../Config";

// Plugins can use `usePuck` instead of relying on props
type RenderFunc<
  Props extends { [key: string]: any } = { children: ReactNode }
> = (props: Props) => ReactElement;

// All direct render methods, excluding fields
export const overrideKeys = [
  "header",
  "headerActions",
  "fields",
  "fieldLabel",
  "drawer",
  "drawerItem",
  "componentOverlay",
  "outline",
  "puck",
  "preview",
] as const;

export type OverrideKey = (typeof overrideKeys)[number];

type OverridesGeneric<Shape extends { [key in OverrideKey]: any }> = Shape;

export type Overrides<UserConfig extends Config = Config> = OverridesGeneric<{
  fieldTypes: Partial<FieldRenderFunctions<UserConfig>>;
  header: RenderFunc<{ actions: ReactNode; children: ReactNode }>;
  actionBar: RenderFunc<{
    label?: string;
    children: ReactNode;
    parentAction: ReactNode;
  }>;
  headerActions: RenderFunc<{ children: ReactNode }>;
  preview: RenderFunc;
  fields: RenderFunc<{
    children: ReactNode;
    isLoading: boolean;
    itemSelector?: ItemSelector | null;
  }>;
  fieldLabel: RenderFunc<{
    children?: ReactNode;
    icon?: ReactNode;
    label: string;
    el?: "label" | "div";
    readOnly?: boolean;
    className?: string;
  }>;
  components: RenderFunc; // DEPRECATED
  componentItem: RenderFunc<{ children: ReactNode; name: string }>; // DEPRECATED
  drawer: RenderFunc;
  drawerItem: RenderFunc<{ children: ReactNode; name: string }>;
  iframe: RenderFunc<{ children: ReactNode; document?: Document }>;
  outline: RenderFunc;
  componentOverlay: RenderFunc<{
    children: ReactNode;
    hover: boolean;
    isSelected: boolean;
    componentId: string;
    componentType: string;
  }>;
  puck: RenderFunc;
}>;

export type FieldRenderFunctions<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>,
  UserField extends { type: string } = Field | G["UserField"]
> = Omit<
  {
    [Type in UserField["type"]]: React.FunctionComponent<
      FieldProps<ExtractField<UserField, Type>, any> & {
        children: ReactNode;
        name: string;
      }
    >;
  },
  "custom"
>;
