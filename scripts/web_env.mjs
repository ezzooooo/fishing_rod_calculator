import nextEnv from '@next/env';
import { readFileSync, existsSync } from 'node:fs';
export function webEnvironment(development=false){
  nextEnv.loadEnvConfig(process.cwd(),development);
  const environment={...process.env};
  if(!environment.NEXT_PUBLIC_FIREBASE_API_KEY)environment.NEXT_PUBLIC_FIREBASE_API_KEY=environment.FIREBASE_WEB_API_KEY||'';
  const legacyDefines='.vscode/dart_defines.local.json';
  if(!environment.NEXT_PUBLIC_FIREBASE_API_KEY&&existsSync(legacyDefines)){
    const values=JSON.parse(readFileSync(legacyDefines,'utf8'));
    environment.NEXT_PUBLIC_FIREBASE_API_KEY=String(values.FIREBASE_WEB_API_KEY||'');
  }
  return environment;
}
