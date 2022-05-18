# Fluid

This package is an attempt to clone [SolidJS](https://github.com/solidjs/solid) for educational purposes. Please, do not use this code in production!!.

Goal is to be able to get the same results from a developers perspective by using more or less the same API.

Only certain parts of SolidJS have been cloned -> the relevant parts in order for us to create an todo-app. This package exposes:

- the basic reactive primitives like `createSignal`, `createEffect` and `createMemo`
- a `render` function to mount your app
- `createStore` in order to work with more complex / nested reactive data-structures
- `For` component, so we can work with lists

Many parts of this package represent a simplification over the real SolidJS. This means that some implementation don't take into account certain edge-cases, and some implementations can even be considered naive. Also, this package lacks various optimizations that the real SolidJS probably has, so expect this package to perform as fast. All this is on purpose though; I believe this makes it easier for everyone to grasp to whole picture.

I did my best to document as much as possible close to the code (code-comments). Make sure you've read the material listed [here](../readme.md#reading-material--sources) first in order to get some foundational knowlegde.
