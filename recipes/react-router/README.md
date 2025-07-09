# `react-router` recipe

The `react-router` recipe showcases one of the most powerful ways to implement Puck using to provide an authoring tool for any route in your React Router app.

## Demonstrates

- React Router v7 (framework) implementation
- JSON database implementation
- Splat route to use puck for any route on the platform

## Usage

Run the generator and enter `react-router` when prompted

```
npx create-puck-app my-app
```

Start the server

```
yarn dev
```

Navigate to the homepage at http://localhost:5173/. To edit the homepage, access the Puck editor at http://localhost:5173/edit.

You can do this for any **base** route on the application, **even if the page doesn't exist**. For example, visit http://localhost:5173/hello-world and you'll receive a 404. You can author and publish a page by visiting http://localhost:5173/hello-world/edit. After publishing, go back to the original URL to see your page.

## Using this recipe

To adopt this recipe, you will need to:

- **IMPORTANT** Add authentication to `/edit` routes. This can be done by modifying the [route module action](https://reactrouter.com/start/framework/route-module#action) in the splat route `/app/routes/puck-splat.tsx`. **If you don't do this, Puck will be completely public.**
- Integrate your database into the functions in `/lib/pages.server.ts`
- Implement a custom puck configuration in `/app/puck.config.tsx`
