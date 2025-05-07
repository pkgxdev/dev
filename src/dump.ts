import { Path, utils } from "libpkgx";
import sniff from "./sniff.ts";
import shell_escape from "./shell-escape.ts";

export default async function (
  cwd: Path,
  opts: { dryrun: boolean; quiet: boolean },
) {
  const snuff = await sniff(cwd);

  if (snuff.pkgs.length === 0 && Object.keys(snuff.env).length === 0) {
    console.error("no devenv detected");
    Deno.exit(1);
  }

  let env = "";
  const pkgspecs = snuff.pkgs.map((pkg) => `+${utils.pkg.str(pkg)}`);

  if (opts.dryrun) {
    console.log(pkgspecs.join(" "));
    return;
  }

  if (snuff.pkgs.length > 0) {
    const cmd = new Deno.Command("pkgx", {
      args: ["--quiet", ...pkgspecs],
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

  const bye_bye_msg = pkgspecs.map((pkgspec) => `-${pkgspec.slice(1)}`).join(
    " ",
  );

  if (!opts.quiet) {
    console.error("%c%s", "color: green", pkgspecs.join(" "));
  }

  console.log(`
  eval "_pkgx_dev_try_bye() {
    suffix=\\"\\\${PWD#\\"${cwd}\\"}\\"
    [ \\"\\$PWD\\" = \\"${cwd}\\$suffix\\" ] && return 1
    echo -e \\"\\033[31m${bye_bye_msg}\\033[0m\\" >&2
    ${undo.trim()}
    unset -f _pkgx_dev_try_bye
  }"

  set -a
  ${env}
  set +a`);
}
