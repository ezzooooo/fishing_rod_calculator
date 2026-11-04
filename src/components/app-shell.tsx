'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Building2, ChevronDown, FilePlus2, Fish, History, LogOut, Menu, Settings, ShieldCheck } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { legacyRouteTarget } from '@/lib/legacy-route';
import { Button, Field, Input } from './ui';
import styles from './app-shell.module.css';

const links=[{href:'/',label:'새 견적 만들기',icon:FilePlus2},{href:'/quotes',label:'견적 내역',icon:History},{href:'/brands',label:'브랜드 관리',icon:Building2},{href:'/fishing-rods',label:'낚시대 관리',icon:Fish},{href:'/system-settings',label:'시스템 설정',icon:Settings,admin:true}];
function Login(){
  const {signIn}=useApp();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function submit(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');try{await signIn(email,password);}catch{setError('로그인하지 못했습니다. 이메일과 비밀번호를 확인해주세요.');}finally{setBusy(false);}}
  return <div className={styles.loginPage}><div className={styles.loginIntro}><div className={styles.loginBrand}><Image className={styles.loginBrandLogo} src="/songsan-logo.png" alt="송산 로고" width={40} height={40}/>송산중고낚시</div><p>STAFF WORKSPACE</p><h1>견적부터 기록까지,<br/>하나의 작업 공간에서.</h1><span>여러 낚시대의 견적을 모으고<br/>고객별 상담 기록을 이어가세요.</span></div><div className={styles.loginPanel}><form onSubmit={submit}><div className={styles.loginIcon}><ShieldCheck size={28}/></div><h2>직원 로그인</h2><p>등록된 직원 계정으로 로그인해주세요.</p><Field label="이메일"><Input type="email" autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="이메일을 입력하세요" disabled={busy}/></Field><Field label="비밀번호"><Input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} placeholder="비밀번호를 입력하세요" disabled={busy}/></Field>{error&&<p role="alert" className="error-message">{error}</p>}<Button type="submit" disabled={busy}>{busy?'로그인 중…':'로그인'}</Button><small>이 서비스는 승인된 직원만 이용할 수 있습니다.</small></form></div></div>;
}
export function AppShell({children}:{children:ReactNode}){
  const {status,user,isAdmin,isDemo,authError,signOut,notify,retry}=useApp();
  const pathname=usePathname().replace(/\/+$/, '') || '/';const router=useRouter();
  useEffect(()=>{if(status==='authorized'&&pathname==='/login')router.replace('/');},[status,pathname,router]);
  useEffect(()=>{
    const target=legacyRouteTarget(window.location.pathname,window.location.hash);
    if(target)router.replace(target);
  },[router]);
  useEffect(()=>{
    if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(registrations=>Promise.all(registrations.map(registration=>registration.unregister()))).catch(()=>{});
    if('caches' in window)caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('flutter')).map(key=>caches.delete(key)))).catch(()=>{});
  },[]);
  if(status==='loading')return <div className="screen-message" role="status"><div className="spinner"/><p>직원 권한을 확인하고 있습니다.</p></div>;
  if(status==='signedOut')return <Login/>;
  if(status==='unconfigured')return <div className="screen-message"><Fish size={40}/><h1>Firebase 연결 설정이 필요합니다</h1><p>{authError}</p><p className="muted">기존 Firebase 웹 앱의 설정을 .env.local에 입력한 뒤 다시 실행해주세요.</p><Button onClick={retry}>다시 확인</Button></div>;
  if(status==='unauthorized'||status==='error')return <div className="screen-message"><ShieldCheck size={40}/><h1>{status==='unauthorized'?'접근 권한이 없습니다':'로그인 상태를 확인하지 못했습니다'}</h1><p>{status==='unauthorized'?'관리자에게 직원 계정 승인을 요청해주세요.':'연결 상태를 확인한 뒤 다시 시도해주세요.'}</p><Button onClick={()=>void signOut().catch(()=>notify('로그아웃하지 못했습니다.','error'))}>로그아웃</Button></div>;
  const navigation=<nav className={styles.navigation} aria-label="주 메뉴"><p>업무 도구</p>{links.filter(link=>!link.admin||isAdmin).map(link=>{const Icon=link.icon;const active=link.href==='/'?pathname==='/':pathname.startsWith(link.href);return <Link key={link.href} href={link.href} className={`${styles.navLink} ${active?styles.active:''}`} aria-current={active?'page':undefined} onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');}}><Icon size={19}/>{link.label}</Link>;})}</nav>;
  return <div className={styles.shell}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><Image className={styles.brandLogo} src="/songsan-logo.png" alt="송산 로고" width={36} height={36}/><span className={styles.brandText}>송산중고낚시<small>견적 워크스페이스</small></span></Link>
      <div className={styles.desktopNavigation}>{navigation}</div>
      <div className={styles.account}>
        {isDemo&&<span className={styles.demoBadge}>예시 데이터</span>}
        <span className={styles.identity} title={user?.email}>{user?.email}</span>
        <Button variant="ghost" className={styles.logout} onClick={()=>void signOut().catch(()=>notify('로그아웃하지 못했습니다.','error'))}><LogOut size={16}/><span>로그아웃</span></Button>
      </div>
      <details className={styles.mobileMenu}><summary aria-label="메뉴 열기"><Menu size={21}/><ChevronDown size={13}/></summary>{navigation}</details>
    </header>
    <main className={styles.main}>{pathname==='/system-settings'&&!isAdmin?<div className="screen-message"><h1>관리자 전용 메뉴입니다</h1><Link className="button button-secondary" href="/">새 견적 만들기로</Link></div>:children}</main>
  </div>;
}
