import { ComponentConfig } from "@/core/types";
import { withLayout } from "../../components/Layout";
import TemplateComponent, { TemplateProps } from "./Template";
import { templateRenderFields } from "./render-fields";

export const TemplateInternal: ComponentConfig<TemplateProps> = {
  fields: templateRenderFields,
  render: TemplateComponent,
};

export const Template = withLayout(TemplateInternal);
