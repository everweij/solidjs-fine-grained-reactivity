import type { NodePath } from "@babel/core";
import * as t from "@babel/types";
import type { JSXExpressionContainer, JSXOpeningElement } from "@babel/types";

export function findJSXExpressionContainer(
  path: NodePath
): NodePath<JSXExpressionContainer> | null {
  return path.findParent((parent) =>
    parent.isJSXExpressionContainer()
  ) as NodePath<JSXExpressionContainer> | null;
}

export function isComponent(path: NodePath): boolean {
  const jsxOpeningElement = path.findParent((parent) =>
    parent.isJSXOpeningElement()
  ) as NodePath<JSXOpeningElement> | null;

  const id = jsxOpeningElement.node.name;

  if (t.isJSXIdentifier(id)) {
    return /^[A-Z]/.test(id.name);
  }

  return false;
}

export function getNameOfJSXIdentifier(identifier: object): string {
  if (t.isJSXIdentifier(identifier)) {
    return identifier.name;
  }

  throw new Error("Expected JSXIdentifier");
}
