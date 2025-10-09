import { Config, Data } from "@/core";
import { ButtonProps } from "./blocks/Button";
import { CardProps } from "./blocks/Card";
import { GridProps } from "./blocks/Grid";
import { HeroProps } from "./blocks/Hero";
import { HeadingProps } from "./blocks/Heading";
import { FlexProps } from "./blocks/Flex";
import { LogosProps } from "./blocks/Logos";
import { StatsProps } from "./blocks/Stats";
import { TemplateProps } from "./blocks/Template";
import { TextProps } from "./blocks/Text";
import { SpaceProps } from "./blocks/Space";

import { RootProps } from "./root";
import { RichTextProps } from "./blocks/RichText";

export type { RootProps } from "./root";

export type Components = {
  Button: ButtonProps;
  Card: CardProps;
  Grid: GridProps;
  Hero: HeroProps;
  Heading: HeadingProps;
  Flex: FlexProps;
  Logos: LogosProps;
  Stats: StatsProps;
  Template: TemplateProps;
  Text: TextProps;
  Space: SpaceProps;
  RichText: RichTextProps;
};

export type UserConfig = Config<{
  components: Components;
  root: RootProps;
  categories: ["layout", "typography", "interactive"];
  fields: {
    userField: {
      type: "userField";
      option: boolean;
    };
  };
}>;

export type UserData = Data<Components, RootProps>;
