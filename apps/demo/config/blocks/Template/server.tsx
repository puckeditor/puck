import { ComponentConfig } from "@/core/types";
import { withLayout } from "../../components/Layout";
import { Components } from "../../types";
import TemplateComponent, { TemplateProps } from "./Template";
import { templateRenderFields } from "./render-fields";

export const TemplateInternal: ComponentConfig<{
  props: TemplateProps;
  availableComponents: keyof Components;
}> = {
  fields: templateRenderFields as ComponentConfig<TemplateProps>["fields"],
  render: TemplateComponent,
};

export const Template = withLayout(TemplateInternal);
