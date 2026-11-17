import "@/core/styles.css";
import "@puckeditor/plugin-ai/styles.css";
import "@puckeditor/plugin-auth/styles.css";

import { getPuckIdentity } from "@puckeditor/cloud-client";

import resolvePuckPath from "../../lib/resolve-puck-path";
import { Metadata } from "next";
import Client from "./client";
import { headers } from "next/headers";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ framework: string; uuid: string; puckPath: string[] }>;
}): Promise<Metadata> {
  const { puckPath } = await params;
  const { isEdit, path } = resolvePuckPath(puckPath);

  if (isEdit) {
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
  const { isEdit, path } = resolvePuckPath(puckPath);

  const identity = await getPuckIdentity(await headers());

  return <Client isEdit={isEdit} path={path} identity={identity} />;
}

export const dynamic = "force-dynamic";
