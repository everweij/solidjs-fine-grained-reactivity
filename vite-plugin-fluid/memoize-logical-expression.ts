import type { NodePath } from "@babel/core";
import * as t from "@babel/types";
import type { Expression, Identifier } from "@babel/types";
import type { Scope } from "@babel/traverse";

function createStackBetween(
  ancestor: NodePath,
  descendant: NodePath
): NodePath[] {
  let current: NodePath = descendant;
  const stack: NodePath[] = [];
  while (current !== ancestor) {
    stack.push(current);
    current = current.parentPath!;
  }

  return stack;
}

// find a suitable place to insert the memo.
// we want to insert it in the current scope before the place
// where the current path starts.
function findMemoInsertionPoint(path: NodePath, scope: Scope): NodePath {
  const stack = createStackBetween(scope.path, path);

  if (t.isProgram(scope.path.node)) {
    return stack.at(-1)!;
  }

  while (stack.length) {
    const current = stack.pop();

    if ("body" in current!.node) {
      return stack.pop()!;
    }
  }

  throw new Error("Could not find suitable insertion point for memo");
}

export function memoizeLogicalExpression(
  path: NodePath,
  id: Identifier,
  expression: Expression
): void {
  const p = findMemoInsertionPoint(path, path.scope);

  p.insertBefore(
    t.variableDeclaration("const", [
      t.variableDeclarator(
        id,
        t.callExpression(t.identifier("__createMemo"), [
          t.arrowFunctionExpression([], expression),
        ])
      ),
    ])
  );
}
