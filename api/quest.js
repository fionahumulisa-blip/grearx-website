module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST")return res.status(405).json({error:"Use POST."});
  const prompt=typeof req.body?.prompt==="string"?req.body.prompt.trim():"";
  if(!prompt||prompt.length>1800)return res.status(400).json({error:"Write a prompt under 1,800 characters."});
  const key=process.env.OPENROUTER_API_KEY;
  if(!key)return res.status(503).json({error:"Live AI is not configured. Please contact the site owner."});
  const model=process.env.QUEST_AI_MODEL||"openrouter/auto";
  const system="You are Byte, a friendly AI creation coach for students aged 13–18. Give useful, concise, complete answers. Answer questions directly, then offer one actionable next step. Encourage independent creation and verification. Never ask for private information. Avoid unsafe content. Do not claim to have built something that you haven't.";
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),24000);
  try{
    const upstream=await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",signal:controller.signal,
      headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json","HTTP-Referer":"https://boundlessy-global.vercel.app","X-Title":"Boundlessy AI Quest"},
      body:JSON.stringify({model,max_tokens:1100,temperature:0.5,reasoning:{effort:"minimal"},messages:[{role:"system",content:system},{role:"user",content:prompt}]})
    });
    let data={};try{data=await upstream.json()}catch{}
    if(!upstream.ok){
      const status=upstream.status;
      const reason=status===401||status===403?"The AI service key was rejected.":status===402?"The AI service needs credits.":status===429?"The AI service is rate-limited.":"The AI provider is unavailable.";
      console.error("quest_upstream",status,typeof data?.error?.code==="string"?data.error.code:"");
      return res.status(502).json({error:reason+" Please try again or contact the site owner."});
    }
    const choice=data?.choices?.[0];
    const raw=choice?.message?.content;
    const answer=typeof raw==="string"?raw.trim():Array.isArray(raw)?raw.filter(x=>x&&x.type==="text"&&typeof x.text==="string").map(x=>x.text).join("\n").trim():"";
    if(!answer){
      console.error("quest_empty_answer",{finish_reason:choice?.finish_reason||"missing",has_choices:Array.isArray(data?.choices),model:data?.model||"unknown"});
      return res.status(502).json({error:"The AI model produced no text (reason: "+String(choice?.finish_reason||"unknown").slice(0,40)+"). Please try again."});
    }
    return res.status(200).json({answer:answer.slice(0,6500)});
  }catch(e){
    console.error("quest_request_failed",e?.name||"error");
    return res.status(503).json({error:"The AI request timed out or could not connect. Please try again."});
  }finally{clearTimeout(timer)}
};