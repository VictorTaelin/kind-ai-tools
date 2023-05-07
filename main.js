#!/usr/bin/env node
import process from "process";
import { ChatGPTAPI } from 'chatgpt'
import fs from 'fs/promises';

//function main() {
  //const file = process.argv[2];

  //if (!file) {
    //console.log('Please provide an input file.');
    //process.exit(1);
  //}

  //lib.prove_it(file);
//}

//main();


export async function GPT(message, opts={}) {
  const api = new ChatGPTAPI({
    apiKey: JSON.parse(await fs.readFile(new URL('./TOKEN.json', import.meta.url))),
    debug: opts.debug,
    completionParams: {
      model: "gpt-3.5-turbo",
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



console.log(GPT("oi!"));
