import { ExtensionWebpackModule } from "@moonlight-mod/types";

export const webpackModules: Record<string, ExtensionWebpackModule> = {
  entrypoint: {
    dependencies: [
      { ext: "markdown", id: "markdown" }
    ],
    entrypoint: true
    // There is no `run` specified here, as this Webpack module is stored in a
    // separate file. See `src/katex/webpackModules/entrypoint.ts`.
  }
};

import packJson from '../../package.json';

export const styles: string[] = [
  `@import url("https://cdn.jsdelivr.net/npm/katex@${packJson.dependencies.katex}/dist/katex.min.css");`
];
