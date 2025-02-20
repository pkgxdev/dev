# `dev`

`dev` uses `pkgx` and shellcode to automatically, install and activate the
packages you need for different projects as you navigate in your shell.

Ensure you are using the same versions of tools for your entire stack, during
dev, across your team and in production.

> [!NOTE]
> Packages are installed to `~/.pkgx` and not available to your wider system
> without using a tool from the `pkgx` tooling ecosystem.

## Getting Started

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
> `dev integrate` looks for and edits known `shell.rc` files adding one
> line:
>
> ```sh
> eval "$(dev --shellcode)"
> ```
>
> If you don’t trust us (good on you), then do a dry run first:
>
> ```sh
> pkgx dev integrate --dry-run
> ```
>
> If you like, preview the shellcode: `pkgx dev --shellcode`. This command
> only outputs shellcode, it doesn’t modify any files or do anything else
> either.

## Usage

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
> ### Try Before You `vi`
>
> Modifying your `shell.rc` can be… _intimidating_. If you just want to
> temporarily try `dev` out before you `:wq`—we got you:
>
> ```sh
> $ cd my-project
> $ eval "$(pkgx dev)"
> ```
>
> The devenv will only exist for the duration of your shell session.

## How Packages are Determined

- We look at the files you have and figure out the packages you need.
- Where possible we also determine the versions you need if such things can be
  determined by looking at configuration files.

## Specifying Versions

We allow you to add YAML front matter to all files to specify versions more
precisely:

```toml
# pkgx:
#   dependencies:
#     openssl.org: 1.1.1n

[package]
name = "my cargo project"
# snip…
```

We allow more terse expressions including eg:

```toml
# pkgx: openssl.org@1.1.1n deno^2 npm
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
> The environment variable's value is sanitized, so expressions like
> `MY_VAR: $(sudo rm -rf --no-preserve-root /)` will throw an error.

## `dev` & Editors

Most editors if opened via the Terminal will inherit that Terminal’s
environment. We recommend Visual Studio Code, `dev && code .` works great.

> [!WARNING]
>
> Unfortunately, this usually means you _must_ open your editor via your
> terminal.

## GitHub Actions

```yaml
- uses: pkgxdev/dev@v1
```

Installs needed packages and sets up the environment the same as `dev` does in
your terminal.

## Contributing

We use `deno`, so either install that or—you know—type `dev`.

Edit [./src/sniff.ts](src/sniff.ts) to add new dev types.
