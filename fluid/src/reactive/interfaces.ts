import type { Status } from "./status";

export interface ISignal {
  removeComputation(computation: IComputation): void;
  notifyStale(issuer?: IComputation): void;
  notifyStable(opts?: { didValueChange: boolean }): void;
  get status(): Status;
}

export interface IComputation {
  cleanup(): void;
  markStale(dependency: ISignal): void;
  markStable(opts?: { dependencyDidChange: boolean }): void;
  addDependency(dependency: ISignal): void;
  addCleanup(cleanup: Function): void;
}

export interface IReactiveContext {
  startComputation(computation: IComputation): void;
  endComputation(): void;
  removeComputation(computation: IComputation): void;
  get currentComputation(): IComputation | undefined;
  untrack<T>(fn: () => T): T;
  dispose: () => void;
}

export interface IBatchComputation {
  scheduleEffect(effect: Function): void;
  registerSignal(signal: ISignal): void;
  unregisterSignal(signal: ISignal): void;
  execute(): void;
}
