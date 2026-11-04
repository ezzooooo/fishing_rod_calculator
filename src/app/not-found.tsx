import Link from 'next/link';
export default function NotFound(){return <div className="empty-state"><h1>페이지를 찾을 수 없습니다</h1><p>새 견적 화면에서 다시 시작해주세요.</p><Link className="button button-primary" href="/">새 견적 만들기</Link></div>;}
