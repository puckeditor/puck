/* eslint-disable @next/next/no-img-element */
import { ComponentConfig } from "@/core/types";
import HeroComponent, { HeroProps } from "./Hero";

export const Hero: ComponentConfig<HeroProps> = {
  render: HeroComponent,
};
