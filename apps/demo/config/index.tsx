import { Button } from "./blocks/Button";
import { Card } from "./blocks/Card";
import { Grid } from "./blocks/Grid";
import { Hero } from "./blocks/Hero";
import { Heading } from "./blocks/Heading";
import { Flex } from "./blocks/Flex";
import { Logos } from "./blocks/Logos";
import { Stats } from "./blocks/Stats";
import { Template } from "./blocks/Template";
import { Text } from "./blocks/Text";
import { Space } from "./blocks/Space";
import { RichText } from "./blocks/RichText";

import Root from "./root";
import { UserConfig } from "./types";

// We avoid the name config as next gets confused
export const conf: UserConfig = {
  root: Root,
  categories: {
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
      components: ["Card", "Hero", "Logos", "Stats", "Template"],
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
    Template,
    Text,
    Space,
    RichText,
  },
};

// Namespaces stored pages so they're discarded when the component set changes
// and previously-saved data could reference a component that no longer exists.
//
// This deliberately excludes the seed data in ./initial-data: changing a seed
// page no longer nukes every saved page. @puckeditor/router detects that case
// precisely instead, reporting it as drift on the affected page only.
export const componentKey = Buffer.from(
  Object.keys(conf.components).join("-")
).toString("base64");

export default conf;
