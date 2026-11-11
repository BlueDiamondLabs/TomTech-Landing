const crypto=require("node:crypto");
const {djVideoId,safeSheetTab}=require("../lib/vault-tools");
const SCOPE="https://www.googleapis.com/auth/spreadsheets";
const DEFAULT_HEADERS=["Track","Producer / channel","BPM","BPM source","Style notes (from listing)","YouTube video URL","My rating (1–5)","Keep?","Listened?"];
function responseError(res,status,message,code){return res.status(status).json({error:message,code})}
function safeRequest(req){return req.headers["x-vault-workbench"]==="1"&&(!req.headers.origin||req.headers.origin==="https://"+req.headers.host||req.headers.origin==="http://"+req.headers.host)}
function credentials(){
  if(process.env.DJ_GOOGLE_SERVICE_ACCOUNT_JSON){
    try{return JSON.parse(process.env.DJ_GOOGLE_SERVICE_ACCOUNT_JSON)}catch(e){return null}
  }
  return {client_email:process.env.DJ_GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:process.env.DJ_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY};
}
async function token(){
  const c=credentials();
  if(!c?.client_email||!c?.private_key)throw Error("Service account credentials are not configured.");
  const stamp=Math.floor(Date.now()/1000);
  const header={alg:"RS256",typ:"JWT"};
  const claim={iss:c.client_email,scope:SCOPE,aud:"https://oauth2.googleapis.com/token",iat:stamp,exp:stamp+3500};
  const b64=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
  const signed=b64(header)+"."+b64(claim);
  const privateKey=String(c.private_key).replace(/\\n/g,"\n");
  const signature=crypto.sign("RSA-SHA256",Buffer.from(signed),privateKey).toString("base64url");
  const form=new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:signed+"."+signature});
  const resp=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form,signal:AbortSignal.timeout(15000)});
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok||!data.access_token)throw Error("Service account authorization failed. Verify the key and account access.");
  return data.access_token;
}
async function sheetsFetch(accessToken,endpoint,method="GET",body){
  const r=await fetch("https://sheets.googleapis.com/v4/spreadsheets/"+endpoint,{
    method,headers:{Authorization:"Bearer "+accessToken,...(body?{"Content-Type":"application/json"}:{})},
    body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)
  });
  const json=await r.json().catch(()=>({}));
  if(!r.ok){const error=new Error(json.error?.message||"Google Sheets request failed.");error.status=r.status;throw error}
  return json;
}
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","private, no-store");
  if(req.method!=="POST")return responseError(res,405,"Use POST.");
  if(!safeRequest(req))return responseError(res,403,"Request blocked.");
  if(!process.env.DJ_SHEET_URL||!(process.env.DJ_GOOGLE_SERVICE_ACCOUNT_JSON||(process.env.DJ_GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.DJ_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)))return responseError(res,503,"Google Sheets writing isn't connected. Configure a service account in Vercel and grant it editor access to the existing spreadsheet.","not_configured");
  const sheetId=String(process.env.DJ_SHEET_URL).match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if(!sheetId)return responseError(res,503,"The spreadsheet destination isn't configured correctly.","not_configured");
  const body=req.body&&typeof req.body==="object"?req.body:{};
  const tab=safeSheetTab(body.tab);
  if(!tab||/[\[\]:*?\/\\]/.test(tab)||tab.startsWith("'"))return responseError(res,400,"Choose a valid spreadsheet tab.");
  const input=body.items;
  if(!Array.isArray(input)||!input.length||input.length>50)return responseError(res,400,"Select between 1 and 50 videos.");
  const selected=[];const seen=new Set();
  for(const item of input){
    const id=djVideoId(String(item.url||""));if(!id)return responseError(res,400,"A selected video URL is invalid.");
    if(seen.has(id))continue;seen.add(id);
    selected.push({url:"https://www.youtube.com/watch?v="+id,title:String(item.title||"").slice(0,200).trim(),channel:String(item.channel||"").slice(0,120).trim(),notes:String(item.notes||"").slice(0,240).trim()});
  }
  try{
    const access=await token();
    const meta=await sheetsFetch(access,sheetId+"?fields=sheets.properties.title");
    const exists=(meta.sheets||[]).some(x=>x.properties?.title===tab);
    if(!exists){
      if(body.createNew!==true)return responseError(res,400,"That tab doesn't exist. Select Create new tab to add it.");
      await sheetsFetch(access,sheetId+":batchUpdate","POST",{requests:[{addSheet:{properties:{title:tab}}}]});
      const range="'"+tab.replace(/'/g,"''")+"'!A1:I1";
      await sheetsFetch(access,sheetId+"/values/"+encodeURIComponent(range)+"?valueInputOption=RAW","PUT",{range,majorDimension:"ROWS",values:[DEFAULT_HEADERS]});
    }
    const prefix="'"+tab.replace(/'/g,"''")+"'";
    const found=await sheetsFetch(access,sheetId+"/values/"+encodeURIComponent(prefix+"!F2:F5000"));
    const existing=new Set((found.values||[]).flat().map(x=>djVideoId(String(x||""))).filter(Boolean));
    const newItems=selected.filter(it=>!existing.has(djVideoId(it.url)));
    const duplicates=selected.length-newItems.length;
    if(!newItems.length)return res.status(200).json({added:0,duplicates,tab,message:"No new tracks; all selected URLs were already present in this tab."});
    const eight=tab==="9th Wonder Instrumentals";
    const rows=newItems.map(it=>{
      const line=[it.title,it.channel,"","Not yet confirmed",it.notes||"Added from The Tool Vault; review audio before rating",it.url];
      return eight?line.concat(["",""]):line.concat(["","",""])
    });
    const columns=eight?"A:H":"A:I";
    const append=await sheetsFetch(access,sheetId+"/values/"+encodeURIComponent(prefix+"!"+columns)+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS","POST",{majorDimension:"ROWS",values:rows});
    return res.status(200).json({added:rows.length,duplicates,tab,range:append.updates?.updatedRange||null,message:"Rows added to your Google Sheet. BPM and music type remain unverified until reviewed."});
  }catch(e){
    const code=e.status===403?"permission_denied":"provider_error";
    const message=e.status===403?"Google Sheets denied access. Share the spreadsheet with the configured service account as an Editor.":"The selected tracks were not saved: "+String(e.message||"Google Sheets error");
    return responseError(res,e.status===403?403:502,message,code);
  }
};