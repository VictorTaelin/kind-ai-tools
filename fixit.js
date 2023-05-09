#!/usr/bin/env node
import process from "process";
import { ChatGPTAPI } from 'chatgpt'
import fs from 'fs/promises';
import * as lib from './lib.js';

var kind  = await lib.load_local("./kind_examples.txt");
var file  = process.argv[2];
var model = process.argv[3] === "4" ? "gpt-4" : "gpt-3.5-turbo";
var code  = (await fs.readFile(file, 'utf-8')).trim();
var deps  = (await lib.get_deps(file));
var error = (await lib.check(file,{compact:false})).trim();

var fast = false;

console.log("Fixing " + file + " with " + model + ".");

try {
  var notes = (await fs.readFile("fixit", "utf-8")).trim()+"\n";
  console.log("- Notes: " + notes);
} catch (e) {
  var notes = "";
}

// Gets relevant devs
var defs = (await lib.load_kind_defs(deps)).map(x => x.trim()).join("\n");

var fixit = `Kind is a programming language similar to Agda.

Examples:

<kind_examples>
{{kind_examples}}
</kind_examples>

Notes:

<notes>
global definitions start with an uppercase letter, like 'Equal.apply' and 'Nat.add'
global definitions aren't curried, so they need lambdas: 'List.map (x => Nat.succ x)'
local definitions start with a lowercase letter, and are curried: 'List.map nat_succ'
holes are written as '?hole_name'
{{notes}}</notes>

Below is the incorrect Kind program that you must fix:

<wrong_code>
{{code}}
</wrong_code>

Below is the error message:

<error>
{{error}}
</error>

Below are relevant dependencies:

<deps>
${defs}
</deps>

Your task is to fix that code. Write the fixed version below. Fixed code:

<correct_code>`;

var fixit = fixit
  .replace("{{kind_examples}}",kind)
  .replace("{{notes}}",notes)
  .replace("{{code}}",code)
  .replace("{{error}}",error);

var fixed = await lib.GPT(fixit, {model});
var fixed = fixed.replace("</correct_code>", "").trim();
console.log("- Fixed:\n\n");
console.log(fixed);

await fs.writeFile(file, fixed);
