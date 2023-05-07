#!/usr/bin/env node

import fs from 'fs/promises';
import readline from 'readline';
import { ChatGPTAPI } from 'chatgpt';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const TOKEN = JSON.parse(await fs.readFile(new URL('./TOKEN.json', import.meta.url)));

const SYSTEM = `
You are ChatGPT, a large language model trained by OpenAI. You help the user
with tasks on their MacBook using zsh commands. If the user asks you a question,
you give a short answer and will NOT start it with '#'. If the user asks you to
perform a task, then you'll answer with a zsh script that accomplishes that
task, and will start it with a '#' comment. In that case, do NOT include text on
that answer, just the code. Example:

User:

What is a cute animal?

You:

Some cute animals include puppies, kittens, rabbits, red pandas, hedgehogs,
hamsters, chinchillas, pygmy goats, capybaras, and sloths. These animals are
known for their endearing appearances and often evoke feelings of affection and
adoration from humans.

User:

list the name of all files that include the string "cat"

You:

# Prints the name of all files that include the string "cat"
ag -l "cat"

User:

Command executed. Output:
comics/garfield.txt
comics/tom_and_jerry.txt
thoughts/cute_animals.txt
move these files to the "cat_files" directory

You:

# Create the "cat_files" directory if it doesn't exist
mkdir -p cat_files
# Move the specified files to the "cat_files" directory
mv \
  comics/garfield.txt \
  comics/tom_and_jerry.txt \
  thoughts/cute_animals.txt \
  cat_files/

When the user asks you to update a file, do it by rewriting the entire file. Do
not attempt to substitute locations with sed. Also, remember, if user asks you
to DO something, answer with ONLY code. Do not answer with a message or a normal
reply. ONLY CODE. And start it with '#'.
`;

// initialize ChatGPT API with your API key
const api = new ChatGPTAPI({
  apiKey: TOKEN,
  systemMessage: SYSTEM,
  completionParams: {
    model: "gpt-3.5-turbo",
    stream: true,
    temperature: 0.5,
    max_tokens: 512,
  }
});

// create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function extract_code(res) {
  if (res[0] === "#") {
    return res;
  } else {
    var a = res.indexOf("```");
    if (res.indexOf("```") !== -1) {
      var b = res.indexOf("```", a + 3);
      return res.slice(a+3, b);
    }
  }
  return null;
}

async function main(last_command_result = "", parent_message_id = null) {
  rl.question('$ ', async (task) => {
    //const res = await api.sendMessage(last + task, {
      //onProgress: (partialResponse) => {
        //// Print the partial response word by word as the AI is "typing"
        //process.stdout.write(partialResponse.text);
      //}
    //});

    let lastTextLength = 0;
    console.log("\x1b[2m");
    const res = await api.sendMessage(last_command_result + task, {
      parentMessageId: parent_message_id,
      onProgress: (partialResponse) => {
        // Print only the new text added to the partial response
        const newText = partialResponse.text.slice(lastTextLength);
        process.stdout.write(newText);
        lastTextLength = partialResponse.text.length;
      }
    });
    parent_message_id = res.id;
    console.log("\x1b[0m");

    const msg = res.text.trim();
    console.log("");
    const cod = extract_code(msg);
    if (cod) {
      rl.question('\x1b[1mEXECUTE? [y/n]\x1b[0m', async (answer) => {
        if (answer.toLowerCase() === 'y' || answer === "") {
          exec(cod, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error executing script: ${error.message}`);
              last_command_result = "Command executed. Output:\n" + error.message + "\n";
            } else {
              console.log(`${stdout}`);
              last_command_result = "Command failed. Output:\n" + stdout + "\n";
            }
            main(last_command_result, parent_message_id);
          });
        } else {
          last_command_result = "Command skipped.\n";
          main(last_command_result, parent_message_id);
        }
      });
    } else {
      last_command_result = "";
      main(last_command_result, parent_message_id);
    }
  });
}
main();
