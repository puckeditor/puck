import { SlotField } from "@/core/types";
import { TemplateProps } from "./Template";

export const templateRenderFields: {
  children: SlotField;
} = {
  children: {
    type: "slot",
  },
};
