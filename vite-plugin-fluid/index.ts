import type { Plugin } from "vite";
import { transformAsync } from "@babel/core";
import babelPlugin from "./babel-plugin";
import { relative, extname } from "path";
import ts from "@babel/preset-typescript";

const CWD = process.cwd();

const isWithinCWD = (path: string) => !relative(CWD, path).startsWith("..");

async function transform(code: string, filename: string) {
  const result = await transformAsync(code, {
    filename,
    plugins: [babelPlugin],
    presets: [[ts, {}]],
  });

  return result!;
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

    transform(src, id) {
      if (!isWithinCWD(id)) {
        return src;
      }

      if (![".jsx", ".tsx"].includes(extname(id))) {
        return src;
      }

      return transform(src, id);
    },
  };
}
