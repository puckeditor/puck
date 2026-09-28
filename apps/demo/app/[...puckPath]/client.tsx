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
import { createAiPlugin, withDynamicConfig } from "@puckeditor/plugin-ai";
import type { Data } from "@/core/types";
import headingAnalyzer from "@/plugin-heading-analyzer/src/HeadingAnalyzer";
import config from "../../config";
import { useDemoData } from "../../lib/use-demo-data";
import { useEffect, useMemo, useState } from "react";
import { Type } from "lucide-react";
import { withSignIn } from "../../plugins/sign-in-plugin";
import { DocsBarCta } from "../../components/docs-bar-cta";

const aiPlugin = createAiPlugin({
  designMode: {
    visible: true,
  },
  defaultMode: "design",
});

const blocksPluginInstance = blocksPlugin();
const outlinePluginInstance = outlinePlugin();

export function Client({ path, isEdit }: { path: string; isEdit: boolean }) {
  const [authenticated, setAuthenticated] = useState(false);

  const authedAiPlugin = useMemo(
    () =>
      withSignIn(aiPlugin, authenticated, () => {
        // TODO: Replace with Puck oauth
        alert("Signing in with cloud");
        setAuthenticated(true);
      }),
    [authenticated]
  );

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
      <div>
        <Puck
          config={dynamicConfig}
          data={data}
          onPublish={async (data) => {
            localStorage.setItem(key, JSON.stringify(data));
          }}
          plugins={[
            blocksPluginInstance,
            outlinePluginInstance,
            headingAnalyzer,
            authedAiPlugin,
          ]}
          headerPath={path}
          iframe={{
            enabled: params.get("disableIframe") === "true" ? false : true,
          }}
          dnd={{
            behavior: dndBehavior,
          }}
          fieldTransforms={{
            userField: ({ value }) => value, // Included to check types
          }}
          _experimentalVirtualization
          overrides={{
            header: ({ children }) => (
              <>
                <DocsBarCta />
                {children}
              </>
            ),
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
