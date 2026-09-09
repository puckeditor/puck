"use client";

import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import { withDynamicConfig } from "@puckeditor/plugin-ai";
import config from "../../puck.config";

export function Client({ data }: { data: Data }) {
  const configWithDesignedComponents = withDynamicConfig(config, data);

  return <Render config={configWithDesignedComponents} data={data} />;
}
