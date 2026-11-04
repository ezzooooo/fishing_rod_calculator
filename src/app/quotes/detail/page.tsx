import { Suspense } from 'react';
import { QuoteDetail } from '@/components/quote-workspace';
export default function Page(){return <Suspense fallback={<p role="status">견적을 불러오는 중입니다.</p>}><QuoteDetail/></Suspense>;}
