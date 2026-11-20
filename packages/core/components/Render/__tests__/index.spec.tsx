import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Config, Data, DefaultComponents } from "../../../types";

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

import { Render } from "../index";

const StatefulCounter = ({ label }: { label: string }) => {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      {label}: {count}
    </button>
  );
};

describe("Render", () => {
  describe("slots", () => {
    const config: Config = {
      root: {
        fields: { hero: { type: "slot" } },
        render: ({ hero: Hero, children }: any) => (
          <main>
            <Hero />
            {children}
          </main>
        ),
      },
      components: {
        Section: {
          fields: { items: { type: "slot" } },
          render: ({ items: Items }: any) => (
            <section>
              <Items />
            </section>
          ),
        },
        Counter: {
          fields: { label: { type: "text" } },
          render: ({ label }: any) => <StatefulCounter label={label} />,
        },
      },
    };

    const data: Data<DefaultComponents, any> = {
      root: {
        props: {
          hero: [
            {
              type: "Counter",
              props: { id: "counter-root", label: "In root slot" },
            },
          ],
        },
      },
      content: [
        {
          type: "Section",
          props: {
            id: "section-outer",
            items: [
              {
                type: "Counter",
                props: { id: "counter-slot", label: "In slot" },
              },
              {
                type: "Section",
                props: {
                  id: "section-inner",
                  items: [
                    {
                      type: "Counter",
                      props: { id: "counter-nested", label: "In nested slot" },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    };

    it.each(["In root slot", "In slot", "In nested slot"])(
      "keeps the state of a component %s when the page re-renders",
      (label) => {
        const { rerender } = render(<Render config={config} data={data} />);

        fireEvent.click(screen.getByRole("button", { name: `${label}: 0` }));
        expect(
          screen.getByRole("button", { name: `${label}: 1` })
        ).toBeInTheDocument();

        rerender(<Render config={config} data={data} />);

        expect(
          screen.getByRole("button", { name: `${label}: 1` })
        ).toBeInTheDocument();
      }
    );
  });
});
