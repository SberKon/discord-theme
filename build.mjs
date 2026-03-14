import { build } from "esbuild";
import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const pluginsDir = "./plugins";
const outDir = "./dist";

if (!existsSync(outDir)) mkdirSync(outDir);

const plugins = readdirSync(pluginsDir);

for (const plugin of plugins) {
  const pluginDir = join(pluginsDir, plugin);
  const outPluginDir = join(outDir, plugin);

  if (!existsSync(outPluginDir)) mkdirSync(outPluginDir);

  await build({
    entryPoints: [join(pluginDir, "src/index.ts")],
    outfile: join(outPluginDir, "index.js"),
    bundle: true,
    minify: false,
    format: "iife",
    globalName: "plugin",
    external: [],
    footer: {
      js: "module.exports = plugin;",
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  // Copy manifest
  copyFileSync(join(pluginDir, "manifest.json"), join(outPluginDir, "manifest.json"));

  console.log(`✅ Built: ${plugin}`);
}

console.log("🎉 All plugins built!");
