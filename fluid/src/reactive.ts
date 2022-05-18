import { Accessor, Setter } from "./types";

// a.k.a "subject" | "dependency" | "observable"
interface ISignal {
  removeComputation(computation: IComputation): void;
  notifyStale(issuer?: IComputation): void;
  notifyStable(didValueChange: boolean): void;
  get status(): Status;
}

// "a.k.a" "observer" | "subscriber" | "listener"
interface IComputation {
  cleanup(): void;
  markStale(dependency: ISignal): void;
  markStable(dependencyDidChange: boolean): void;
  addDependency(dependency: ISignal): void;
  addCleanup(cleanup: Function): void;
}

interface IReactiveContext {
  startComputation(computation: IComputation): void;
  endComputation(): void;
  removeComputation(computation: IComputation): void;
  get currentComputation(): IComputation | undefined;
  untrack<T>(fn: () => T): T;
  dispose: () => void;
}

enum Status {
  Stale = 1,
  Stable = 2,
}

let currentContext: IReactiveContext | null = null;
let currentBatch: BatchComputation | null = null;

export class Signal<T> implements ISignal {
  private value: T;
  private _status: Status = Status.Stable;
  private computations = new Set<IComputation>();

  constructor(initialValue: T, private debugName?: string) {
    this.value = initialValue;
  }

  get status() {
    return this._status;
  }

  removeComputation(computation: IComputation) {
    this.computations.delete(computation);
  }

  private subscribe() {
    if (currentContext?.currentComputation) {
      this.computations.add(currentContext.currentComputation);
      currentContext.currentComputation.addDependency(this);
    }
  }

  notifyStale(issuer?: IComputation) {
    if (this._status === Status.Stale) {
      return;
    }

    this._status = Status.Stale;
    currentBatch?.registerSignal(this);

    const computations = [...this.computations].filter(
      (computation) => computation !== issuer
    );

    for (const computation of computations) {
      computation.markStale(this);
    }
  }

  notifyStable(didValueChange: boolean) {
    if (this._status === Status.Stable) {
      return;
    }

    this._status = Status.Stable;
    currentBatch?.unregisterSignal(this);

    for (const computation of this.computations) {
      computation.markStable(didValueChange);
    }
  }

  getValue = () => {
    this.subscribe();
    return this.value;
  };

  setValue = (nextValue: T) => {
    if (nextValue === this.value) {
      return;
    }

    const isStarter = currentBatch === null;
    currentBatch = currentBatch || new BatchComputation();

    this.notifyStale();
    this.value = nextValue;
    this.notifyStable(true);

    if (isStarter) {
      currentBatch.execute();
      currentBatch = null;
    }
  };
}

class BatchComputation {
  private pendingEffects: Function[] = [];
  private pendingSignals = new Set<ISignal>();

  scheduleEffect(effect: Function) {
    if (!this.pendingEffects.includes(effect)) {
      this.pendingEffects.push(effect);
    }
  }

  registerSignal(signal: ISignal) {
    this.pendingSignals.add(signal);
  }

  unregisterSignal(signal: ISignal) {
    this.pendingSignals.delete(signal);
  }

  execute() {
    while (this.pendingEffects.length) {
      const effect = this.pendingEffects.shift()!;
      effect();
    }

    for (const signal of this.pendingSignals) {
      signal.notifyStable(false);
    }

    if (this.pendingEffects.length) {
      this.execute();
    }
  }
}

export function batch(fn: Function) {
  // to support nested batches
  if (currentBatch) {
    fn();
    return;
  }

  currentBatch = new BatchComputation();
  fn();
  currentBatch.execute();
  currentBatch = null;
}

export function createSignal<T>(
  initialValue: T,
  debugName?: string
): readonly [Accessor<T>, Setter<T>] {
  const signal = new Signal(initialValue, debugName);

  return [signal.getValue, signal.setValue] as const;
}

type EffectFunction<Prev, Next extends Prev = Prev> = (
  v: Prev | undefined
) => Next;

class Computation<Next> implements IComputation {
  private context: IReactiveContext;
  private cleanups = new Set<Function>();
  private dependencies = new Set<ISignal>();
  private previousValue: Next | undefined;
  private shouldCompute = true; // always compute initially, and only compute if dependencies have changed
  private status: Status = Status.Stable; // only execute on transition from stale to stable

  constructor(
    private fn: EffectFunction<Next>,
    private isMemo = false,
    private debugName?: string
  ) {
    if (!currentContext) {
      throw new Error("Computation must be created inside a reactive context");
    }

    this.context = currentContext;
    this.execute();
  }

  protected get allDependenciesAreStable() {
    for (const dependency of this.dependencies) {
      if (dependency.status === Status.Stale) {
        return false;
      }
    }

    return true;
  }

  cleanup = () => {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups.clear();

    for (const signal of this.dependencies) {
      signal.removeComputation(this);
    }
    this.dependencies.clear();

    this.context.removeComputation(this);
  };

  addCleanup(cleanup: Function): void {
    this.cleanups.add(cleanup);
  }

  addDependency(dependency: ISignal) {
    this.dependencies.add(dependency);
  }

  markStale(staleDependency: ISignal) {
    this.status = Status.Stale;

    for (const dependency of this.dependencies) {
      const isNotifier = dependency === staleDependency;
      if (!isNotifier) {
        dependency.notifyStale(this);
      }
    }
  }

  markStable(dependencyDidChange: boolean) {
    if (dependencyDidChange) {
      this.shouldCompute = true;
    }

    if (!this.allDependenciesAreStable) {
      return;
    }

    if (this.status === Status.Stable) {
      return;
    }
    this.status = Status.Stable;

    if (!this.shouldCompute) {
      return;
    }

    if (currentBatch && !this.isMemo) {
      currentBatch.scheduleEffect(this.execute);
    } else {
      this.execute();
    }
  }

  private execute = () => {
    currentContext = this.context;

    this.cleanup();

    if (this.context.currentComputation) {
      this.context.currentComputation.addCleanup(this.cleanup);
    }

    this.context.startComputation(this);
    try {
      this.previousValue = this.fn(this.previousValue);
    } finally {
      this.context.endComputation();
      this.shouldCompute = false;
    }
  };
}

export function createEffect<Next>(
  fn: EffectFunction<Next>,
  debugName?: string
) {
  new Computation(fn, false, debugName);
}

export function createMemo<T>(fn: () => T, debugName?: string): Accessor<T> {
  const signal = new Signal<T>(null!, `memo-signal ${debugName}`);

  new Computation(
    () => {
      const value = fn();
      untrack(() => signal.setValue(value));
    },
    true,
    `memo-computation ${debugName}`
  );

  return signal.getValue;
}

export function untrack<T>(fn: () => T): T {
  if (!currentContext?.currentComputation) {
    return fn();
  }

  return currentContext.untrack(fn);
}

export function onCleanup(fn: Function) {
  currentContext?.currentComputation?.addCleanup(fn);
}

export type Disposer = () => void;

class ReactiveContext implements IReactiveContext {
  private stack: IComputation[] = [];
  private computations: Set<IComputation> = new Set();

  get currentComputation(): IComputation | undefined {
    return this.stack.at(-1);
  }

  startComputation(computation: IComputation): void {
    this.stack.push(computation);
    this.computations.add(computation);
  }

  endComputation(): void {
    this.stack.pop();
  }

  removeComputation(computation: IComputation): void {
    this.computations.delete(computation);
  }

  untrack<T>(fn: () => T): T {
    const temporaryStack = this.stack;
    this.stack = [];
    const value = fn();
    this.stack = temporaryStack;
    return value;
  }

  dispose = () => {
    for (const computation of this.computations) {
      computation.cleanup();
    }
    this.computations.clear();
  };
}

export function createRoot(fn: (dispose: Disposer) => unknown) {
  const parentContext = currentContext;
  const context = (currentContext = new ReactiveContext());

  try {
    fn(context.dispose);
  } finally {
    currentContext = parentContext;
  }
}
