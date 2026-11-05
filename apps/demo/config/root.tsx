import { DefaultRootProps, RootConfig } from "@/core";
import { getClassNameFactory } from "@/core/lib";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import styles from "./root.module.css";

const getClassName = getClassNameFactory("Root", styles);

export type RootProps = DefaultRootProps;

export const Root: RootConfig<{
  props: RootProps;
  fields: {
    userField: { type: "userField"; option: boolean };
  };
}> = {
  ai: {
    defaultZone: {
      disallow: ["Button", "Card"],
    },
  },
  fields: {
    title: { type: "text", label: "Title" },
  },
  defaultProps: {
    title: "My Page",
  },
  render: ({ puck: { isEditing, renderDropZone: DropZone } }) => {
    return (
      <div className={getClassName()}>
        <Header editMode={isEditing} />
        <DropZone zone="default-zone" style={{ flexGrow: 1 }} />

        <Footer>
          <Footer.List title="Section">
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
          </Footer.List>
          <Footer.List title="Section">
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
          </Footer.List>
          <Footer.List title="Section">
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
          </Footer.List>
          <Footer.List title="Section">
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
            <Footer.Link href="#">Label</Footer.Link>
          </Footer.List>
        </Footer>
      </div>
    );
  },
};

export default Root;
