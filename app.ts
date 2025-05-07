#!/usr/bin/env -S pkgx --quiet deno^2 run -A

//TODO if you step into dev-dir/subdir and type `dev` does it find the root properly?
//TODO dev off uses PWD which may not be correct if in subdir (obv)

import { Path, utils } from "libpkgx";
import shellcode, { datadir } from "./src/shellcode().ts";
import app_version from "./src/app-version.ts";
import integrate from "./src/integrate.ts";
import { parseArgs } from "jsr:@std/cli@^1/parse-args";
import dump from "./src/dump.ts";
import sniff from "./src/sniff.ts";
import { walk } from "jsr:@std/fs@1/walk";

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
  boolean: ["help", "version", "shellcode", "quiet"],
  default: {
    "dry-run": false,
  },
});

if (parsedArgs.help) {
  const { code } = await new Deno.Command("pkgx", {
    args: [
      "glow",
      "https://raw.githubusercontent.com/pkgxdev/dev/refs/heads/main/README.md",
    ],
  }).spawn().status;
  Deno.exit(code);
} else if (parsedArgs.shellcode) {
  console.log(shellcode());
} else if (parsedArgs.version) {
  console.log(`dev ${app_version}`);
} else {
  const subcommand = parsedArgs._[0];
  const dryrun = parsedArgs["dry-run"] as boolean;
  const quiet = Array.isArray(parsedArgs["quiet"])
    ? !!parsedArgs["quiet"].length
    : parsedArgs["quiet"];

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
          //FIXME probably slower than ideal
          const { pkgs } = await sniff(cwd);
          Deno.exit(pkgs.length == 0 ? 1 : 0);
        } else {
          Deno.exit(1);
        }
      }
      break;

    case "ls":
      for await (
        const entry of walk(datadir().string, { includeDirs: false })
      ) {
        if (entry.name === "dev.pkgx.activated") {
          const partial_path = new Path(entry.path).parent().relative({
            to: datadir(),
          });
          console.log(`/${partial_path}`);
        }
      }
      break;

    case undefined:
      if (Deno.stdout.isTerminal()) {
        const cwd = Path.cwd();
        const { pkgs } = await sniff(cwd);
        if (
          datadir().join(cwd.string.slice(1), "dev.pkgx.activated").isFile()
        ) {
          console.log(
            "%cactive",
            "color: green",
            pkgs.map(utils.pkg.str).join(" "),
          );
        } else if (pkgs.length > 0) {
          console.log(
            "%cinactive",
            "color: red",
            pkgs.map(utils.pkg.str).join(" "),
          );
        } else {
          console.log("%cno keyfiles found", "color: red");
        }
      } else {
        const cwd = Path.cwd();
        await dump(cwd, { dryrun, quiet });
      }
      break;

    case "off": {
      let dir = Path.cwd();
      while (dir.string != "/") {
        const f = datadir().join(dir.string.slice(1), "dev.pkgx.activated")
          .isFile();
        if (f) {
          f.rm();
          console.log("%cdeactivated", "color: green", dir.string);
          Deno.exit(0);
        }
        dir = dir.parent();
      }
      console.error("%cno devenv found", "color: red");
      Deno.exit(1);
      break;
    }

    default: {
      if (Deno.stdout.isTerminal()) {
        const cwd = Path.cwd().join(subcommand as string);
        const { pkgs } = await sniff(cwd);
        if (pkgs.length > 0) {
          datadir().join(cwd.string.slice(1)).mkdir("p").join(
            "dev.pkgx.activated",
          ).touch();
          console.log(
            "%cactived",
            "color: green",
            pkgs.map(utils.pkg.str).join(" "),
          );
        } else {
          console.error("%cno keyfiles found", "color: red");
          Deno.exit(1);
        }
      } else {
        const cwd = Path.cwd().join(subcommand as string);
        await dump(cwd, { dryrun, quiet });
      }
    }
  }
}
