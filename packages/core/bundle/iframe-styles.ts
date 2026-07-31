/**
 * CSS styles for the iframe-only. Only includes essential iframe styles.
 *
 * The user never imports this manually. It should only be loaded by Puck
 * at run-time if the user excludes the default Puck styles.
 */
import "./core.css";

// CSS modules
import "../components/ActionBar/styles.module.css";
import "../components/DraggableComponent/styles.module.css";
import "../components/Drawer/styles.module.css";
import "../components/DropZone/styles.module.css";
import "../components/InlineTextField/styles.module.css";
import "../components/Loader/styles.module.css";
import "../components/RichTextMenu/styles.module.css";
import "../components/RichTextMenu/components/Control/styles.module.css";

// Global CSS
import "../components/DraggableComponent/styles.css";
import "../lib/overlay-portal/styles.css";
