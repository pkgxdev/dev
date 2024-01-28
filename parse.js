const fs = require('fs');
const readline = require('readline');

const readInterface = readline.createInterface({
    input: fs.createReadStream('file'),
    output: process.stdout,
    terminal: false
});

const stripQuotes = (str) => str.startsWith('"') || str.startsWith("'") ? str.slice(1, -1) : str;

const replaceEnvVars = (str) => {
  return str
    .replace(/\$.+?\b/g, (_, key) => process.env[key] ?? '')
    .replace(/\$\{.+?\}/g, (_, key) => process.env[key] ?? '')
    .replace(/\$\{.+?:\+:.+?\}/g, (_, key) => (v => v ? `:${v}` : '')(process.env[key]))
};

readInterface.on('line', (line) => {
    const match = line.match(/^export ([^=]+)=(.*)$/);
    if (match) {
        const [_, key, value_] = match;
        const value = stripQuotes(value_);
        if (key === 'PATH') {
            value.split(':').forEach((path) => {
                if (!path.startsWith("$")) {
                  fs.appendFileSync(process.env['GITHUB_PATH'], `${path}\n`);
                }
            });
        } else {
            let v = replaceEnvVars(value);
            fs.appendFileSync(process.env['GITHUB_ENV'], `${key}=${v}\n`);
        }
    }
});
