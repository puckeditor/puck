import { CSSProperties } from "react";
import {
  rootAreaId,
  rootDroppableId,
  rootZone,
} from "../../lib/root-droppable-id";
import { setupZone } from "../../lib/data/setup-zone";
import {
  Config,
  Data,
  Metadata,
  UserGenerics,
  FieldTransforms,
} from "../../types";
import { useSlots } from "../../lib/use-slots";
import { SlotRenderPure } from "../SlotRender/server";
import { useRichtextProps } from "../RichTextEditor/lib/use-richtext-props";

type DropZoneRenderProps = {
  zone: string;
  data: Data;
  config: Config;
  areaId?: string;
  style?: CSSProperties;
  metadata?: Metadata;
  fieldTransforms?: FieldTransforms;
};

type DropZoneRenderItemProps = {
  item: Data["content"][number];
  data: Data;
  config: Config;
  metadata: Metadata;
  fieldTransforms?: FieldTransforms;
};

function DropZoneRenderItem({
  item,
  data,
  config,
  metadata,
  fieldTransforms,
}: DropZoneRenderItemProps) {
  const Component = config.components[item.type];

  const props = {
    ...item.props,
    puck: {
      renderDropZone: ({ zone }: { zone: string }) => (
        <DropZoneRender
          zone={zone}
          data={data}
          areaId={item.props.id}
          config={config}
          metadata={metadata}
          fieldTransforms={fieldTransforms}
        />
      ),
      metadata,
      dragRef: null,
      isEditing: false,
    },
  };

  const renderItem = { ...item, props };
  const propsWithSlots = useSlots(
    config,
    renderItem,
    (slotProps) => (
      <SlotRenderPure
        {...slotProps}
        config={config}
        metadata={metadata}
        fieldTransforms={fieldTransforms}
      />
    ),
    fieldTransforms
  );

  const richtextProps = useRichtextProps(
    Component?.fields,
    propsWithSlots,
    fieldTransforms
  );

  if (!Component) {
    return null;
  }

  return <Component.render {...propsWithSlots} {...richtextProps} />;
}

export function DropZoneRender({
  zone,
  data,
  areaId = "root",
  config,
  metadata = {},
  fieldTransforms,
}: DropZoneRenderProps) {
  let zoneCompound = rootDroppableId;
  let content = data?.content || [];

  if (!data || !config) {
    return null;
  }

  if (areaId !== rootAreaId && zone !== rootZone) {
    zoneCompound = `${areaId}:${zone}`;
    content = setupZone(data, zoneCompound).zones[zoneCompound];
  }

  return (
    <>
      {content.map((item) => {
        return (
          <DropZoneRenderItem
            key={item.props.id}
            item={item}
            data={data}
            config={config}
            metadata={metadata}
            fieldTransforms={fieldTransforms}
          />
        );
      })}
    </>
  );
}

export function Render<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
>({
  config,
  data,
  metadata = {},
  fieldTransforms: userFieldTransforms,
}: {
  config: UserConfig;
  data: G["UserData"];
  metadata?: Metadata;
  fieldTransforms?: FieldTransforms<UserConfig>;
}) {
  // The generic only exists to type the user's transforms against their own
  // field types. Everything downstream works off the unparameterised type.
  const fieldTransforms = userFieldTransforms as FieldTransforms | undefined;

  // DEPRECATED
  const rootProps = "props" in data.root ? data.root.props : data.root;

  const title = rootProps.title || "";

  const props = {
    ...rootProps,
    puck: {
      renderDropZone: ({ zone }: { zone: string }) => (
        <DropZoneRender
          zone={zone}
          data={data}
          config={config}
          metadata={metadata}
          fieldTransforms={fieldTransforms}
        />
      ),
      isEditing: false,
      dragRef: null,
      metadata,
    },
    title,
    editMode: false,
    id: "puck-root",
  };

  const propsWithSlots = useSlots(
    config,
    { type: "root", props },
    (props) => (
      <SlotRenderPure
        {...props}
        config={config}
        metadata={metadata}
        fieldTransforms={fieldTransforms}
      />
    ),
    fieldTransforms
  );

  const richtextProps = useRichtextProps(
    config.root?.fields,
    propsWithSlots,
    fieldTransforms
  );

  if (config.root?.render) {
    return (
      <config.root.render {...propsWithSlots} {...richtextProps}>
        <DropZoneRender
          config={config}
          data={data}
          zone={rootZone}
          metadata={metadata}
          fieldTransforms={fieldTransforms}
        />
      </config.root.render>
    );
  }

  return (
    <DropZoneRender
      config={config}
      data={data}
      zone={rootZone}
      metadata={metadata}
      fieldTransforms={fieldTransforms}
    />
  );
}
