import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { webEnvironment } from './web_env.mjs';
const require=createRequire(import.meta.url);
const environment=webEnvironment();
if(process.argv.includes('--require-config')){
  if(!environment.NEXT_PUBLIC_FIREBASE_API_KEY){console.error('Firebase API 키가 필요합니다. NEXT_PUBLIC_FIREBASE_API_KEY를 설정해주세요.');process.exit(1);}
  if(environment.NEXT_PUBLIC_DEMO_MODE==='true'){console.error('예시 데이터 모드로 운영 배포할 수 없습니다.');process.exit(1);}
}
const result=spawnSync(process.execPath,[require.resolve('next/dist/bin/next'),'build','--webpack'],{stdio:'inherit',env:environment});
process.exit(result.status??1);
