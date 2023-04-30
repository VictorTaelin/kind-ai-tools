#!/usr/bin/env node
import process from "process";
import * as lib from "./lib.js";

function main() {
  const file = process.argv[2];

  if (!file) {
    console.log('Please provide an input file.');
    process.exit(1);
  }

  lib.prove_it(file);
}

main();

