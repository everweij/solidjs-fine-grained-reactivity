import type { Accessor, Disposer, Setter } from "../types";
import type { EffectFunction } from "./computation";
import { globals } from "./globals";
import { Signal } from "./signal";
import { BatchComputation } from "./batch-computation";
import { Computation } from "./computation";
import { ReactiveContext } from "./reactive-context";

/**
 * Creates a new signal and only exposes the getter and setter
 */
export function createSignal<T>(
  initialValue: T,
  debugName?: string
): readonly [Accessor<T>, Setter<T>] {
  const signal = new Signal(initialValue, debugName);
  return [signal.getValue, signal.setValue];
}

/**
 * Creates a new effect
 */
export function createEffect<Next>(
  fn: EffectFunction<Next>,
  debugName?: string
): void {
  new Computation(fn, false, debugName);
}

/**
 * This is actually a composition of createEffect and createSignal.
 * Only difference is that the computation is marked as "side-effect-free", meaning
 * that execution doesn't need to be scheduled, but instead can be performed immediately
 */
export function createMemo<T>(fn: () => T, debugName?: string): Accessor<T> {
  const signal = new Signal<T>(null!);

  new Computation(() => {
    const value = fn();
    untrack(() => signal.setValue(value));
  }, true);

  return signal.getValue;
}

/**
 * Use this function to express the intend that you want to update multiple things
 * in one update-cycle. E.g. all dependent effects should run at most once after the
 * callback has finished executing.
 */
export function batch(fn: Function): void {
  // Execute the callback right away if there is already a batch in process.
  if (globals.currentBatch) {
    fn();
    return;
  }

  globals.currentBatch = new BatchComputation();
  fn();
  globals.currentBatch!.execute();
  globals.currentBatch = null;
}

/**
 * @see ReactiveContext#untrack
 */
export function untrack<T>(fn: () => T): T {
  if (!globals.currentContext?.currentComputation) {
    return fn();
  }

  return globals.currentContext.untrack(fn);
}

/**
 * Lets you register a callback that will be executed when the current
 * effect or reactive-context cleans-up
 */
export function onCleanup(fn: Function): void {
  globals.currentContext?.currentComputation?.addCleanup(fn);
}

/**
 * @see ReactiveContext
 * The only way to create a reactive context.
 */
export function createRoot(fn: (dispose: Disposer) => unknown): void {
  const parentContext = globals.currentContext;
  const context = (globals.currentContext = new ReactiveContext());

  try {
    fn(context.dispose);
  } finally {
    globals.currentContext = parentContext;
  }
}
