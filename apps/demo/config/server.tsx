import { Button } from "./blocks/Button";
import { Card } from "./blocks/Card";
import { Grid } from "./blocks/Grid";
import { Hero } from "./blocks/Hero/server";
import { Heading } from "./blocks/Heading";
import { Flex } from "./blocks/Flex";
import { Logos } from "./blocks/Logos";
import { Stats } from "./blocks/Stats";
import { Template } from "./blocks/Template/server";
import { Text } from "./blocks/Text";
import { Space } from "./blocks/Space";
import { RichText } from "./blocks/RichText";
import Root from "./root";
import { UserConfig } from "./types";

// We avoid the name config as next gets confused
const conf: UserConfig = {
  root: Root,
  categories: {
    layout: {
      components: ["Grid", "Flex", "Space"],
    },
    typography: {
      components: ["Heading", "Text"],
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

export default conf;
