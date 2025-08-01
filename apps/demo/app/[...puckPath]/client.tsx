"use client";

import { Button, Config, Fields, Puck, Render } from "@/core";
import headingAnalyzer from "@/plugin-heading-analyzer/src/HeadingAnalyzer";
// import config from "../../config";
import { useDemoData } from "../../lib/use-demo-data";
import { useEffect, useState } from "react";
import { createClient, Entry } from "contentful";
import createFieldContentful from "../../../../packages/field-contentful";

type ComponentProps = {
  // Expect contentful entries as article data
  data?: Entry<{ text: string }>;
  // Add a prop for selecting a content type
  model: string;
};

const contentfulClient = createClient({
  space: "SPACE-ID",
  accessToken: "ACCESS-TOKEN",
});

const config: Config<{ Component: ComponentProps }> = {
  components: {
    Component: {
      resolveFields: async (data, params) => {
        // Fetch all available content types from Contentful
        const types = await contentfulClient.getContentTypes();

        // Create a dropdown field for selecting a content type
        let fields: Fields<ComponentProps> = {
          model: {
            type: "select",
            options: [
              { label: "Select a content type", value: "" },
              ...types.items.map((type) => ({
                label: type.name,
                value: type.sys.id,
              })),
            ],
          },
        };

        // If a content type is selected, add an entry picker for it
        if (data.props.model) {
          fields.data = createFieldContentful<ComponentProps["data"]>(
            data.props.model,
            {
              client: contentfulClient,
            }
          );
        }

        return fields;
      },
      render: ({ data }) => {
        return <p>{data?.fields.text}</p>;
      },
    },
  },
};

export function Client({ path, isEdit }: { path: string; isEdit: boolean }) {
  const metadata = {
    example: "Hello, world",
  };

  const { data, resolvedData, key } = useDemoData({
    path,
    isEdit,
    metadata,
  });

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const params = new URL(window.location.href).searchParams;

  if (isEdit) {
    return (
      <div>
        <Puck
          config={config}
          data={data}
          onPublish={async (data) => {
            localStorage.setItem(key, JSON.stringify(data));
          }}
          plugins={[headingAnalyzer]}
          headerPath={path}
          iframe={{
            enabled: params.get("disableIframe") === "true" ? false : true,
          }}
          overrides={{
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
    return <Render config={config} data={resolvedData} metadata={metadata} />;
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
