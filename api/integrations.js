module.exports=function handler(req,res){
  res.setHeader("Cache-Control","private, no-store");
  if(req.method!=="GET")return res.status(405).json({error:"Use GET"});
  res.status(200).json({
    youtubeSearch:Boolean(process.env.YOUTUBE_DATA_API_KEY),
    googleSheetsWrite:Boolean(process.env.DJ_GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.DJ_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY&&process.env.DJ_SHEET_URL),
    workflowCrownPost:Boolean(process.env.MAKE_CROWN_POST_WEBHOOK),
    sheetLink:Boolean(process.env.DJ_SHEET_URL)
  });
};