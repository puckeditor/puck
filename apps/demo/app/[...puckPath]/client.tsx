"use client";

import { AutoField, Button, FieldLabel, Puck, Render } from "@/core";
import headingAnalyzer from "@/plugin-heading-analyzer/src/HeadingAnalyzer";
import config from "../../config";
import { NotFound } from "../../lib/not-found";
import { useDemoData } from "../../lib/use-demo-data";
import { useEffect, useState } from "react";
import { Type } from "lucide-react";

export function Client({ path, isEdit }: { path: string; isEdit: boolean }) {
  const metadata = {
    example: "Hello, world",
  };

  const { resolved, resolvedData, save, isResolving } = useDemoData({
    path,
    isEdit,
    metadata,
  });

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || isResolving) return null;

  // In edit mode resolvePage always returns a page — an empty shell for a path
  // that doesn't exist yet — so this only fires on the public route.
  if (!resolved) return <NotFound />;

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
          config={config}
          data={resolved.data}
          onPublish={save}
          plugins={[headingAnalyzer]}
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
                {resolved?.drift && (
                  <div
                    title="config/pages.ts has changed since this page was published. Publishing again adopts the current source."
                    style={{
                      alignSelf: "center",
                      padding: "4px 10px",
                      borderRadius: 4,
                      background: "var(--puck-color-yellow-11, #fdf3d4)",
                      color: "var(--puck-color-yellow-02, #6b5000)",
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Source changed
                  </div>
                )}

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

  return (
    <Render
      config={config}
      data={resolvedData ?? resolved.data}
      metadata={metadata}
    />
  );
}

export default Client;
