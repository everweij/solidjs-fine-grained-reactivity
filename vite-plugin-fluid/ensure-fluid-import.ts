import type { NodePath } from "@babel/core";
import type { Program, ImportDeclaration } from "@babel/types";
import * as t from "@babel/types";

const FLUID_PACKAGE_SOURCE = "fluid";

function hasImportedFluidVar(
  program: NodePath<Program>,
  importName: string
): boolean {
  for (const node of program.node.body) {
    if (
      !t.isImportDeclaration(node) ||
      node.source.value !== FLUID_PACKAGE_SOURCE
    ) {
      continue;
    }

    const importDeclaration = node as ImportDeclaration;

    for (const specifier of importDeclaration.specifiers) {
      if (specifier.local.name === importName) {
        return true;
      }
    }
  }

  return false;
}

function findFirstFluidImportStatement(
  program: NodePath<Program>
): NodePath<ImportDeclaration> | null {
  let result: NodePath<ImportDeclaration> | null = null;

  program.traverse({
    ImportDeclaration(path) {
      if (path.node.source.value === FLUID_PACKAGE_SOURCE && !result) {
        result = path;
      }
    },
  });

  return result;
}

function createFluidImport(
  program: NodePath<Program>
): NodePath<ImportDeclaration> {
  const fluidImport = t.importDeclaration(
    [],
    t.stringLiteral(FLUID_PACKAGE_SOURCE)
  );

  program.unshiftContainer("body", fluidImport);
  return program.get("body.0") as NodePath<ImportDeclaration>;
}

// This function makes sure that a certain fluid import is present in the file
export function ensureFluidImport(
  program: NodePath<Program>,
  name: string,
  alias: string = name
): void {
  if (hasImportedFluidVar(program, alias)) {
    return;
  }

  let fluidImport = findFirstFluidImportStatement(program);
  if (!fluidImport) {
    fluidImport = createFluidImport(program);
  }

  fluidImport.unshiftContainer(
    "specifiers",
    t.importSpecifier(t.identifier(alias), t.identifier(name))
  );
}
