# vite-plugin-fluid

This package exposes a plugin for vite which takes care of fluid-specific behavior, just like Solid's counterpart `vite-plugin-solid`.

Note: just like the "fluid" package, the implementation of this package is an approximation compared to `vite-plugin-solid`. The original plugin is way more complex and extensive than this implementation. The reason behind this is it's mainly focussed on getting the example app to work with the same code, and because it's easier to grasp for people who want to get an understanding about the concepts and reasoning behind the code-transformations.

Also, to get a better sense about what SolidJS is actually transforming I recommend you to to check out SolidJS's [Playground](https://playground.solidjs.com/) (select the "Output tab" to inspect the transpiled code).

## Overview

This plugin uses mainly `babel` under the hood in order to transform the code. In order to get a better understanding about what's going on, I would recommend you to read the excelllent [babel-plugin-handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md) written by Jamie Kyle.

## Purpose

This plugin adds certain syntactic sugar on top of your code. This is because of a design decision the SolidJS-team made for various reasons, mainly performance and developer-experience.

Let's walk you trough the most important transformations:

### Wrapping 'dynamic' parts in a function or object-getter when inside JSX

Let's say we have to following code:

```tsx
function MyComponent() {
  const [count, setCount] = createSignal(0);

  return <Counter count={count()} onClick={() => setCount(count() + 1)} />;
}
```

In the example above, `count()` gets called in the context of `MyComponent`,
but actually we would want `count()` to be called inside the `<Counter />`-context. We can 'delay' this execution be wrapping the `count()` in a object-getter like so:

```tsx
return jsx(Counter, {
  get count() {
    return count();
  },
  onClick: () => setCount(count() + 1),
});
```

This plugin makes a distinction between attributes on Components vs. those on html-elements. Dynamic and thus reactive attributes on components get wrapped in so-called object-getters, whereas the attributes on elements get wrapped inside regular functions. The reason for this is that the attributes of elements are more predicatable than they are on components, which has mainly todo with the "props" -> during transpilation we don't know whether a prop is already a function or not.
Let me elaborate on what this means with the help of a few examples:

```tsx
type Props = {
  onToggle: () => void;
  name: () => string;
};

function MyComponent(props: Props) {
  return (
    <Child
      // original
      onToggle={props.onToggle}
      // wrapped in function -> does will break functionality
      onToggle={() => props.onToggle}
      // original
      name={props.name}
      // wrapped in function -> does will break functionality
      name={() => props.name}
    />
  );
}
```

This plugin looks at a 2 'hints' to determine whether a jsx-expression should be wrapped inside a function or object:

- Is a function being called?
- is a property being accessed on a object?

An exception is that we leave attributes on html-elements alone that start with "on", because these are most likely event-handlers.

### Memoization of conditonal and logical expressions

When we look at the following code:

```tsx
function MyComponent() {
  const [count, setCount] = createSignal(0);

  return (
    <div>
      <button onClick={() => setCount(count() + 1)}>Increment</button>
      {count() > 5 && <div>Yeee!</div>}
    </div>
  );
}
```

`count() > 5` will re-evalutate every time the value of `count` changes. In order to prevent this the plugin extracts the logical-expression and puts it in a `createMemo`:

```tsx
function MyComponent() {
  const [count, setCount] = createSignal(0);

  const generatedMemo = createMemo(() => count() > 5);

  return (
    <div>
      <button onClick={() => setCount(count() + 1)}>Increment</button>
      {generatedMemo && <div>Yeee!</div>}
    </div>
  );
}
```

This way, `{generatedMemo && <div>Yeee!</div>}` only gets evalauted when the outcome of the logical expression changes (`true` and `false`).

This same applies to ternary expressions:

```tsx
const [count, setCount] = createSignal(0);

{
  count() === 0 ? <div>Zero!</div> : <div>{count()}</div>;
}
```

Becomes:

```tsx
const [count, setCount] = createSignal(0);

const generatedMemo = createMemo(() => count() === 0);

{
  generatedMemo ? <div>Zero!</div> : <div>{count()}</div>;
}
```
