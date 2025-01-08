#!/usr/bin/env -S pkgx deno^2 run -A

//TODO if you step into dev-dir/subdir and type `dev` does it find the root properly?
//TODO dev off uses PWD which may not be correct if in subdir (obv)

import { Path } from "libpkgx";
import shellcode from "./src/shellcode().ts";
import app_version from "./src/app-version.ts";
import integrate from "./src/integrate.ts";
import { parse } from "jsr:@std/flags";
import dump from "./src/dump.ts";

const parsedArgs = parse(Deno.args, {
  alias: {
    n: "dry-run",
    "just-print": "dry-run",
    recon: "dry-run",
    v: "version",
    h: "help",
  },
  boolean: ["help", "version", "shellcode"],
  default: {
    "dry-run": false,
  },
});

if (parsedArgs.help) {
  const status = await new Deno.Command("pkgx", {
    args: ["gh", "repo", "view", "pkgxdev/dev"],
  }).spawn().status;
  Deno.exit(status.code);
} else if (parsedArgs.shellcode) {
  console.log(shellcode());
} else if (parsedArgs.version) {
  console.log(`dev ${app_version}`);
} else {
  const subcommand = parsedArgs._[0];
  const dryrun = parsedArgs["dry-run"] as boolean;
  switch (subcommand) {
    case "integrate":
      await integrate("install", { dryrun });
      break;
    case "deintegrate":
      await integrate("uninstall", { dryrun });
      break;
    default: {
      const cwd = Path.cwd().join(subcommand as string);
      await dump(cwd, { dryrun });
    }
  }
}
