import { Data } from "@puckeditor/core";
import fs from "fs";

// Replace with call to your database
export const getPage = (path: string) => {
  const allData: Record<string, Data> | null = fs.existsSync("database.json")
    ? JSON.parse(fs.readFileSync("database.json", "utf-8"))
    : null;

  return allData ? allData[path] : null;
};

// Replace with call to your database
export const setPage = (path: string, data: Data) => {
  const existingData = JSON.parse(
    fs.existsSync("database.json")
      ? fs.readFileSync("database.json", "utf-8")
      : "{}"
  );

  const updatedData = {
    ...existingData,
    [path]: data,
  };

  fs.writeFileSync("database.json", JSON.stringify(updatedData));
};
