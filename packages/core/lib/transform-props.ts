import { walkTree } from "./data/walk-tree";
import {
  Config,
  Data,
  DefaultComponentProps,
  DefaultRootFieldProps,
} from "../types";
import { defaultData } from "./data/default-data";

type PropTransform<
  Props extends DefaultComponentProps = DefaultComponentProps,
  RootProps extends DefaultComponentProps = DefaultRootFieldProps
> = Partial<
  {
    [ComponentName in keyof Props]: (
      props: Props[ComponentName] & { [key: string]: any }
    ) => Props[ComponentName];
  } & { root: (props: RootProps & { [key: string]: any }) => RootProps }
>;

export function transformProps<
  Props extends DefaultComponentProps = DefaultComponentProps,
  RootProps extends DefaultComponentProps = DefaultRootFieldProps
>(
  data: Partial<Data>,
  propTransforms: PropTransform<Props, RootProps>,
  config: Config = { components: {} }
): Data {
  const mapItem = (item: any) => {
    if (propTransforms[item.type]) {
      return {
        ...item,
        props: {
          id: item.props.id,
          ...propTransforms[item.type]!(item.props as any),
        },
      };
    }

    return item;
  };

  const defaultedData = defaultData(data);

  // DEPRECATED - handle legacy root props
  const rootProps = defaultedData.root.props || defaultedData.root;
  let newRoot = { ...defaultedData.root };
  if (propTransforms["root"]) {
    newRoot.props = propTransforms["root"](rootProps as any);
  }

  const dataWithUpdatedRoot = { ...defaultedData, root: newRoot };

  const updatedData = walkTree(dataWithUpdatedRoot, config, (content) =>
    content.map(mapItem)
  );

  // DEPRECATED - handle legacy root props
  if (!defaultedData.root.props) {
    updatedData.root = updatedData.root.props as any;
  }

  return updatedData;
}
