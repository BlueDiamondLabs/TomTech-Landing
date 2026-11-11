const {djVideoId}=require("../lib/vault-tools");
function sameOrigin(req){const origin=req.headers.origin;return !origin||origin===("https://"+req.headers.host)||origin===("http://"+req.headers.host)}
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","private, no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="POST")return res.status(405).json({error:"Use POST."});
  if(!sameOrigin(req)||req.headers["x-vault-workbench"]!=="1")return res.status(403).json({error:"Request blocked."});
  const key=process.env.YOUTUBE_DATA_API_KEY;
  if(!key)return res.status(503).json({code:"not_configured",error:"YouTube search isn't connected yet. An official YouTube Data API key must be configured in Vercel before this search can run."});
  const b=req.body&&typeof req.body==="object"?req.body:{};
  const artist=String(b.artist||"").trim().slice(0,110);
  const kind=String(b.kind||"Instrumentals only").slice(0,60);
  const bpm=String(b.bpm||"").trim().slice(0,32);
  const count=Math.max(1,Math.min(50,Number(b.count)||20));
  if(!artist)return res.status(400).json({error:"Enter an artist, producer, or track search."});
  const suffix={"Instrumentals only":"instrumental","Original songs":"official audio","Scratch samples":"scratch samples","Remixes":"remix"}[kind]||"music";
  const q=[artist,suffix,bpm&&" "+bpm].filter(Boolean).join(" ");
  const p=new URLSearchParams({part:"snippet",type:"video",maxResults:String(count),videoEmbeddable:"true",q,key});
  let response;
  try{response=await fetch("https://www.googleapis.com/youtube/v3/search?"+p.toString(),{signal:AbortSignal.timeout(15000)})}
  catch(e){return res.status(502).json({error:"YouTube could not be reached. No results were saved."})}
  const json=await response.json().catch(()=>({}));
  if(!response.ok)return res.status(response.status===403?502:502).json({error:"YouTube search failed. Check the API key, its YouTube Data API v3 access, and your quota.",detail:json.error?.errors?.[0]?.reason||"Provider error"});
  const seen=new Set();
  const items=(Array.isArray(json.items)?json.items:[]).map(it=>{
    const id=it.id?.videoId;
    if(!djVideoId("https://www.youtube.com/watch?v="+id)||seen.has(id))return null;
    seen.add(id);
    return {videoId:id,title:it.snippet?.title||"Untitled",channel:it.snippet?.channelTitle||"",description:(it.snippet?.description||"").slice(0,240),
      thumbnail:it.snippet?.thumbnails?.medium?.url||"",publishedAt:it.snippet?.publishedAt||"",url:"https://www.youtube.com/watch?v="+id}
  }).filter(Boolean);
  return res.status(200).json({items,query:q,count:items.length,notice:"Search ranking is provided by YouTube. BPM, originality, and instrumental status are not automatically verified; preview and review each result."});
};