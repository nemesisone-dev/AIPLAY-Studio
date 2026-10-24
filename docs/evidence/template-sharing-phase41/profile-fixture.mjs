// Reuse the existing isolated offline fixture, with independent app/browser ports.
// Run from the repository root: node docs/evidence/template-sharing-phase41/profile-fixture.mjs A
// Start B in another terminal. Both use synthetic files, never model weights.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
const profile=process.argv[2];
assert.ok(['A','B'].includes(profile),'Choose profile A or B.');
assert.equal(path.resolve(process.cwd()),path.resolve(fileURLToPath(new URL('../../../',import.meta.url))),'Run from the repository root.');
const [ui,comfy,wrapper]=profile==='A'?[4471,4473,4474]:[4481,4483,4484];
let source=await fs.readFile(new URL('../beginner-cloud-phase3/cloud-setup-fixture.mjs',import.meta.url),'utf8');
source=source.replaceAll('4457',String(ui)).replaceAll('4459',String(comfy)).replaceAll('4460',String(wrapper)).replaceAll('syntheticmusic','syntheticmusic-'+profile.toLowerCase());
const status="if(u.pathname==='/qa/status')return sendJSON(res,200,{submissions,queued:queue.length,completed:Object.keys(history).length,actions:fixtureActions});";
assert.ok(source.includes(status));
source=source.replace(status,"if(u.pathname==='/qa/status')return sendJSON(res,200,{submissions,queued:queue.length,completed:Object.keys(history).length,actions:fixtureActions,requests:fixtureRequests});");
const anchor='const realFetch=globalThis.fetch;';assert.ok(source.includes(anchor));
source=source.replace(anchor,`const fixtureRequests=[];const originalCreateServer=http.createServer;
http.createServer=function(...args){const server=originalCreateServer.apply(this,args);
server.prependListener('request',req=>{if(req.url.startsWith('/api/'))fixtureRequests.push({method:req.method,path:new URL(req.url,'http://fixture').pathname});});return server;};
${anchor}`);
const directory=path.resolve('tmp/cloud-manager/template-sharing-acceptance');await fs.mkdir(directory,{recursive:true});
const file=path.join(directory,'profile-'+profile.toLowerCase()+'-fixture.mjs');await fs.writeFile(file,source);
await import(pathToFileURL(file).href);
