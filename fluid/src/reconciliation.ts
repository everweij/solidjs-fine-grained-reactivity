import {
  EMPTY_OBJECT,
  isEmpty,
  isEventListener,
  isFalsey,
  isNumber,
  isString,
  unpack,
} from "./util";
import type { Style, Falsey, CSSProperties, Child, AnyObject } from "./types";
import { onCleanup } from "./reactive";

// Converts a `Children`-array to a `Node[]`-array.
export function prepareChildren(currentChild: Child | Child[]): Node[] {
  const result: Node[] = [];
  const futureChildren = Array.isArray(currentChild)
    ? currentChild
    : [currentChild];

  for (const child of futureChildren) {
    if (isString(child) || isNumber(child)) {
      result.push(document.createTextNode(child.toString()));
    } else if (!isFalsey(child)) {
      result.push(child);
    }
  }

  return result;
}

function assignStyle(
  element: HTMLElement,
  style: Style | Falsey,
  previous: Style | Falsey
): void {
  const nodeStyle = element.style as unknown as AnyObject;

  // Let's iterate over all style-rules, both new and old, and perform a diff
  const styleProperties = new Set([
    ...Object.keys(previous || EMPTY_OBJECT),
    ...Object.keys(style || EMPTY_OBJECT),
  ]) as Set<keyof CSSProperties>;
  for (const styleProperty of styleProperties) {
    // unpack the value of the style-rule if neccessary -> the value can be
    // wrapped in a function
    const newValue = unpack(style && style[styleProperty]);
    const previousValue = nodeStyle[styleProperty];

    const isAdded = !isEmpty(newValue) && isEmpty(previousValue);
    const isRemoved = isEmpty(newValue) && !isEmpty(previousValue);
    const hasChanged = !isAdded && !isRemoved && newValue !== previousValue;

    if (isAdded || hasChanged) {
      nodeStyle[styleProperty] = newValue;
    } else if (isRemoved) {
      nodeStyle[styleProperty] = null;
    }
  }
}

function assignClassName(element: HTMLElement, value: string | Falsey): void {
  if (isEmpty(value)) element.removeAttribute("class");
  else element.className = value;
}

function assignAttribute(
  element: HTMLElement,
  key: string,
  value: string | true | Falsey
): void {
  if (isFalsey(value)) element.removeAttribute(key);
  else element.setAttribute(key, value === true ? "" : value);
}

function assignEventListener(
  element: Node,
  property: string,
  value: Function | Falsey
): void {
  if (!value) {
    return;
  }

  const listener = value as EventListener;
  const event = property.slice(2).toLowerCase();
  element.addEventListener(event, listener);

  onCleanup(() => element.removeEventListener(event, listener));
}

const inputElementProps = ["value", "checked"];

export function reconcileProperty(
  element: HTMLElement,
  property: string,
  value: any,
  previousValue: any = null
) {
  if (property === "style") {
    assignStyle(element, value, previousValue);
  } else if (property === "class") {
    assignClassName(element, value);
  } else if (isEventListener(property)) {
    assignEventListener(element, property, value);
  } else if (inputElementProps.includes(property)) {
    // @ts-ignore
    (element as HTMLInputElement)[property] = value;
  } else if (value !== previousValue) {
    assignAttribute(element, property, value);
  }
}
