# `dev`

`dev` uses `pkgx` and shellcode to automatically, install and activate the
packages you need for different projects as you navigate in your shell.

Ensure you are using the same versions of tools for your entire stack, during
dev, across your team and in production.

> [!NOTE]
> Packages are installed to `~/.pkgx` and not available to your wider system
> without using a tool from the `pkgx` tooling ecosystem.

## Getting Started

Since `dev` v1.8.0 we integrate with `pkgm` (^0.11) and this is the recommended
way to use `dev`.

> [!IMPORTANT]
>
> Both `dev` and the packages you want to be `dev`-aware must be installed to
> `/usr/local/` for this to work. (`dev` (but only `dev`) can be a `pkgm shim`).
>
> ```sh
> sudo pkgm install dev node@22
> ```

```sh
$ cd my-project
$ ls
package.json

$ node --version
command not found: node

$ sudo pkgm install dev node
$ node --version && which node
v23.11.0
/usr/local/bin/node

$ cat package.json | jq .engines
{
  "node": "^20"
}

$ dev .
activated `~/my-project` (+node^20)

$ node --version && which node
v20.19.0
/usr/local/bin/node

$ cd ..
$ node --version && which node
v23.11.0
/usr/local/bin/node

$ cd -
$ node --version && which node
v20.19.0
/usr/local/bin/node
```

`pkgm` installs `dev`-aware packages to `/usr/local/bin`. Provided you have
`/usr/local/bin/dev` installed and you have activated `dev` in your project
directories the `node` that is invoked is swapped out _when invoked_.

This is the recommended way to use `dev` because it works everywhere and not
just the terminal.

## `dev` via Shellcode

Using `dev` via shellcode requires hooks to be installed in your shell. It is
handy in that no tool needs to be installed. It is problematic in that shell
hooks are more invasive and don’t work in other tools like editors.

---

<details>
<summary>Using <code>dev</code> via shellcode…</summary>

A great advantage of the shellcode is not needing to install tools you may never
need again when exploring new open source projects.

```sh
pkgx dev integrate
```

`dev` requires `pkgx` but at your preference:

```sh
brew install pkgxdev/made/dev
dev integrate
```

We support macOS & Linux, **Bash** & **Zsh**. PRs are very welcome to support
more shells.

> [!NOTE]
>
> `dev integrate` looks for and edits known `shell.rc` files adding one line:
>
> ```sh
> eval "$(pkgx --quiet dev --shellcode)"
> ```
>
> If you don’t trust us (good on you), then do a dry run first:
>
> ```sh
> pkgx dev integrate --dry-run
> ```
>
> If you like, preview the shellcode: `pkgx dev --shellcode`. This command only
> outputs shellcode, it doesn’t modify any files or do anything else either.

### Usage

```sh
$ cd my-project

my-project $ ls
package.json

my-project $ dev
+nodejs.org
# ^^ installs node to ~/.pkgx/nodejs.org/v22.12.0 if not already installed

my-project $ node --version
v22.12.0

$ which node
~/.pkgx/nodejs.org/v22.12.0/bin/node

$ cd ..
-nodejs.org

$ node
command not found: node
```

> [!TIP]
>
> #### Try Before You `vi`
>
> Modifying your `shell.rc` can be… _intimidating_. If you just want to
> temporarily try `dev` out before you `:wq`—we got you:
>
> ```sh
> $ cd my-project
> $ eval "$(pkgx dev)"
> +deno^2
> $ deno --version
> deno 2.1.1
> ```
>
> The devenv will only exist for the duration of your shell session.

</details>

---

## How Packages are Determined

- We look at the files you have and figure out the packages you need.
- Where possible we also determine the versions you need if such things can be
  determined by looking at configuration files.

## Specifying Versions

We allow you to add YAML front matter to all files to specify versions more
precisely:

```toml
# ---
# pkgx:
#   dependencies:
#     openssl.org: 1.1.1n
# ---

[package]
name = "my cargo project"
# snip…
```

We allow more terse expressions including eg:

```toml
# ---
# pkgx:
#   dependencies: openssl.org@1.1.1n deno^2 npm
# ---
```

The major exception being json since it doesn’t support comments, in this case
we read a special `pkgx` node:

```json
{
  "pkgx": {
    "dependencies": {
      "openssl.org": "1.1.1n",
      "deno": "^2",
      "npm": null
    }
  }
}
```

You can also make a `pkgx.yaml` file.

## Adding Custom Environment Variables

You can add your own environment variables if you like:

```toml
# ---
# pkgx:
#   dependencies:
#     openssl.org: 1.1.1n
#   env:
#     MY_VAR: my-value
# ---
```

> [!NOTE]
>
> - Adding environment variables only works via the `shellcode` route.
> - The environment variable's value is sanitized, so expressions like
>   `MY_VAR: $(sudo rm -rf --no-preserve-root /)` will throw an error.
> - We recommend `direnv` instead of this route.

## `dev` & Editors

The sure fire way for things to work in editors is to use the `dev`/`pkgm`
combo. Having said this most editors if opened via the Terminal will inherit
that Terminal’s environment.

## GitHub Actions

```yaml
- uses: pkgxdev/dev@v1
```

Our action installs needed packages (via `pkgx`) and sets up the environment the
same as `dev` does in your terminal.

## Contributing

We use `deno`, so either install that or—you know—type `dev`.

Edit [./src/sniff.ts](src/sniff.ts) to add new dev types.
