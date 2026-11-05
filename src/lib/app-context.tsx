'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebaseServices, isDemoMode, SYSTEM_SETTINGS_ADMIN_UID } from './firebase';
import { FirebaseRepository, asError, type AppRepository } from './repository';
import { DemoRepository } from './demo-repository';
import type { Brand, FishingRod } from './domain';
import { upsertSavedBrand } from './brands';
import { createCatalogReadinessTracker, type CatalogSource, type SessionStatus } from './session-state';

export interface AppUser {uid:string;email:string;}
interface Notice {message:string;tone:'success'|'error'|'info';id:number;}
interface AppContextValue {
  status:SessionStatus;user:AppUser|null;isAdmin:boolean;isDemo:boolean;authError:string|null;
  brands:Brand[];rods:FishingRod[];catalogLoading:boolean;catalogError:string|null;
  repository:AppRepository|null;signIn:(email:string,password:string)=>Promise<void>;signOut:()=>Promise<void>;
  saveBrand:(id:string|null,name:string,aliases?:readonly string[])=>Promise<Brand>;
  notify:(message:string,tone?:'success'|'error'|'info')=>void;retry:()=>void;
}
const Context=createContext<AppContextValue|null>(null);
export function AppProvider({children}:{children:ReactNode}) {
  const demo=isDemoMode();
  const [status,setStatus]=useState<SessionStatus>('loading');
  const [user,setUser]=useState<AppUser|null>(null);
  const [repository,setRepository]=useState<AppRepository|null>(null);
  const [authError,setAuthError]=useState<string|null>(null);
  const [brands,setBrands]=useState<Brand[]>([]);
  const [rods,setRods]=useState<FishingRod[]>([]);
  const [catalogLoading,setCatalogLoading]=useState(true);
  const [catalogError,setCatalogError]=useState<string|null>(null);
  const [notice,setNotice]=useState<Notice|null>(null);
  const [attempt,setAttempt]=useState(0);
  const session=useRef({uid:null as string|null,authorized:false});
  const notify=useCallback((message:string,tone:Notice['tone']='success')=>setNotice({message,tone,id:Date.now()}),[]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),5500);return()=>clearTimeout(timer);},[notice]);
  useEffect(()=>{
    let alive=true;
    let stopAuth=()=>{};
    let stopStaff=()=>{};
    queueMicrotask(()=>{
      if(!alive)return;
      setAuthError(null);
      if(demo){session.current={uid:'demo-staff',authorized:true};setUser({uid:'demo-staff',email:'preview@example.test'});setRepository(new DemoRepository({brandSnapshotDelayMs:Number(process.env.NEXT_PUBLIC_DEMO_BRAND_SNAPSHOT_DELAY_MS)||0}));setStatus('authorized');return;}
      try{
        const services=firebaseServices();
        setRepository(new FirebaseRepository(services.database,()=>session.current));
        stopAuth=onAuthStateChanged(services.auth,firebaseUser=>{
          if(!alive)return;
          stopStaff();session.current={uid:firebaseUser?.uid??null,authorized:false};setBrands([]);setRods([]);setCatalogError(null);
          setUser(firebaseUser?{uid:firebaseUser.uid,email:firebaseUser.email??''}:null);
          if(!firebaseUser){setStatus('signedOut');return;}
          setStatus('loading');
          stopStaff=onSnapshot(doc(services.database,'staff',firebaseUser.uid),snapshot=>{
            if(!alive||session.current.uid!==firebaseUser.uid)return;
            const enabled=snapshot.exists()&&snapshot.data().enabled===true;
            session.current={uid:firebaseUser.uid,authorized:enabled};setStatus(enabled?'authorized':'unauthorized');
          },()=>{if(alive&&session.current.uid===firebaseUser.uid){session.current.authorized=false;setStatus('unauthorized');}});
        },error=>{if(alive){session.current.authorized=false;setAuthError(asError(error).message);setStatus('error');}});
      }catch(error){setAuthError(asError(error).message);setStatus('unconfigured');}
    });
    return()=>{alive=false;stopStaff();stopAuth();};
  },[demo,attempt]);
  useEffect(()=>{
    if(status!=='authorized'||!repository)return;
    let alive=true;const markReady=createCatalogReadinessTracker();
    queueMicrotask(()=>{if(alive){setCatalogLoading(true);setCatalogError(null);}});
    const ready=(source:CatalogSource)=>{if(markReady(source))setCatalogLoading(false);};
    const fail=(error:Error)=>{if(alive){setCatalogError(error.message);setCatalogLoading(false);}};
    const stopBrands=repository.watchBrands(value=>{if(alive){setBrands(value);ready('brands');}},fail);
    const stopRods=repository.watchRods(value=>{if(alive){setRods(value);ready('rods');}},fail);
    return()=>{alive=false;stopBrands();stopRods();};
  },[repository,status]);
  const signIn=useCallback(async(email:string,password:string)=>{
    if(demo){session.current={uid:'demo-staff',authorized:true};setUser({uid:'demo-staff',email:email.trim()||'preview@example.test'});setStatus('authorized');return;}
    await signInWithEmailAndPassword(firebaseServices().auth,email.trim(),password);
  },[demo]);
  const signOut=useCallback(async()=>{
    if(!demo)await firebaseSignOut(firebaseServices().auth);
    session.current={uid:null,authorized:false};setUser(null);setStatus('signedOut');setBrands([]);setRods([]);
  },[demo]);
  const saveBrand=useCallback(async(id:string|null,name:string,aliases?:readonly string[])=>{
    if(!repository)throw new Error('브랜드 목록을 불러온 뒤 다시 저장해주세요.');
    const owner=session.current.uid;
    const saved=id===null?await repository.createBrand(name,aliases):await repository.updateBrand(id,name,aliases);
    if(owner&&session.current.authorized&&session.current.uid===owner)setBrands(current=>upsertSavedBrand(current,saved));
    return saved;
  },[repository]);
  return <Context.Provider value={{status,user,isAdmin:demo||user?.uid===SYSTEM_SETTINGS_ADMIN_UID,isDemo:demo,authError,brands,rods,catalogLoading,catalogError,repository,signIn,signOut,saveBrand,notify,retry:()=>setAttempt(value=>value+1)}}>
    {children}
    {notice&&<div className={`toast toast-${notice.tone}`} role={notice.tone==='error'?'alert':'status'}><span>{notice.message}</span><button aria-label="알림 닫기" onClick={()=>setNotice(null)}>×</button></div>}
  </Context.Provider>;
}
export function useApp(){const value=useContext(Context);if(!value)throw new Error('AppProvider가 필요합니다.');return value;}
