// Real search input in Chrome, including an IME session that stays open while idle.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const esbuild = require(path.resolve(root, '../lms-manage-api/node_modules/esbuild'));
const taskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-search-ime-'));
const fixture = `
import React, {useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import CustomSearchInput from './components/ui/Inputs/CustomSearchInput';
const calls=[];
let reset;
let acknowledgeDelay=0;
function App(){
 const draft=useRef('');
 const [value,setValue]=useState('');
 const [resetKey,setResetKey]=useState(0);
 reset=()=>{draft.current='';setValue('');setResetKey(key=>key+1)};
 return <CustomSearchInput value={value} resetKey={resetKey}
   onValueChange={text=>{draft.current=text}}
   fetchApi={async text=>{calls.push(text);await new Promise(resolve=>setTimeout(resolve,acknowledgeDelay));setValue(text)}}/>;
}
createRoot(document.getElementById('root')).render(<App/>);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const type=(input,text)=>{
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,text);
 input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:text,isComposing:true}));
};
(async()=>{
 for(let i=0;i<100&&!document.querySelector('input');i++)await pause(20);
 const input=document.querySelector('input');
 assert(input,'Search input missing');
 input.focus();
 input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
 for(const text of ['ôn','ôn tập','ôn tập văn','ôn tập văn chương']){
   type(input,text);await pause(80);
 }
 assert(calls.length===0,'Search ran before typing stopped');
 await pause(450);
 assert(calls.length===1&&calls[0]==='ôn tập văn chương','Idle IME search requires a trailing space: '+JSON.stringify(calls));
 assert(input.value==='ôn tập văn chương','Search changed the draft');
 type(input,'ôn tập văn chương mới');
 await pause(450);
 assert(calls.length===2&&calls[1]==='ôn tập văn chương mới','Continued IME typing was not searched');
 // Ending composition and typing rapidly must use the final text.
 input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:input.value}));
 type(input,'văn');await pause(60);type(input,'văn học');
 await pause(450);
 assert(calls.length===3&&calls[2]==='văn học','Rapid typing submitted a stale keyword');
 // Reset must cancel the pending keyword even during composition.
 input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
 type(input,'từ khóa chờ');await pause(50);reset();await pause(450);
 assert(input.value===''&&calls.length===3,'Reset did not cancel pending IME search');
 type(input,'x');await pause(50);type(input,'');await pause(450);
 assert(calls.length===4&&calls[3]==='','Clearing search did not submit an empty keyword');

 // Slow typing: each pause exceeds debounce, without ending composition.
 reset();await pause(50);
 input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
 const slowStart=calls.length;
 for(const text of ['ô','ôn','ôn ','ôn t','ôn tập','ôn tập văn','ôn tập văn chương']){
   type(input,text);await pause(450);
   assert(calls.at(-1)===text,'Slow typing failed to search '+JSON.stringify(text));
   assert(input.value===text&&document.activeElement===input,'Slow typing changed the draft or lost focus');
 }
 assert(calls.length===slowStart+7,'Slow typing generated duplicate requests');
 input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:input.value}));
 await pause(450);
 assert(calls.length===slowStart+7,'Ending IME repeats an already completed search');
 // A previous search acknowledgement must preserve the newer draft and caret.
 acknowledgeDelay=200;
 type(input,'ôn tập');await pause(360);
 assert(calls.at(-1)==='ôn tập','Delayed search did not start');
 type(input,'ôn tập văn chương');input.setSelectionRange(6,6);
 await pause(200);
 assert(input.value==='ôn tập văn chương','Previous search overwrote a newer draft');
 assert(input.selectionStart===6&&input.selectionEnd===6,'Previous search moved the caret');
 await pause(400);
 assert(calls.at(-1)==='ôn tập văn chương','New draft was not searched after an older acknowledgement');
 acknowledgeDelay=0;
 // Editing in the middle must keep the caret even when results update.
 type(input,'ôn tập thơ văn chương');input.setSelectionRange(10,10);await pause(450);
 assert(input.value==='ôn tập thơ văn chương'&&input.selectionStart===10,'Search moved the caret when editing in the middle');
 // Very slow Vietnamese accent changes, like a Telex word being composed.
 input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
 for(const text of ['chu','chư','chươ','chương']){
   type(input,text);await pause(750);
   assert(calls.at(-1)===text&&input.value===text,'Very slow accent change was lost');
 }
 input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:input.value}));
 // Paste and backspace follow the same idle search behavior.
 const ordinaryInput=(text,inputType)=>{
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,text);
   input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType}));
 };
 ordinaryInput('ôn tập văn chương','insertFromPaste');await pause(450);
 assert(calls.at(-1)==='ôn tập văn chương','Pasted text was not searched');
 ordinaryInput('ôn tập văn','deleteContentBackward');await pause(450);
 assert(calls.at(-1)==='ôn tập văn','Backspace was not searched');
 const beforeReset=calls.length;reset();await pause(50);
 ordinaryInput('ôn tập văn','insertText');await pause(450);
 assert(calls.length===beforeReset+1,'Reset suppressed searching the same keyword again');
 const beforeNavigation=calls.length;
 type(input,'từ khóa chưa gửi');await pause(50);
 window.dispatchEvent(new Event('lms:route-navigation-start'));await pause(450);
 assert(calls.length===beforeNavigation,'Navigation did not cancel pending search');
 document.getElementById('qa-result').textContent=JSON.stringify({ok:true,calls,checks:['idle IME without trailing space','continued composition','rapid typing','reset cancels pending search','clear search','slow IME typing (450ms pauses)','no duplicate at composition end','delayed acknowledgement preserves draft and caret','editing in the middle','very slow accent changes (750ms pauses)','paste and backspace','same keyword after reset','navigation cancels pending search']});
})().catch(error=>{document.getElementById('qa-result').textContent=JSON.stringify({ok:false,error:error.message})});
`;
(async()=>{
 const result=await esbuild.build({stdin:{contents:fixture,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',tsconfig:root+'/tsconfig.json',define:{'process.env.NODE_ENV':'"development"'}});
 fs.writeFileSync(path.join(taskDir,'qa.html'),'<!doctype html><meta charset="utf-8"><div id="root"></div><pre id="qa-result">RUNNING</pre><script>'+result.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');
const child=spawn(process.env.CHROME || '/usr/bin/google-chrome',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--disable-background-timer-throttling','--disable-renderer-backgrounding','--remote-debugging-pipe','about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
child.on('error', error => { process.stderr.write(String(error)+'\n'); process.exitCode=1; });
child.on('exit', () => { for (const entry of pending.values()) entry.reject(Error('Chrome exited')); pending.clear(); });
let buffer='',nextId=1;
const pending=new Map();
child.stdio[4].on('data',chunk=>{buffer+=chunk.toString();let i;while((i=buffer.indexOf('\0'))>=0){const msg=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p?.reject(Error(JSON.stringify(msg.error))):p?.resolve(msg.result)}}});
const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=nextId++;pending.set(id,{resolve,reject});child.stdio[3].write(JSON.stringify({id,method,params,...sessionId?{sessionId}:{}})+'\0')});
const timer=setTimeout(()=>{child.kill();process.stderr.write('Browser test timeout\n');process.exitCode=1},60000);
(async()=>{
const {targetId}=await call('Target.createTarget',{url:'file://'+path.join(taskDir, 'qa.html')});
const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
await call('Emulation.setDeviceMetricsOverride',{width:Number(process.env.QA_VIEWPORT || 390),height:Number(process.env.QA_HEIGHT || 844),deviceScaleFactor:1,mobile:false},sessionId);
await call('Page.bringToFront',{},sessionId);
for(let i=0;i<160;i++){
 await new Promise(r=>setTimeout(r,300));
 const result=await call('Runtime.evaluate',{expression:'document.getElementById("qa-result")?.textContent',returnByValue:true},sessionId);
 const value=result.result?.value;
 if(value && value!=='RUNNING') {const report=JSON.parse(value);process.stdout.write(JSON.stringify(report,null,2)+'\n');if(!report.ok)process.exitCode=1;if(process.env.QA_SCREENSHOT){const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(process.env.QA_SCREENSHOT,Buffer.from(shot.data,'base64'));}return;}
}
throw Error('Test result not produced');
})().catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1}).finally(async()=>{clearTimeout(timer);await call('Browser.close').catch(()=>{});child.kill();fs.rmSync(taskDir,{recursive:true,force:true})});

})().catch(error => {fs.rmSync(taskDir,{recursive:true,force:true});process.stderr.write(String(error)+"\n");process.exitCode=1;});
