/* eslint-disable @next/next/no-img-element */
import { ComponentConfig } from "@/core/types";
import HeroComponent, { HeroProps } from "./Hero";
import { heroRenderFields } from "./render-fields";
import { Components } from "../../types";

export const Hero: ComponentConfig<{
  props: HeroProps;
  availableComponents: keyof Components;
}> = {
  fields: heroRenderFields as ComponentConfig<HeroProps>["fields"],
  render: HeroComponent,
};
