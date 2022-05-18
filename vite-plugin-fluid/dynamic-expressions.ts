import type { NodePath } from "@babel/core";
import type {
  CallExpression,
  Expression,
  JSXAttribute,
  JSXElement,
  JSXExpressionContainer,
  JSXFragment,
  JSXOpeningElement,
  ObjectExpression,
  ObjectMethod,
  ObjectProperty,
} from "@babel/types";
import * as t from "@babel/types";
import { getNameOfJSXIdentifier } from "./util";

export function shouldTransformJSXExpression(
  jsxExpressionContainer: NodePath<JSXExpressionContainer>
): boolean {
  if (!jsxExpressionContainer) {
    return false;
  }

  if (t.isFunction(jsxExpressionContainer.node.expression)) {
    return false;
  }

  return true;
}

function wrapChildrenInFragment(
  jsxElement: NodePath<JSXElement>
): JSXFragment[] {
  const children = jsxElement.get("children");
  return children.length
    ? [
        t.jsxFragment(
          t.jsxOpeningFragment(),
          t.jsxClosingFragment(),
          children.map((child) => child.node)
        ),
      ]
    : [];
}

function wrapJsxAttributeInObjectGetter(
  name: string,
  expression: Expression
): ObjectMethod {
  const property = t.objectMethod(
    "get",
    t.identifier(name),
    [],
    t.blockStatement([t.returnStatement(expression)])
  );

  return property;
}

export function createPropsObjectFromJsxAttributes(
  attributes: NodePath<JSXAttribute>[],
  expressionsToBeWrapped: Map<
    NodePath<JSXAttribute>,
    NodePath<JSXExpressionContainer>
  >
): ObjectExpression {
  const properties: (ObjectMethod | ObjectProperty)[] = [];

  for (const attribute of attributes) {
    const name = getNameOfJSXIdentifier(attribute.node.name);
    const shouldWrapInGetter = expressionsToBeWrapped.has(attribute);

    if (shouldWrapInGetter) {
      const expression = expressionsToBeWrapped.get(attribute)!.node
        .expression as Expression;

      const property = wrapJsxAttributeInObjectGetter(name, expression);

      properties.push(property);
    } else {
      const expression = (attribute.get("value.expression") as NodePath)
        .node as Expression;

      const property = t.objectProperty(t.identifier(name), expression);

      properties.push(property);
    }

    attribute.remove();
  }

  return t.objectExpression(properties);
}

export function componentToJsxFunction(
  path: NodePath<JSXOpeningElement>,
  props: ObjectExpression,
  jsxElement: NodePath<JSXElement>
): CallExpression {
  return t.callExpression(t.identifier("jsx"), [
    t.identifier(getNameOfJSXIdentifier(path.node.name)),
    props,
    ...wrapChildrenInFragment(jsxElement),
  ]);
}
