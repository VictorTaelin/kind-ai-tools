#!/usr/bin/env node
import process from "process";
import { ChatGPTAPI } from 'chatgpt'
import fs from 'fs/promises';
import * as lib from './lib.js';

var file = process.argv[2];
var fill = process.argv[3];
var model = "gpt-4-0314";
var temperature = 0;

var file_code = await fs.readFile(file, 'utf-8');
var fill_code = fill ? await fs.readFile(fill, 'utf-8') : file_code;

var system = `You are a hole-filling agent. You are provided with a file containing holes, denoted as '?name'. Your task is to respond with the correct string to replace these holes with. Pay attention to avoid off-by-one indentation errors. Omit valid JSON to be consumed by JSON.parse.

Example query:

// prints the square of all even numbers from 0 to 10
function ?a(x) {
  for (var i = 0; i < ?b; ++i) {
    ?c
  }
}

Example response:

{
  "a": "printEvenSquares",
  "b": "11",
  "c": "if (i % 2 === 0) {\\n      console.log(x * x);\\n    }"
}

Notice how, on "c", the console.log line has 6 spaces, based on context.
`;

var subst = JSON.parse(await lib.GPT(fill_code, {model, temperature, system, debug: true }));
for (var key in subst) {
  file_code = file_code.replace("?"+key, subst[key]);
}

await fs.writeFile(file, file_code, 'utf-8');
console.log('File is updated successfully.');
