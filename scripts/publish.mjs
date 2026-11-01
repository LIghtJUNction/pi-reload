import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const [packed] = JSON.parse(readFileSync("pack-result.json", "utf8"));
if (!packed?.filename || !packed?.integrity) {
  throw new Error("npm pack did not return a filename and integrity");
}

const lookup = spawnSync("npm", [
  "view", `${pkg.name}@${pkg.version}`, "dist.integrity", "--json",
], { encoding: "utf8" });
if (lookup.error) throw lookup.error;
if (lookup.status === 0) {
  const publishedIntegrity = JSON.parse(lookup.stdout);
  if (publishedIntegrity !== packed.integrity) {
    throw new Error("Version already exists with different contents; refusing to skip or overwrite");
  }
  console.log("Identical version already published; continuing GitHub release.");
} else {
  // Do not treat authentication, network or server errors as an absent version.
  let error;
  try { error = JSON.parse(lookup.stdout).error; } catch {}
  if (error?.code !== "E404") {
    process.stderr.write(lookup.stderr);
    throw new Error("Cannot verify registry version; refusing to publish");
  }
  const publish = spawnSync("npm", [
    "publish", packed.filename, "--access", "public", "--provenance",
  ], { stdio: "inherit" });
  if (publish.error) throw publish.error;
  if (publish.status !== 0) throw new Error("npm publish failed");
}
