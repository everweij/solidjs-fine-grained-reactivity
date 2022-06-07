import { prepareChildren, reconcileProperty } from "./reconciliation";
import { createEffect, createRoot } from "./reactive";
import {
  isFn,
  isString,
  unpack,
  isEventListener,
  identity,
  isStyleProp,
} from "./util";
import type { AnyObject, Children, Disposer } from "./types";
import udomdiff from "udomdiff/esm";

// Function that given a parent element tries to mount children-elements
function renderChildren(parent: Node, children: Children) {
  // Each child-element or fragment of children-elements needs a insertion point.
  // This list exists to find a next sibbling given an certain index later on.
  // E.g., if we have a list of 3 children -> ["a", false, "c"], and index 1 (false)
  // updates to "b", we need to tell the diff algorithm to insert "b" before the "c"-node.
  // That's why we store the first child-element of each fragment in this list.
  const nextSibblings: (Node | null)[] = [];

  children.forEach((child, index) => {
    if (isFn(child)) {
      // Apparently we're dealing with a 'dynamic' child or fragment of children.
      // Therefore, we need to wrap it in an effect for the behavior to become reactive.
      // That is, when a child updates, we're able to perform a diff against the DOM.
      createEffect((previousChildren: Node[] = []) => {
        const nextChildren = udomdiff(
          parent,
          previousChildren,
          prepareChildren(unpack(child)),
          identity,
          nextSibblings.slice(index + 1).find(Boolean)
        );

        // Store the possble first child in the list of next sibblings.
        nextSibblings[index] = nextChildren[0];
        return nextChildren;
      });
    } else {
      // Apparently we're dealing with static content. Therefore, we can let do the diff
      // do its work (append only)
      const [firstChild] = udomdiff(
        parent,
        [],
        prepareChildren(child),
        identity
      );

      // Also store the possble first child in the list of next sibblings.
      nextSibblings[index] = firstChild;
    }
  });
}

// Function that given a parent element tries to set various html-attributes
function renderProperties(
  element: HTMLElement,
  props: JSX.HTMLAttributes<HTMLElement>
) {
  // Let's map over all the html-attributes
  Object.entries(props).forEach(([property, value]) => {
    // We need to determine if we should wrap setting the value in a effect or not.
    // Event-handlers like onClick, onChange, etc. are not reactive and should be kept as is.
    // When values are of type Function, with the exeption of the "style"-attribute, it's fairly
    // safe to assume that the behavior is reactive and should be wrapped in an effect.
    const shouldWrapInEffect =
      !isEventListener(property) && (isFn(value) || isStyleProp(property));

    if (shouldWrapInEffect) {
      createEffect((previousValue) => {
        const nextValue = unpack(value);
        reconcileProperty(element, property, nextValue, previousValue);
        return nextValue;
      });
    } else {
      // just set and forget
      reconcileProperty(element, property, value);
    }
  });
}

// Create a new element given a tag-name, and takes care
// of constructing the structure and behavior of the element.
function createElement(
  tagName: string,
  props: JSX.HTMLAttributes<HTMLElement>,
  children: Children
) {
  const element = document.createElement(tagName);
  renderChildren(element, children);
  renderProperties(element, props);

  return element;
}

// The compiler will call this function when it encounters a JSX-element.
// This is actually more or less the same of how this works in React for instance.
// This gives us the change to customize the way JSX is handeled.
export function jsx(
  tag: string,
  attributes: AnyObject,
  ...children: JSX.Element[]
): Node | Node[];
export function jsx(
  Component: Function,
  props: AnyObject,
  ...children: JSX.Element[]
): Node | Node[];
export function jsx(
  tagNameOrComponent: string | Function,
  props: AnyObject,
  ...children: unknown[]
): Node | Node[] {
  // make sure `props` is always an object
  props = props || {};

  // A string indicates that we're dealing with a tag-name, and should create
  // a new dom-element.
  if (isString(tagNameOrComponent)) {
    return createElement(tagNameOrComponent, props, children as Children);
  }

  // At this point we can assume that we're dealing with a component.
  // First, let's normalize the children so it behaves like the users expects it
  // to behave.
  props.children =
    children.length === 0
      ? undefined
      : children.length === 1
      ? children[0]
      : children;

  // Since components return actual DOM-elements, we can just call the component
  // as a function and return the result.
  return tagNameOrComponent(props);
}

// The compiler will call this function when it encounters a JSX-fragment.
// Basically we're just forwarding the 'children'.
export const Fragment = (props: { children: Node[] }) => props.children;

// This is the entry point to an application.
export function render(code: () => JSX.Element, root: HTMLElement): Disposer {
  return createRoot((disposer) => {
    const dispose = () => {
      // Cheap way to clean up the root-element
      root.textContent = "";
      disposer();
    };

    // mount the actual dom-elements
    renderChildren(root, [code as any]);

    // Give the user the ability to clean up the root-element outside of the
    // usual component structure. E.g, useful for testing.
    return dispose;
  });
}
