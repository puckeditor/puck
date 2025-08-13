import { DefaultRootProps, RootConfig } from "@/core";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

export type RootProps = DefaultRootProps;

export const Root: RootConfig<{
  props: RootProps;
  fields: {
    userField: { type: "userField"; option: boolean };
  };
}> = {
  defaultProps: {
    title: "My Page",
  },
  render: ({ puck: { isEditing, renderDropZone: DropZone } }) => {
    return (
      <div
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
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
