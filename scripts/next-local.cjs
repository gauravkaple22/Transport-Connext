const { spawnSync } = require("node:child_process");

const options = process.env.NODE_OPTIONS?.trim();
const env = {
  ...process.env,
  NODE_OPTIONS: [options, "--use-system-ca"].filter(Boolean).join(" "),
};
const result = spawnSync(process.execPath, [
  require.resolve("next/dist/bin/next"), ...process.argv.slice(2),
], { env, stdio: "inherit" });

if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
