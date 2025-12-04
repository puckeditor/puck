"use client";

import { rootZone } from "../../lib/root-droppable-id";
import { useSlots } from "../../lib/use-slots";
import { Config, Data, Metadata, UserGenerics } from "../../types";
import {
  DropZonePure,
  DropZoneProvider,
  DropZoneRenderPure,
} from "../DropZone";
import React, { useMemo } from "react";
import { SlotRender } from "../SlotRender";
import { DropZoneContext } from "../DropZone/context";
import { useRichtextProps } from "../RichTextEditor/lib/use-richtext-props";

export const renderContext = React.createContext<{
  config: Config;
  data: Data;
  metadata: Metadata;
}>({
  config: { components: {} },
  data: { root: {}, content: [] },
  metadata: {},
});

export function Render<
  UserConfig extends Config = Config,
  G extends UserGenerics<UserConfig> = UserGenerics<UserConfig>
>({
  config,
  data,
  metadata = {},
}: {
  config: UserConfig;
  data: Partial<G["UserData"] | Data>;
  metadata?: Metadata;
}) {
  const defaultedData = {
    ...data,
    root: data.root || {},
    content: data.content || [],
  } as G["UserData"];

  // DEPRECATED
  const rootProps =
    "props" in defaultedData.root
      ? defaultedData.root.props
      : defaultedData.root;
  const title = rootProps?.title || "";

  const pageProps = {
    ...rootProps,
    puck: {
      renderDropZone: DropZonePure,
      isEditing: false,
      dragRef: null,
      metadata: metadata,
    },
    title,
    editMode: false,
    id: "puck-root",
  };

  const propsWithSlots = useSlots(
    config,
    { type: "root", props: pageProps },
    (props) => <SlotRender {...props} config={config} metadata={metadata} />
  );

  const richtextProps = useRichtextProps(config.root?.fields, pageProps);

  const nextContextValue = useMemo<DropZoneContext>(
    () => ({
      mode: "render",
      depth: 0,
    }),
    []
  );

  if (config.root?.render) {
    return (
      <renderContext.Provider value={{ config, data: defaultedData, metadata }}>
        <DropZoneProvider value={nextContextValue}>
          <config.root.render {...propsWithSlots} {...richtextProps}>
            <DropZoneRenderPure zone={rootZone} />
          </config.root.render>
        </DropZoneProvider>
      </renderContext.Provider>
    );
  }

  return (
    <renderContext.Provider value={{ config, data: defaultedData, metadata }}>
      <DropZoneProvider value={nextContextValue}>
        <DropZoneRenderPure zone={rootZone} />
      </DropZoneProvider>
    </renderContext.Provider>
  );
}
