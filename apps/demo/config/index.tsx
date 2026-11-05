import { Button } from "./blocks/Button";
import { Card } from "./blocks/Card";
import { Grid } from "./blocks/Grid";
import { Hero } from "./blocks/Hero";
import { Heading } from "./blocks/Heading";
import { Flex } from "./blocks/Flex";
import { Logos } from "./blocks/Logos";
import { Stats } from "./blocks/Stats";
import { FeatureGrid } from "./blocks/FeatureGrid";
import { CTA } from "./blocks/CTA";
import { FAQ } from "./blocks/FAQ";
import { Steps } from "./blocks/Steps";
import { FeatureSplit } from "./blocks/FeatureSplit";
import { Bento } from "./blocks/Bento";
import { Template } from "./blocks/Template";
import { Text } from "./blocks/Text";
import { Space } from "./blocks/Space";
import { RichText } from "./blocks/RichText";

import Root from "./root";
import { UserConfig } from "./types";
import { initialData } from "./initial-data";

// We avoid the name config as next gets confused
export const conf: UserConfig = {
  root: Root,
  categories: {
    introduction: {
      title: "Introduction",
      components: ["Hero"],
    },
    content: {
      title: "Content",
      components: [
        "FeatureGrid",
        "Card",
        "CTA",
        "FAQ",
        "Steps",
        "FeatureSplit",
        "Bento",
      ],
    },
    socialProof: {
      title: "Social Proof",
      components: ["Logos", "Stats"],
    },
    layout: {
      components: ["Grid", "Flex", "Space"],
    },
    typography: {
      components: ["Heading", "Text", "RichText"],
    },
    interactive: {
      title: "Actions",
      components: ["Button"],
    },
    other: {
      title: "Other",
      components: ["Template"],
    },
  },
  components: {
    Button,
    Card,
    Grid,
    Hero,
    Heading,
    Flex,
    Logos,
    Stats,
    FeatureGrid,
    CTA,
    FAQ,
    Steps,
    FeatureSplit,
    Bento,
    Template,
    Text,
    Space,
    RichText,
  },
};

export const componentKey = Buffer.from(
  `${Object.keys(conf.components).join("-")}-${JSON.stringify({
    initialData,
  })}`
).toString("base64");

export default conf;
