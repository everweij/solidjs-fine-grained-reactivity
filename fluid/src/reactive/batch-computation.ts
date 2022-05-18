import type { IBatchComputation, ISignal } from "./interfaces";

/**
 * This class represents a container where delayed computations can be stored and executed later.
 */
export class BatchComputation implements IBatchComputation {
  // a queue of effects that need to be executed
  private pendingEffects: Function[] = [];

  // a collection of signals that are waiting to be marked stable.
  // (when a signal is marked stable, it will be removed from this collection, see `unregisterSignal`)
  private pendingSignals = new Set<ISignal>();

  // Gets called by a computation when it needs to scheduled for execution.
  scheduleEffect(effect: Function): void {
    if (!this.pendingEffects.includes(effect)) {
      this.pendingEffects.push(effect);
    }
  }

  // Lets this batch know that a signal is stale.
  registerSignal(signal: ISignal): void {
    this.pendingSignals.add(signal);
  }

  // Lets this batch know that the signal is stable again.
  unregisterSignal(signal: ISignal): void {
    this.pendingSignals.delete(signal);
  }

  execute(): void {
    // Pick the first effect in the queue and execute it until the queue is empty.
    while (this.pendingEffects.length) {
      const effect = this.pendingEffects.shift()!;
      effect();
    }

    // All that remains a possible collection of signals that are still waiting to
    // to marked as stable. In other words: appearently those signals were 'wrongly' marked
    // as stale, and had no real impact. We could not know this beforehand though. So, let's mark
    // them stable again, which in turn might trigger some remaining computations (computations that
    // were marked as being stale, but didn't run yet because not all dependencies were marked as stable).
    for (const signal of this.pendingSignals) {
      signal.notifyStable({ didValueChange: false });
    }

    // The above code might have introduced new effects added to the queue. If that's the case, we need to
    // recursevily repeat the above process again till the queue is empty.
    if (this.pendingEffects.length) {
      this.execute();
    }
  }
}
