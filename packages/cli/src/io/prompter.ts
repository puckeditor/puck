import { CliError } from "../errors";

export interface Choice<T extends string> {
  value: T;
  name: string;
  description?: string;
}

export interface Prompter {
  confirm(message: string, defaultValue?: boolean): Promise<boolean>;
  select<T extends string>(message: string, choices: Choice<T>[]): Promise<T>;
  input(
    message: string,
    opts?: { default?: string; validate?: (value: string) => true | string }
  ): Promise<string>;
  password(message: string): Promise<string>;
}

/**
 * Used whenever the CLI is not interactive. Input resolution never calls it;
 * it exists so that a hidden prompt fails loudly instead of hanging an agent.
 */
export const nonInteractivePrompter: Prompter = new Proxy({} as Prompter, {
  get() {
    return () => {
      throw new CliError(
        "PUCK-CLI-INTERNAL",
        "Attempted to prompt in non-interactive mode"
      );
    };
  },
});

const isPromptExit = (err: unknown) =>
  err instanceof Error &&
  (err.name === "ExitPromptError" || err.name === "AbortPromptError");

const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (isPromptExit(err)) {
      throw new CliError("PUCK-CLI-CANCELLED", "Cancelled");
    }
    throw err;
  }
};

/** Renders prompts to stderr so stdout stays clean for piping */
export const createInquirerPrompter = (
  output: NodeJS.WritableStream
): Prompter => {
  const context = { output };

  return {
    confirm: (message, defaultValue = true) =>
      wrap(async () => {
        const { default: confirm } = await import("@inquirer/confirm");
        return confirm({ message, default: defaultValue }, context);
      }),
    select: (message, choices) =>
      wrap(async () => {
        const { default: select } = await import("@inquirer/select");
        return select({ message, choices }, context);
      }),
    input: (message, opts = {}) =>
      wrap(async () => {
        const { default: input } = await import("@inquirer/input");
        return input(
          { message, default: opts.default, validate: opts.validate },
          context
        );
      }),
    password: (message) =>
      wrap(async () => {
        const { default: password } = await import("@inquirer/password");
        return password({ message, mask: "*" }, context);
      }),
  };
};
