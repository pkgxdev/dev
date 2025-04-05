#!/usr/bin/env -S pkgx --quiet deno^2 run -A

//TODO if you step into dev-dir/subdir and type `dev` does it find the root properly?
//TODO dev off uses PWD which may not be correct if in subdir (obv)

import { Path } from "libpkgx";
import shellcode, { datadir } from "./src/shellcode().ts";
import app_version from "./src/app-version.ts";
import integrate from "./src/integrate.ts";
import { parseArgs } from "jsr:@std/cli@^1/parse-args";
import dump from "./src/dump.ts";
import sniff from "./src/sniff.ts";

const parsedArgs = parseArgs(Deno.args, {
  alias: {
    n: "dry-run",
    "just-print": "dry-run",
    recon: "dry-run",
    v: "version",
    h: "help",
    q: "quiet",
  },
  collect: ["quiet"],
  boolean: ["help", "version", "shellcode"],
  default: {
    "dry-run": false,
  },
});

if (parsedArgs.help) {
  const status = await new Deno.Command("pkgx", {
    args: ["--quiet", "gh", "repo", "view", "pkgxdev/dev"],
  }).spawn().status;
  Deno.exit(status.code);
} else if (parsedArgs.shellcode) {
  console.log(shellcode());
} else if (parsedArgs.version) {
  console.log(`dev ${app_version}`);
} else {
  const subcommand = parsedArgs._[0];
  const dryrun = parsedArgs["dry-run"] as boolean;
  const quiet = parsedArgs["quiet"] != undefined;
  switch (subcommand) {
    case "integrate":
      await integrate("install", { dryrun });
      break;
    case "deintegrate":
      await integrate("uninstall", { dryrun });
      break;
    case "status":
      {
        const cwd = Path.cwd();
        if (
          datadir().join(cwd.string.slice(1), "dev.pkgx.activated").isFile()
        ) {
          //FIXME probably slower than necessary
          const { pkgs } = await sniff(cwd);
          Deno.exit(pkgs.length == 0 ? 1 : 0);
        } else {
          Deno.exit(1);
        }
      }
      break;
    default: {
      const cwd = Path.cwd().join(subcommand as string);
      await dump(cwd, { dryrun, quiet });
    }
  }
}
