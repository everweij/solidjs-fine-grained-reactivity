import { isEventListener, isFalsey, isNumber, isString, unpack } from "./util";
import type { Style, Falsey, CSSProperties, Child, AnyObject } from "./types";
import { onCleanup } from "./reactive";

const EMPTY_OBJECT = {};

function shouldRender<T>(value: T | Falsey): value is T {
  return !isFalsey(value);
}

function childrenHasTextNode(children: (Node | null)[]): boolean {
  for (let i = 0; i < children.length; i++) {
    if (children[i]?.nodeType === Node.TEXT_NODE) {
      return true;
    }
  }

  return false;
}

type PreviousChildren = Array<Node | null>;

export function reconcileChildren(
  parent: Node,
  currentChild: Child | Child[],
  previousChildren: PreviousChildren = [],
  nextSibbling: Node | null = null
): [PreviousChildren, Node | null] {
  const currentChildren = Array.isArray(currentChild)
    ? currentChild
    : [currentChild];

  const nextChildren: PreviousChildren = [];
  let firstElement: Node | null = null;

  const previousHasOnlyElements = !childrenHasTextNode(previousChildren);

  for (let i = 0; i < currentChildren.length; i++) {
    const current = currentChildren[i];
    const isTextual = isString(current) || isNumber(current);

    let prevIndex = -1;
    if (shouldRender(current)) {
      if (previousHasOnlyElements && !isTextual) {
        prevIndex = previousChildren.indexOf(current as Node);
      } else {
        prevIndex = previousChildren.findIndex((previous) => {
          const isSameText =
            previous?.nodeType === Node.TEXT_NODE &&
            previous.textContent === current;
          const isSameElement =
            previous?.nodeType === Node.ELEMENT_NODE && previous === current;

          return isSameText || isSameElement;
        });
      }
    }

    const alreadyExists = prevIndex > -1;
    const hasMoved = alreadyExists && i !== prevIndex;
    const hasTextChanged =
      alreadyExists &&
      isTextual &&
      previousChildren[prevIndex]?.textContent !== current;

    const isAdded = !alreadyExists && shouldRender(current);
    const isRemoved = !alreadyExists && !shouldRender(current);

    if (hasMoved) {
      const prevItem = previousChildren[prevIndex];
      parent.replaceChild(current as Node, prevItem as Node);
      previousChildren[prevIndex] = null; // mutate???
      nextChildren[i] = current as Node;
    } else if (hasTextChanged) {
      previousChildren[prevIndex]!.textContent = current as string;
      nextChildren[i] = previousChildren[prevIndex];
    } else if (isAdded) {
      const node = isTextual
        ? document.createTextNode(current.toString())
        : current;

      if (nextChildren[i - 1]?.nextSibling) {
        parent.insertBefore(node, nextChildren[i - 1]!.nextSibling);
      } else if (nextSibbling) {
        parent.insertBefore(node, nextSibbling);
      } else {
        parent.appendChild(node);
      }
      nextChildren[i] = node;
    } else if (isRemoved) {
      nextChildren[i] = null;
    } else {
      previousChildren[i] = null;
      nextChildren[i] = current as Node;
    }

    if (!firstElement) firstElement = nextChildren[i];
  }

  for (const child of previousChildren) {
    if (child) {
      parent.removeChild(child);
    }
  }

  return [nextChildren, firstElement];
}

function isInvalidStyleValue(value: unknown): value is Falsey | "" {
  return isFalsey(value) || value === "";
}

function assignStyle(
  element: HTMLElement,
  style: Style | Falsey,
  previous: Style | Falsey
): void {
  const nodeStyle = element.style as unknown as AnyObject;

  const styleProperties = new Set([
    ...Object.keys(style || EMPTY_OBJECT),
    ...Object.keys(previous || EMPTY_OBJECT),
  ]) as Set<keyof CSSProperties>;
  for (const styleProperty of styleProperties) {
    const newValue = unpack(style && style[styleProperty]);
    const previousValue = nodeStyle[styleProperty];

    const isAdded =
      !isInvalidStyleValue(newValue) && isInvalidStyleValue(previousValue);
    const isRemoved =
      isInvalidStyleValue(newValue) && !isInvalidStyleValue(previousValue);
    const hasChanged = !isAdded && !isRemoved && newValue !== previousValue;

    if (isAdded || hasChanged) {
      nodeStyle[styleProperty] = newValue;
    } else if (isRemoved) {
      nodeStyle[styleProperty] = null;
    }
  }
}

function assignClassName(element: HTMLElement, value: string | Falsey): void {
  if (isFalsey(value)) element.removeAttribute("class");
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
  const event = property.slice(2).toLowerCase();
  element.addEventListener(event, value as EventListener);

  onCleanup(() => {
    element.removeEventListener(event, value as EventListener);
  });
}

const inputElementProps = ["value", "checked"];

export function reconcileProperty(
  element: HTMLElement,
  property: string,
  value: any,
  previousValue: any
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
