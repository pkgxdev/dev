const fs = require("fs");
const readline = require("readline");

const readInterface = readline.createInterface({
  input: fs.createReadStream(process.argv[2]),
  output: process.stdout,
  terminal: false,
});

const stripQuotes = (str) =>
  str.startsWith('"') || str.startsWith("'") ? str.slice(1, -1) : str;

const replaceEnvVars = (str) => {
  const value = str
    .replaceAll(
      /\$\{([a-zA-Z0-9_]+):\+:\$[a-zA-Z0-9_]+\}/g,
      (_, key) => ((v) => v ? `:${v}` : "")(process.env[key]),
    )
    .replaceAll(/\$\{([a-zA-Z0-9_]+)\}/g, (_, key) => process.env[key] ?? "")
    .replaceAll(/\$([a-zA-Z0-9_]+)/g, (_, key) => process.env[key] ?? "");
  return value;
};

let found = false;

readInterface.on("line", (line) => {
  if (!found) found = line.trim() == "set -a";
  if (!found) return;
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const [_, key, value_] = match;
    const value = stripQuotes(value_);
    if (key.trim() === "PATH") {
      value
        .replaceAll("${PATH:+:$PATH}", "")
        .replaceAll("$PATH", "")
        .replaceAll("${PATH}", "")
        .split(":").forEach((path) => {
          fs.appendFileSync(process.env["GITHUB_PATH"], `${path}\n`);
        });
    } else {
      let v = replaceEnvVars(value);
      fs.appendFileSync(process.env["GITHUB_ENV"], `${key}=${v}\n`);
    }
  }
});
