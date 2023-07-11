#!/usr/bin/env node
import process from "process";
import { ChatGPTAPI } from 'chatgpt'
import fs from 'fs/promises';
import * as lib from './lib.js';

var system = `You are a code completer. You are provided with a file containing holes, denoted as '?name'. Your task is to fill a specific hole, including proper identation, based on context.

## Example query:

function print_even_squares_up_to(lim) {
  for (var i = 0; i < lim; ++i) {
    ?loop
  }
}

>> Fill the ?loop hole.

## Example response:

    if (i % 2 === 0) {
      console.log(x * x);
    }`;

var file = process.argv[2];
var fill = process.argv[3];

if (!file) {
  console.log("Usage: holefill <file> [<shortened_file>]");
  console.log("");
  console.log("This will replace all ?holes in <file>, using GPT-4.");
  console.log("A shortened file can be used to omit irrelevant parts.");
  process.exit();
}

var model = "gpt-4-0314";
var temperature = 0;
var file_code = await fs.readFile(file, 'utf-8');
var fill_code = fill ? await fs.readFile(fill, 'utf-8') : file_code;
var fill_tokens = lib.token_count(fill_code);
var tokens = (8192 - fill_tokens - lib.token_count(system) - 256);
var holes = fill_code.match(/\?\w+/g) || [];
console.log("holes_found:", holes);
console.log("token_count:", fill_tokens);

if (tokens <= 0) {
  console.log("Please shorten the file.");
  process.exit();
}

for (let hole of holes) {
  console.log("next_filled: " + hole + "...");
  var query = fill_code + "\n\n>> Fill the "+hole+" hole.";
  var subst = await lib.GPT(query, {model, temperature, system, tokens, debug: true });
  file_code = file_code.replace(new RegExp('(?:\\?)'+hole.slice(1)+'(?!\\w)', 'g'), subst.trim());
}

await fs.writeFile(file, file_code, 'utf-8');
