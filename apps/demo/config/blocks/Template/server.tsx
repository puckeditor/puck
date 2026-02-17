import { ComponentConfig } from "@/core/types";
import { withLayout } from "../../components/Layout";
import TemplateComponent, { TemplateProps } from "./Template";
import { Components } from "../../types";

export const TemplateInternal: ComponentConfig<
  TemplateProps,
  keyof Components
> = {
  render: TemplateComponent,
};

export const Template = withLayout(TemplateInternal);
