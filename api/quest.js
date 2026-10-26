module.exports = async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST")return res.status(405).json({error:"Use POST."});
  const prompt=typeof req.body?.prompt==="string"?req.body.prompt.trim():"";
  if(!prompt||prompt.length>1800)return res.status(400).json({error:"Write a prompt under 1,800 characters."});
  const key=process.env.OPENROUTER_API_KEY;
  if(!key)return res.status(503).json({error:"Live AI is not connected yet. The free-form prompt lab still works."});
  try{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
    let upstream;
    try{upstream=await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",signal:controller.signal,
      headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json","HTTP-Referer":"https://boundlessy-global.vercel.app","X-Title":"Boundlessy AI Quest"},
      body:JSON.stringify({model:process.env.QUEST_AI_MODEL||"openrouter/auto",max_tokens:450,temperature:0.7,messages:[
        {role:"system",content:"You are Byte, a friendly AI learning companion for secondary-school students aged 13–18. Encourage curiosity and critical thinking. Answer in clear, concise, age-appropriate language. Never request personal information. Avoid explicit, sexual, violent, hateful or dangerous instructions. For risky or high-stakes topics, recommend a trusted adult or professional. Explain uncertainty and invite the student to test or verify important claims. Never pretend a simulated result is a real experiment."},
        {role:"user",content:prompt}
      ]})})}finally{clearTimeout(timer)}
    if(!upstream.ok)return res.status(502).json({error:"The AI provider is temporarily unavailable. Please try again later."});
    const data=await upstream.json();const answer=data?.choices?.[0]?.message?.content;
    if(typeof answer!=="string"||!answer.trim())return res.status(502).json({error:"No answer was returned. Try again."});
    return res.status(200).json({answer:answer.slice(0,5000)});
  }catch{return res.status(503).json({error:"The AI request timed out or could not connect. Please try again."})}
};