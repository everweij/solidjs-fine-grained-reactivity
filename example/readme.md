# Todo-app written with Fluid (SolidJS clone)

This app is heavily inspired by https://todomvc.com/examples/react/.

Two important parts that makes this example runnable:

### Typescript config

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "fluid"
  }
}
```

We don't want Typescript to touch JSX syntax. Instead, we want our Vite-plugin to take care of this. With `"jsxImportSource"` (see https://www.typescriptlang.org/tsconfig#jsxImportSource) we tell Typescript how to perform type-checks with our own custom JSX-implementation. In this case it checks for a `jsx-runtime.d.ts` or `jsx-runtime.ts` file in the root of the `"fluid"` package.

### Vite config

```ts
import { defineConfig } from "vite";
import fluid from "../vite-plugin-fluid";

export default defineConfig({
  plugins: [fluid()],
});
```

In order to run this application we need to configure Vite to make use of our [Fluid-plugin](../vite-plugin-fluid/readme.md).

## Scripts

```bash
# starts a dev-server
yarn start

# builds the application
yarn build

# performs various compile-time checks
yarn typecheck
```
