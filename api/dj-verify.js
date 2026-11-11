const {djVideoId}=require("../lib/vault-tools");
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","private, no-store");
  if(req.method!=="POST")return res.status(405).json({error:"Use POST."});
  if(req.headers["x-vault-workbench"]!=="1"||(req.headers.origin&&req.headers.origin!=="https://"+req.headers.host&&req.headers.origin!=="http://"+req.headers.host))return res.status(403).json({error:"Request blocked."});
  const id=djVideoId(String(req.body?.url||""));
  if(!id)return res.status(400).json({error:"Paste a valid YouTube video URL."});
  const url="https://www.youtube.com/watch?v="+id;
  try{
    const response=await fetch("https://www.youtube.com/oembed?url="+encodeURIComponent(url)+"&format=json",{signal:AbortSignal.timeout(12000)});
    if(!response.ok)return res.status(422).json({error:"YouTube couldn't confirm that video. It may be removed, private, or restricted."});
    const item=await response.json();
    return res.status(200).json({videoId:id,url,title:String(item.title||"").slice(0,250),channel:String(item.author_name||"").slice(0,120),thumbnail:"https://img.youtube.com/vi/"+id+"/mqdefault.jpg",verified:true});
  }catch(e){return res.status(502).json({error:"Could not verify this URL with YouTube right now."})}
};