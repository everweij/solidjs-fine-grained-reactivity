import type { IComputation, IReactiveContext, ISignal } from "./interfaces";
import { Status } from "./status";
import { globals } from "./globals";

export type EffectFunction<Prev, Next extends Prev = Prev> = (
  v: Prev | undefined
) => Next;

/**
 * A computation is the combination of a function that can be used to compute a value, and certain
 * behaviors that are associated with it. It has a strong relation with signals (dependencies); values
 * that will change over time, and are used by this computation.
 */
export class Computation<Next> implements IComputation {
  // Holds a reference to the reactive-context at the time this computation was created.
  private context: IReactiveContext;

  // A collection of cleanup functions that will be called together with this internal cleanup
  private cleanups = new Set<Function>();

  // Keep track of all dependencies that this computation is interested in.
  private dependencies = new Set<ISignal>();

  // Keep track of the last returned value of the executed computation. This is useful for the next
  // computation, so that it can compare values for example.
  private previousValue: Next | undefined;

  // Always compute initially, and only compute if dependencies have changed
  private shouldCompute = true;

  // Note: We should only execute on the transition from stale to stable
  private status: Status = Status.Stable;

  constructor(
    private fn: EffectFunction<Next>,
    private isMemo = false,
    private debugName?: string
  ) {
    if (!globals.currentContext) {
      throw new Error(
        "A computation must be created inside a reactive context"
      );
    }

    this.context = globals.currentContext;
    this.execute(); // execute immediately
  }

  // Iterates over each dependency and reports whether all dependencies are stable.
  protected get allDependenciesAreStable(): boolean {
    for (const dependency of this.dependencies) {
      if (dependency.status === Status.Stale) {
        return false;
      }
    }

    return true;
  }

  // Cleans up any "loose-ends" that might have been created by the computation.
  cleanup = (): void => {
    // Start by calling the cleanup functions that were added while executing the
    // last computation. E.g. [onCleanup](./index.ts)
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups.clear();

    // Next, let all dependencies know that this computation is no longer interested in them.
    for (const signal of this.dependencies) {
      signal.removeComputation(this);
    }
    this.dependencies.clear();

    // Finally, remove this computation from the reactive context.
    this.context.removeComputation(this);
  };

  // Allows certain components to add a cleanup function that will be called when
  // this computation cleans-up after itself.
  addCleanup(cleanup: Function): void {
    this.cleanups.add(cleanup);
  }

  // A way for a dependency to tell this signal that Apparently this computation is interested in it.
  addDependency(dependency: ISignal): void {
    this.dependencies.add(dependency);
  }

  // Gets called by a dependency when it has been told that it is now stale
  // See [Signal.notifyStale](./signal.ts)
  markStale(staleDependency: ISignal): void {
    // mark this computation as stale
    this.status = Status.Stale;

    // Cascade through the dependency tree and propagate the message that everything
    // should be considered stale for now
    for (const dependency of this.dependencies) {
      const isNotifier = dependency === staleDependency;
      if (!isNotifier) {
        dependency.notifyStale(this);
      }
    }
  }

  // This method signals the computation that it is possibly ready the re-compute itself.
  markStable(opts = { dependencyDidChange: true }): void {
    // we should only recompute if at least one dependency has actually changed
    if (opts.dependencyDidChange) {
      this.shouldCompute = true;
    }

    // Only proceed if we're currently stale, and at least one dependency has changed.
    // `allDependenciesAreStable` has to do with a concept named "glitch-free-updates".
    // Basically this means that we should not compute to eagerly, but rather wait until
    // all dependencies have informed us that they are stable.
    const readyToProceed =
      this.status !== Status.Stable &&
      this.allDependenciesAreStable &&
      this.shouldCompute;

    if (readyToProceed) {
      // Mark this computation as stable
      this.status = Status.Stable;

      // Check whether we should execute the computation immediately or schedule it for batching
      const shouldSchedule = globals.currentBatch && !this.isMemo;
      if (shouldSchedule) {
        globals.currentBatch!.scheduleEffect(this.execute);
      } else {
        this.execute();
      }
    }
  }

  // Executes the actual computation
  private execute = (): void => {
    // First, let's 'restore' the reactive context globally
    globals.currentContext = this.context;

    // Cleanup loose-ends
    this.cleanup();

    // If this computation is inside a nested computation, we should let the
    // 'parent' computation know that it should also cleanup after this computation.
    // Otherwise, this might introduce unwanted effects / memory-leaks
    const isNestedComputation = Boolean(this.context.currentComputation);
    if (isNestedComputation) {
      this.context.currentComputation!.addCleanup(this.cleanup);
    }

    // Tell the reactive context we're about to execute
    // See [ReactiveContent](./reactive-context.ts) for more info
    this.context.startComputation(this);
    try {
      // Execute the computation, and store the result internally
      this.previousValue = this.fn(this.previousValue);
    } finally {
      // Tell the reactive context we're done
      this.context.endComputation();

      // No need to re-execute for now
      this.shouldCompute = false;
    }
  };
}
