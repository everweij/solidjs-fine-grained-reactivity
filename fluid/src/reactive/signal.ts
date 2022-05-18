import type { IComputation, ISignal } from "./interfaces";
import { Status } from "./status";
import { globals } from "./globals";
import { BatchComputation } from "./batch-computation";

/**
 * This class represents a reactive value, also called a signal.
 * It holds a close relationsship with a [Computation](./computation.ts).
 * When a value gets read from a signal, the current computation is added
 * internally to the list of computations that are Apparently interested in
 * this signal. This is useful later on, because when the signal's value gets
 * changed, we know which computations we need to notify about this event.
 */
export class Signal<T> implements ISignal {
  // The contained value of this signal
  private value: T;

  // Whether this signal is stable or stale
  private _status: Status = Status.Stable;

  // List of computations that are interested in this signal's value
  private computations = new Set<IComputation>();

  constructor(initialValue: T, private debugName?: string) {
    this.value = initialValue;
  }

  get status(): Status {
    return this._status;
  }

  // Way for a computation to tell the signal that it is no longer interested.
  removeComputation(computation: IComputation): void {
    this.computations.delete(computation);
  }

  // Establish a two-way-binding between this signal and the possible interested computation.
  private registerCurrentComputation(): void {
    if (globals.currentContext?.currentComputation) {
      this.computations.add(globals.currentContext.currentComputation);

      // Note: This is the "two-way-binding" part: we're adding this signal to the
      // list of dependencies as well.
      globals.currentContext.currentComputation.addDependency(this);
    }
  }

  // See `Signal.setValue()` for more info about the flow.
  notifyStale(issuer?: IComputation): void {
    // Stop if we're already stale
    if (this._status === Status.Stale) {
      return;
    }

    // update the status, and let the current batch know about this
    this._status = Status.Stale;
    globals.currentBatch!.registerSignal(this);

    // Inform all interested computations about the fact that we're now
    // should be considered stale, and a possible(!) re-computation in
    // the works.
    const computations = [...this.computations].filter(
      (computation) => computation !== issuer
    );
    for (const computation of computations) {
      computation.markStale(this);
    }
  }

  // See `Signal.setValue()` for more info about the flow.
  notifyStable(opts = { didValueChange: true }): void {
    // Stop if we're already stable
    if (this._status === Status.Stable) {
      return;
    }

    // update the status, and let the current batch know about this
    // (to the current batch, this signal is no longer relevant)
    this._status = Status.Stable;
    globals.currentBatch?.unregisterSignal(this);

    // Inform all interested computations about the fact that we're now
    // stable and that, depending whether the value actually changed, the computation
    // can start running again.
    for (const computation of this.computations) {
      computation.markStable({ dependencyDidChange: opts.didValueChange });
    }
  }

  // Returns the current value of this signal, with the side-effect that it
  // registers the current computation as a dependent of this signal.
  getValue = (): T => {
    this.registerCurrentComputation();
    return this.value;
  };

  setValue = (nextValue: T): void => {
    // Stop if nothing changed
    if (nextValue === this.value) {
      return;
    }

    // Is this "setting the value" this first in a chain of updates?
    const isStarter = globals.currentBatch === null;
    // ... If so, we need to start a new batch.
    globals.currentBatch = globals.currentBatch || new BatchComputation();

    // Inform all interested computations that this signal's value is about to change.
    // This will result in a cascading effect: all dependent computations will be marked
    // as stale, and in turn each computation will notify its signal-dependencies as well
    // about this event
    this.notifyStale();

    // Update the value
    this.value = nextValue;

    // Inform all interested computations that this signal's value has changed, and that
    // each computation should start a re-run.
    this.notifyStable({ didValueChange: true });

    // If this was the first update in a chain of updates, we can now start the execution
    // of the batch
    if (isStarter) {
      globals.currentBatch!.execute();
      globals.currentBatch = null;
    }
  };
}
