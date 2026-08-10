import type { Config, Data } from "@puckeditor/core";

export type Props = {
  HeadingBlock: { title: string };
};

export type UserData = Data<Props>;

export const config: Config<Props> = {
  components: {
    HeadingBlock: {
      fields: {
        title: { type: "text" },
      },
      defaultProps: {
        title: "Heading",
      },
      render: ({ title }) => (
        <div style={{ padding: 64 }}>
          <h1>{title}</h1>
        </div>
      ),
    },
  },
};
