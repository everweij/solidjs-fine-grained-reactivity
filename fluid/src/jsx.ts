import { reconcileChildren, reconcileProperty } from "./reconciliation";
import { createEffect, createRoot } from "./reactive";
import { isFn, isString, unpack, isEventListener } from "./util";
import type { Accessor, AnyObject, Child, Children, Disposer } from "./types";

function createComponent(
  Component: Function,
  props: AnyObject,
  children: unknown[]
) {
  0;
  const compactChildren = children.length === 1 ? children[0] : children;

  if (props) {
    props.children = compactChildren;
  }

  return Component(props || { children: compactChildren });
}

function renderChildren(parent: Node, children: (Child | Accessor<Child>)[]) {
  // keep track of the first node of each child
  const nextSibblingMap: Array<Node | null> = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (isFn(child)) {
      createEffect<Array<Node | null>>((previousChildren) => {
        const nextSibbling =
          nextSibblingMap.find((el, index) => index > i && el) || null;

        const [nextChildren, firstNode] = reconcileChildren(
          parent,
          unpack(child),
          previousChildren,
          nextSibbling
        );

        nextSibblingMap[i] = firstNode;
        return nextChildren;
      }, "renderChildren-effect");
    } else {
      const [, firstNode] = reconcileChildren(parent, child);
      nextSibblingMap[i] = firstNode;
    }
  }
}

function renderProperties(
  element: HTMLElement,
  props: JSX.HTMLAttributes<HTMLElement>
) {
  const entries = Object.entries(props || {});
  for (const [property, value] of entries) {
    const shouldWrapInEffect =
      (isFn(value) || property === "style") && !isEventListener(property);

    if (shouldWrapInEffect) {
      createEffect((previousValue) => {
        const nextValue = unpack(value);
        reconcileProperty(element, property, nextValue, previousValue);
        return nextValue;
      });
    } else {
      reconcileProperty(element, property, value, null);
    }
  }
}

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

export function jsx(
  tagNameOrComponent: string | Function,
  props: AnyObject,
  ...children: unknown[]
) {
  if (isString(tagNameOrComponent)) {
    return createElement(tagNameOrComponent, props, children as Children);
  } else {
    return createComponent(tagNameOrComponent, props, children);
  }
}

export function Fragment(props: { children: Node[] }) {
  return props.children;
}

export function render(code: () => any, root: HTMLElement): Disposer {
  let dispose!: Disposer;

  createRoot((disposer) => {
    dispose = () => {
      root.textContent = "";
      disposer();
    };

    renderChildren(root, [code]);
  });

  return dispose;
}
