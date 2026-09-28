import {
  NEXT_AI_EDITOR_EXCLUDED,
  NEXT_AI_EDITOR_MAPPED,
  NEXT_EDITOR_EXCLUDED,
  NEXT_EDITOR_MAPPED,
} from "../../frameworks/next";
import {
  VINEXT_AI_EDITOR_EXCLUDED,
  VINEXT_AI_EDITOR_MAPPED,
  VINEXT_EDITOR_EXCLUDED,
  VINEXT_EDITOR_MAPPED,
} from "../../frameworks/vinext";
import {
  REACT_ROUTER_AI_EDITOR_EXCLUDED,
  REACT_ROUTER_AI_EDITOR_MAPPED,
  REACT_ROUTER_EDITOR_EXCLUDED,
  REACT_ROUTER_EDITOR_MAPPED,
} from "../../frameworks/react-router";
import { testTemplates } from "../../../__tests__/helpers/harness";

// Adding a file to a recipe must be a deliberate decision in the CLI
describe("recipe coverage", () => {
  it.each([
    ["next", NEXT_EDITOR_MAPPED, NEXT_EDITOR_EXCLUDED],
    ["next-ai", NEXT_AI_EDITOR_MAPPED, NEXT_AI_EDITOR_EXCLUDED],
    ["react-router", REACT_ROUTER_EDITOR_MAPPED, REACT_ROUTER_EDITOR_EXCLUDED],
    [
      "react-router-ai",
      REACT_ROUTER_AI_EDITOR_MAPPED,
      REACT_ROUTER_AI_EDITOR_EXCLUDED,
    ],
    ["vinext", VINEXT_EDITOR_MAPPED, VINEXT_EDITOR_EXCLUDED],
    ["vinext-ai", VINEXT_AI_EDITOR_MAPPED, VINEXT_AI_EDITOR_EXCLUDED],
  ] as const)(
    "every %s recipe file is mapped or excluded",
    (recipe, mapped, excluded) => {
      expect(testTemplates.list(recipe)).toEqual(
        [...mapped, ...excluded].sort()
      );
    }
  );
});

// The CLI integrates vinext apps from the next recipes, so they must not drift
describe("vinext recipes", () => {
  it.each([
    ["vinext", "next", VINEXT_EDITOR_MAPPED],
    ["vinext-ai", "next-ai", VINEXT_AI_EDITOR_MAPPED],
  ] as const)("%s matches %s", (vinext, next, mapped) => {
    for (const file of [...mapped, "app/layout.tsx", "app/styles.css"]) {
      expect({
        file,
        content: testTemplates.read(vinext, file).toString(),
      }).toEqual({
        file,
        content: testTemplates.read(next, file).toString(),
      });
    }
  });
});
