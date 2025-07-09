import { ComponentConfig } from "@/core/types";
import { withLayout } from "../../components/Layout";
import TemplateComponent, { TemplateProps } from "./Template";

export const TemplateInternal: ComponentConfig<TemplateProps> = {
  render: TemplateComponent,
};

export const Template = withLayout(TemplateInternal);
