import process from "node:process";
import esbuild from "esbuild";

const isProd = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron"],
  format: "cjs",
  platform: "node",
  target: "es2020",
  outfile: "main.js",
  sourcemap: isProd ? false : "inline",
  minify: isProd,
  logLevel: "info"
});

if (isProd) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
  console.log("Watching for changes...");
}

