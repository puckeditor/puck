import { createUsePuck } from "@/core";

/**
 * Hook to access the Puck internal API using selectors to minimize re-renders.
 */
const usePuck = createUsePuck();

export default usePuck;
