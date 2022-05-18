import type { Accessor, AnyObject, Falsey } from "./types";

export const isFalsey = (value: unknown): value is Falsey =>
  value === undefined || value === null || value === false;

export const isFn = (value: unknown): value is Function =>
  typeof value === "function";

export const isNull = (value: unknown): value is null => value === null;

export const isObject = (value: unknown): value is AnyObject =>
  typeof value === "object" && !isNull(value);

export const isString = (value: unknown): value is string =>
  typeof value === "string";

export const isNumber = (value: unknown): value is number =>
  typeof value === "number";

export const isArray = Array.isArray;

export const isEmpty = (value: unknown): value is Falsey | "" =>
  isFalsey(value) || value === "";

/**
 * Recursively calls a function until it is able to return a value.
 */
export function unpack<T>(value: T | Accessor<T>): T {
  let current: T | Accessor<T> = value;
  while (isFn(current)) {
    current = (current as Function)();
  }

  return current;
}

export const isEventListener = (property: string): boolean =>
  property.startsWith("on");

export const isStyleProp = (property: string): boolean => property === "style";

/**
 * Returns a new object by mapping over each entry (key / value) of a given object.
 */
export function mapObject<T>(
  object: T,
  mapper: (key: keyof T, value: unknown) => [keyof T, unknown]
): T {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => mapper(key as keyof T, value))
  ) as any;
}

export const identity = <T>(value: T): T => value;

export const EMPTY_OBJECT = {};
