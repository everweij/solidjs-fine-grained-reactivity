import { batch } from "./reactive";
import { Signal } from "./reactive/signal";
import type { AnyObject, Predicate } from "./types";
import { isArray, isFn, isNumber, isObject, isString, mapObject } from "./util";

const ORIGINAL = Symbol("original");
const PROXY = Symbol("proxy");

interface ProxiedObject {
  [ORIGINAL]: AnyObject;
  [PROXY]: boolean;
  [key: string]: unknown;
}

// Function that given an object will return a new object with the same keys
// but with values wrapped in signals internally instead.
function wrapProxy(maybeObject: unknown): unknown {
  // return eatly if the provided value is not the type we're looking for
  if (!isObject(maybeObject) || isArray(maybeObject)) {
    return maybeObject;
  }

  // Map over the object and see where we can wrap the value in a signal where possible
  const object = mapObject(maybeObject, (key, value) => {
    if (isArray(value)) {
      // In case of an array, we need to both wrap the array as well as each individual item
      const mapped = value.map((value) => wrapProxy(value));
      return [key, new Signal(mapped)];
    }

    if (isObject(value)) {
      // in case of a nested object, we need to wrap this object recursively
      return [key, wrapProxy(value as AnyObject)];
    }

    return [key, new Signal(value)];
  });

  return new Proxy(object, {
    get(obj, prop) {
      // We're using symbols as a sort of backdoor to the original object
      if (typeof prop === "symbol") {
        if (prop === ORIGINAL) {
          return obj;
        }

        if (prop === PROXY) {
          return true;
        }

        throw new Error(`Unexpected symbol`);
      }

      // Get the value out of the signal of applicable
      const value = obj[prop];
      return value instanceof Signal ? value.getValue() : value;
    },
  });
}

/**
 * Function that helps you to create a deep nested reactive store.
 * @see https://www.solidjs.com/docs/latest/api#createstore
 *
 * Note: this is a approximation of the createStore function from solid-js.
 */
export function createStore<T extends AnyObject>(initialState: T) {
  // Start by bootstrapping the initial provided state
  const state = wrapProxy(initialState);

  // The first couple of parameters are for selector-purposes, the last one is
  // alwasys reserverd for setting the final state
  function setState<
    Args extends [...Array<string | number | Predicate>, AnyObject | Function]
  >(...args: Args) {
    batch(() => {
      let stateToBeSet: unknown = state;

      // loop over the arguments and select the correct state step by step
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

      // The last argument is always the (partial-)state to be set (or setter function)
      const partialStateOrSetter = args.at(-1);

      // convert it to an array for convinience
      stateToBeSet = isArray(stateToBeSet) ? stateToBeSet : [stateToBeSet];

      for (const state of stateToBeSet as ProxiedObject[]) {
        // obtain key/value pairs to iterate over
        const entries = Object.entries(
          isFn(partialStateOrSetter)
            ? partialStateOrSetter(state)
            : partialStateOrSetter
        );

        // get a reference to the original object (un-proxied)
        const original = state[ORIGINAL];

        for (const [key, value] of entries) {
          const currentValue = original[key];
          if (currentValue instanceof Signal) {
            // Note: overwriting the old array may seem like introducing a
            // memory-leak because there's no pro-active clean-up being performed.
            // However, since the signal is most likely tied to a specific component, and
            // that component is going to be destroyed anyway, resulting in effects unsubscribing from
            // all removed signals, the memory-leak is probably not a problem.
            //
            // Checks if we should wrap the new value in a proxy
            const nextValue = isArray(value)
              ? value.map((value) => (value[PROXY] ? value : wrapProxy(value)))
              : value;
            currentValue.setValue(nextValue);
          } else {
            // Should we ever and up here?
            (state as unknown as AnyObject)[key] = value;
          }
        }
      }
    });
  }

  return [state as T, setState] as const;
}
