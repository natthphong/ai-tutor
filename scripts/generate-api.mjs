import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const source=process.env.TOKO_OPENAPI || '../backend/contracts/openapi.json';
fs.copyFileSync(source,'src/generated/openapi.json');
execFileSync('node_modules/.bin/openapi-typescript',['src/generated/openapi.json','-o','src/generated/api.ts'],{stdio:'inherit'});
