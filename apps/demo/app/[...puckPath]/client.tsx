"use client";

import {
  AutoField,
  Button,
  FieldLabel,
  Puck,
  Render,
  outlinePlugin,
  blocksPlugin,
} from "@/core";
import { withDynamicConfig } from "@puckeditor/plugin-ai";
import type { Data } from "@/core/types";
import headingAnalyzer from "@/plugin-heading-analyzer/src/HeadingAnalyzer";
import config from "../../config";
import { useDemoData } from "../../lib/use-demo-data";
import { useAuthedAiPlugin } from "../../lib/use-authed-ai-plugin";
import { useEffect, useMemo, useState } from "react";
import { Type } from "lucide-react";
import { DocsBarCta } from "../../components/docs-bar-cta";
import { PuckSignInIdentity } from "@puckeditor/cloud-client";
import { createAuthPlugin } from "@puckeditor/plugin-auth";

const authPlugin = createAuthPlugin();

const blocksPluginInstance = blocksPlugin();
const outlinePluginInstance = outlinePlugin();

export function Client({
  path,
  isEdit,
  identity,
}: {
  path: string;
  isEdit: boolean;
  identity: PuckSignInIdentity | null;
}) {
  const { aiPlugin, ui } = useAuthedAiPlugin(identity);

  const metadata = {
    example: "Hello, world",
  };

  const { data, resolvedData, key } = useDemoData({
    path,
    isEdit,
    metadata,
  });

  const [isClient, setIsClient] = useState(false);

  const dynamicConfig = useMemo(
    () => withDynamicConfig(config, data as Data),
    [data]
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const params = new URL(window.location.href).searchParams;
  const requestedDndBehavior = params.get("dndBehavior");
  const dndBehavior =
    requestedDndBehavior === "auto" ||
    requestedDndBehavior === "fluid" ||
    requestedDndBehavior === "static"
      ? requestedDndBehavior
      : undefined;

  if (isEdit) {
    return (
      // The editor fills the window above the demo footer
      <div
        style={{ display: "flex", flexDirection: "column", height: "100dvh" }}
      >
        <div style={{ flexGrow: 1, minHeight: 0 }}>
          <Puck
            _experimentalFullScreenCanvas
            height="100%"
            config={dynamicConfig}
            data={data}
            ui={ui}
            onPublish={async (data) => {
              localStorage.setItem(key, JSON.stringify(data));
            }}
            plugins={[
              blocksPluginInstance,
              outlinePluginInstance,
              aiPlugin,
              ...(identity ? [authPlugin] : []),
              headingAnalyzer,
            ]}
            headerPath={path}
            iframe={{
              enabled: params.get("disableIframe") === "true" ? false : true,
            }}
            dnd={{
              behavior: dndBehavior,
              enableDragHandle: true,
            }}
            fieldTransforms={{
              userField: ({ value }) => value, // Included to check types
            }}
            _experimentalVirtualization
            overrides={{
              fieldTypes: {
                // Example of user field provided via overrides
                userField: ({ readOnly, field, name, value, onChange }) => (
                  <FieldLabel
                    label={field.label || name}
                    readOnly={readOnly}
                    icon={<Type size={16} />}
                  >
                    <AutoField
                      field={{ type: "text" }}
                      onChange={onChange}
                      value={value}
                    />
                  </FieldLabel>
                ),
              },
              headerActions: ({ children }) => (
                <>
                  <div>
                    <Button href={path} newTab variant="secondary">
                      View page
                    </Button>
                  </div>

                  {children}
                </>
              ),
            }}
            metadata={metadata}
          />
        </div>
        <DocsBarCta />
      </div>
    );
  }

  if (data.content) {
    return (
      <Render config={dynamicConfig} data={resolvedData} metadata={metadata} />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        textAlign: "center",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div>
        <h1>404</h1>
        <p>Page does not exist in session storage</p>
      </div>
    </div>
  );
}

export default Client;
