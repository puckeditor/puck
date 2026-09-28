import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import fs from "fs";

export async function POST(request: Request) {
  const payload = await request.json();

  const existingData = JSON.parse(
    fs.existsSync("database.json")
      ? fs.readFileSync("database.json", "utf-8")
      : "{}"
  );

  const updatedData = {
    ...existingData,
    [payload.path]: payload.data,
  };

  fs.writeFileSync("database.json", JSON.stringify(updatedData));

  // Purge Next.js cache
  revalidatePath(payload.path);

  return NextResponse.json({ status: "ok" });
}
