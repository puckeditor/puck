import { walkTree, Config, Data } from "@puckeditor/core";

/**
 * Gets all the IDs of every component in the given Puck data
 *
 *
 * @param options The puck data to collect the IDs from, and the config that was used to build it
 * @returns The collected component IDs
 */
const getAllComponentIds = ({
  data,
  config,
}: {
  data: Data;
  config: Config;
}) => {
  const ids = new Set<string>();

  walkTree(data, config, (content) => {
    content.forEach((item) => {
      ids.add(item.props.id);
    });

    return content;
  });

  return Array.from(ids);
};

export default getAllComponentIds;
