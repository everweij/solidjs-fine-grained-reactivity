# Fine-grained reactivity - A deep dive into SolidJS

The goal of this repository is to learn how SolidJS works in general by attempting to create a SolidJS-clone from scratch which is called "Fluid". In order to test assumptions I've created a small todo-app both with Solid as well as Fluid, and see whether I can get the same results with more or less the same code.

## Reading material / sources

In order to create Fluid the following sources were used:

- https://indepth.dev/posts/1269/finding-fine-grained-reactive-programming
- https://indepth.dev/posts/1289/solidjs-reactivity-to-rendering
- https://medium.com/hackernoon/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254
- https://github.com/luwes/js-diff-benchmark
- https://dev.to/ryansolid/a-hands-on-introduction-to-fine-grained-reactivity-3ndf

I recommend to read these first before jumping into the source of this project.

## Getting started

This repository is setup as a monorepo with multiple packages (workspaces). Although I use Yarn myself, you should also be fine by using a different package manager, like NPM or PNPM.

After cloning this repo, please install all dependencies by running:

```bash
yarn install
```

Then, in order to start the actual todo-apps, you can run the following scripts:

```bash
# runs our example todo-app, written with Fluid
yarn example

# runs the same todo-app, written with SolidJS
yarn solid

# runs tests (append '--watch' to enable watch-mode)
yarn test
```

## Structure

This repo is divided into various packages / workspaces. A brief overview:

- _example_, the example todo-app written with Fluid
- _fluid_, the SolidJS-clone
- _shared_, only some stylesheets for now which are shared between the two todo-apps
- _solid_, the Solid implementation of the todo-app for comparison
- _vite-plugin-fluid_, Fluid's attempt to create a Vite plugin (`vite-plugin-solid` counterpart)

## Documentation

Please consult the `readme.md` in each workspace for more info.
