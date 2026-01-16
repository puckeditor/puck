# plugin-emotion-cache

Inject [emotion cache](https://emotion.sh/docs/@emotion/cache) into the Puck iframe.

## Quick start

```sh
npm i @puckeditor/plugin-emotion-cache
```

```jsx
import { Puck } from "@puckeditor/core";
import createEmotionCache from "@puckeditor/plugin-emotion-cache";

// Create your emotion cache plugin. This example configures it for Chakra.
const chakraEmotionCache = createEmotionCache("cha");

// Render Puck
export function Page() {
  return <Puck config={config} data={data} plugins={[chakraEmotionCache]} />;
}
```

## Args

| Param         | Example | Type   | Status   |
| ------------- | ------- | ------ | -------- |
| [`key`](#key) | `cha`   | String | Required |

### Required args

#### `key`

Key to pass to Emotion's [`createCache` method](https://emotion.sh/docs/@emotion/cache#createcache).

## License

MIT © [The Puck Contributors](https://github.com/puckeditor/puck/graphs/contributors)
