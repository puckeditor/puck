import { loginUrl } from "@puckeditor/cloud-client";
import { NextRequest, NextResponse } from "next/server";

export const GET = (request: NextRequest) => {
  // loginUrl only returns to paths on this site
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/edit";

  return NextResponse.json({ url: loginUrl(returnTo) });
};
