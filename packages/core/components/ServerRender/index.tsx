import { CSSProperties } from "react";
import {
  rootAreaId,
  rootDroppableId,
  rootZone,
} from "../../lib/root-droppable-id";
import { setupZone } from "../../lib/data/setup-zone";
import { Config, Data, Metadata, UserGenerics } from "../../types";
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
};

type DropZoneRenderItemProps = {
  item: Data["content"][number];
  data: Data;
  config: Config;
  metadata: Metadata;
};

function DropZoneRenderItem({
  item,
  data,
  config,
  metadata,
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
        />
      ),
      metadata,
      dragRef: null,
      isEditing: false,
    },
  };

  const renderItem = { ...item, props };
  const propsWithSlots = useSlots(config, renderItem, (slotProps) => (
    <SlotRenderPure {...slotProps} config={config} metadata={metadata} />
  ));
  const richtextProps = useRichtextProps(Component?.fields, propsWithSlots);

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
}: {
  config: UserConfig;
  data: G["UserData"];
  metadata?: Metadata;
}) {
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

  const propsWithSlots = useSlots(config, { type: "root", props }, (props) => (
    <SlotRenderPure {...props} config={config} metadata={metadata} />
  ));

  const richtextProps = useRichtextProps(config.root?.fields, props);

  if (config.root?.render) {
    return (
      <config.root.render {...propsWithSlots} {...richtextProps}>
        <DropZoneRender
          config={config}
          data={data}
          zone={rootZone}
          metadata={metadata}
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
    />
  );
}
