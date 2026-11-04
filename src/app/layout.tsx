import type { Metadata } from 'next';
import { AppProvider } from '@/lib/app-context';
import { QuoteDraftProvider } from '@/lib/quote-draft-context';
import { AppShell } from '@/components/app-shell';
import './globals.css';
export const metadata: Metadata={title:'송산중고낚시 · 견적 관리',description:'송산중고낚시 직원용 견적 및 기록 관리',icons:{icon:'/songsan-logo.png',apple:'/songsan-logo.png'},robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="ko"><body><AppProvider><QuoteDraftProvider><AppShell>{children}</AppShell></QuoteDraftProvider></AppProvider></body></html>;
}
