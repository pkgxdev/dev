#!/usr/bin/env -S pkgx deno^2 run -A

//TODO if you step into dev-dir/subdir and type `dev` does it find the root properly?
//TODO dev off uses PWD which may not be correct if in subdir (obv)

import { Path, utils } from "libpkgx";
import shellcode from "./src/shellcode().ts";
import sniff from "./src/sniff.ts";
import shell_escape from "./src/shell-escape.ts";
import app_version from "./src/app-version.ts";
import integrate from "./src/integrate.ts";

switch (Deno.args[0]) {
  case "--help": {
    const status = await new Deno.Command("pkgx", {
      args: ["gh", "repo", "view", "pkgxdev/dev"],
    }).spawn().status;
    Deno.exit(status.code);
    break; // deno lint insists
  }
  case "--shellcode":
    console.log(shellcode());
    Deno.exit(0);
    break; // deno lint insists
  case "--version":
    console.log(`dev ${app_version}`);
    Deno.exit(0);
    break; // deno lint insists
  case "integrate":
    await integrate("install", { dryrun: Deno.args[1] == "--dry-run" });
    Deno.exit(0);
    break;
  case "deintegrate":
    await integrate("uninstall", { dryrun: Deno.args[1] == "--dry-run" });
    Deno.exit(0);
}

const snuff = await sniff(Path.cwd());

if (snuff.pkgs.length === 0 && Object.keys(snuff.env).length === 0) {
  console.error("no devenv detected");
  Deno.exit(1);
}

let env = "";
const pkgspecs = snuff.pkgs.map((pkg) => `+${utils.pkg.str(pkg)}`);

if (snuff.pkgs.length > 0) {
  const cmd = new Deno.Command("pkgx", {
    args: [...pkgspecs],
    stdout: "piped",
    env: { CLICOLOR_FORCE: "1" }, // unfortunate
  }).spawn();

  await cmd.status;

  const stdout = (await cmd.output()).stdout;
  env = new TextDecoder().decode(stdout);
}

// add any additional env that we sniffed
for (const [key, value] of Object.entries(snuff.env)) {
  env += `${key}=${shell_escape(value)}\n`;
}

env = env.trim();

let undo = "";
for (const envln of env.trim().split("\n")) {
  if (!envln) continue;

  const [key] = envln.split("=", 2);
  undo += `    if [ \\"$${key}\\" ]; then
    export ${key}=\\"$${key}\\"
  else
    unset ${key}
  fi\n`;
}

const dir = Deno.cwd();

const bye_bye_msg = pkgspecs.map((pkgspec) => `-${pkgspec.slice(1)}`).join(" ");

console.log(`
eval "_pkgx_dev_try_bye() {
  suffix=\\"\\\${PWD#\\"${dir}\\"}\\"
  [ \\"\\$PWD\\" = \\"${dir}$suffix\\" ] && return 1
  echo -e \\"\\033[31m${bye_bye_msg}\\033[0m\\" >&2
  ${undo.trim()}
  unset -f _pkgx_dev_try_bye
}"

set -a
${env}
set +a`);

console.error("%c%s", "color: green", pkgspecs.join(" "));
