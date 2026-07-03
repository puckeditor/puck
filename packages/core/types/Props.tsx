import { DropZoneProps } from "../components/DropZone/types";
import { Metadata } from "./Data";
import { WithChildren, WithPuckProps } from "./Utils";

export type PuckContext = {
  renderDropZone: (props: DropZoneProps) => React.ReactNode;
  metadata: Metadata;
  isEditing: boolean;
  dragRef: ((element: Element | null) => void) | null;
};

export type DefaultRootFieldProps = {
  title?: string;
};

/**
 * Merge the default root field props into user-provided root props, letting
 * the user's props take precedence. Using a plain intersection would turn an
 * overridden `title` (e.g. `number`) into `never` (`number & string`).
 */
export type WithDefaultRootFieldProps<RootProps> = RootProps &
  Omit<DefaultRootFieldProps, keyof RootProps>;

export type DefaultRootRenderProps<
  Props extends DefaultComponentProps = DefaultRootFieldProps
> = WithPuckProps<WithChildren<Props>>;

export type DefaultRootProps = DefaultRootRenderProps; // Deprecated

export type DefaultComponentProps = { [key: string]: any };
