# AGENTS instructions

## CSS

- Use CSS modules co-located with the React component under `style.module.css`
- Follow SUITCSS naming conventions:
  - Blocks: PascalCase, for example `Select`, `DrawerItem`, `RichTextEditor`.
  - Descendants: `Block-descendant`, for example `Select-button`.
  - Modifiers: `Block--modifier`, for example `Select--disabled`.
  - State: Use modifeirs instead.
- Generally only includes one block (with descendants and modifiers) per file.
- Occasionally break this rule if small sub-components are required as they need different modifiers.
- Use the `getClassNameFactory()` helper (`packages/core/lib/get-class-name-factory.ts`) to access the class names in code.

### Example

```css
/* styles.module.css */
.Button {
}
.Button-label {
}
.Button--primary {
}
```

```tsx
// index.tsx
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("Button", styles);

const Button = ({ primary }: { primary: boolean }) => {
  return (
    {/* styles['Button'] + styles['Button--primary'] */}
    <button className={getClassName({ primary })}>
      {/* styles['Button-label'] */}
      <span className={getClassName("label")}>Button</span>
    </button>
  );
};

// getClassName(); // styles["Button"]
// getClassName("label"); // styles["Button-label"]
// getClassName({ primary: true }); // styles["Button"] + styles["Button--primary"]
```
