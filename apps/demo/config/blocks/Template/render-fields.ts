import { SlotField } from "@/core/types";
import { TemplateProps } from "./Template";
import { Components } from "../../types";

export const templateRenderFields: {
  children: SlotField<keyof Components>;
} = {
  children: {
    type: "slot",
  },
};
