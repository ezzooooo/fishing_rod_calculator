/** Carry over Flutter hash URLs and older edit/detail links after the cutover. */
export function legacyRouteTarget(pathname:string,hash=''):string|null {
  const hashPath=hash.startsWith('#/')?hash.slice(1):null;
  const candidate=(hashPath??pathname).split('?')[0].replace(/\/+$/,'')||'/';
  if(hashPath&&['/','/quotes','/brands','/fishing-rods','/system-settings','/login'].includes(candidate))return candidate;
  if(/^\/brands\/(?:add|edit\/[^/]+)$/.test(candidate))return '/brands';
  if(/^\/fishing-rods\/(?:add|edit\/[^/]+)$/.test(candidate))return '/fishing-rods';
  const detail=candidate.match(/^\/quotes\/([^/]+)$/);
  if(detail&&detail[1]!=='detail'){
    try{return `/quotes/detail?id=${encodeURIComponent(decodeURIComponent(detail[1]))}`;}catch{return null;}
  }
  return null;
}
