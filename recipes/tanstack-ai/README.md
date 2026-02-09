# `tanstack-ai` recipe

The `tanstack-ai` recipe showcases one of the most powerful ways to combine Puck and [Puck AI](https://puckeditor.com/docs/ai/overview): providing an authoring tool with AI page generation capabilities for any route in your TanStack app.

## Demonstrates

- Puck AI integration for generating pages with AI
- TanStack implementation
- JSON database implementation
- Splat route to use puck for any route on the platform

## Usage

Run the generator and select `TanStack` when prompted

```
npx create-puck-app my-app

? Which recipe would you like to use?
❯ TanStack
```

Confirm you want to use Puck AI

```
? Would you like to use Puck AI? (Y/n) Y
```

Start the server

```
cd my-app
yarn dev
```

### Set up Puck AI

Create a [Puck account](https://cloud.puckeditor.com) and [obtain an API key](https://cloud.puckeditor.com/api-keys).

Create a `.env.local` file in the root of your project and add your API key:

```
PUCK_API_KEY=your-api-key
```

Navigate to the homepage at https://localhost:3000. To edit the homepage, access the Puck editor at https://localhost:3000/edit, and select the AI button in the left navigation bar to generate content for the page using Puck AI.

You can do this for any route on the application, **even if the page doesn't exist**. For example, visit https://localhost:3000/hello/world and you'll receive a 404. You can author and publish a page by visiting https://localhost:3000/hello/world/edit. After publishing, go back to the original URL to see your page.

## Using this recipe

To adopt this recipe, you will need to:

- **IMPORTANT** Add authentication to `/edit` routes. This can be done by modifying the [server function](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions) in the splat route `/src/routes/$.route.tsx`. **If you don't do this, Puck will be completely public.**
- Integrate your database into the functions in `/src/data/page.ts`
- Implement a custom puck configuration in `/src/puck.config.tsx`
- Add business context for the AI generation in `/src/routes/api.puck.$.ts`
