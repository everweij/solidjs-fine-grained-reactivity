import type { NodePath, PluginObj } from "@babel/core";
import * as t from "@babel/types";
import type {
  Expression,
  JSXAttribute,
  JSXElement,
  JSXExpressionContainer,
  Identifier,
} from "@babel/types";
import type { VisitNodeFunction, Visitor } from "@babel/traverse";
import { ensureFluidImport } from "./ensure-fluid-import";
import { memoizeLogicalExpression } from "./memoize-logical-expression";
import {
  findJSXExpressionContainer,
  getNameOfJSXIdentifier,
  isComponent,
} from "./util";
import {
  componentToJsxFunction,
  createPropsObjectFromJsxAttributes,
  shouldTransformJSXExpression,
} from "./dynamic-expressions";

export type ExpressionToBeWrappedMap = Map<
  NodePath<JSXAttribute>,
  NodePath<JSXExpressionContainer>
>;

type State = {
  expressionsToBeWrapped: ExpressionToBeWrappedMap | null;
  ensureCreateMemoImport?: boolean;
  ensureJsxImport?: boolean;
  alreadyMemoed?: boolean;
};

function getUniqueMemoId(path: NodePath): Identifier {
  return path.scope.generateUidIdentifier("memo");
}

const handleDynamicJsxExpressions: VisitNodeFunction<State, any> = (
  path,
  state
) => {
  const jsxExpressionContainer = findJSXExpressionContainer(path);
  if (!shouldTransformJSXExpression(jsxExpressionContainer)) {
    return;
  }

  const jsxAttribute =
    t.isJSXAttribute(jsxExpressionContainer.parentPath.node) &&
    (jsxExpressionContainer.parentPath as NodePath<JSXAttribute> | false);

  if (jsxAttribute && isComponent(jsxAttribute)) {
    let expressionsToBeWrapped = state.expressionsToBeWrapped;
    if (!expressionsToBeWrapped) {
      expressionsToBeWrapped = new Map();
      state.expressionsToBeWrapped = expressionsToBeWrapped;
    }
    expressionsToBeWrapped.set(jsxAttribute, jsxExpressionContainer);
    return;
  }

  const isEventHandler =
    jsxAttribute &&
    getNameOfJSXIdentifier(jsxAttribute.node.name).startsWith("on");
  if (isEventHandler) {
    return;
  }

  // wrap in function
  jsxExpressionContainer
    .get("expression")
    .replaceWith(
      t.arrowFunctionExpression(
        [],
        t.cloneNode(jsxExpressionContainer.node.expression as Expression)
      )
    );
};

const jsxVisitor: Visitor<State> = {
  CallExpression: {
    exit: handleDynamicJsxExpressions,
  },
  MemberExpression: {
    exit: handleDynamicJsxExpressions,
  },
  ConditionalExpression: {
    enter(path, state) {
      const jsxExpressionContainer = findJSXExpressionContainer(path);
      if (!shouldTransformJSXExpression(jsxExpressionContainer)) {
        return;
      }

      state.ensureCreateMemoImport = true;
      const id = path.scope.generateUidIdentifier("memo");
      memoizeLogicalExpression(path, id, t.cloneNode(path.node.test, true));
      path.get("test").replaceWith(t.callExpression(id, []));
    },
  },

  LogicalExpression: {
    enter(path, state) {
      if (state.alreadyMemoed) {
        return;
      }

      const jsxExpressionContainer = findJSXExpressionContainer(path);
      if (!shouldTransformJSXExpression(jsxExpressionContainer)) {
        return;
      }

      state.ensureCreateMemoImport = true;
      state.alreadyMemoed = true;

      const shouldMemoBoth =
        !t.isJSX(path.node.left) && !t.isJSX(path.node.right);

      if (shouldMemoBoth) {
        const id = getUniqueMemoId(path);
        memoizeLogicalExpression(path, id, path.node);
        path.replaceWith(t.callExpression(id, []));
        return;
      }

      for (const child of [path.get("left"), path.get("right")]) {
        if (t.isJSX(child.node)) {
          continue;
        }

        const id = getUniqueMemoId(path);
        memoizeLogicalExpression(path, id, child.node);
        child.replaceWith(t.callExpression(id, []));
      }
    },
    exit(_, state) {
      state.alreadyMemoed = false;
    },
  },

  JSXOpeningElement: {
    exit(path, state) {
      if (state.expressionsToBeWrapped) {
        const attributes = path.get("attributes") as NodePath<JSXAttribute>[];

        const props = createPropsObjectFromJsxAttributes(
          attributes,
          state.expressionsToBeWrapped
        );

        const jsxElement = path.find((parent) =>
          parent.isJSXElement()
        ) as NodePath<JSXElement>;
        const hasParentJsx = jsxElement.parentPath.isJSX();

        let transformed: t.CallExpression | JSXExpressionContainer =
          componentToJsxFunction(path, props, jsxElement);
        if (hasParentJsx) {
          transformed = t.jsxExpressionContainer(transformed);
        }

        jsxElement.replaceWith(transformed);

        state.ensureJsxImport = true;
      }

      state.expressionsToBeWrapped = null;
    },
  },
};

export default function plugin(): PluginObj<State> {
  return {
    name: "babel-transform-fluid",
    visitor: {
      Program: {
        enter(_, state) {
          state.ensureCreateMemoImport = false;
          state.ensureJsxImport = false;
        },
        exit(path, state) {
          if (state.ensureCreateMemoImport) {
            ensureFluidImport(path, "createMemo", "__createMemo");
          }

          if (state.ensureJsxImport) {
            ensureFluidImport(path, "jsx");
          }
        },
      },

      JSXElement: {
        enter(path, state) {
          path.traverse(jsxVisitor, state);
        },
      },
    },
  };
}
