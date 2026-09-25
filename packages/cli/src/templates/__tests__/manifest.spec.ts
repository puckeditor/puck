import {
  NEXT_AI_EDITOR_EXCLUDED,
  NEXT_AI_EDITOR_MAPPED,
  NEXT_EDITOR_EXCLUDED,
  NEXT_EDITOR_MAPPED,
} from "../../frameworks/next";
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
  ] as const)(
    "every %s recipe file is mapped or excluded",
    (recipe, mapped, excluded) => {
      expect(testTemplates.list(recipe)).toEqual(
        [...mapped, ...excluded].sort()
      );
    }
  );
});
