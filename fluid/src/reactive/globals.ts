import type { IBatchComputation, IReactiveContext } from "./interfaces";

interface Globals {
  currentContext: IReactiveContext | null;
  currentBatch: IBatchComputation | null;
}

/**
 * This object acts as a global state for the current reactive context and
 * the current batch computation.
 * @see [ReactiveContext](./reactive-context.ts) for implementation details, or
 * @see [createRoot](./index.ts) how to create a reactive content.
 * @see [BatchComputation](./batch-computation.ts) for implementation details, or
 * @see [batch](./index.ts) how to create a batch computation.
 */
export const globals: Globals = {
  currentContext: null,
  currentBatch: null,
};
