import { Suspense } from 'react';
import { ProductManagement } from '@/components/equipment-management';

export default function Page() {
  return <Suspense fallback={<p role="status">제품 관리를 불러오는 중입니다.</p>}><ProductManagement /></Suspense>;
}
