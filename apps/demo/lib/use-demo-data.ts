import { useEffect, useState } from "react";
import config, { componentKey } from "../config";
import { initialData } from "../config/initial-data";
import { Metadata, resolveAllData } from "@/core";
import { Components, UserData } from "../config/types";
import { RootProps } from "../config/root";

const isBrowser = typeof window !== "undefined";

export const useDemoData = ({
  path,
  isEdit,
  metadata = {},
}: {
  path: string;
  isEdit: boolean;
  metadata?: Metadata;
}) => {
  // unique b64 key that updates each time we add / remove components

  const key = `puck-demo:${componentKey}:${path}`;

  const [data] = useState<Partial<UserData>>(() => {
    if (isBrowser) {
      const dataStr = localStorage.getItem(key);

      if (dataStr) {
        return JSON.parse(dataStr);
      }

      return initialData[path] || {};
    }
  });

  // Normally this would happen on the server, but we can't
  // do that because we're using local storage as a database
  const [resolvedData, setResolvedData] = useState<Partial<UserData>>(data);

  useEffect(() => {
    if (data && !isEdit) {
      resolveAllData<Components, RootProps>(data, config, metadata).then(
        setResolvedData
      );
    }
  }, [data, isEdit]);

  useEffect(() => {
    if (!isEdit) {
      const title = data?.root?.props?.title || data?.root?.title;
      document.title = title || "";
    }
  }, [data, isEdit]);

  return { data, resolvedData, key };
};
