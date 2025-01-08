# `dev`

`dev` uses `pkgx` and shellcode to automatically, install and activate the
packages you need for different projects as you navigate in your shell.

## Installation

```sh
echo 'eval "$(pkgx dev --shellcode)"' >> ~/.zshrc
```

We support bashlike shells (adapt the rc file above). Fish support is welcome,
but I don’t understand Fish so please PR!

> [!NOTE]
>
> `pkgx` is a required dependency.
>
> ```sh
> brew install pkgxdev/made/pkgx || sh <(curl https://pkgx.sh)
> ```

> [!TIP]
> If you like, preview the shellcode: `pkgx dev --shellcode`.

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

## Usage

```sh
$ cd my-project

my-project $ ls
package.json

my-project $ dev
+nodejs.org

my-project $ node --version
v22.12.0

$ which node
~/.pkgx/nodejs.org/v22.12.0/bin/node

$ cd ..
-nodejs.org

$ node
command not found: node
```

## How Packages are Determined

- We look at the files you have and figure out the packages you need.
- Where possible we also determine the versions you need if such things can be
  determined by looking at configuration files.

## Specifying Versions

We allow you to add YAML front matter to all files to specify versions more
precisely:

```toml
# pkgx:
#   openssl.org: 1.1.1n

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
    "openssl.org": "1.1.1n",
    "deno": "^2",
    "npm": null
  }
}
```

You can also make a `pkgx.yaml` file.

## Adding Custom Environment Variables

You can add your own environment variables if you like:

```toml
# pkgx:
#   openssl.org: 1.1.1n
# env:
#   MY_VAR: my-value
```

## Contributing

Edit [./src/sniff.ts](src/sniff.ts) to add new dev types.
