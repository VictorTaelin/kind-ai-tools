#!/usr/bin/env node
import process from "process";
import { ChatGPTAPI } from 'chatgpt'
import fs from 'fs/promises';
import * as lib from './lib.js';

var file  = process.argv[2];
var model = process.argv[3] === "4" ? "gpt-4" : "gpt-3.5-turbo";
var quest = (await fs.readFile(file, 'utf-8')).trim();

var answer = await lib.GPT(quest, {model, debug: true});

//console.log(answer);

await fs.writeFile(file, quest + "\n" + answer);
