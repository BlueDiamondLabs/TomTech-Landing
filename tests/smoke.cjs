const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");

async function main(){
 const html=fs.readFileSync("index.html","utf8");
 assert.match(html,/<!DOCTYPE html>/);
 assert.match(html,/@media\(max-width:760px\)/);
 const match=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
 assert.ok(match,"inline dashboard script present");
 const script=new vm.Script(match[1],{filename:"dashboard.js"});
 const nodes=new Map(),listeners=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:"",textContent:"",value:"",classList:{toggle(){},add(){},remove(){}},addEventListener(k,fn){listeners.set(id+":"+k,fn)},focus(){},select(){}});return nodes.get(id)}
 const document={getElementById:node,querySelector:node,addEventListener(k,fn){listeners.set("document:"+k,fn)}};
 let storage=null;const localStorage={getItem(){return storage},setItem(k,v){storage=v},removeItem(){storage=null}};
 const secretSheet="https://docs.google.com/spreadsheets/d/TEST_PRIVATE_ID/edit";
 const window={VaultWorkbench:{open(tool){window.opened=tool;return true}}};
 const context={document,window,localStorage,navigator:{clipboard:{writeText(s){context.copied=s;return Promise.resolve()}}},console,setTimeout,clearTimeout,confirm:()=>false,fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve({djSheetUrl:secretSheet})}),URL,Blob};
 script.runInNewContext(context);
 function cards(){return (node("cards").innerHTML.match(/class="tile"/g)||[]).length}
 assert.equal(cards(),23,"23 initial dashboard tiles");
 assert.match(node("stats").innerHTML,/Total tools/);
 assert.match(node("nav").innerHTML,/Favorites/);
 listeners.get("search:input")({target:{value:"RoofQuote"}});
 assert.equal(cards(),2,"search filters cards");
 listeners.get("search:input")({target:{value:""}});
 function click(selector,value){listeners.get("document:click")({target:{closest(k){if(k!==selector)return null;return {getAttribute(name){if(name==="data-cat"||name==="data-fav"||name==="data-action"||name==="data-id")return value;return null},hasAttribute(name){return name==="data-action"}}}}})}
 click("[data-cat]","Music");
 assert.equal(cards(),2,"music category filters cards");
 click("[data-cat]","All");
 click("[data-fav]","dj");
 assert.ok(JSON.parse(storage).favs.includes("no:dj"),"favorites persist");
 click("[data-action]","test-center");
 assert.match(node("dialogHost").innerHTML,/Test &amp; launch checklist/);
 click("[data-action]","dj");
 assert.equal(window.opened,"dj","DJ launches in-app workbench rather than copying a ChatGPT prompt");
 assert.doesNotMatch(html,/Copy ChatGPT request/);
 click("[data-action]","add");
 assert.match(node("dialogHost").innerHTML,/id="toolForm"/);
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.ok(html.includes("fetch(\"/api/links\""),"private links fetched server-side");
 assert.equal(cards(),23,"loading link metadata does not remove cards");
 assert.equal(html.includes("TEST_PRIVATE_ID"),false,"private link not hardcoded");
 console.log("PASS: dashboard syntax, 23 tiles, search, filters, favorites, test center, in-app DJ launcher, editor, secure link loader.");
}
main().catch(error=>{console.error(error);process.exitCode=1});
