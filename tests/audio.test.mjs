import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import ts from 'typescript';
test('PCM output preserves duration and amplitude at Safari 44.1k and 48k',()=>{
 for(const sampleRate of [44100,48000]){
  let Processor;const chunks=[];const context={sampleRate,Int16Array,Math,AudioWorkletProcessor:class{port={postMessage:(b)=>chunks.push(new Int16Array(b))}},registerProcessor:(_name,p)=>Processor=p};vm.runInNewContext(fs.readFileSync('public/pcm-worklet.js','utf8'),context);const p=new Processor();
  for(let at=0;at<sampleRate;at+=128)p.process([[new Float32Array(Math.min(128,sampleRate-at)).fill(.5)]]);
  const total=chunks.reduce((n,x)=>n+x.length,0)+p.index;assert.ok(Math.abs(total-16000)<=1);assert.ok(chunks.every(c=>c.every(x=>Math.abs(x-16383)<=1)));
 }
});
function recorderContext(){let stopped=0;let resolve;const media={getTracks:()=>[{stop(){stopped++}}]};const context={exports:{},setTimeout,clearTimeout,Date,Blob,navigator:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)}},MediaRecorder:class{static isTypeSupported(t){return t==='audio/mp4'};constructor(_,o){this.mimeType=o.mimeType;this.state='inactive'}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['recorded'])});this.onstop?.()}}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/audio/recorder.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return {context,grant:()=>resolve(media),stops:()=>stopped}}
test('recorder releases a permission request that resolves after background cancellation',async()=>{const x=recorderContext(),r=new x.context.exports.VoiceRecorder();const start=r.start();r.cancel();x.grant();await assert.rejects(start);assert.equal(x.stops(),1)});
test('recorder picks Safari mp4 and always releases microphone after stop',async()=>{const x=recorderContext(),r=new x.context.exports.VoiceRecorder();const start=r.start();x.grant();await start;const b=await r.stop();assert.equal(b.type,'audio/mp4');assert.equal(x.stops(),1);assert.ok(b.size>0)});
