import classnames from "classnames";

type OptionsObj = Record<string, any>;
type Options = string | OptionsObj;

export const getGlobalClassName = (rootClass: string, options: Options) => {
  if (typeof options === "string") {
    return `${rootClass}-${options}`;
  } else {
    const mappedOptions: Options = {};
    for (let option in options) {
      mappedOptions[`${rootClass}--${option}`] = options[option];
    }

    return classnames({
      [rootClass]: true,
      ...mappedOptions,
    });
  }
};

const getClassNameFactory =
  (
    rootClass: string,
    styles: Record<string, string>,
    config: { baseClass?: string } = { baseClass: "" }
  ) =>
  (options: Options = {}, params: { excludeBase?: boolean } = {}) => {
    if (typeof options === "string") {
      const descendant = options;

      const style = styles[`${rootClass}-${descendant}`];

      if (style) {
        return config.baseClass + styles[`${rootClass}-${descendant}`] || "";
      }

      return "";
    } else if (typeof options === "object") {
      const modifiers = options;

      const prefixedModifiers: OptionsObj = {};

      for (let modifier in modifiers) {
        prefixedModifiers[styles[`${rootClass}--${modifier}`]] =
          modifiers[modifier];
      }

      const c = !params.excludeBase ? styles[rootClass] : "";

      return (
        config.baseClass +
        classnames({
          [c]: !!c, // only apply the class if it exists
          ...prefixedModifiers,
        })
      );
    } else {
      return config.baseClass + styles[rootClass] || "";
    }
  };

export default getClassNameFactory;
