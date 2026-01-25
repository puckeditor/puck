# `tanstack` recipe

The `tanstack` recipe showcases one of the most powerful ways to implement Puck using to provide an authoring tool for any route in your Next app.

## Demonstrates

- TanStack Router implementation
- JSON database implementation with HTTP API
- Catch-all routes to use puck for any route on the platform

## Usage

Run the generator and enter `tanstack` when prompted

```
npx create-puck-app my-app
```

Start the server

```
yarn dev
```

Navigate to the homepage at https://localhost:3000. To edit the homepage, access the Puck editor at https://localhost:3000/edit.

You can do this for any route on the application, **even if the page doesn't exist**. For example, visit https://localhost:3000/hello/world and you'll receive a 404. You can author and publish a page by visiting https://localhost:3000/hello/world/edit. After publishing, go back to the original URL to see your page.

## Using this recipe

To adopt this recipe, you will need to:

- **IMPORTANT** Add authentication to `/edit` routes. This can be done by modifying the [server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions) in the splat route `/src/routes/$.route.tsx`. **If you don't do this, Puck will be completely public.**
- Integrate your database into the functions in `/src/data/page.ts`
- Implement a custom puck configuration in `/src/puck.config.tsx`
