# field-contentful

Select [entries](https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/entries) from a [Contentful](https://www.contentful.com) space.

## Quick start

```sh
npm i @measured/puck-field-contentful
```

```jsx
import createFieldContentful from "@measured/puck-field-contentful";

const config = {
  components: {
    Example: {
      fields: {
        movie: createFieldContentful("movies", {
          space: "my_space",
          accessToken: "abcdefg123456",
        }),
      },
      render: ({ data }) => {
        return <p>{data?.fields.title || "No data selected"}</p>;
      },
    },
  },
};
```

## Args

| Param                         | Example  | Type   | Status   |
| ----------------------------- | -------- | ------ | -------- |
| [`contentType`](#contenttype) | `movies` | String | Required |
| [`options`](#options)         | `{}`     | Object | Required |

### Required args

#### `contentType`

ID of the Contentful [Content Type](https://www.contentful.com/help/content-model-and-content-type/) to query.

#### `options`

| Param                                      | Example                                 | Type                                                            | Status                         |
| ------------------------------------------ | --------------------------------------- | --------------------------------------------------------------- | ------------------------------ |
| [`accessToken`](#optionsaccesstoken)       | `"abc123"`                              | String                                                          | Required (unless using client) |
| [`space`](#optionsspace)                   | `"my-space"`                            | String                                                          | Required (unless using client) |
| [`client`](#optionsclient)                 | `createClient()`                        | [ContentfulClientApi](https://www.npmjs.com/package/contentful) | -                              |
| [`filterFields`](#optionsfilterfields)     | `{ "rating[gte]": { type: "number" } }` | Object                                                          | -                              |
| [`initialFilters`](#optionsinitialfilters) | `{ "rating[gte]": 1 }`                  | Object                                                          | -                              |
| [`titleField`](#optionstitlefield)         | `"name"`                                | String                                                          | -                              |

##### `options.accessToken`

Your Contentful access token.

##### `options.space`

The id for the Contentful space that contains your content.

##### `options.client`

A Contentful client as created by the [`contentful` Node.js package](https://www.npmjs.com/package/contentful). You can use this instead of `accessToken` and `space` if you want to reuse your client, or customise it more fully.

##### `options.filterFields`

An object describing which [`filterFields`](https://puckeditor.com/docs/api-reference/fields/external#filterfields) to render and pass the result directly to Contentful as [search parameters](https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters).

```jsx
createFieldContentful("movies", {
  // ...
  filterFields: {
    // Filter the "rating" field by value greater than the user input
    "fields.rating[gte]": {
      type: "number",
    },
  },
});
```

##### `options.initialFilters`

The initial values for the filters defined in [`filterFields`](#optionsfilterfields). This data is passed directly directly to Contentful as [search parameters](https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters).

```jsx
createFieldContentful("movies", {
  // ...
  initialFilters: {
    "fields.rating[gte]": 1,
    select: "name,rating", // Can include search parameters not included in filterFields
  },
});
```

##### `options.titleField`

The field to use as the title for the selected item. Defaults to `"title"`.

```jsx
createFieldContentful("movies", {
  // ...
  titleField: "name",
});
```

## Returns

An [External field](https://puckeditor.com/docs/api-reference/fields/external) type that loads Contentful [entries](https://contentful.github.io/contentful.js/contentful/10.6.16/types/Entry.html).

## TypeScript

You can use the `Entry` type for data loaded via Contentful:

```tsx
import createFieldContentful, { Entry } from "@/field-contentful";

type MyProps = {
  Example: {
    movie: Entry<{ title: string; description: string; rating: number }>;
  };
};

const config: Config<MyProps> = {
  // ...
};
```

## License

MIT © [The Puck Contributors](https://github.com/measuredco/puck/graphs/contributors)
