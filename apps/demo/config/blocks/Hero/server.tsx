/* eslint-disable @next/next/no-img-element */
import { ComponentConfig } from "@/core/types";
import HeroComponent, { HeroProps } from "./Hero";
import { Components } from "../../types";

export const Hero: ComponentConfig<HeroProps, keyof Components> = {
  render: HeroComponent,
};
