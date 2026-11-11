function sameOrigin(req){return req.headers["x-vault-workbench"]==="1"&&(!req.headers.origin||req.headers.origin==="https://"+req.headers.host||req.headers.origin==="http://"+req.headers.host)}
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","private, no-store");
  if(req.method!=="POST")return res.status(405).json({error:"Use POST"});
  if(!sameOrigin(req))return res.status(403).json({error:"Request blocked."});
  if(req.body?.workflow!=="crownpost")return res.status(400).json({error:"Unsupported workflow."});
  const endpoint=process.env.MAKE_CROWN_POST_WEBHOOK;
  if(!endpoint)return res.status(503).json({error:"The Crown Pro Make.com webhook has not been connected in Vercel.",code:"not_configured"});
  let u;
  try{u=new URL(endpoint)}catch(e){return res.status(503).json({error:"Webhook configuration is invalid."})}
  if(u.protocol!=="https:"||!/^hook\.[a-z0-9-]+\.make\.com$/.test(u.hostname))return res.status(503).json({error:"Webhook host must be an official Make.com HTTPS webhook."});
  const b=req.body||{};
  const topic=String(b.topic||"").trim().slice(0,200);
  const caption=String(b.caption||"").trim().slice(0,600);
  const platform=String(b.platform||"facebook").slice(0,24);
  if(!topic||!["facebook","instagram"].includes(platform))return res.status(400).json({error:"Enter a topic and choose a supported platform."});
  try{
    const r=await fetch(u.toString(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source:"the-tool-vault",topic,caption,platform,requestedAt:new Date().toISOString()}),redirect:"error",signal:AbortSignal.timeout(15000)});
    if(!r.ok)return res.status(502).json({error:"Make.com did not accept the trigger. Verify the scenario is enabled.",status:r.status});
    return res.status(202).json({accepted:true,message:"Make.com acknowledged the trigger. This does not confirm an image was generated or a post was published."});
  }catch(e){return res.status(502).json({error:"Couldn't contact Make.com. No completion is confirmed."})}
};