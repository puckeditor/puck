import { forwardRef } from "react";
import { DropZoneProps } from "../DropZone/types";
import {
  ComponentData,
  Config,
  Content,
  Metadata,
  WithPuckProps,
} from "../../types";
import { useSlots } from "../../lib/use-slots";
import { useRichtextProps } from "../RichTextEditor/lib/use-richtext-props";

type SlotRenderProps = DropZoneProps & {
  content: Content;
  config: Config;
  metadata: Metadata;
};

export const SlotRenderPure = (props: SlotRenderProps) => (
  <SlotRender {...props} />
);

const Item = ({
  config,
  item,
  metadata,
}: {
  config: Config;
  item: ComponentData;
  metadata: Metadata;
}) => {
  const Component = config.components[item.type];

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const props = useSlots(config, item, (slotProps) => (
    <SlotRenderPure {...slotProps} config={config} metadata={metadata} />
  )) as WithPuckProps<ComponentData["props"]>;

  const richtextProps = useRichtextProps(Component.fields, props);

  return (
    <Component.render
      {...props}
      {...richtextProps}
      puck={{
        ...props.puck,
        metadata: metadata || {},
      }}
    />
  );
};

/**
 * Render a slot.
 *
 * Replacement for DropZoneRender
 */
export const SlotRender = forwardRef<HTMLDivElement, SlotRenderProps>(
  function SlotRenderInternal(
    { className, style, content, config, metadata, as },
    ref
  ) {
    const El = as ?? "div";

    return (
      <El className={className} style={style} ref={ref}>
        {content.map((item) => {
          if (!config.components[item.type]) {
            return null;
          }

          return (
            <Item
              key={item.props.id}
              config={config}
              item={item}
              metadata={metadata}
            />
          );
        })}
      </El>
    );
  }
);
