import type { IComputation, IReactiveContext } from "./interfaces";

/**
 * This class represents a reactive context. Upon creation by [createRoot](./index.ts),
 * the newly created reactive context is [globally set](./globals.ts). A reactive-context
 * has 2 repsonsibilities:
 * - It acts as a 'middle-man', so that other components (e.g. a [Signal](./signal.ts)) can
 *  get info about a running computation.
 * - it provides a means to dispose a whole context at once.
 */
export class ReactiveContext implements IReactiveContext {
  // Maintains a list of computations that are currently running
  // The reason a stack is necessary, and why we're not using a single value,
  // has to do with the fact that computations can be nested.
  private stack: IComputation[] = [];

  // We need to keep track of all computations that are 'active'. By 'active'
  // I mean computations that have subscribes to one or more signals.
  // This is needed when we want to dispose all computations at once.
  private computations: Set<IComputation> = new Set();

  // Give certain components access to the current computation
  get currentComputation(): IComputation | undefined {
    return this.stack.at(-1);
  }

  // With this method a computation can express to the context that
  // it is about to execute.
  startComputation(computation: IComputation): void {
    // add the computation to the stack of running computations
    this.stack.push(computation);

    // add the computation to the set of active computations
    this.computations.add(computation);
  }

  // With this method a computation can express to the context that
  // it is done executing.
  endComputation(): void {
    // remove the current computation from the stack
    this.stack.pop();
  }

  // With this method a computation can express to the context that
  // it is no longer active. See [Computation.cleanup](./computation.ts).
  removeComputation(computation: IComputation): void {
    this.computations.delete(computation);
  }

  // This method allows the user to run a function in a temporary empty context.
  // This is useful for example when you want to read a value from a signal, but
  // don't want to subscribe the current running computation to the signal
  untrack<T>(fn: () => T): T {
    const temporaryStack = this.stack;
    this.stack = [];
    const value = fn();
    this.stack = temporaryStack;
    return value;
  }

  // Disposes and cleans up all computations that are currently active.
  dispose = (): void => {
    for (const computation of this.computations) {
      computation.cleanup();
    }
    this.computations.clear();
  };
}
