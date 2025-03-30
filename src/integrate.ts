import readLines from "libpkgx/utils/read-lines.ts";
import { readAll, writeAll } from "jsr:@std/io";
import { Path, utils } from "libpkgx";
import { existsSync } from "node:fs";
const { flatmap } = utils;

export default async function (
  op: "install" | "uninstall",
  { dryrun }: { dryrun: boolean },
) {
  let opd_at_least_once = false;
  const encode = ((e) => e.encode.bind(e))(new TextEncoder());

  const fopts = { read: true, ...dryrun ? {} : { write: true, create: true } };

  here: for (const [file, line] of shells()) {
    const fd = await Deno.open(file.string, fopts);
    try {
      let pos = 0;
      for await (const readline of readLines(fd)) {
        if (readline.trim().endsWith("# https://github.com/pkgxdev/dev")) {
          if (op == "install") {
            console.error("hook already integrated:", file);
            continue here;
          } else if (op == "uninstall") {
            // we have to seek because readLines is buffered and thus the seek pos is probs already at the file end
            await fd.seek(pos + readline.length + 1, Deno.SeekMode.Start);
            const rest = await readAll(fd);

            if (!dryrun) await fd.truncate(pos); // deno has no way I can find to truncate from the current seek position
            await fd.seek(pos, Deno.SeekMode.Start);
            if (!dryrun) await writeAll(fd, rest);

            opd_at_least_once = true;
            console.error("removed hook:", file);

            continue here;
          }
        }

        pos += readline.length + 1; // the +1 is because readLines() truncates it
      }

      if (op == "install") {
        const byte = new Uint8Array(1);
        if (pos) {
          await fd.seek(0, Deno.SeekMode.End); // potentially the above didn't reach the end
          while (true && pos > 0) {
            await fd.seek(-1, Deno.SeekMode.Current);
            await fd.read(byte);
            if (byte[0] != 10) break;
            await fd.seek(-1, Deno.SeekMode.Current);
            pos -= 1;
          }

          if (!dryrun) {
            await writeAll(
              fd,
              encode(`\n\n${line}  # https://github.com/pkgxdev/dev\n`),
            );
          }
        }
        opd_at_least_once = true;
        console.error(`${file} << \`${line}\``);
      }
    } finally {
      fd.close();
    }
  }
  if (dryrun && opd_at_least_once) {
    console.error(
      "%cthis was a dry-run. %cnothing was changed.",
      "color: #5f5fff",
      "color: initial",
    );
  } else {switch (op) {
      case "uninstall":
        if (!opd_at_least_once) {
          console.error("nothing to deintegrate found");
        }
        break;
      case "install":
        if (opd_at_least_once) {
          console.log(
            "now %crestart your terminal%c for `dev` hooks to take effect",
            "color: #5f5fff",
            "color: initial",
          );
        }
    }}
}

function shells(): [Path, string][] {
  const eval_ln =
    existsSync("/opt/homebrew/bin/dev") || existsSync("/usr/local/bin/dev")
      ? 'eval "$(dev --shellcode)"'
      : 'eval "$(pkgx --quiet dev --shellcode)"';

  const zdotdir = flatmap(Deno.env.get("ZDOTDIR"), Path.abs) ?? Path.home();
  const zshpair: [Path, string] = [zdotdir.join(".zshrc"), eval_ln];

  const candidates: [Path, string][] = [
    zshpair,
    [Path.home().join(".bashrc"), eval_ln],
    [Path.home().join(".bash_profile"), eval_ln],
  ];

  const viable_candidates = candidates.filter(([file]) => file.exists());

  if (viable_candidates.length == 0) {
    if (Deno.build.os == "darwin") {
      /// macOS has no .zshrc by default and we want mac users to get a just works experience
      return [zshpair];
    } else {
      console.error("no `.shellrc` files found");
      Deno.exit(1);
    }
  }

  return viable_candidates;
}
