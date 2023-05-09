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
var error = (await lib.check(file,{compact:true})).trim();

var fast = false;

console.log("Fixing " + file + " with " + model + ".");

try {
  var notes = (await fs.readFile("fixit", "utf-8")).trim()+"\n";
  if (notes.length > 0) {
    console.log("Notes:\n" + notes);
  }
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

Below is the incorrect Kind program that you must fix, with the problematic
locations wrapped around '{{bad_code_here}}':

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

Your goal is to fix that code, and remove all double spaces. Write the fixed
version below, inside 'correct_code' tags. For ex

<correct_code>
example Z Z = a
example (S x) (S y) = b
... rest of the code with errors fixed and double spaces removed ...
</correct_code>

Do it now. Fixed code:`;

var fixit = fixit
  .replace("{{kind_examples}}",kind)
  .replace("{{notes}}",notes)
  .replace("{{code}}",code)
  .replace("{{error}}",error);

//console.log("---------------------");
//console.log(fixit);
//process.exit();

var answer = await lib.GPT(fixit, {model, debug: true});

console.log("-------- GPT --------");
console.log(answer);
console.log("---------------------");

var fixed = lib.extract("correct_code", answer).trim();
console.log("");
console.log("Fixed.");
await fs.writeFile(file, fixed);

//var explanation = lib.extract("explanation", answer).trim();
//console.log("- Explanation:\n\n");
//console.log(explanation);

