import fs from 'node:fs';import assert from 'node:assert/strict';
const backend=JSON.parse(fs.readFileSync('../backend/contracts/openapi.json','utf8'));
const routes=fs.readFileSync('../backend/internal/app/app.go','utf8');
for(const m of routes.matchAll(/g\.(Get|Post|Patch|Delete)\("([^"]+)"/g)){
 const method=m[1].toLowerCase(),path=m[2].replace(':id','{id}');if(path==='/openapi.json')continue;
 assert.ok(backend.paths[path]?.[method],`${method} ${path} missing from OpenAPI`);
}
console.log('All REST routes are documented in the shared contract');
