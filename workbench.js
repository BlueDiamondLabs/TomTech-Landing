(function(){
"use strict";
const root=document.getElementById("workbenchHost"),toolkit=window.VaultTools;
if(!root||!toolkit){console.warn("The Tool Vault native tools did not initialize.");return}
const status={youtubeSearch:false,googleSheetsWrite:false,workflowCrownPost:false,sheetLink:false};
const work={tool:null,items:[],selected:new Set(),packResult:null,dealResult:null,loading:false};
const playlistKey="tool-vault-dj-draft-v1";
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function byId(id){return root.querySelector("#"+id)}
function showMsg(message,type){const n=byId("vw-message");if(n){n.className="vw-message "+(type||"");n.textContent=String(message)}}
function errorMessage(e){return e&&e.message?String(e.message):"The operation could not be completed."}
function htmlButton(label,action,kind){return '<button class="vw-button '+(kind||"")+'" type="button" data-vw="'+esc(action)+'">'+esc(label)+'</button>'}
function shell(title,subtitle,icon,body,side,wide){
  root.innerHTML='<div class="vw-app"><header class="vw-top"><div class="vw-heading"><div class="vw-icon">'+esc(icon)+'</div><div><h2>'+esc(title)+'</h2><p>'+esc(subtitle)+'</p></div></div><div class="vw-buttons">'+htmlButton("← Back to Vault","close")+'</div></header><div class="'+(wide?"vw-wide":"vw-wrap")+'">'+(wide?body:'<main class="vw-main">'+body+'</main><aside class="vw-side">'+side+'</aside>')+'</div></div>';
}
function panel(title,body){return '<section class="vw-panel"><h3>'+esc(title)+'</h3>'+body+'</section>'}
function field(id,label,inner){return '<div class="vw-field"><label for="'+esc(id)+'">'+esc(label)+'</label>'+inner+'</div>'}
function inp(id,value,placeholder,type){return '<input id="'+esc(id)+'" type="'+(type||"text")+'" value="'+esc(value||"")+'" placeholder="'+esc(placeholder||"")+'">'}
function formOptions(items,selected){return items.map(x=>'<option value="'+esc(x)+'" '+(x===selected?'selected':'')+'>'+esc(x)+'</option>').join("")}
function resultText(msg){return '<div class="vw-muted">'+esc(msg)+'</div>'}
function getSelected(){return work.items.filter(x=>work.selected.has(x.videoId))}
function syncHeader(){const n=byId("vw-counter");if(n)n.textContent=work.items.length+" results · "+work.selected.size+" selected"}
async function request(path,payload){
  const response=await fetch(path,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Vault-Workbench":"1"},body:JSON.stringify(payload)});
  const contentType=response.headers.get("content-type")||"";
  if(!contentType.includes("json"))throw Error("The server did not return a valid response. Try signing in to Vercel.");
  const data=await response.json();
  if(!response.ok)throw Error(data.error||"The request could not be completed.");
  return data;
}
async function refreshStatus(){
  try{const r=await fetch("/api/integrations",{credentials:"same-origin",cache:"no-store"});
    if(!r.ok)return;const d=await r.json();Object.keys(status).forEach(k=>status[k]=Boolean(d[k]));
    const y=byId("vw-status-youtube");if(y)y.textContent=status.youtubeSearch?"Connected":"Needs API connection";
    const g=byId("vw-status-sheets");if(g)g.textContent=status.googleSheetsWrite?"Connected":"Needs service account";
    const m=byId("vw-status-make");if(m)m.textContent=status.workflowCrownPost?"Connected":"Needs Make.com webhook";
  }catch(e){/* show setup guidance if the integration status cannot be read */}
}
function dj(){
  const body=panel("Find music on YouTube",'<p class="vw-muted">Search and review tracks here. Nothing is copied into ChatGPT. YouTube search requires its official API key; the URL verifier works separately.</p>'+
    '<form id="vw-dj-search">'+
    '<div class="vw-row">'+field("vw-artist","Artist / producer",inp("vw-artist","9th Wonder","Artist, producer, or search phrase"))+field("vw-type","Music type",'<select id="vw-type">'+formOptions(["Instrumentals only","Original songs","Scratch samples","Remixes"],"Instrumentals only")+'</select>')+'</div>'+
    '<div class="vw-row">'+field("vw-bpm","BPM search hint",inp("vw-bpm","70–120 BPM","Optional; not automatically verified"))+field("vw-count","Maximum results",'<select id="vw-count">'+formOptions(["10","20","30","50"],"20")+'</select>')+'</div>'+
    '<div class="vw-actions"><button type="submit" class="vw-button primary">🔎 Search YouTube</button></div></form>')+
    panel("Verify a YouTube URL",'<p class="vw-muted">Already have a link? Paste it here to check the video title and channel directly with YouTube, then add it to your results.</p><form id="vw-dj-verify">'+field("vw-url","YouTube video URL",inp("vw-url","","https://www.youtube.com/watch?v=...","url"))+'<div class="vw-actions"><button class="vw-button primary" type="submit">Verify and add</button></div></form>')+
    panel("Your music results",'<div class="vw-actions"><span class="vw-progress" id="vw-counter">0 results · 0 selected</span>'+htmlButton("Select all","select-all")+htmlButton("Clear selection","clear-selection")+'</div><div id="vw-player"></div><div id="vw-results" style="margin-top:15px">'+resultText("Search YouTube or verify a specific URL to start collecting tracks.")+'</div><hr class="divider">'+
    '<div class="vw-row">'+field("vw-tab","Destination tab",'<select id="vw-tab">'+formOptions(["Scratch Crate","Original Free Beats","9th Wonder Instrumentals","Create new tab"],"9th Wonder Instrumentals")+'</select>')+field("vw-newtab","New tab name (only for Create new tab)",inp("vw-newtab","","Producer Instrumentals"))+'</div>'+
    '<div class="vw-actions">'+htmlButton("Save selected to Google Sheets","save-sheet","primary")+htmlButton("Download selected CSV","download-csv")+htmlButton("Save draft here","save-draft")+'</div>'+
    '<div id="vw-message" class="vw-message">Results are reviewed and saved only when you choose to save them. BPM is a search hint, not a measured result.</div>');
  const side=panel("Connection status",'<p class="vw-muted">Official YouTube Data API</p><span class="vw-progress" id="vw-status-youtube">Checking...</span><p class="vw-muted" style="margin-top:16px">Google Sheets writer</p><span class="vw-progress" id="vw-status-sheets">Checking...</span><div class="vw-message warn">Connect the YouTube Data API key and a Google Sheets service account in Vercel for fully automated search and save. The service account must be given Editor access to your sheet.</div>')+
    panel("What runs in this app?",'<div class="vw-link-list">✓ Search results displayed here when connected<br>✓ YouTube video preview here<br>✓ Video URL verification without a search key<br>✓ Selection and deduplication<br>✓ Download CSV and browser drafts<br>✓ Write to your real Sheet when connected<br>✕ BPM measurement is not automatic</div>');
  shell("DJ Music Studio","Find, preview, and organize YouTube music inside The Tool Vault","🎧",body,side);refreshStatus();loadDraft();
}
function loadDraft(){
  try{const arr=JSON.parse(localStorage.getItem(playlistKey)||"[]");if(Array.isArray(arr)&&arr.length){work.items=arr.filter(x=>x&&toolkit.djVideoId(x.url)).slice(0,80);work.selected=new Set();renderDjResults()}}catch(e){}
}
function renderDjResults(){
  const n=byId("vw-results");if(!n)return;syncHeader();
  if(!work.items.length){n.innerHTML=resultText("No tracks yet. Search or verify a YouTube URL above.");return}
  n.innerHTML=work.items.map(item=>
    '<article class="vw-result"><input type="checkbox" class="vw-check" data-vw-id="'+esc(item.videoId)+'" aria-label="Select '+esc(item.title)+'" '+(work.selected.has(item.videoId)?"checked":"")+'>'+
    '<img alt="" loading="lazy" src="'+esc(item.thumbnail||("https://img.youtube.com/vi/"+item.videoId+"/mqdefault.jpg"))+'"><div class="vw-stack"><h4>'+esc(item.title)+'</h4><p>'+esc(item.channel)+'</p><div class="vw-actions" style="margin-top:5px"><button class="vw-button" type="button" data-vw="preview" data-id="'+esc(item.videoId)+'">▶ Preview</button><a target="_blank" rel="noopener noreferrer" href="'+esc(item.url)+'">Video URL ↗</a></div></div></article>'
  ).join("");
}
async function searchDj(){
  const artist=byId("vw-artist")?.value.trim(),kind=byId("vw-type")?.value,bpm=byId("vw-bpm")?.value,count=Number(byId("vw-count")?.value);
  if(!artist){showMsg("Enter an artist or producer.","bad");return}
  showMsg("Searching YouTube; checking the returned video IDs...","");
  try{const data=await request("/api/dj-search",{artist,kind,bpm,count});
      work.items=data.items||[];work.selected=new Set();renderDjResults();showMsg((work.items.length?"Results loaded. Review them before selecting. ":"No results returned. ")+(data.notice||""),work.items.length?"good":"warn")}
  catch(e){showMsg(errorMessage(e),"bad")}
}
async function verifyVideo(){
  const url=byId("vw-url")?.value||"";
  showMsg("Asking YouTube to verify the video...","");
  try{const data=await request("/api/dj-verify",{url});
    if(!work.items.some(x=>x.videoId===data.videoId))work.items.unshift(data);
    work.selected.add(data.videoId);renderDjResults();showMsg("YouTube confirmed: "+data.title+". Added to your results (not yet written to the spreadsheet).","good")}
  catch(e){showMsg(errorMessage(e),"bad")}
}
function selectedCSV(){const rows=[["Track","Producer / channel","BPM","BPM source","Style notes","YouTube video URL"]].concat(getSelected().map(it=>[it.title,it.channel,"","Not yet confirmed",it.description||"Needs review",it.url]));return rows.map(r=>r.map(v=>'"'+String(v||"").replace(/"/g,'""')+'"').join(",")).join("\r\n")}
function saveCSV(){if(!getSelected().length){showMsg("Select at least one track first.","warn");return}const blob=new Blob([selectedCSV()],{type:"text/csv;charset=utf-8"});const a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download="tool-vault-music-results.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);showMsg("CSV exported. This did not modify your Google Sheet.","good")}
async function saveSheet(){
  const items=getSelected();
  if(!items.length){showMsg("Select tracks before saving.","warn");return}
  let tab=byId("vw-tab").value,createNew=false;
  if(tab==="Create new tab"){tab=byId("vw-newtab").value.trim();createNew=true}
  if(!tab){showMsg("Select or enter a destination tab.","warn");return}
  showMsg("Sending selected tracks to your Google Sheet...","");
  try{const r=await request("/api/dj-save",{items,tab,createNew});showMsg(r.added+" tracks added to '"+r.tab+"'; "+r.duplicates+" duplicates skipped. "+r.message,"good")}
  catch(e){showMsg(errorMessage(e),"bad")}
}
function saveDraft(){try{localStorage.setItem(playlistKey,JSON.stringify(work.items.slice(0,80)));showMsg(work.items.length+" tracks saved in this browser as a draft. They are NOT yet in Google Sheets.","good")}catch(e){showMsg("Could not save the draft in this browser.","bad")}}
function preview(id){if(!toolkit.djVideoId("https://www.youtube.com/watch?v="+id))return;const n=byId("vw-player");if(n){n.innerHTML='<div class="vw-player"><iframe src="https://www.youtube-nocookie.com/embed/'+esc(id)+'" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="YouTube track preview"></iframe></div>';n.scrollIntoView?.({behavior:"smooth",block:"nearest"})}}
function pack(){
  const body=panel("Count parts through a PML station",'<p class="vw-muted">Load a Pack BOM CSV with columns for Station, Part Number, Quantity, and optionally Pack PN. Duplicate parts are summed; rows after the selected station and zero quantities are excluded.</p><form id="vw-pack-form">'+
    '<div class="vw-row">'+field("vw-pack","Pack part number",inp("vw-pack","1572","e.g. 1572"))+field("vw-station","Current station",inp("vw-station","700","e.g. 020, 150, 700"))+'</div>'+
    field("vw-pack-file","Upload CSV file",'<input type="file" id="vw-pack-file" accept=".csv,text/csv">')+
    field("vw-bom","Or paste BOM CSV",' <textarea id="vw-bom" placeholder="Station,Part Number,Quantity,Pack PN&#10;020,12345678,2,1572&#10;040,12345678,3,1572&#10;700,87654321,1,1572"></textarea>')+
    '<div class="vw-actions"><button type="submit" class="vw-button primary">Calculate part counts</button></div></form>')+
    panel("Calculated quantities",'<div id="vw-pack-results">'+resultText("Upload or paste a BOM and choose Calculate.")+'</div><div id="vw-message" class="vw-message">Counts are calculated locally from the BOM you provide; no factory database is connected.</div>');
  const side=panel("Counting rules",'<div class="vw-link-list">✓ Filter by Pack PN (if column exists)<br>✓ Include stations up to current station<br>✓ Sum duplicate part numbers<br>✓ Ignore zero quantities<br>✓ Flag invalid rows<br>✓ Download computed results</div><p class="vw-muted">Station 020 is treated as numeric station 20. A station is only counted if its row has valid quantities and parts.</p>')+
    panel("Data privacy",'<p class="vw-muted">BOM calculations run in your browser. This tool does not upload them to a server.</p>');
  shell("RESS Pack Counter","Compute accurate part totals directly in The Tool Vault","📦",body,side);
}
function runPack(){
  try{work.packResult=toolkit.countPackParts(byId("vw-bom").value,byId("vw-pack").value,byId("vw-station").value);
    const r=work.packResult;const table=r.parts.length?'<div class="vw-table-scroll"><table class="vw-table"><thead><tr><th>Part Number</th><th>Quantity</th></tr></thead><tbody>'+r.parts.map(p=>'<tr><td>'+esc(p.part)+'</td><td class="num">'+esc(p.quantity)+'</td></tr>').join("")+'</tbody></table></div>':resultText("No matching nonzero parts through this station.");
    byId("vw-pack-results").innerHTML='<div class="vw-stat-grid"><div class="vw-stat"><small>Unique part numbers</small><strong>'+r.parts.length+'</strong></div><div class="vw-stat"><small>Matching BOM rows</small><strong>'+r.processed+'</strong></div></div>'+table+'<p class="vw-footnote">'+r.skipped+' rows skipped, '+r.zero+' zero quantities excluded.</p><div class="vw-actions">'+htmlButton("Download results CSV","pack-csv")+'</div>';
    showMsg(r.warnings.length?r.warnings.slice(0,5).join(" ")+" Review your CSV.":"Count complete from the supplied CSV. Please verify the BOM and station mapping.",r.warnings.length?"warn":"good")}
  catch(e){showMsg(errorMessage(e),"bad")}
}
function packCSV(){const r=work.packResult;if(!r){showMsg("Calculate counts before exporting.","warn");return}download("pack-counts.csv",[['Part Number','Quantity']].concat(r.parts.map(p=>[p.part,p.quantity])))}
function download(name,rows){const csv=rows.map(r=>r.map(v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"').join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n)}
function property(){
  const body=panel("Property deal worksheet",'<p class="vw-muted">Enter your property numbers to calculate rental return and purchase spread. This does not fetch live Detroit comparable sales or neighborhood data.</p><form id="vw-property-form">'+
    field("vw-address","Property address",inp("vw-address","","Street address, Detroit, MI"))+
    '<div class="vw-row">'+field("vw-price","Purchase price ($)",inp("vw-price","","e.g. 50000","number"))+field("vw-arv","Your estimated after-repair value ($)",inp("vw-arv","","Optional","number"))+'</div>'+
    '<div class="vw-row">'+field("vw-rehab","Rehab budget ($)",inp("vw-rehab","0","","number"))+field("vw-closing","Closing and acquisition costs ($)",inp("vw-closing","0","","number"))+'</div>'+
    '<div class="vw-row">'+field("vw-rent","Expected monthly rent ($)",inp("vw-rent","0","","number"))+field("vw-taxes","Annual property taxes ($)",inp("vw-taxes","0","","number"))+'</div>'+
    '<div class="vw-row">'+field("vw-insurance","Annual insurance ($)",inp("vw-insurance","0","","number"))+field("vw-vacancy","Vacancy allowance (%)",inp("vw-vacancy","5","","number"))+'</div>'+
    '<div class="vw-row">'+field("vw-management","Management expense (%)",inp("vw-management","8","","number"))+field("vw-maintenance","Maintenance reserve (%)",inp("vw-maintenance","8","","number"))+'</div>'+
    '<div class="vw-actions"><button type="submit" class="vw-button primary">Analyze property</button></div></form>')+
    panel("Deal calculations",'<div id="vw-property-results">'+resultText("Enter a property and select Analyze property.")+'</div><div id="vw-message" class="vw-message warn">All outputs are preliminary and based only on the assumptions you enter. Verify taxes, rental demand, actual condition, and comparable sales separately.</div>');
  const side=panel("Metrics explained",'<p class="vw-muted"><strong>NOI:</strong> annual rental income less estimated operating expenses, before debt service and income taxes.</p><p class="vw-muted"><strong>Cap rate:</strong> NOI divided by purchase plus rehab and closing costs.</p><p class="vw-muted"><strong>Potential spread:</strong> your estimated after-repair value minus total project cost. Not a guaranteed profit.</p>')+
    panel("Source notes",'<p class="vw-muted">Live address validation, comparable transactions, rental comps, vacancy estimates, and neighborhood scoring are not connected yet. Those will require licensed data or authorized research integrations.</p>');
  shell("Detroit Property Deal Analyzer","Work through a real estate investment inside The Tool Vault","🏘️",body,side);
}
function analyzeProperty(){
  try{const keys=["price","arv","rehab","closing","rent","taxes","insurance","vacancy","management","maintenance"];const data={address:byId("vw-address").value.trim()};keys.forEach(k=>data[k]=byId("vw-"+k).value);
    const result=toolkit.dealMetrics(data);work.dealResult={data,result};const metrics=[["Total project cost",money(result.totalCost)],["Annual gross rent",money(result.grossAnnual)],["Annual operating expenses",money(result.annualExpenses)],["Net operating income",money(result.noi)],["Cap rate",result.capRate.toFixed(2)+"%"],["Monthly income before debt",money(result.monthlyBeforeDebt)],["Gross rental yield",result.grossYield.toFixed(2)+"%"],["Estimated spread",result.equitySpread===null?"Not provided":money(result.equitySpread)]];
    byId("vw-property-results").innerHTML='<div class="vw-stat-grid">'+metrics.map(([label,value])=>'<div class="vw-stat"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>').join("")+'</div><p class="vw-footnote">Expenses include vacancy, management, maintenance, property taxes, and insurance. No mortgage, utilities, capital expenditure shocks, permit costs, or taxes on income are modeled.</p><div class="vw-actions">'+htmlButton("Download analysis CSV","property-csv")+'</div>';
    showMsg("Calculation complete. The valuation inputs are yours and have not been independently verified.","good")}
  catch(e){showMsg(errorMessage(e),"bad")}
}
function propertyCSV(){if(!work.dealResult)return;const d=work.dealResult.data,r=work.dealResult.result;download("property-deal-analysis.csv",[["Field","Value"],...Object.entries(d),...Object.entries(r)])}
function poster(){
  const body=panel("Prepare a Crown Pro Construction post",'<p class="vw-muted">Enter your campaign idea and send it directly to the linked Make.com scenario. This does not create or publish content without a configured webhook.</p><form id="vw-make-form">'+
    field("vw-topic","Post topic / service",inp("vw-topic","","e.g. New roof installation in Downriver"))+
    field("vw-caption","Caption guidance (optional)",'<textarea id="vw-caption" placeholder="Message, offer, CTA, seasonality..."></textarea>')+
    field("vw-platform","Platform",'<select id="vw-platform"><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select>')+
    '<div class="vw-actions"><button class="vw-button primary" type="submit">Trigger Make.com workflow</button></div></form><div id="vw-message" class="vw-message warn">The automation must be connected and enabled. Trigger accepted does not mean a post was published.</div>');
  const side=panel("Connection",'<p class="vw-muted">Crown Pro Make.com webhook</p><span class="vw-progress" id="vw-status-make">Checking...</span><p class="vw-muted" style="margin-top:14px">Connect the existing Make.com scenario to Vercel using an encrypted server-only environment variable. The workflow must support the inputs shown here.</p>')+
    panel("Safety",'<p class="vw-muted">No hidden browser webhook or credentials. Your Make scenario receives an explicit request only when you press Trigger.</p>');
  shell("Crown Pro Campaign Runner","Operate a connected Make.com scenario from The Tool Vault","📣",body,side);refreshStatus();
}
async function runPoster(){
  showMsg("Requesting the connected Make.com scenario...","");
  try{const r=await request("/api/workflow-run",{workflow:"crownpost",topic:byId("vw-topic").value.trim(),caption:byId("vw-caption").value.trim(),platform:byId("vw-platform").value});showMsg(r.message,"good")}
  catch(e){showMsg(errorMessage(e),"bad")}
}
const embedded={roof:{title:"RoofQuote Studio",url:"https://roof.voicelinkdynamics.com",icon:"🏠"},fantasy:{title:"Fantasy Secret Sauce",url:"https://fantasysecretsauce.com",icon:"🏈"},rental:{title:"Rental Website Factory",url:"https://vld-rental-site-factory.vercel.app",icon:"🏡"}};
function embed(id){
  const t=embedded[id];if(!t)return;
  const body='<div class="vw-message warn">This opens the existing site inside The Tool Vault when that site allows embedding. Some apps block frames or require their own login. If the frame is blocked, use the original site link below. This is not a new integration.</div><div class="vw-actions" style="margin-bottom:10px"><a class="vw-button primary" target="_blank" rel="noopener noreferrer" href="'+esc(t.url)+'">↗ Open original site</a></div><iframe class="vw-frame" title="'+esc(t.title)+'" src="'+esc(t.url)+'" sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" referrerpolicy="strict-origin-when-cross-origin" loading="eager"></iframe>';
  shell(t.title,"Embedded website view — subject to that site's frame permissions",t.icon,body,"",true);
}
function open(tool){
  work.tool=tool;work.items=[];work.selected=new Set();work.packResult=null;work.dealResult=null;
  if(tool==="dj"||tool==="musiccrate")dj();
  else if(tool==="pack")pack();
  else if(tool==="detr")property();
  else if(tool==="crownpost")poster();
  else if(embedded[tool])embed(tool);
  else return false;
  document.body.style.overflow="hidden";
  return true;
}
function close(){root.innerHTML="";document.body.style.overflow="";work.tool=null}
root.addEventListener("click",function(event){
  const btn=event.target.closest("[data-vw]");if(!btn)return;
  const act=btn.getAttribute("data-vw");
  if(act==="close")close();
  if(act==="preview")preview(btn.getAttribute("data-id"));
  if(act==="save-sheet")saveSheet();
  if(act==="download-csv")saveCSV();
  if(act==="save-draft")saveDraft();
  if(act==="select-all"){work.selected=new Set(work.items.map(x=>x.videoId));renderDjResults()}
  if(act==="clear-selection"){work.selected.clear();renderDjResults()}
  if(act==="pack-csv")packCSV();
  if(act==="property-csv")propertyCSV();
});
root.addEventListener("change",function(event){
  if(event.target.matches(".vw-check")){const id=event.target.getAttribute("data-vw-id");if(event.target.checked)work.selected.add(id);else work.selected.delete(id);syncHeader()}
  if(event.target.id==="vw-pack-file"&&event.target.files[0]){
    const reader=new FileReader();
    reader.onload=()=>{const target=byId("vw-bom");if(target)target.value=String(reader.result||"")};
    reader.onerror=()=>showMsg("Could not read that CSV file.","bad");
    reader.readAsText(event.target.files[0]);
  }
});
root.addEventListener("submit",function(event){
  event.preventDefault();
  switch(event.target.id){
    case "vw-dj-search":searchDj();break;
    case "vw-dj-verify":verifyVideo();break;
    case "vw-pack-form":runPack();break;
    case "vw-property-form":analyzeProperty();break;
    case "vw-make-form":runPoster();break;
  }
});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&work.tool)close()});
window.VaultWorkbench={open,close,integrations:status};
})();