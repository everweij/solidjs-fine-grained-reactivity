import type { Accessor, AnyObject, Falsey } from "./types";

export function isFalsey(value: unknown): value is Falsey {
  return value === undefined || value === null || value === false;
}

export function isFn(value: unknown): value is Function {
  return typeof value === "function";
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isObject(value: unknown): value is AnyObject {
  return typeof value === "object" && !isNull(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export const isArray = Array.isArray;

export function unpack<T>(value: T | Accessor<T>): T {
  let current: T | Accessor<T> = value;
  while (isFn(current)) {
    current = (current as Function)();
  }

  return current;
}

export function isEventListener(property: string): boolean {
  return property.startsWith("on");
}

export function mapObject<T>(
  object: T,
  mapper: (key: keyof T, value: unknown) => [keyof T, unknown]
): T {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => mapper(key as keyof T, value))
  ) as any;
}
