import { Path } from "libpkgx";

export default function shellcode() {
  // find self
  const dev_cmd = Deno.env.get("PATH")?.split(":").map((path) =>
    Path.abs(path)?.join("dev")
  )
    .filter((x) => x?.isExecutableFile())[0];

  if (!dev_cmd) throw new Error("couldn’t find `dev`");

  return `
_pkgx_chpwd_hook() {
  if ! type _pkgx_dev_try_bye >/dev/null 2>&1 || _pkgx_dev_try_bye; then
    dir="$PWD"
    while [ "$dir" != / -a "$dir" != . ]; do
      if [ -f "${datadir()}/$dir/dev.pkgx.activated" ]; then
        eval "$(${dev_cmd})" "$dir"
        break
      fi
      dir="$(dirname "$dir")"
    done
  fi
}

dev() {
  case "$1" in
  off)
    if type -f _pkgx_dev_try_bye >/dev/null 2>&1; then
      dir="$PWD"
      while [ "$dir" != / -a "$dir" != . ]; do
        if [ -f "${datadir()}/$dir/dev.pkgx.activated" ]; then
          rm "${datadir()}/$dir/dev.pkgx.activated"
          break
        fi
        dir="$(dirname "$dir")"
      done
      PWD=/ _pkgx_dev_try_bye
    else
      echo "no devenv" >&2
    fi;;
  ''|on)
    if [ "$2" ]; then
      "${dev_cmd}" "$@"
    elif ! type -f _pkgx_dev_try_bye >/dev/null 2>&1; then
      mkdir -p "${datadir()}$PWD"
      touch "${datadir()}$PWD/dev.pkgx.activated"
      eval "$(${dev_cmd})"
    else
      echo "devenv already active" >&2
    fi;;
  *)
    "${dev_cmd}" "$@";;
  esac
}

if [ -n "$ZSH_VERSION" ] && [ $(emulate) = zsh ]; then
  eval 'typeset -ag chpwd_functions

        if [[ -z "\${chpwd_functions[(r)_pkgx_chpwd_hook]+1}" ]]; then
          chpwd_functions=( _pkgx_chpwd_hook \${chpwd_functions[@]} )
        fi

        if [ "$TERM_PROGRAM" != Apple_Terminal ]; then
          _pkgx_chpwd_hook
        fi'
elif [ -n "$BASH_VERSION" ] && [ "$POSIXLY_CORRECT" != y ] ; then
  eval 'cd() {
          builtin cd "$@" || return
          _pkgx_chpwd_hook
        }
        _pkgx_chpwd_hook'
else
  POSIXLY_CORRECT=y
  echo "pkgx: dev: warning: unsupported shell" >&2
fi
`.trim();
}

export function datadir() {
  return new Path(
    Deno.env.get("XDG_DATA_HOME")?.trim() || platform_data_home_default(),
  ).join("pkgx", "dev");
}

function platform_data_home_default() {
  const home = Path.home();
  switch (Deno.build.os) {
    case "darwin":
      return home.join("Library/Application Support");
    case "windows": {
      const LOCALAPPDATA = Deno.env.get("LOCALAPPDATA");
      if (LOCALAPPDATA) {
        return new Path(LOCALAPPDATA);
      } else {
        return home.join("AppData/Local");
      }
    }
    default:
      return home.join(".local/share");
  }
}
