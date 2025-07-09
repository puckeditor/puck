# `remix` recipe

The `remix` recipe showcases a Remix Run app with Puck, using it to provide an authoring tool for any root-level route in your Remix app.

## Demonstrates

- Remix Run V2 implementation
- JSON database implementation with HTTP API
- Dynamic routes to use puck for any root-level route on the platform
- Option to disable client-side JavaScript for Puck pages

## Usage

Run the generator and enter `next` when prompted

```
npx create-puck-app my-app
```

Start the server

```
yarn dev
```

Navigate to the homepage at https://localhost:3000. To edit the homepage, access the Puck editor at https://localhost:3000/edit.

You can do this for any **base** route on the application, **even if the page doesn't exist**. For example, visit https://localhost:3000/hello-world and you'll receive a 404. You can author and publish a page by visiting https://localhost:3000/hello-world/edit. After publishing, go back to the original URL to see your page.

## Using this recipe

To adopt this recipe you will need to:

- **IMPORTANT** Add authentication to `/edit` routes. This can be done by modifying the example routes `/app/routes/_index.tsx` and `/app/routes/edit.tsx` or the example model in `/app/models/page.server.ts`. **If you don't do this, Puck will be completely public.**
- Integrate your database into the API calls in `/app/models/page.server.ts`
- Implement a custom puck configuration in `/app/puck.config.tsx`

By default, this recipe will have JavaScript enable on all routes - like a usual react app. If you know that your Puck content doesn't need react, then you can disable JS uncommenting the relevant code in `/app/root.tsx` and the example route `/app/routes/_index.tsx`. Check the network tab for no JS downloads, and verify that the page still works.

## Disabling JavaScript

This recipe can be adapted to disable JavaScript. See the [Remix docs](https://remix.run/docs/en/main/guides/disabling-javascript) for steps on how to do this.
