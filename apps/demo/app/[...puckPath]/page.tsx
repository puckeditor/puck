import "@/core/styles.css";

import { resolvePuckPath } from "@puckeditor/router";
import { Metadata } from "next";
import Client from "./client";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ framework: string; uuid: string; puckPath: string[] }>;
}): Promise<Metadata> {
  const { puckPath } = await params;
  const { isEditorRoute, path } = resolvePuckPath(puckPath);

  if (isEditorRoute) {
    return {
      title: "Editing: " + path,
    };
  }

  return {
    title: "",
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ framework: string; uuid: string; puckPath: string[] }>;
}) {
  const { puckPath } = await params;
  const { isEditorRoute, path } = resolvePuckPath(puckPath);

  return <Client isEdit={isEditorRoute} path={path} />;
}

export const dynamic = "force-dynamic";
