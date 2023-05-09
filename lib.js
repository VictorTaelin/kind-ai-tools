import fs from 'fs/promises';
import path from 'path';
import { ChatGPTAPI } from 'chatgpt'
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const __kindex = '/Users/v/vic/dev/kindex/';

export async function load_local(relativePath) {
  try {
    const filePath = path.join(__dirname, relativePath);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent;
  } catch (error) {
    console.error(`Error reading ${relativePath}:`, error);
    throw error;
  }
}
const execAsync = promisify(exec);

export async function show(inputPath) {
  const basePath = __kindex;
  const safeInputPath = path.normalize(inputPath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(basePath, safeInputPath);

  try {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      const files = await fs.readdir(fullPath);
      return files.join('\n');
    } else if (stat.isFile() && path.extname(fullPath) === '.kind2') {
      const fileContents = await fs.readFile(fullPath, 'utf-8');
      return fileContents;
    } else {
      return 'Not a directory or a .kind2 file';
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      return 'File or directory not found';
    } else {
      throw err;
    }
  }
}

export async function write(inputPath, content) {
  const basePath = __kindex;
  const safeInputPath = path.normalize(inputPath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(basePath, safeInputPath);
  if (!fullPath.startsWith(basePath)) {
    return 'Cannot write outside of the Wikind directory';
  }
  if (safeInputPath.includes('/') || safeInputPath.includes('\\')) {
    return 'Cannot write to subdirectories';
  }
  try {
    if (path.extname(fullPath) !== '.kind2') {
      return 'Only .kind2 files are allowed';
    }
    await fs.writeFile(fullPath, content, 'utf-8');
    return 'File written';
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(fullPath, content, 'utf-8');
      return 'File created';
    } else {
      throw err;
    }
  }
}

export async function get_deps(inputPath, opts = {}) {
  const basePath = __kindex;
  const safeInputPath = path.normalize(inputPath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(basePath, safeInputPath);

  try {
    var { stdout, stderr } = await execAsync(`kind2 --get-deps check "${fullPath}"`, { cwd: basePath });
    var deps = stdout;
  } catch (err) {
    var deps = err.stdout;
  }
  return deps.split("\n").filter(x => x !== "");
}

export async function check(inputPath, opts = {}) {
  const basePath = __kindex;
  const safeInputPath = path.normalize(inputPath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(basePath, safeInputPath);

  try {
    var { stdout, stderr } = await execAsync(`kind2 --hide-deps ${opts.compact ? "--hide-vals --compact" : ""} check "${fullPath}"`, { cwd: basePath });
    return stderr || stdout;
  } catch (err) {
    return err.stderr || err.message;
  }
}

const SYSTEM = "You're an intelligent agent.";

export async function GPT(message, opts={}) {
  const api = new ChatGPTAPI({
    apiKey: await get_token(),
    debug: opts.debug,
    completionParams: {
      model: opts.model || "gpt-4",
      stream: true,
      temperature: opts.temperature || 0,
      max_tokens: opts.tokens || 512,
    },
  });

  const res = await api.sendMessage(message, {
    systemMessage: opts.system || SYSTEM,
    onProgress: (partialResponse) => {
      if (opts.debug) {
        console.clear();
        console.log(partialResponse.text);
      }
    }
  });

  if (opts.debug) {
    console.clear();
    console.log(res.text)
  }

  return res.text;
}

export async function shorten_error(message, opts={}) {
  const base_prompt = await fs.readFile(__dirname + "/prompts/shorten_error.txt", 'utf-8');
  const full_prompt = base_prompt.replace("{{message}}", message);
  return await GPT(full_prompt, opts);
}

export async function prove_it(file) {
  function extract(tag, str) {
    if (str.indexOf("<"+tag+">") !== -1) {
      return str.slice(str.indexOf("<"+tag+">")+2+tag.length, str.indexOf("</"+tag+">")).trim();
    } else {
      return "...";
    }
  }

  if (!file) {
    var file = "Main.kind2";
    var text = [
      "Main (x : Nat) : Equal Nat (Nat.half (Nat.double x)) x",
      "Main x = ?a"
    ].join("\n");
  } else {
    var text = await fs.readFile(file, "utf8");
  };

  var next = await fs.readFile(__dirname + "/prompts/prove_it.txt", 'utf-8')+"\n";

  var gpt = `<action>
!write ${file}
${text}
</action>`;

  do {
    console.clear();

    console.log("\x1b[1m# GPT:\x1b[0m");
    console.log(extract("action", gpt));
    console.log("");
    console.log(extract("reason", gpt));
    console.log("");

    var cmd  = extract("action", gpt);
    var args = cmd.split("\n")[0].split(" ");
    var body = cmd.split("\n").slice(1).join("\n");

    console.log("\x1b[1m# Kind:\x1b[0m");
    var kind = "<kind>\n";
    switch (args[0]) {
      case "!read": {
        var file = await show(args[1]);
        var kind = kind + file;
        break;
      }
      case "!write": {
        if (body.trim().length === 0) {
          console.log("... got empty body");
          return;
        }
        write(args[1], body);
        var chk = await check(args[1]);
        if (args[1] === "Main.kind2" && chk === "checked") {
          console.log("Done! Saved prompt.txt with the complete interaction.");
          await fs.writeFile("prompt.txt", next + gpt);
          return;
        }
        var kind = kind + chk;
        break;
      }
      default: {
        console.log("Unknown command. GPT's output:");
        console.log("------------------------");
        console.log(gpt);
        console.log("------------------------");
        console.log("Saved prompt.txt with the complete interaction.");
        await fs.writeFile("prompt.txt", next + gpt);
        return;
      }
    }
    var kind = kind + "\n</kind>\n";
    console.log(extract("kind", kind));
    console.log("");

    // Generates the next base prompt
    var next = next + gpt + "\n\n" + kind + "\n";

    // Prover's next step
    var msge = next + `
Advance the proof above by writing the next step below, inside <action> tags.
Choose the best possible action to progress the theorem towards a proof.
Then, write a brief snapshot of your thought process, inside <reason> tags.
Example:

<action>
next action here
</action>

<reason>
your reasoning here
</reason>
\n\n`;
    var gpt = await GPT(msge, {tokens: 512});

  } while (true);
}

// Given a list of Kind definition names, returns their codes
export async function load_kind_defs(definitionNames) {
  const sourceCodes = [];

  for (const name of definitionNames) {
    const path1 = __kindex + name.replace(/\./g, '/') + '.kind2';
    const path2 = __kindex + name.replace(/\./g, '/') + '/_.kind2';
    try {
      sourceCodes.push(await fs.readFile(path1, 'utf-8'));
    } catch (err1) {
      try {
        sourceCodes.push(await fs.readFile(path2, 'utf-8'));
      } catch (err2) {}
    }
  }

  return sourceCodes;
}

export async function get_token() {
  const tokenPath = path.join(os.homedir(), '.config', 'openai.token');
  try {
    const token = (await fs.readFile(tokenPath, 'utf8')).trim();
    return token;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('Error: openai.token file not found in ~/.config/');
      console.error('Please make sure the file exists and contains your OpenAI API token.');
    } else {
      console.error('Error reading openai.token file:', err.message);
    }
    process.exit(1);
  }
}
