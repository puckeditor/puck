import { createUsePuck } from "@puckeditor/core";

/**
 * Hook to access the Puck internal API using selectors to minimize re-renders.
 */
const usePuck = createUsePuck();

export default usePuck;
