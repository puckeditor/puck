import { inspect } from "node:util";

const REDACTED = "[redacted]";

/**
 * Wraps a credential so it cannot leak through JSON serialisation, string
 * interpolation or console.log. Call reveal() only where the raw value is
 * actually written (the env file) or sent (Puck Cloud).
 */
export class Secret {
  #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  reveal() {
    return this.#value;
  }

  toJSON() {
    return REDACTED;
  }

  toString() {
    return REDACTED;
  }

  [inspect.custom]() {
    return REDACTED;
  }
}

/**
 * Tracks every secret seen during a run so the output layer can scrub them
 * from arbitrary strings (e.g. child process output echoed in errors).
 */
export class SecretRegistry {
  #values = new Set<string>();

  add(secret: Secret | string) {
    const value = typeof secret === "string" ? secret : secret.reveal();
    if (value.length >= 4) this.#values.add(value);
  }

  scrub(text: string) {
    let out = text;
    for (const value of this.#values) {
      out = out.split(value).join(REDACTED);
    }
    return out;
  }
}

export const isValidApiKeyFormat = (value: string) =>
  value.length > 0 &&
  value.length <= 512 &&
  /^[\x21-\x7e]+$/.test(value) &&
  !/["'`\\$#]/.test(value);
