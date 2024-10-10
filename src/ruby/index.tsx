import { ExtensionWebpackModule } from "@moonlight-mod/types";

export const webpackModules: Record<string, ExtensionWebpackModule> = {
  entrypoint: {
    dependencies: [
      { ext: "markdown", id: "markdown" }
    ],
    entrypoint: true
    // There is no `run` specified here, as this Webpack module is stored in a
    // separate file. See `src/ruby/webpackModules/entrypoint.ts`.
  }
};
