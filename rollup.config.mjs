import fs from 'fs';
import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

export default async (commandLineArgs)=>{
  fs.rmSync('dist', {recursive: true, force: true });
    
  const banner = `/*!
  * easy-barcode-scanner (build ${(new Date()).toISOString()})
  * A wrapper for https://github.com/Dynamsoft/barcode-reader-javascript. Easier to use.
  * The wrapper is under Unlicense, the Dynamsoft SDK it depended is still protected by copyright.
  */`;

  
  return [
    {
      input: "src/index.ts",
      plugins: [
        nodeResolve(),
        typescript({ tsconfig: "./tsconfig.json" }),
        // terser({ ecma: 5, format: terser_format }),
      ],
      output: [
        {
          file: "dist/easy-barcode-scanner.js",
          format: "umd",
          name: "Dynamsoft",
          exports: "named",
          banner: banner,
          plugins: [terser({ ecma: 5 })],
        },
        {
          file: "dist/easy-barcode-scanner.mjs",
          format: "es",
          exports: "named",
          banner: banner,
          plugins: [terser({ ecma: 6 })],
        },
        {
          file: "dist/easy-barcode-scanner.esm.js",
          format: "es",
          exports: "named",
          banner: banner,
          plugins: [terser({ ecma: 6 })],
        },
      ],
    },
  ]
};

