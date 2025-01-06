#!/usr/bin/env -S pkgx deno^2 run -A

//TODO if you step into dev-dir/subdir does it work?
//TODO dev off uses PWD which may not be correct if in subdir (obv)

import { Path, utils } from "libpkgx";
import shellcode from "./src/shellcode().ts";
import sniff from "./src/sniff.ts";
import shell_escape from "./src/shell-escape.ts";

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
}

const snuff = await sniff(Path.cwd());

const pkgspecs = snuff.pkgs.map((pkg) => `+${utils.pkg.str(pkg)}`);

const cmd = new Deno.Command("pkgx", {
  args: [...pkgspecs],
  stdout: "piped",
  env: { CLICOLOR_FORCE: "1" }, // unfortunate
}).spawn();

await cmd.status;

const stdout = (await cmd.output()).stdout;
let env = new TextDecoder().decode(stdout);

// add any additional env that we sniffed
for (const [key, value] of Object.entries(snuff.env)) {
  env += `${key}=${shell_escape(value)}\n`;
}

env = env.trim();

let undo = "";
for (const envln of env.trim().split("\n")) {
  const [key] = envln.split("=", 2);
  const value = Deno.env.get(key);
  if (value) {
    undo += `    export ${key}=${shell_escape(value)}\n`;
  } else {
    undo += `    unset ${key}\n`;
  }
}

const dir = Deno.cwd();

const bye_bye_msg = pkgspecs.map((pkgspec) => `-${pkgspec.slice(1)}`).join(" ");

console.log(`
set -a
${env}
set +a

_pkgx_dev_try_bye() {
  suffix="\${PWD#"${dir}"}"
  if test "$PWD" != "${dir}$suffix"; then
    ${undo.trim()}
    unset -f _pkgx_dev_try_bye
    echo "\\033[31m${bye_bye_msg}\\033[0m" >&2
    return 0
  else
    return 1
  fi
}
`.trim());

console.error("%c%s", "color: green", pkgspecs.join(" "));
