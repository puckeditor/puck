import { Cloud } from "lucide-react";
import { getClassNameFactory } from "@/core/lib";
import type { Plugin } from "@/core/types";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("SignInCta", styles);

/** Renders the sign-in CTA component. */
const SignInCta = ({ onSignIn }: { onSignIn: () => void }) => (
  <div className={getClassName()}>
    <span className={getClassName("icon")}>
      <Cloud aria-hidden="true" size={28} />
    </span>
    <strong className={getClassName("title")}>Connect to Puck Cloud</strong>
    <span className={getClassName("description")}>
      AI in this demo uses your Puck Cloud account. You&apos;ll return here
      after signing in.
    </span>
    <div className={getClassName("actions")}>
      <button
        className={getClassName("action")}
        onClick={onSignIn}
        type="button"
      >
        Sign in
      </button>
    </div>
  </div>
);

/**
 * Wraps a plugin with a sign-in CTA. If the user is not signed in, it shows the sign-in panel instead of the plugin's panel.
 *
 * @param plugin The plugin to wrap with the sign-in CTA.
 * @param signedIn Whether the user is currently signed in.
 * @param onSignIn The callback to invoke when the user clicks the sign-in button.
 */
export const withSignIn = (
  plugin: Plugin,
  signedIn: boolean,
  onSignIn: () => void
): Plugin => ({
  ...plugin,
  render: () =>
    signedIn && plugin.render ? (
      plugin.render()
    ) : (
      <SignInCta onSignIn={onSignIn} />
    ),
});
