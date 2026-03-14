const { build } = require("esbuild");
const { existsSync, mkdirSync, readdirSync, copyFileSync } = require("fs");
const { join } = require("path");

const pluginsDir = "./plugins";
const outDir = "./dist";

if (!existsSync(outDir)) mkdirSync(outDir);

const plugins = readdirSync(pluginsDir);

(async () => {
  for (const plugin of plugins) {
    const pluginDir = join(pluginsDir, plugin);
    const outPluginDir = join(outDir, plugin);

    if (!existsSync(outPluginDir)) mkdirSync(outPluginDir);

    await build({
      entryPoints: [join(pluginDir, "src/index.ts")],
      outfile: join(outPluginDir, "index.js"),
      bundle: true,
      minify: false,
      format: "cjs",
      external: ["@vendetta", "@vendetta/*"],
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    });

    copyFileSync(
      join(pluginDir, "manifest.json"),
      join(outPluginDir, "manifest.json")
    );

    console.log(`Built: ${plugin}`);
  }

  console.log("All plugins built!");
})();
