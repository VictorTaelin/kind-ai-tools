#!/usr/bin/env node
import process from "process";
import { ChatGPTAPI } from 'chatgpt'
import fs from 'fs/promises';
import * as lib from './lib.js';

var kind  = await lib.load_local("./prompts/kind_examples.txt");
var file  = process.argv[2];
var fast  = process.argv[3] === "--fast";
var code  = (await fs.readFile(file, 'utf-8')).trim();
var error = (await lib.check(file,{compact:true})).trim();

var fast = false;

console.log("Fixing " + file + " with " + (fast ? "GPT-3.5" : "GPT-4") + "...");

try {
  var note = (await fs.readFile("fixit", "utf-8"));
  console.log("- Note: " + note.trim());
} catch (e) {
  var note = "";
}

var fixit = (await lib.load_local("./prompts/fixit.txt"))
  .replace("{{kind_examples}}",kind)
  .replace("{{note}}",note)
  .replace("{{code}}",code)
  .replace("{{error}}",error);

// Asks needed definitions
// -----------------------

var prom = fixit + `
Your job is to fix this error. To do so, more information may be necessary.
Write below a JSON with the name of ALL the global definitions that could be
relevant to fix the error above. For example, if the error involves missing
cases, include the relevant type, in order to find its constructors. If it is a
type mismatch, write the name of the relevant functions. And so on.

JSON:`;

try {
  var load = await lib.GPT(prom, "gpt-3.5-turbo");
  for (var def of JSON.parse(load)) {
    console.log("- Reading " + def + "...");
  }
  var defs = await lib.load_kind_defs(JSON.parse(load));
  var defs = defs.map(x => x.trim()).join("\n");
  //console.log(defs);
} catch (e) {
  var defs = "";
}


// Asks the fixed code
// -------------------

var prom = fixit + `
Below are some definitions that could be relevant:

${defs}

Your task is to fix the code. Write the fixed version below. Fixed code:

// Main.kind`;

var fixed = await lib.GPT(prom, {model: fast ? "gpt-3.5-turbo" : "gpt-4"});
console.log("- Fixed.\n\n");
console.log(fixed);

await fs.writeFile(file, fixed);
