import { useCallback, useEffect, useState } from "react";
import {
  indexPages,
  resolvePage,
  resolvePuckPath,
  type ResolvedPage,
} from "@puckeditor/router";
import config, { componentKey } from "../config";
import { pages } from "../config/pages";
import { createLocalPageStore } from "./page-store";
import { Metadata, resolveAllData } from "@/core";
import { Components, UserData } from "../config/types";
import { RootProps } from "../config/root";

const store = createLocalPageStore(componentKey);

// Cheap: indexing does not read `sourceHash`, so the seed pages are never hashed
// unless something actually publishes over one of them.
const codePages = indexPages<UserData>(pages);

export const useDemoData = ({
  path,
  isEdit,
  metadata = {},
}: {
  path: string;
  isEdit: boolean;
  metadata?: Metadata;
}) => {
  // `undefined` while resolving, `null` once we know there is no such page.
  const [resolved, setResolved] = useState<ResolvedPage<UserData> | null>();
  const [resolvedData, setResolvedData] = useState<UserData>();

  useEffect(() => {
    let active = true;

    // Local storage first, then the pages defined in config/pages.ts, then a
    // 404 — or an empty page if we're in the editor.
    resolvePage<UserData>({
      pathname: path,
      pages,
      store,
      mode: isEdit ? "edit" : "render",
    }).then((next) => {
      if (!active) return;

      setResolved(next);
      setResolvedData(next?.data);
    });

    return () => {
      active = false;
    };
  }, [path, isEdit]);

  // Normally this would happen on the server, but we can't
  // do that because we're using local storage as a database
  useEffect(() => {
    if (resolved && !isEdit) {
      resolveAllData<Components, RootProps>(
        resolved.data,
        config,
        metadata
      ).then(setResolvedData);
    }
    // `metadata` is a fresh literal on every render of the caller, so including
    // it here would re-resolve the whole page on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, isEdit]);

  useEffect(() => {
    if (!isEdit) {
      const root = resolved?.data.root;

      document.title = root?.props?.title || root?.title || "";
    }
  }, [resolved, isEdit]);

  const save = useCallback(
    async (data: UserData) => {
      const { path: canonical } = resolvePuckPath(path);

      // Stamping the seed's hash is what makes drift detectable later: if the
      // page in config/pages.ts changes after this, the two no longer agree.
      await store.set(canonical, {
        data,
        forkedFromHash: codePages[canonical]?.sourceHash,
      });

      // We just forked from the current source, so any drift is now resolved.
      setResolved((prev) =>
        prev ? { ...prev, data, origin: "store", drift: false } : prev
      );
    },
    [path]
  );

  return {
    resolved,
    data: resolved?.data,
    resolvedData,
    save,
    isResolving: resolved === undefined,
  };
};
