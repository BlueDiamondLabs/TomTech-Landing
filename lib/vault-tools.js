/* Pure utilities shared by The Tool Vault workbenches and smoke tests. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.VaultTools=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  function parseCSV(content){
    const source=String(content||"").replace(/^\uFEFF/,"");
    const rows=[];let row=[],field="",quoted=false;
    for(let i=0;i<source.length;i++){
      const c=source[i];
      if(c==='"'){
        if(quoted&&source[i+1]==='"'){field+='"';i++}
        else quoted=!quoted;
      }else if(c===","&&!quoted){row.push(field.trim());field=""}
      else if((c==="\n"||c==="\r")&&!quoted){
        if(c==="\r"&&source[i+1]==="\n")i++;
        row.push(field.trim());field="";
        if(row.some(x=>x!==""))rows.push(row);
        row=[];
      }else field+=c;
    }
    if(quoted)throw Error("Unclosed quotation mark in CSV");
    row.push(field.trim());if(row.some(x=>x!==""))rows.push(row);
    return rows;
  }
  function normalizeHeader(h){return String(h||"").toLowerCase().replace(/[^a-z0-9]/g,"")}
  function column(headers,names){const map=headers.map(normalizeHeader);return names.map(normalizeHeader).reduce((out,n)=>out===-1?map.indexOf(n):out,-1)}
  function stationNumber(station){
    const s=String(station==null?"":station).trim();
    const m=s.match(/(?:^|[^\d])(\d{2,3})(?:[^\d]|$)/);
    if(!m)return NaN;
    return Number(m[1]);
  }
  function countPackParts(csv,pack,through){
    const rows=Array.isArray(csv)?csv:parseCSV(csv);
    if(!rows.length)throw Error("Add a CSV table with a header row.");
    const header=rows[0];
    const st=column(header,["station","station number","pml station","operation","operation number","workstation"]);
    const pn=column(header,["part number","part pn","component part number","component","part","pn","material","material number"]);
    const qty=column(header,["quantity","qty","quantity per pack","count","units","required qty"]);
    const pk=column(header,["pack pn","pack part number","pack number","pack","pack pn number","pack id"]);
    if(st<0||pn<0||qty<0)throw Error("CSV needs Station, Part Number, and Quantity headers. Pack PN is optional.");
    const max=stationNumber(through);
    if(!Number.isFinite(max))throw Error("Enter a valid station, such as 020, 150, or 700.");
    let handled=0,skipped=0,zero=0;const counts=new Map(),warnings=[];
    for(let i=1;i<rows.length;i++){
      const r=rows[i];const rowNum=i+1;
      if(pk>=0&&String(pack||"").trim()&&String(r[pk]||"").trim()!==String(pack).trim()){skipped++;continue}
      const s=stationNumber(r[st]);
      if(!Number.isFinite(s)){warnings.push("Row "+rowNum+": invalid station.");skipped++;continue}
      if(s>max){skipped++;continue}
      const part=String(r[pn]||"").trim();
      const num=Number(String(r[qty]||"").replace(/,/g,""));
      if(!part||!Number.isFinite(num)||num<0){warnings.push("Row "+rowNum+": invalid part or quantity.");skipped++;continue}
      if(num===0){zero++;continue}
      counts.set(part,(counts.get(part)||0)+num);
      handled++;
    }
    if(pk<0&&String(pack||"").trim())warnings.push("No Pack PN column found: all rows through the chosen station were counted.");
    return {parts:Array.from(counts,([part,quantity])=>({part,quantity})).sort((a,b)=>a.part.localeCompare(b.part,undefined,{numeric:true})),
            processed:handled,skipped,zero,warnings,maxStation:max,pack:String(pack||"").trim(),hasPackColumn:pk>=0};
  }
  function dealMetrics(x){
    const val=(k,def=0)=>{const raw=x[k];const n=(raw==null||raw==="")?def:Number(raw);if(!Number.isFinite(n)||n<0)throw Error("Enter a valid non-negative number for "+k+".");return n};
    const price=val("price"),rehab=val("rehab"),closing=val("closing"),rent=val("rent"),taxes=val("taxes"),insurance=val("insurance"),
       vacancy=val("vacancy",5),management=val("management",8),maintenance=val("maintenance",8),arv=val("arv");
    for(const [k,v] of [["vacancy",vacancy],["management",management],["maintenance",maintenance]])if(v>100)throw Error(k+" cannot exceed 100%.");
    if(price<=0)throw Error("Enter a purchase price greater than zero.");
    const totalCost=price+rehab+closing,grossAnnual=rent*12,
       vacancyCost=grossAnnual*vacancy/100,managementCost=grossAnnual*management/100,
       maintenanceCost=grossAnnual*maintenance/100,
       annualExpenses=vacancyCost+managementCost+maintenanceCost+taxes+insurance,
       noi=grossAnnual-annualExpenses,
       capRate=totalCost>0?noi/totalCost*100:0,
       grossYield=totalCost>0?grossAnnual/totalCost*100:0,
       monthlyBeforeDebt=noi/12,
       equitySpread=arv>0?arv-totalCost:null;
    return {totalCost,grossAnnual,annualExpenses,noi,capRate,grossYield,monthlyBeforeDebt,equitySpread,vacancyCost,managementCost,maintenanceCost};
  }
  function djVideoId(url){
    try{
      const u=new URL(url),host=u.hostname.toLowerCase().replace(/^www\./,"");
      let id="";
      if(host==="youtu.be")id=u.pathname.slice(1).split("/")[0];
      else if(host==="youtube.com"||host==="m.youtube.com"||host==="music.youtube.com"||host==="youtube-nocookie.com"){
        if(u.pathname==="/watch")id=u.searchParams.get("v")||"";
        else if(/^\/(?:shorts|embed|live)\//.test(u.pathname))id=u.pathname.split("/")[2]||"";
      }
      return /^[a-zA-Z0-9_-]{11}$/.test(id)?id:null;
    }catch(e){return null}
  }
  function safeSheetTab(tab){return String(tab||"").trim().slice(0,80)}
  return {parseCSV,countPackParts,dealMetrics,djVideoId,safeSheetTab};
});
