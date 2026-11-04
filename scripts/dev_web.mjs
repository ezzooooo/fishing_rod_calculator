import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { webEnvironment } from './web_env.mjs';
const require=createRequire(import.meta.url);
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack',...process.argv.slice(2)],{stdio:'inherit',env:webEnvironment(true)});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
