"use client";

import React, { useMemo } from "react";

import { rootZone } from "../../lib/root-droppable-id";
import useRenderProps from "../../lib/field-transforms/use-render-props";

import {
  Config,
  Data,
  Metadata,
  UserGenerics,
  FieldTransforms,
} from "../../types";

import {
  DropZonePure,
  DropZoneProvider,
  DropZoneRenderPure,
} from "../DropZone";
import { SlotRender } from "../SlotRender";
import { DropZoneContext } from "../DropZone/context";

export const renderContext = React.createContext<{
  config: Config;
  data: Data;
  metadata: Metadata;
  fieldTransforms?: FieldTransforms;
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
  fieldTransforms: userFieldTransforms,
}: {
  config: UserConfig;
  data: Partial<G["UserData"] | Data>;
  metadata?: Metadata;
  fieldTransforms?: FieldTransforms<UserConfig>;
}) {
  // The generic only exists to type the user's transforms against their own
  // field types. Everything downstream works off the unparameterised type.
  const fieldTransforms = userFieldTransforms as FieldTransforms | undefined;

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

  const renderProps = useRenderProps(
    config,
    { type: "root", props: pageProps },
    (props) => (
      <SlotRender
        {...props}
        config={config}
        metadata={metadata}
        fieldTransforms={fieldTransforms}
      />
    ),
    fieldTransforms
  );

  const nextContextValue = useMemo<DropZoneContext>(
    () => ({
      mode: "render",
      depth: 0,
    }),
    []
  );

  if (config.root?.render) {
    return (
      <renderContext.Provider
        value={{ config, data: defaultedData, metadata, fieldTransforms }}
      >
        <DropZoneProvider value={nextContextValue}>
          <config.root.render {...renderProps}>
            <DropZoneRenderPure zone={rootZone} />
          </config.root.render>
        </DropZoneProvider>
      </renderContext.Provider>
    );
  }

  return (
    <renderContext.Provider
      value={{ config, data: defaultedData, metadata, fieldTransforms }}
    >
      <DropZoneProvider value={nextContextValue}>
        <DropZoneRenderPure zone={rootZone} />
      </DropZoneProvider>
    </renderContext.Provider>
  );
}
