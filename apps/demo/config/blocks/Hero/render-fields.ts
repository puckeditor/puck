import { ComponentConfig } from "@/core/types";
import { HeroProps } from "./Hero";

export const heroRenderFields: NonNullable<
  ComponentConfig<HeroProps>["fields"]
> = {
  description: {
    type: "richtext",
  },
  image: {
    type: "object",
    objectFields: {
      content: {
        type: "slot",
      },
    },
  },
};
