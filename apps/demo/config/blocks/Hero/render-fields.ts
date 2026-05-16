import { ObjectField, RichtextField, SlotField } from "@/core/types";
import { HeroProps } from "./Hero";

export const heroRenderFields = {
  description: {
    type: "richtext",
  } satisfies RichtextField,
  image: {
    type: "object",
    objectFields: {
      content: {
        type: "slot",
      } satisfies SlotField,
    },
  } satisfies ObjectField<HeroProps["image"]>,
};
