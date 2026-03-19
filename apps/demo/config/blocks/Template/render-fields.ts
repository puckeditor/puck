import { ComponentConfig } from "@/core/types";
import { TemplateProps } from "./Template";

export const templateRenderFields: NonNullable<
  ComponentConfig<TemplateProps>["fields"]
> = {
  children: {
    type: "slot",
  },
};
