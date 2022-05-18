import { batch } from "./reactive";
import { Signal } from "./reactive/signal";
import type { AnyObject, Predicate } from "./types";
import { isArray, isFn, isNumber, isObject, isString, mapObject } from "./util";

const ORIGINAL = Symbol("original");
const PROXY = Symbol("proxy");

interface ProxiedObject {
  [ORIGINAL]: AnyObject;
  [PROXY]: boolean;
}

function wrapProxy(maybeObject: unknown): unknown {
  if (!isObject(maybeObject) || isArray(maybeObject)) {
    return maybeObject;
  }

  const object = mapObject(maybeObject, (key, value) => {
    if (isArray(value)) {
      const mapped = value.map((value) => wrapProxy(value));
      return [key, new Signal(mapped)];
    }

    if (isObject(value)) {
      return [key, wrapProxy(value as AnyObject)];
    }

    return [key, new Signal(value)];
  });

  return new Proxy(object, {
    get(obj, prop) {
      if (prop === ORIGINAL) {
        return obj;
      }

      if (prop === PROXY) {
        return true;
      }

      // @ts-ignore
      const value = obj[prop];

      if (value instanceof Signal) {
        return value.getValue();
      }

      return value;
    },
  });
}

export function createStore<T extends AnyObject>(initialState: T) {
  const state = wrapProxy(initialState);

  function setState<
    Args extends [...Array<string | number | Predicate>, AnyObject | Function]
  >(...args: Args) {
    batch(() => {
      let stateToBeSet: unknown = state;

      for (const arg of args.slice(0, -1)) {
        const isPropertyKey = isNumber(arg) || isString(arg);
        const isPredicate = isFn(arg);

        if (isPropertyKey) {
          if (!isObject(stateToBeSet)) {
            throw new Error("Cannot set property on non-object");
          }

          stateToBeSet = stateToBeSet[arg];
        } else if (isPredicate) {
          if (!isArray(stateToBeSet)) {
            throw new Error("Predicates are only supported on arrays");
          }

          stateToBeSet = stateToBeSet.filter(arg as Predicate);
        } else {
          throw new Error("invalid argument");
        }
      }

      const partialStateOrSetter = args.at(-1);

      // convert it to an array for convinience
      stateToBeSet = isArray(stateToBeSet) ? stateToBeSet : [stateToBeSet];

      for (const state of stateToBeSet as ProxiedObject[]) {
        const entries = Object.entries(
          isFn(partialStateOrSetter)
            ? partialStateOrSetter(state)
            : partialStateOrSetter
        );

        const original = state[ORIGINAL];

        for (const [key, value] of entries) {
          const currentValue = original[key];
          if (currentValue instanceof Signal) {
            const nextValue = isArray(value)
              ? value.map((value) => (value[PROXY] ? value : wrapProxy(value)))
              : value;
            currentValue.setValue(nextValue);
          } else {
            (state as unknown as AnyObject)[key] = value;
          }
        }
      }
    });
  }

  return [state as T, setState] as const;
}
