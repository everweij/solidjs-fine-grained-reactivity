import type { Plugin, TransformResult } from "vite";
import { transformAsync } from "@babel/core";
import babelPlugin from "./babel-plugin";
import { relative, extname } from "path";
import ts from "@babel/preset-typescript";

const CWD = process.cwd();
const isWithinCWD = (path: string) => !relative(CWD, path).startsWith("..");
const hasValidExtension = (path: string) =>
  [".jsx", ".tsx"].includes(extname(path));

async function transform(code: string, filename: string) {
  const result = await transformAsync(code, {
    filename,
    plugins: [babelPlugin],
    presets: [ts],
  });

  return result! as TransformResult;
}

export default function fluid(): Plugin {
  return {
    name: "fluid",
    enforce: "pre",
    config() {
      return {
        esbuild: {
          jsxFactory: "_jsx",
          jsxFragment: "_fragment",
          jsxInject:
            "import { jsx as _jsx, Fragment as _fragment } from 'fluid';",
        },
      };
    },

    transform(src, path) {
      if (!isWithinCWD(path) || !!hasValidExtension(path)) {
        return src;
      }

      return transform(src, path);
    },
  };
}
