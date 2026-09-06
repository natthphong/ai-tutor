"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {ArrowLeft,Headphones,Mic,Square,Send} from "lucide-react";
import {api,post} from "@/lib/api";
import type {SessionData,User,ListenResult} from "@/lib/types";
import {VoiceRecorder} from "@/features/audio/recorder";
import {ErrorMessage,Mascot} from "./ui";
import {FeedbackCard} from "./Practice";

export default function ListeningPractice({id,user,data,reload,onBack}:{id:string;user:User;data:SessionData;reload:()=>Promise<void>;onBack:()=>void}) {
 const [question,setQuestion]=useState<ListenResult>();
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [recording,setRecording]=useState(false),[text,setText]=useState("");
 const player=useRef<HTMLAudioElement>(null),recorder=useRef(new VoiceRecorder()),mounted=useRef(true);
 const lock=useRef(false),loaded=useRef(""),answerRequest=useRef("");
 const latest=data.turns.filter(t=>t.role==="model").at(-1);
 const completed=data.session.status==="completed";
 const listen=useCallback(async()=>{
   if(lock.current)return;lock.current=true;setBusy(true);setError("");
   try {const result=await post<ListenResult>(`/sessions/${id}/listen`,{request_id:crypto.randomUUID()});if(mounted.current)setQuestion(result);}
   catch(e){if(mounted.current)setError((e as Error).message)}finally{lock.current=false;if(mounted.current)setBusy(false)}
 },[id]);
 useEffect(()=>{
   if(!latest || completed || loaded.current===latest.id)return;
   loaded.current=latest.id;
   const saved=data.session.state.listen_result as ListenResult|undefined;
   if(saved?.turn_id===latest.id){setQuestion(saved);return;}
   setQuestion(undefined);void listen();
 },[latest?.id,completed,data.session.state.listen_result,listen]);
 useEffect(()=>{
   if(!question || !player.current || document.hidden)return;
   player.current.playbackRate=user.profile.speed || 1;
   void player.current.play().catch(()=>setNotice("แตะเล่นเสียงเพื่อเริ่มฟัง"));
 },[question,user.profile.speed]);
 useEffect(()=>{
   mounted.current=true;
   const pause=()=>{if(document.hidden){player.current?.pause();recorder.current.cancel();setRecording(false);setNotice("พักการฟังแล้ว กลับมาแตะเล่นต่อได้")}};
   document.addEventListener("visibilitychange",pause);
   return()=>{mounted.current=false;player.current?.pause();recorder.current.cancel();document.removeEventListener("visibilitychange",pause)};
 },[]);
 async function send(blob?:Blob){
   if(lock.current)return;lock.current=true;setBusy(true);setError("");player.current?.pause();
   try{
     const request=answerRequest.current || crypto.randomUUID();answerRequest.current=request;
     if(blob){const form=new FormData();form.set("audio",blob,"listening.wav");form.set("request_id",request);await api(`/sessions/${id}/turns`,{method:"POST",body:form});}
     else await post(`/sessions/${id}/turns`,{request_id:request,text});
     answerRequest.current="";setText("");lock.current=false;await reload();
   }catch(e){setError((e as Error).message)}finally{lock.current=false;setBusy(false)}
 }
 async function stopRecording(){try{const b=await recorder.current.stop();setRecording(false);await send(b)}catch(e){setRecording(false);setError((e as Error).message)}}
 async function record(){player.current?.pause();setError("");if(recording){await stopRecording();return;}try{await recorder.current.start(()=>void stopRecording());setRecording(true)}catch(e){setError((e as Error).message)}}
 async function finish(){setBusy(true);try{await post(`/sessions/${id}/complete`,{});await reload()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const last=data.attempts.at(-1);
 return <>
   <div className="session-top"><button className="text-button" onClick={onBack}><ArrowLeft size={18}/>กลับพื้นที่เรียน</button><button className="button" disabled={busy||recording||completed} onClick={()=>void finish()}>จบการฝึก</button></div>
   <div className="session-heading"><div><span className="eyebrow">LISTEN FIRST, SPEAK YOUR WAY</span><h1>{data.session.state.daily_title || "ฟังให้เข้าใจ แล้วคุยกัน"}</h1><p>รอบแรกฟังอย่างเดียว · รอบสองเห็นบางคำ · รอบสามดูเฉลย ถ้าเข้าใจแล้วตอบได้ทันที</p></div><Mascot size={75}/></div>
   <ErrorMessage message={error}/>{notice&&<p className="notice" role="status">{notice}</p>}
   {completed ? <div className="card completion-card"><h2>เก็บการฝึกฟังวันนี้แล้ว</h2><p>เข้าใจความหมายและตอบได้ {data.session.state.listening_successes || 0} ครั้ง</p><button className="button primary" onClick={onBack}>กลับไปดูแผนวันนี้</button></div> : <div className="session-grid"><section className="card listening-card">
     <Headphones size={42}/><h2>{busy&&!question?"Loop กำลังเตรียมเสียง…":`ฟังรอบที่ ${question?.listen_count || 1}`}</h2>
     {question&&<audio ref={player} controls src={`/api/audio/${question.audio_id}`} preload="auto" onError={()=>setNotice("โหลดเสียงยังไม่สำเร็จ ลองแตะเล่นอีกครั้ง")}/>}
     {question?.caption ? <div className="listening-caption" aria-live="polite"><p>{question.caption}</p>{question.translation&&<p lang="th">{question.translation}</p>}</div> : <p className="listening-hidden">ลองจับใจความจากเสียงก่อน ยังไม่แสดงคำพูดภาษาอังกฤษ</p>}
     <button className="button" disabled={busy||recording} onClick={()=>void listen()}>{!question?"ลองเตรียมเสียงอีกครั้ง":question.listen_count===1?"ฟังรอบ 2 พร้อมบางคำ":question.listen_count===2?"ฟังรอบ 3 พร้อมเฉลย":"ฟังซ้ำ"}</button>
     <p>ตอบด้วยคำของคุณเองได้ ไม่ต้องท่องคำถามให้เหมือนเดิม</p>
     <div className="mic-area"><button className={`mic-button ${recording?"recording":""}`} aria-label={recording?"หยุดและส่งเสียง":"ตอบด้วยเสียง"} disabled={busy||!question} onClick={()=>void record()}>{recording?<Square/>:<Mic/>}</button><strong>{recording?"กำลังฟังคุณ…":busy?"Loop กำลังฟังคำตอบ…":"เข้าใจแล้ว ตอบได้เลย"}</strong></div>
     <form className="text-compose" onSubmit={e=>{e.preventDefault();void send()}}><input aria-label="พิมพ์คำตอบเพื่อฝึกความเข้าใจ" value={text} onChange={e=>{setText(e.target.value);answerRequest.current=""}} maxLength={1500} placeholder="พิมพ์ตอบได้ (ไม่นับ speaking mastery)"/><button className="icon-button" aria-label="ส่งคำตอบ" disabled={busy||recording||!question||!text.trim()}><Send size={20}/></button></form>
   </section><aside>{last&&<><div className="notice">{data.session.state.listening_understood ? "เข้าใจความหมายและตอบในบริบทได้แล้ว" : "ลองฟังใจความสำคัญอีกนิด แล้วค่อยตอบด้วยคำของคุณ"}</div><FeedbackCard feedback={last.feedback} user={user} attempt={last}/></>}</aside></div>}
 </>;
}
