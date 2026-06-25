(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(n){if(n.ep)return;n.ep=!0;const r=t(n);fetch(n.href,r)}})();function nl(s){const e=new Map;for(const t of s.split(`
`)){if(t.length<54)continue;const i=t.slice(0,6);if(i!=="ATOM  "&&i!=="HETATM"||t.slice(12,16).trim()!=="CA")continue;const r=t[21];if(!r||r===" ")continue;const o=t.slice(22,26).trim();if(!o)continue;const a=Number.parseInt(o,10);if(!Number.isFinite(a))continue;const l=t[26]===" "?"":t[26],d=`${o}${l}`,c=Number.parseFloat(t.slice(30,38)),u=Number.parseFloat(t.slice(38,46)),h=Number.parseFloat(t.slice(46,54));if(!Number.isFinite(c)||!Number.isFinite(u)||!Number.isFinite(h))continue;let f=e.get(r);f||(f={residues:new Set,calphas:[]},e.set(r,f)),!f.residues.has(d)&&(f.residues.add(d),f.calphas.push({resSeq:a,iCode:l,x:c,y:u,z:h}))}return Array.from(e.entries()).map(([t,i])=>({chainId:t,residues:i.residues,calphas:i.calphas}))}function rl(s){const e=[];let t=0;for(;t<s.length;){for(;t<s.length&&/\s/.test(s[t]);)t++;if(t>=s.length)break;const i=s[t];if(i==="'"){t++;const n=t;for(;t<s.length&&s[t]!=="'";)t++;e.push(s.slice(n,t)),t++}else if(i==='"'){t++;const n=t;for(;t<s.length&&s[t]!=='"';)t++;e.push(s.slice(n,t)),t++}else{const n=t;for(;t<s.length&&!/\s/.test(s[t]);)t++;e.push(s.slice(n,t))}}return e}function Ia(s,e){const t=s.split(`
`),i=e+".",n=[];let r=0;for(;r<t.length;){if(t[r].trim()==="loop_"){let c=r+1;for(;c<t.length&&t[c].trim()==="";)c++;if(c<t.length&&t[c].trim().startsWith(i)){r=c;break}}r++}if(r>=t.length)return n;const o=[];for(;r<t.length;){const d=t[r].trim();if(d.startsWith(i)){const c=d.indexOf(".");o.push(d.slice(c+1)),r++}else break}if(o.length===0)return n;const a=[];for(;r<t.length;){const d=t[r].trim();if(d==="#"||d==="loop_"||d.startsWith("_")&&!d.startsWith(i))break;if(d.startsWith(";")){r++;const u=[];for(;r<t.length&&t[r].trim()!==";";)u.push(t[r]),r++;r++,a.push(u.join(`
`));continue}if(d.startsWith("#")){r++;continue}if(d===""){r++;continue}const c=rl(t[r]);a.push(...c),r++}const l=o.length;for(let d=0;d+l<=a.length;d+=l){const c={};for(let u=0;u<l;u++)c[o[u]]=a[d+u];n.push(c)}return n}function ol(s){const e=[],t=Ia(s,"_struct_conf");for(const n of t){if(!(n.conf_type_id??"").startsWith("HELX"))continue;const o=n.beg_auth_asym_id,a=n.beg_auth_seq_id,l=n.end_auth_seq_id;if(!o||o==="."||o==="?"||!a||a==="."||a==="?"||!l||l==="."||l==="?")continue;const d=parseInt(a,10),c=parseInt(l,10);isNaN(d)||isNaN(c)||e.push({chainId:o,start:d,end:c,type:"helix"})}const i=Ia(s,"_struct_sheet_range");for(const n of i){const r=n.beg_auth_asym_id,o=n.beg_auth_seq_id,a=n.end_auth_seq_id;if(!r||r==="."||r==="?"||!o||o==="."||o==="?"||!a||a==="."||a==="?")continue;const l=parseInt(o,10),d=parseInt(a,10);isNaN(l)||isNaN(d)||e.push({chainId:r,start:l,end:d,type:"strand"})}return e}function al(s,e,t){const i=e.map(n=>{const r=t.filter(o=>o.chainId===n.chainId).map(o=>({start:o.start,end:o.end,type:o.type})).sort((o,a)=>o.start-a.start);return{chainId:n.chainId,residueCount:n.residues.size,segments:r,calphas:n.calphas}});return{pdbId:s,chains:i}}const dl="modulepreload",ll=function(s,e){return new URL(s,e).href},Na={},Ua=function(e,t,i){let n=Promise.resolve();if(t&&t.length>0){const o=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),l=(a==null?void 0:a.nonce)||(a==null?void 0:a.getAttribute("nonce"));n=Promise.allSettled(t.map(d=>{if(d=ll(d,i),d in Na)return;Na[d]=!0;const c=d.endsWith(".css"),u=c?'[rel="stylesheet"]':"";if(!!i)for(let S=o.length-1;S>=0;S--){const C=o[S];if(C.href===d&&(!c||C.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${d}"]${u}`))return;const f=document.createElement("link");if(f.rel=c?"stylesheet":dl,c||(f.as="script"),f.crossOrigin="",f.href=d,l&&f.setAttribute("nonce",l),document.head.appendChild(f),c)return new Promise((S,C)=>{f.addEventListener("load",S),f.addEventListener("error",()=>C(new Error(`Unable to preload CSS for ${d}`)))})}))}function r(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return n.then(o=>{for(const a of o||[])a.status==="rejected"&&r(a.reason);return e().catch(r)})},cl=.5,hl=1e-9;function _s(s,e){const t=e.x-s.x,i=e.y-s.y,n=e.z-s.z,r=t*t+i*i+n*n;return Math.pow(Math.max(r,hl),cl)}function Ni(s,e,t,i){return{x:t*s.x+i*e.x,y:t*s.y+i*e.y,z:t*s.z+i*e.z}}function Vn(s,e){return{x:2*s.x-e.x,y:2*s.y-e.y,z:2*s.z-e.z}}function ul(s,e,t,i,n){const o=0+_s(s,e),a=o+_s(e,t),l=a+_s(t,i),d=o+n*(a-o),c=Ni(s,e,(o-d)/(o-0),(d-0)/(o-0)),u=Ni(e,t,(a-d)/(a-o),(d-o)/(a-o)),h=Ni(t,i,(l-d)/(l-a),(d-a)/(l-a)),f=Ni(c,u,(a-d)/(a-0),(d-0)/(a-0)),S=Ni(u,h,(l-d)/(l-o),(d-o)/(l-o));return Ni(f,S,(a-d)/(a-o),(d-o)/(a-o))}function kn(s,e=16){const t=s.length;if(t===0)return{samples:[],controlIndex:[]};if(t===1)return{samples:[{...s[0]}],controlIndex:[0]};const i=[],n=[];for(let r=0;r<t-1;r++){const o=s[r],a=s[r+1],l=r>0?s[r-1]:Vn(o,a),d=r+2<t?s[r+2]:Vn(a,o);n.push(i.length),i.push({...o});for(let c=1;c<e;c++){const u=c/e;i.push(ul(l,o,a,d,u))}}return n.push(i.length),i.push({...s[t-1]}),{samples:i,controlIndex:n}}function Fa(s,e,t,i,n,r){const o=n-i,a=r-n,l=r-i,d=(c,u,h)=>(u-c)/o-(h-c)/l+(h-u)/a;return{x:d(s.x,e.x,t.x),y:d(s.y,e.y,t.y),z:d(s.z,e.z,t.z)}}function fl(s,e,t,i){const n=_s(s,e),r=n+_s(e,t),o=r+_s(t,i),a=r-n,l=Fa(s,e,t,0,n,r),d=Fa(e,t,i,n,r,o);return{c1:{x:e.x+l.x*a/3,y:e.y+l.y*a/3,z:e.z+l.z*a/3},c2:{x:t.x-d.x*a/3,y:t.y-d.y*a/3,z:t.z-d.z*a/3},end:{...t}}}function xl(s){const e=s.length;if(e===0)return{start:{x:0,y:0,z:0},segments:[]};if(e===1)return{start:{...s[0]},segments:[]};if(e===2){const[i,n]=s;return{start:{...i},segments:[{c1:Ni(i,n,2/3,1/3),c2:Ni(i,n,1/3,2/3),end:{...n}}]}}const t=[];for(let i=0;i<e-1;i++){const n=s[i],r=s[i+1],o=i>0?s[i-1]:Vn(n,r),a=i+2<e?s[i+2]:Vn(r,n);t.push(fl(o,n,r,a))}return{start:{...s[0]},segments:t}}function ar(s){const t=new Array(s+3+1).fill(0);for(let n=s;n<=s+3;n++)t[n]=1;const i=s-3-1;for(let n=1;n<=i;n++)t[3+n]=n/(i+1);return t}function i1(s,e,t){if(t>=s[e+1])return e;if(t<=s[3])return 3;let i=3,n=e+1,r=i+n>>1;for(;t<s[r]||t>=s[r+1];)t<s[r]?n=r:i=r,r=i+n>>1;return r}function s1(s,e,t){const i=[1,0,0,0],n=[0,0,0,0],r=[0,0,0,0];for(let o=1;o<=3;o++){n[o]=t-s[e+1-o],r[o]=s[e+o]-t;let a=0;for(let l=0;l<o;l++){const d=r[l+1]+n[o-l];if(d<1e-12)continue;const c=i[l]/d;i[l]=a+r[l+1]*c,a=n[o-l]*c}i[o]=a}return i}function pl(s){const e=s.length;if(e<=1)return[0];const t=[0];for(let n=1;n<e;n++){const r=s[n].x-s[n-1].x,o=s[n].y-s[n-1].y,a=s[n].z-s[n-1].z;t.push(t[n-1]+Math.sqrt(r*r+o*o+a*a))}const i=t[e-1];return i<1e-10?s.map((n,r)=>r/(e-1)):t.map(n=>n/i)}function Sl(s,e){const t=e.length,i=s.map((r,o)=>[...r,e[o]]);for(let r=0;r<t;r++){let o=r;for(let a=r+1;a<t;a++)Math.abs(i[a][r])>Math.abs(i[o][r])&&(o=a);if([i[r],i[o]]=[i[o],i[r]],Math.abs(i[r][r])<1e-12)throw new Error("singular");for(let a=r+1;a<t;a++){const l=i[a][r]/i[r][r];for(let d=r;d<=t;d++)i[a][d]-=l*i[r][d]}}const n=new Array(t).fill(0);for(let r=t-1;r>=0;r--){n[r]=i[r][t];for(let o=r+1;o<t;o++)n[r]-=i[r][o]*n[o];n[r]/=i[r][r]}return n}function dr(s,e){const t=s.length,i=s[0].length,n=Array.from({length:i},()=>new Array(i).fill(0)),r=new Array(i).fill(0);for(let o=0;o<t;o++)for(let a=0;a<i;a++){r[a]+=s[o][a]*e[o];for(let l=0;l<i;l++)n[a][l]+=s[o][a]*s[o][l]}return Sl(n,r)}function Zr(s,e){const t=s.length,i=pl(s);if(t<=1)return{controlPoints:t===0?[{x:0,y:0,z:0}]:[{...s[0]}],knots:ar(4),params:i};if(t<=3)return{controlPoints:s.map(y=>({...y})),knots:ar(4),params:i};e=Math.max(4,Math.min(e,t));const n=ar(e),r=e-1,o=e-2,a=t-2;if(o<=0||a<=0){const y=s[0],g=s[t-1];return{controlPoints:Array.from({length:e},(w,q)=>{const E=q/(e-1);return{x:y.x+E*(g.x-y.x),y:y.y+E*(g.y-y.y),z:y.z+E*(g.z-y.z)}}),knots:n,params:i}}const l=s[0],d=s[t-1],c=[],u=[],h=[],f=[];for(let y=1;y<t-1;y++){const g=i[y],M=i1(n,r,g),w=s1(n,M,g),q=new Array(o).fill(0);let E=s[y].x,m=s[y].y,_=s[y].z;for(let A=0;A<=3;A++){const T=M-3+A,R=w[A];T===0?(E-=R*l.x,m-=R*l.y,_-=R*l.z):T===e-1?(E-=R*d.x,m-=R*d.y,_-=R*d.z):q[T-1]=R}c.push(q),u.push(E),h.push(m),f.push(_)}let S,C,p;try{S=dr(c,u),C=dr(c,h),p=dr(c,f)}catch{const y=s[0],g=s[t-1];return{controlPoints:Array.from({length:e},(w,q)=>{const E=q/(e-1);return{x:y.x+E*(g.x-y.x),y:y.y+E*(g.y-y.y),z:y.z+E*(g.z-y.z)}}),knots:n,params:i}}return{controlPoints:[{...l},...S.map((y,g)=>({x:y,y:C[g],z:p[g]})),{...d}],knots:n,params:i}}function yl({controlPoints:s,knots:e},t){const n=s.length-1,r=Math.max(0,Math.min(1,t)),o=i1(e,n,r),a=s1(e,o,r);let l=0,d=0,c=0;for(let u=0;u<=3;u++){const h=o-3+u;l+=a[u]*s[h].x,d+=a[u]*s[h].y,c+=a[u]*s[h].z}return{x:l,y:d,z:c}}function Kr(s,e){const t=[];for(let r=0;r<e;r++){const o=r/(e-1);t.push(yl(s,o))}const i=[];let n=-1;for(const r of s.params){let o=Math.min(Math.floor(r*(e-1)),e-1);o<=n&&(o=n+1),o>=e&&(o=e-1),i.push(o),n=o}return{samples:t,controlIndex:i}}function ml(s,e){return[s[0][0]*e[0]+s[0][1]*e[1]+s[0][2]*e[2],s[1][0]*e[0]+s[1][1]*e[1]+s[1][2]*e[2],s[2][0]*e[0]+s[2][1]*e[1]+s[2][2]*e[2]]}function Cl(s,e){let t=e,i=Math.sqrt(t[0]*t[0]+t[1]*t[1]+t[2]*t[2]);i<1e-10?t=[1,1,1]:t=[t[0]/i,t[1]/i,t[2]/i];for(let n=0;n<40;n++){const r=ml(s,t);if(i=Math.sqrt(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]),i<1e-10)break;const o=[r[0]/i,r[1]/i,r[2]/i],a=Math.abs(o[0]*t[0]+o[1]*t[1]+o[2]*t[2]);if(t=o,1-a<1e-8)break}return t}function Jr(s,e,t=4){const i=s.length,n=s.map(r=>({...r}));for(let r=0;r<i;r++){if(!e[r])continue;const o=[];for(let y=Math.max(0,r-t);y<=Math.min(i-1,r+t);y++)e[y]&&o.push(s[y]);if(o.length<3)continue;const a={x:0,y:0,z:0};for(const y of o)a.x+=y.x,a.y+=y.y,a.z+=y.z;a.x/=o.length,a.y/=o.length,a.z/=o.length;const l=[[0,0,0],[0,0,0],[0,0,0]];for(const y of o){const g=[y.x-a.x,y.y-a.y,y.z-a.z];for(let M=0;M<3;M++)for(let w=0;w<3;w++)l[M][w]+=g[M]*g[w]}const d=o[o.length-1],c=[d.x-o[0].x,d.y-o[0].y,d.z-o[0].z],[u,h,f]=Cl(l,c),S=s[r].x-a.x,C=s[r].y-a.y,p=s[r].z-a.z,x=S*u+C*h+p*f;n[r]={x:a.x+x*u,y:a.y+x*h,z:a.z+x*f}}return n}function zl(s,e,t=4){return Jr(s,e,t)}const gl={sampleDensity:16,breakDistance:5.5,membraneCentre:0,aminosPerDof:4},Oa={helix:4,strand:2};function ql(s,e){const t=[];let i=[];const n=e*e;for(const r of s){if(i.length===0){i.push(r);continue}const o=i[i.length-1],a=r.x-o.x,l=r.y-o.y,d=r.z-o.z;a*a+l*l+d*d>n?(t.push(i),i=[r]):i.push(r)}return i.length&&t.push(i),t}function _l(s,e){const t=[...e].sort((n,r)=>n.start-r.start),i=new Map;for(const n of s){let r=0,o=t.length-1,a="coil";for(;r<=o;){const l=r+o>>1,d=t[l];if(d.end<n.resSeq)r=l+1;else if(d.start>n.resSeq)o=l-1;else{a=d.type;break}}i.set(n.resSeq,a)}return i}function vl(s,e){if(!e||s.length===0)return[{calphas:s,type:"coil",startGroupIndex:0}];const t=[];let i=[s[0]],n=e.get(s[0].resSeq)??"coil",r=0;for(let o=1;o<s.length;o++){const a=e.get(s[o].resSeq)??"coil";a!==n?(t.push({calphas:i,type:n,startGroupIndex:r}),r=o,i=[s[o]],n=a):i.push(s[o])}return i.length>0&&t.push({calphas:i,type:n,startGroupIndex:r}),t}function Ml(s,e={}){const{sampleDensity:t,breakDistance:i,membraneCentre:n,ssSegments:r,aminosPerDof:o}={...gl,...e};if(s.length===0)return{segments:[],totalArcLength:0,zMin:0,zMax:0};const a=ql(s,i),l=[];let d=0,c=1/0,u=-1/0;for(const h of a){const f=r?_l(h,r):void 0;let C=h.map(q=>({x:q.x,y:q.y,z:q.z-n}));if(f){const q=h.map(m=>(f.get(m.resSeq)??"coil")==="helix"),E=h.map(m=>(f.get(m.resSeq)??"coil")==="strand");C=Jr(C,q,Oa.helix),C=Jr(C,E,Oa.strand)}const p=vl(h,f),x=[],y=[];let g=0,M=d,w=null;for(const q of p){const E=q.calphas.length,m=C.slice(q.startGroupIndex,q.startGroupIndex+E),A={helix:o,coil:o,strand:o}[q.type],T=(E-1)*t+1,R=Math.max(4,Math.ceil(E/A));let B,V;if(E<=3||R>=E){const D=kn(m,t);B=D.samples,V=D.controlIndex}else{const D=Zr(m,R),N=Kr(D,T);B=N.samples,V=N.controlIndex}const P=[];for(const D of B){if(w){const N=D.x-w.x,W=D.y-w.y;M+=Math.sqrt(N*N+W*W)}w=D,P.push({arc:M,z:D.z,x3:D.x,y3:D.y})}for(let D=0;D<q.calphas.length;D++){const N=q.calphas[D],W=V[D],X=N.z-n;X<c&&(c=X),X>u&&(u=X),y.push({resSeq:N.resSeq,iCode:N.iCode,arc:P[W].arc,z:X,index:q.startGroupIndex+D,sampleIndex:g+W})}g+=B.length,x.push(...P)}d=x.length>0?x[x.length-1].arc:d,l.push({samples:x,residues:y})}return Number.isFinite(c)||(c=0,u=0),{segments:l,totalArcLength:d,zMin:c,zMax:u}}const bl={sampleDensity:16,breakDistance:5.5,membraneCentre:0,aminosPerDof:4};function El(s){for(;s>Math.PI;)s-=2*Math.PI;for(;s<=-Math.PI;)s+=2*Math.PI;return s}function lr(s,e){if(!s)return"coil";for(const t of s)if(e>=t.start&&e<=t.end)return t.type;return"coil"}function n1(s,e){const{centre:t,sampleDensity:i,breakDistance:n,membraneCentre:r,ssSegments:o,aminosPerDof:a}={...bl,...e};if(s.length===0)return{segments:[],totalArcLength:0,zMin:0,zMax:0};const l=o?s.map(m=>lr(o,m.resSeq)==="helix"):s.map(()=>!1),d=o?zl(s.map(m=>({x:m.x,y:m.y,z:m.z})),l):s.map(m=>({x:m.x,y:m.y,z:m.z})),c=d.map(m=>Math.hypot(m.x-t.x,m.y-t.y)),u=c.reduce((m,_)=>m+_,0)/c.length||1,h=.4*u,f=new Array(s.length);let S=Math.atan2(d[0].y-t.y,d[0].x-t.x);f[0]=u*S;let C=S;for(let m=1;m<s.length;m++){const _=Math.atan2(d[m].y-t.y,d[m].x-t.x);c[m]>=h&&c[m-1]>=h&&(S+=El(_-C)),c[m]>=h&&(C=_),f[m]=u*S}if(f[f.length-1]<f[0])for(let m=0;m<f.length;m++)f[m]=-f[m];const p=[];let x={calphas:[],pts:[],pts3d:[]};const y=n*n;for(let m=0;m<s.length;m++){const _=s[m],A={x:f[m],y:d[m].z-r,z:0},T={x:d[m].x,y:d[m].y,z:d[m].z-r};if(x.calphas.length===0){x.calphas.push(_),x.pts.push(A),x.pts3d.push(T);continue}const R=x.calphas[x.calphas.length-1],B=_.x-R.x,V=_.y-R.y,P=_.z-R.z;B*B+V*V+P*P>y?(p.push(x),x={calphas:[_],pts:[A],pts3d:[T]}):(x.calphas.push(_),x.pts.push(A),x.pts3d.push(T))}x.calphas.length&&p.push(x);const g=[];let M=1/0,w=-1/0,q=-1/0;for(const m of p){const{calphas:_,pts:A,pts3d:T}=m,R=[],B=[];let V=0,P=0,D=lr(o,_[0].resSeq);const N=(W,X,te)=>{const ne=A.slice(W,X+1),de=T.slice(W,X+1),Ae=ne.length,Fe=Math.max(4,Math.ceil(Ae/a));let Te,j,re;if(te==="helix"&&Ae>=2){const Q=ne[0],pe=ne[Ae-1],ye=(Ae-1)*i+1;Te=Array.from({length:ye},(Xe,Ye)=>{const we=Ye/(ye-1);return{x:Q.x+(pe.x-Q.x)*we,y:Q.y+(pe.y-Q.y)*we,z:0}});const ve=de[0],Je=de[Ae-1];re=Array.from({length:ye},(Xe,Ye)=>{const we=Ye/(ye-1);return{x:ve.x+(Je.x-ve.x)*we,y:ve.y+(Je.y-ve.y)*we,z:ve.z+(Je.z-ve.z)*we}});let Le=-1;j=ne.map((Xe,Ye)=>{let we=Math.round(Ye/(Ae-1)*(ye-1));return we<=Le&&(we=Le+1),Le=we,Math.min(we,ye-1)})}else if(Ae<=3||Fe>=Ae){const Q=kn(ne,i);Te=Q.samples,j=Q.controlIndex,re=kn(de,i).samples}else{const Q=Zr(ne,Fe),pe=Kr(Q,(Ae-1)*i+1);Te=pe.samples,j=pe.controlIndex;const ye=Zr(de,Fe);re=Kr(ye,(Ae-1)*i+1).samples}for(let Q=0;Q<Te.length;Q++){const pe=Te[Q],ye=re[Q];R.push({arc:pe.x,z:pe.y,x3:ye.x,y3:ye.y}),pe.x>q&&(q=pe.x)}for(let Q=0;Q<Ae;Q++){const pe=_[W+Q],ye=pe.z-r;ye<M&&(M=ye),ye>w&&(w=ye),B.push({resSeq:pe.resSeq,iCode:pe.iCode,arc:R[V+j[Q]].arc,z:ye,index:W+Q,sampleIndex:V+j[Q]})}V+=Te.length};for(let W=1;W<_.length;W++){const X=lr(o,_[W].resSeq);X!==D&&(N(P,W-1,D),P=W,D=X)}N(P,_.length-1,D),g.push({samples:R,residues:B})}Number.isFinite(M)||(M=0,w=0);let E=1/0;for(const m of g)for(const _ of m.samples)_.arc<E&&(E=_.arc);if(Number.isFinite(E)&&E!==0){for(const m of g){for(const _ of m.samples)_.arc-=E;for(const _ of m.residues)_.arc-=E}q-=E}return{segments:g,totalArcLength:Number.isFinite(q)?q:0,zMin:M,zMax:w}}function Tl(s,e={}){const t=e.threshold??12;let i=!1,n=!1;for(const r of s)if(r.z>=t?i=!0:r.z<=-t&&(n=!0),i&&n)return!0;return!1}function Al(s,e={}){const t=e.max??1,i=e.fallbackToLargest??!0,n=[...s].sort((u,h)=>h.residueCount-u.residueCount),r=n.filter(u=>Tl(u.calphas,e)),o=new Set(r.map(u=>u.chainId)),a=s.filter(u=>!o.has(u.chainId));let l=!1,d=r;return d.length===0&&i&&(d=n,l=!0),{selected:d.slice(0,t),nonTransmembrane:a,fellBackToLargest:l}}const wl={minSpacing:3.5,maxSpacing:6.5,contactCutoff:5.5,minContacts:3,minAxisDot:.5};function r1(s){if(s.length===0)return NaN;const e=[...s].sort((i,n)=>i-n),t=e.length>>1;return e.length%2?e[t]:(e[t-1]+e[t])/2}function Rl(s,e){const t=s.x-e.x,i=s.y-e.y,n=s.z-e.z;return Math.sqrt(t*t+i*i+n*n)}function Pl(s){const e=s.length,t={x:0,y:0,z:0};for(const a of s)t.x+=a.x,t.y+=a.y,t.z+=a.z;t.x/=e,t.y/=e,t.z/=e;const i={x:s[e-1].x-s[0].x,y:s[e-1].y-s[0].y,z:s[e-1].z-s[0].z};if(e<3){const a=Math.hypot(i.x,i.y,i.z)||1;return{centroid:t,axis:{x:i.x/a,y:i.y/a,z:i.z/a}}}const n=[[0,0,0],[0,0,0],[0,0,0]];for(const a of s){const l=[a.x-t.x,a.y-t.y,a.z-t.z];for(let d=0;d<3;d++)for(let c=0;c<3;c++)n[d][c]+=l[d]*l[c]}let r=[i.x,i.y,i.z],o=Math.hypot(r[0],r[1],r[2]);r=o<1e-10?[1,0,0]:[r[0]/o,r[1]/o,r[2]/o];for(let a=0;a<50;a++){const l=[n[0][0]*r[0]+n[0][1]*r[1]+n[0][2]*r[2],n[1][0]*r[0]+n[1][1]*r[1]+n[1][2]*r[2],n[2][0]*r[0]+n[2][1]*r[1]+n[2][2]*r[2]];if(o=Math.hypot(l[0],l[1],l[2]),o<1e-10)break;const d=[l[0]/o,l[1]/o,l[2]/o],c=Math.abs(d[0]*r[0]+d[1]*r[1]+d[2]*r[2]);if(r=d,1-c<1e-9)break}return r[0]*i.x+r[1]*i.y+r[2]*i.z<0&&(r=[-r[0],-r[1],-r[2]]),{centroid:t,axis:{x:r[0],y:r[1],z:r[2]}}}function Dl(s){const e=s.filter(i=>i.type==="strand").sort((i,n)=>i.start-n.start),t=[];for(const i of e){const n=t[t.length-1];n&&i.start<=n.end?n.end=Math.max(n.end,i.end):t.push({...i})}return t}function o1(s,e){const t=new Map;for(const r of s)t.set(r.resSeq,r);const i=[],n=Dl(e);for(const r of n){const o=[];for(let d=r.start;d<=r.end;d++){const c=t.get(d);c&&o.push(c)}if(o.length<2)continue;const{centroid:a,axis:l}=Pl(o);i.push({index:i.length,segment:r,calphas:o,centroid:a,axis:l})}return i}function Qr(s,e){return s.x*e.x+s.y*e.y+s.z*e.z}function Ll(s,e,t){const i=[],n=[];for(const a of s.calphas){let l=1/0,d=null;for(const c of e.calphas){const u=Rl(a,c);u<l&&(l=u,d=c)}i.push(l),d&&l<=t.contactCutoff&&n.push({aResSeq:a.resSeq,bResSeq:d.resSeq,distance:l})}const r=r1(i);if(!(r>=t.minSpacing&&r<=t.maxSpacing)||n.length<t.minContacts||Math.abs(Qr(s.axis,e.axis))<t.minAxisDot)return null;const o=Qr(s.axis,e.axis)>=0?"parallel":"antiparallel";return{a:s.index,b:e.index,orientation:o,spacing:r,contacts:n}}function Il(s,e={}){const t={...wl,...e},i=[];for(let n=0;n<s.length;n++)for(let r=n+1;r<s.length;r++){const o=Ll(s[n],s[r],t);o&&i.push(o)}return i}function Nl(s,e){var d;const t=new Set(s),i=new Map;for(const c of s)i.set(c,[]);for(const c of e)!t.has(c.a)||!t.has(c.b)||(i.get(c.a).push({other:c.b,spacing:c.spacing}),i.get(c.b).push({other:c.a,spacing:c.spacing}));const n=new Map;for(const[c,u]of i)u.sort((h,f)=>h.spacing-f.spacing),n.set(c,new Set(u.slice(0,2).map(h=>h.other)));const r=new Map;for(const c of s)r.set(c,[]);for(const[c,u]of n)for(const h of u)c<h&&((d=n.get(h))!=null&&d.has(c))&&(r.get(c).push(h),r.get(h).push(c));const o=new Set;let a=[],l=[];for(const c of s){if(o.has(c)||r.get(c).length===0)continue;const u=new Set,h=[c];for(;h.length;){const g=h.pop();if(!u.has(g)){u.add(g);for(const M of r.get(g))u.has(M)||h.push(M)}}for(const g of u)o.add(g);const f=[...u].filter(g=>r.get(g).length===1).sort((g,M)=>g-M),S=f.length>0?f[0]:Math.min(...u),C=[S];let p=-1,x=S,y=!1;for(;;){const g=r.get(x).find(M=>M!==p);if(g===void 0)break;if(g===S){y=!0;break}C.push(g),p=x,x=g}y&&C.length>a.length&&(a=C),!y&&C.length>l.length&&(l=C)}return a.length>0?{order:a,closed:!0}:{order:l,closed:!1}}function Ul(s){let e=0,t=0;for(const i of s)for(let n=1;n<i.calphas.length;n++){const r=i.calphas[n].x-i.calphas[n-1].x,o=i.calphas[n].y-i.calphas[n-1].y,a=i.calphas[n].z-i.calphas[n-1].z;e+=Math.abs(r*i.axis.x+o*i.axis.y+a*i.axis.z),t++}return t?e/t:3.3}function a1(s,e,t={}){return d1(o1(s,e),t)}function d1(s,e={}){const t=Il(s,e),i={x:0,y:0,z:1},n=new Map;for(const A of s)n.set(A.index,0);for(const A of t)n.set(A.a,(n.get(A.a)??0)+1),n.set(A.b,(n.get(A.b)??0)+1);const r=s.filter(A=>(n.get(A.index)??0)>=2),{order:o,closed:a}=Nl(r.map(A=>A.index),t),l=r.length>=3?r:s,d={x:0,y:0,z:0};let c=0;for(const A of l)for(const T of A.calphas)d.x+=T.x,d.y+=T.y,d.z+=T.z,c++;c&&(d.x/=c,d.y/=c,d.z/=c);const u={strands:s,pairings:t,closed:!1,ringOrder:o,strandCount:s.length,shear:NaN,tiltDeg:NaN,axis:i,centre:d,radius:0,cylindrical:!1};if(l.length<3)return u;let h=0;for(const A of l)h+=Math.acos(Math.min(1,Math.abs(Qr(A.axis,i))));const f=h/l.length*(180/Math.PI),S=[],C=[];for(const A of l){const T=A.centroid.x-d.x,R=A.centroid.y-d.y;S.push(Math.hypot(T,R)),C.push(Math.atan2(R,T))}const p=S.reduce((A,T)=>A+T,0)/S.length;C.sort((A,T)=>A-T);let x=C[0]+2*Math.PI-C[C.length-1];for(let A=1;A<C.length;A++)x=Math.max(x,C[A]-C[A-1]);const y=a&&l.length>=6&&p>1&&x<2.4,g=o.length>0?o.length:l.length,M=Ul(l),w=new Set(o),q=t.filter(A=>w.has(A.a)&&w.has(A.b)),E=r1(q.map(A=>A.spacing)),m=Number.isFinite(E)?E:2*Math.PI*p/g,_=g*m*Math.tan(f*Math.PI/180)/M;return{strands:s,pairings:t,closed:a,ringOrder:o,strandCount:g,shear:_,tiltDeg:f,axis:i,centre:d,radius:p,cylindrical:y}}function Fl(s){const e=[];for(const t of s)for(const i of o1(t.calphas,t.segments))e.push({...i,index:e.length,chainId:t.chainId});return e}function Ol(s,e={}){return d1(Fl(s),e)}function Bl(s,e,t,i,n){if(t<=e)return[];const r=[];for(let y=e;y<=t;y++)r.push({sx:s[y].arc*n.arcPxPerA,sy:-s[y].z*n.zPxPerA});if(r.length<2)return[];const o=new Array(r.length).fill(0),a=new Array(r.length).fill(0);for(let y=0;y<r.length;y++){let g=0,M=0;y>0&&(g+=r[y].sx-r[y-1].sx,M+=r[y].sy-r[y-1].sy),y<r.length-1&&(g+=r[y+1].sx-r[y].sx,M+=r[y+1].sy-r[y].sy);const w=Math.sqrt(g*g+M*M);w>1e-9&&(o[y]=g/w,a[y]=M/w)}const l=n.halfWidthPx,d=n.arrowHalfWidthPx,c=n.arrowLengthPx,u=r.length-1;let h=u,f=r[u].sx,S=r[u].sy,C=-a[u],p=o[u];if(i){let y=c,g=u,M=0,w=!0;for(let q=u;q>0;q--){const E=r[q].sx-r[q-1].sx,m=r[q].sy-r[q-1].sy,_=Math.sqrt(E*E+m*m);if(!(_<=0)){if(y<=_){g=q,M=1-y/_,w=!1;break}y-=_}}if(w)h=-1,f=r[0].sx,S=r[0].sy,C=-a[0],p=o[0];else{h=g-1,f=r[g-1].sx+M*(r[g].sx-r[g-1].sx),S=r[g-1].sy+M*(r[g].sy-r[g-1].sy);const q=Math.sqrt(o[h]*o[h]+a[h]*a[h]);q>1e-9&&(C=-a[h]/q,p=o[h]/q)}}const x=[];for(let y=0;y<=h;y++)x.push([r[y].sx+l*-a[y],r[y].sy+l*o[y]]);i&&(x.push([f+l*C,S+l*p]),x.push([f+d*C,S+d*p]),x.push([r[u].sx,r[u].sy]),x.push([f-d*C,S-d*p]),x.push([f-l*C,S-l*p]));for(let y=h;y>=0;y--)x.push([r[y].sx-l*-a[y],r[y].sy-l*o[y]]);return x.map(([y,g])=>[y/n.arcPxPerA,-g/n.zPxPerA])}function Ba(s,e,t){const i=s[t].arc-s[e].arc,n=s[t].z-s[e].z,r=Math.sqrt(i*i+n*n);return r<1e-9?{a:1,z:0}:{a:i/r,z:n/r}}function jo(s,e,t,i,n){const r=(i.tangentMagPx??n.defaultTangentMagPx)/n.arcPxPerA,o=n.elementGapPx/n.arcPxPerA,a=n.extremeSpacingPx/n.arcPxPerA,l=[];let d=null;if(s){const h=s.index;d={arc:s.samples[h].arc,z:s.samples[h].z};const f=Ba(s.samples,Math.max(0,h-1),h);l.push({...d,kind:"endpoint"}),l.push({arc:d.arc+r*f.a,z:d.z+r*f.z,kind:"tangent"})}let c=null,u=null;if(e){const h=e.index;c={arc:e.samples[h].arc,z:e.samples[h].z};const f=Ba(e.samples,h,Math.min(e.samples.length-1,h+1));u={arc:c.arc-r*f.a,z:c.z-r*f.z,kind:"tangent"}}if(i.extremePoints&&t){let h=-1/0,f=1/0;for(let q=t.startSample;q<=t.endSample;q++)t.samples[q].z>h&&(h=t.samples[q].z),t.samples[q].z<f&&(f=t.samples[q].z);const S=[...l.map(q=>q.z)];c&&S.push(c.z),u&&S.push(u.z);const C=Math.min(...S),p=Math.max(...S),x=p-C,y=i.extremeThreshold*x;let g=null;const M=h-p,w=C-f;if(M>y&&M>=w?g=h:w>y&&(g=f),g!==null){const q=d?d.arc+o/2:c?c.arc-o/2:0;l.push({arc:q-a/2,z:g,kind:"extreme"}),l.push({arc:q+a/2,z:g,kind:"extreme"})}}return u&&l.push(u),c&&l.push({...c,kind:"endpoint"}),l}function l1(s,e){const t=new Map;for(const r of e)for(const o of r.residues)t.set(o.resSeq,{arc:o.arc,z:o.z});const i=new Set(s.ringOrder),n=[];for(const r of s.pairings)if(!(!i.has(r.a)||!i.has(r.b)))for(const o of r.contacts){const a=t.get(o.aResSeq),l=t.get(o.bResSeq);!a||!l||n.push({a:{resSeq:o.aResSeq,arc:a.arc,z:a.z},b:{resSeq:o.bResSeq,arc:l.arc,z:l.z}})}return n}const ft="http://www.w3.org/2000/svg",Hl=`
  :host {
    display: block;
    font-family: sans-serif;
    padding: 0.5rem;
    max-width: 100%;
  }
  .protein-id {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
  }
  .chain-block { margin-top: 0.75rem; }
  .chain-label {
    font-family: monospace;
    font-size: 0.85rem;
    color: #444;
    margin-bottom: 0.25rem;
  }
  .chain-note {
    font-size: 0.8rem;
    color: #6c757d;
    font-style: italic;
    margin-top: 0.25rem;
  }
  .chain-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: #fafafa;
    border-radius: 4px;
    border: 1px solid #efefef;
  }
  .chain-violin {
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    padding: 0.25rem 0.4rem 0.3rem;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: inherit;
  }
  .chain-violin:hover { background: #eef3f8; }
  .chain-violin.selected {
    background: #e6f2ff;
    border-color: #1f77b4;
  }
  .chain-violin:focus-visible {
    outline: 2px solid #1f77b4;
    outline-offset: 1px;
  }
  .violin-label {
    font-family: monospace;
    font-size: 0.75rem;
    color: #333;
    margin-top: 0.2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
  }
  .violin-label .residues { color: #777; font-size: 0.7rem; }
  .chain-picker-label {
    font-size: 0.75rem;
    color: #6c757d;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  .svg-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }
  svg {
    display: block;
    max-width: none;
    /* no height: auto — inside overflow-x:auto containers it causes the browser
       to compute height from container width, producing a huge whitespace gap */
  }
  .placeholder { font-style: italic; color: #888; }
  .view-toggle {
    display: inline-flex;
    margin-bottom: 0.4rem;
    border: 1px solid #ced4da;
    border-radius: 5px;
    overflow: hidden;
  }
  .view-toggle button {
    font: inherit;
    font-size: 0.8rem;
    padding: 0.2rem 0.7rem;
    border: none;
    background: #fff;
    color: #495057;
    cursor: pointer;
  }
  .view-toggle button + button { border-left: 1px solid #ced4da; }
  .view-toggle button.active { background: #1f77b4; color: #fff; }
  .view-toggle button:focus-visible { outline: 2px solid #1f77b4; outline-offset: -2px; }
  .topo-stage {
    display: none;
    width: 100%;
    height: 60vh;
    min-height: 320px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    background: #f4f6f8;
  }
`,Ke={margin:{top:36,right:40,bottom:36,left:40},membraneHalf:15,zRangeMin:25,arcPxPerA:2.5,zPxPerA:2.5},si={membraneFill:"#eaeaea",membraneEdge:"#bdbdbd",zAxis:"#666",coil:"#666",helix:"#6e8db6",helixEdge:"#3e587a",strand:"#6ea76d",strandEdge:"#3d6d3d"},$i={elementGapPx:30,tangentMagPx:10,extremeThreshold:.2,extremeSpacingPx:5},Zo={defaultTangentMagPx:$i.tangentMagPx,elementGapPx:$i.elementGapPx,extremeSpacingPx:$i.extremeSpacingPx,arcPxPerA:Ke.arcPxPerA},vs={minStrandWidths:2,transitionGapWidths:4,loopTangentPx:14,capHintResidues:5},Gl=3;function Ko(s){return s.filter(e=>e.type==="coil"||e.end-e.start+1>=Gl)}function Vl(s){let e=0,t=0;for(const i of s.segments){const n=i.end-i.start+1;i.type==="helix"?e+=n:i.type==="strand"&&(t+=n)}return t>e&&t>0}function $r(s,e){for(const t of s)if(e>=t.start&&e<=t.end)return t.type;return"coil"}function c1(s,e){if(s.length===0)return[];const t=[];let i=$r(e,s[0].resSeq),n=s[0].sampleIndex,r=0;for(let a=1;a<s.length;a++){const l=$r(e,s[a].resSeq);l!==i&&(t.push({type:i,startSample:n,endSample:s[a].sampleIndex,startResSeq:s[r].resSeq,endResSeq:s[a-1].resSeq,endResSampleIdx:s[a-1].sampleIndex,residueStart:r,residueEnd:a-1}),i=l,n=s[a].sampleIndex,r=a)}const o=s.length-1;return t.push({type:i,startSample:n,endSample:s[o].sampleIndex,startResSeq:s[r].resSeq,endResSeq:s[o].resSeq,endResSampleIdx:s[o].sampleIndex,residueStart:r,residueEnd:o}),t}const es={halfWidthPx:4,arrowHalfWidthPx:6,arrowLengthPx:12},Ha={helix:{fill:si.helix,stroke:si.helixEdge},strand:{fill:si.strand,stroke:si.strandEdge}},on={fontSizePx:11,gapPx:3,tangentStepSamples:3,fill:"#333"};function kl(s,e){return s.length*e*.6}function Ga(s,e,t,i,n,r){if(e.length<2)return;const o=e[t].arc*Ke.arcPxPerA,a=-e[t].z*Ke.zPxPerA,l=on.tangentStepSamples,d=n?t:Math.max(0,t-l),c=n?Math.min(e.length-1,t+l):t;if(d===c)return;const u=(e[c].arc-e[d].arc)*Ke.arcPxPerA,h=-(e[c].z-e[d].z)*Ke.zPxPerA,f=Math.hypot(u,h);if(f<1e-9)return;const S=n?-1:1,C=S*u/f,p=S*h/f,x=String(i),y=on.fontSizePx,g=kl(x,y),M=y,q=Math.abs(C)*(g/2)+Math.abs(p)*(M/2)+on.gapPx,E=o+C*q,m=a+p*q;r.push({cx:E,cy:m,w:g,h:M});const _=document.createElementNS(ft,"text");_.setAttribute("x",E.toFixed(2)),_.setAttribute("y",m.toFixed(2)),_.setAttribute("text-anchor","middle"),_.setAttribute("dominant-baseline","central"),_.setAttribute("font-size",`${y}`),_.setAttribute("fill",on.fill),_.textContent=x,s.appendChild(_)}function h1(s,e,t){const i=t-e+1;if(i<6)return t;const n=e+Math.floor(i*2/3),r=(s[n].arc-s[e].arc)*Ke.arcPxPerA,o=-(s[n].z-s[e].z)*Ke.zPxPerA,a=Math.sqrt(r*r+o*o);if(a<1e-9)return t;const l=r/a,d=o/a,c=Math.cos(25*Math.PI/180),u=Math.floor(i*.4);for(let h=t;h>t-u&&h>e+1;h--){const f=(s[h].arc-s[h-1].arc)*Ke.arcPxPerA,S=-(s[h].z-s[h-1].z)*Ke.zPxPerA,C=Math.sqrt(f*f+S*S);if((C>1e-9?(f*l+S*d)/C:1)>=c)return h}return t}function Wl(s,e,t,i,n,r,o=!1){const a=Bl(e,t,i,r,{halfWidthPx:es.halfWidthPx,arrowHalfWidthPx:es.arrowHalfWidthPx,arrowLengthPx:es.arrowLengthPx,arcPxPerA:Ke.arcPxPerA,zPxPerA:Ke.zPxPerA});if(a.length===0)return;const l=a.map(([c,u])=>`${c.toFixed(3)},${u.toFixed(3)}`).join(" "),d=document.createElementNS(ft,"polygon");d.setAttribute("points",l),d.setAttribute("fill",Ha[n].fill),d.setAttribute("stroke",Ha[n].stroke),d.setAttribute("stroke-width","1.5"),d.setAttribute("stroke-linejoin","round"),d.setAttribute("vector-effect","non-scaling-stroke"),o&&d.setAttribute("opacity","0.32"),s.appendChild(d)}const Xl={endpoint:"#1f77b4",tangent:"#2ca02c",extreme:"#d62728"};function u1(s,e,t,i,n,r=!1){if(t.length<2)return;const o=t.map(c=>({x:c.arc,y:c.z,z:0})),a=xl(o);let l=`M${a.start.x.toFixed(2)},${a.start.y.toFixed(2)}`;for(const c of a.segments)l+=` C${c.c1.x.toFixed(2)},${c.c1.y.toFixed(2)} ${c.c2.x.toFixed(2)},${c.c2.y.toFixed(2)} ${c.end.x.toFixed(2)},${c.end.y.toFixed(2)}`;const d=document.createElementNS(ft,"path");if(d.setAttribute("d",l),d.setAttribute("fill","none"),d.setAttribute("stroke",si.coil),d.setAttribute("stroke-width","1.8"),d.setAttribute("stroke-linecap","round"),d.setAttribute("stroke-linejoin","round"),d.setAttribute("vector-effect","non-scaling-stroke"),i&&d.setAttribute("stroke-dasharray","3 5"),r&&d.setAttribute("opacity","0.32"),s.appendChild(d),n)for(const c of t){const u=document.createElementNS(ft,"circle");u.setAttribute("class","loop-debug-point"),u.setAttribute("cx",(c.arc*Ke.arcPxPerA).toFixed(2)),u.setAttribute("cy",(-c.z*Ke.zPxPerA).toFixed(2)),u.setAttribute("r","2.5"),u.setAttribute("fill",Xl[c.kind]),u.setAttribute("stroke","#fff"),u.setAttribute("stroke-width","0.5"),e.appendChild(u)}}function Yl(s,e,t,i,n,r,o,a,l=!1){const d=n?{samples:t,index:n.endResSampleIdx}:null,c=r?{samples:t,index:r.startSample}:null,u={samples:t,startSample:i.startSample,endSample:i.endSample},h=jo(d,c,u,a,Zo);let f=!1;for(let S=1;S<o.length;S++)if(o[S].resSeq-o[S-1].resSeq>1){f=!0;break}u1(s,e,h,f,a.showPoints,l)}function jl(s,e){var o,a;const t=$i.elementGapPx/Ke.arcPxPerA,i=[];let n=0,r=0;for(const l of s){const d=c1(l.residues,e),c=l.samples.length;if(d.length===0){const C=((o=l.samples[0])==null?void 0:o.arc)??0,p=n-C,x=l.samples.map(g=>({...g,arc:g.arc+p})),y=n+((((a=l.samples[c-1])==null?void 0:a.arc)??C)-C);i.push({samples:x,residues:l.residues,runs:d}),y>r&&(r=y),n=y+t;continue}const u=new Array(c).fill(NaN);let h=0;for(let C=0;C<d.length;C++){const p=d[C],x=n-l.samples[p.startSample].arc;C===0&&(h=x);const y=C<d.length-1?d[C+1].startSample:c;for(let g=p.startSample;g<y;g++)u[g]=x;p.type==="helix"||p.type==="strand"?n+=l.samples[p.endResSampleIdx].arc-l.samples[p.startSample].arc:n+=t}let f=h;for(let C=0;C<c;C++)Number.isNaN(u[C])?u[C]=f:f=u[C];const S=l.samples.map((C,p)=>({...C,arc:C.arc+u[p]}));i.push({samples:S,residues:l.residues,runs:d}),n>r&&(r=n),n+=t}return{layouts:i,totalArc:r}}function Va(s,e,t=!1){const i=es.halfWidthPx*2,n=vs.minStrandWidths*i/Ke.arcPxPerA,r=vs.transitionGapWidths*i/Ke.arcPxPerA,o=vs.minStrandWidths*i/Ke.arcPxPerA,a=[];let l=-1/0,d=-1/0,c=!1;const u=s.map(x=>{const y=c1(x.residues,e),g=x.samples.length,M=new Array(g).fill(NaN);t||(a.length=0,l=-1/0,d=-1/0,c=!1);for(const q of y){if(q.type!=="strand"&&q.type!=="helix")continue;const E=q.type==="helix",m=[];for(let D=q.residueStart;D<=q.residueEnd;D++){const N=x.residues[D];m.push({arc:N.arc,z:N.z})}let _=1/0,A=-1/0;for(const D of m)D.arc<_&&(_=D.arc),D.arc>A&&(A=D.arc);const T=(_+A)/2,R=A-_,B=m.length-1,V=m.map((D,N)=>E?B>0?N/B*R:0:D.arc-_);let P=_;if(a.length>0)if(E||c){const D=d+r-V[0];let N=-1/0;for(const W of a)for(let X=0;X<m.length;X++)for(const te of W){const ne=m[X].z-te.z;if(Math.abs(ne)>=o)continue;const de=Math.sqrt(o*o-ne*ne)+te.arc-V[X];de>N&&(N=de)}P=Math.max(D,Number.isFinite(N)?N:-1/0)}else{let D=-1/0;for(const W of a)for(const X of m)for(const te of W){const ne=X.z-te.z;if(Math.abs(ne)>=n)continue;const de=Math.sqrt(n*n-ne*ne)+te.arc-X.arc;de>D&&(D=de)}const N=Math.max(Number.isFinite(D)?D:-1/0,l+n-T);P=_+N}if(E){const D=q.endResSampleIdx-q.startSample;for(let N=q.startSample;N<=q.endResSampleIdx;N++)M[N]=P+(D>0?(N-q.startSample)/D:0)*R}else{const D=P-_;for(let N=q.startSample;N<=q.endResSampleIdx;N++)M[N]=x.samples[N].arc+D}a.push(m.map((D,N)=>({arc:P+V[N],z:D.z}))),l=P+R/2,d=P+V[B],c=E}const w=M.findIndex(q=>!Number.isNaN(q));if(w===-1)for(let q=0;q<g;q++)M[q]=x.samples[q].arc;else{for(let E=0;E<w;E++)M[E]=M[w];let q=w;for(let E=w+1;E<g;E++)if(!Number.isNaN(M[E])){if(E>q+1){const m=M[q],_=M[E];for(let A=q+1;A<E;A++)M[A]=m+(_-m)*(A-q)/(E-q)}q=E}for(let E=q+1;E<g;E++)M[E]=M[q]}return{segment:x,runs:y,newArc:M}});let h=1/0,f=-1/0;for(const x of u)for(const y of x.newArc)y<h&&(h=y),y>f&&(f=y);const S=Number.isFinite(h)?-h:0,C=u.map(({segment:x,runs:y,newArc:g})=>({samples:x.samples.map((M,w)=>({...M,arc:g[w]+S})),residues:x.residues.map(M=>({...M,arc:g[M.sampleIndex]+S})),runs:y})),p=Number.isFinite(f)?f-h:0;return{layouts:C,totalArc:p}}function Zl(s,e,t){const i=document.createElementNS(ft,"g");i.setAttribute("class","contact-ties");for(const{a:n,b:r}of l1(e,t)){const o=document.createElementNS(ft,"line");o.setAttribute("x1",n.arc.toFixed(3)),o.setAttribute("y1",n.z.toFixed(3)),o.setAttribute("x2",r.arc.toFixed(3)),o.setAttribute("y2",r.z.toFixed(3)),o.setAttribute("stroke","#9aa0a6"),o.setAttribute("stroke-width","0.8"),o.setAttribute("stroke-dasharray","2 2"),o.setAttribute("stroke-opacity","0.7"),o.setAttribute("vector-effect","non-scaling-stroke"),i.appendChild(o)}s.appendChild(i)}function Kl(s,e){const t=s.ringOrder.map(n=>s.strands[n].segment),i=e.filter(n=>n.type==="helix");return[...t,...i].sort((n,r)=>n.start-r.start)}function Jl(s,e,t){const i=new Map(s.map(c=>[c.chainId,c])),n=[];for(const c of e.ringOrder){const u=e.strands[c].chainId;u&&!n.includes(u)&&n.push(u)}const r=[],o=[],a=new Map;let l=1/0,d=-1/0;for(const c of n){const u=i.get(c);if(!u)continue;const h=e.ringOrder.map(g=>e.strands[g]).filter(g=>g.chainId===c).map(g=>g.segment);if(h.length===0)continue;const f=Math.min(...h.map(g=>g.start)),S=Math.max(...h.map(g=>g.end)),C=c===t?vs.capHintResidues:0,p=u.calphas.filter(g=>g.resSeq>=f-C&&g.resSeq<=S+C),x=h.map(g=>({...g}));for(const g of x)a.set(`${g.start}-${g.end}`,g);const y=n1(p,{ssSegments:x,centre:e.centre});for(const g of y.segments)r.push(g),o.push(c===t);l=Math.min(l,y.zMin),d=Math.max(d,y.zMax)}return Number.isFinite(l)||(l=0,d=0),{segments:r,focal:o,wallSegments:[...a.values()],zMin:l,zMax:d}}function f1(s,e,t){const i=t?Jl(t.chains,t.analysis,t.focalChainId):null,n=i!==null||e.cylindrical,r=Ko(s.segments),o=i?i.wallSegments:e.cylindrical?Kl(e,r):r,a=i?{segments:i.segments,zMin:i.zMin,zMax:i.zMax}:e.cylindrical?n1(s.calphas,{ssSegments:o,centre:e.centre}):Ml(s.calphas,{ssSegments:o}),{layouts:l,totalArc:d}=i?Va(a.segments,o,!0):e.cylindrical?Va(a.segments,o):jl(a.segments,o);return{asm:i,useUnwrap:n,cylindrical:e.cylindrical,layouts:l,totalArc:d,focalFlags:i?i.focal:null,zMin:a.zMin,zMax:a.zMax}}function Ql(s,e,t,i,n){const{asm:r,useUnwrap:o,layouts:a,totalArc:l,focalFlags:d,zMin:c,zMax:u}=f1(s,t,n),h=o?{...e,extremePoints:!1,tangentMagPx:vs.loopTangentPx}:e,f=Math.max(Ke.zRangeMin,Math.abs(c),Math.abs(u)),S=Math.max(200,l*Ke.arcPxPerA),C=f*2*Ke.zPxPerA,p=Ke.margin.left+S+Ke.margin.right,x=Ke.margin.top+C+Ke.margin.bottom,y=document.createElementNS(ft,"svg");y.setAttribute("xmlns",ft),y.setAttribute("viewBox",`0 0 ${p} ${x}`),y.setAttribute("width",`${p}`),y.setAttribute("height",`${x}`),y.setAttribute("role","img"),y.setAttribute("aria-label",n?`Chain ${s.chainId} highlighted in a ${n.analysis.strandCount}-strand assembly β-barrel`:`Chain ${s.chainId} membrane unrolling`);const g=document.createElementNS(ft,"g"),M=Ke.margin.left,w=Ke.margin.top+C/2;g.setAttribute("transform",`translate(${M}, ${w}) scale(${Ke.arcPxPerA}, ${-2.5})`),y.appendChild(g);const q=document.createElementNS(ft,"rect");q.setAttribute("x","0"),q.setAttribute("y","-15"),q.setAttribute("width",`${l.toFixed(2)}`),q.setAttribute("height",`${Ke.membraneHalf*2}`),q.setAttribute("fill",si.membraneFill),q.setAttribute("fill-opacity","0.55"),q.setAttribute("stroke",si.membraneEdge),q.setAttribute("vector-effect","non-scaling-stroke"),g.appendChild(q);const E=document.createElementNS(ft,"line");E.setAttribute("x1","0"),E.setAttribute("x2",`${l.toFixed(2)}`),E.setAttribute("y1","0"),E.setAttribute("y2","0"),E.setAttribute("stroke",si.zAxis),E.setAttribute("stroke-dasharray","4 4"),E.setAttribute("vector-effect","non-scaling-stroke"),g.appendChild(E);const m=r!==null||Vl(s);i&&o&&!r&&Zl(g,t,a);const _=document.createElementNS(ft,"g");_.setAttribute("transform",`translate(${M}, ${w})`),_.setAttribute("font-family","sans-serif");const A=[],T=document.createElementNS(ft,"g");T.setAttribute("transform",`translate(${M}, ${w})`);for(let W=0;W<a.length;W++){const X=a[W],te=!r&&W>0,ne=!r&&W<a.length-1;if(t2(g,_,T,X,m,A,h,te,ne,d?!d[W]:!1),!r&&W>0){const de=a[W-1],Ae=$l(de),Fe=e2(X),Te=Ae?{samples:de.samples,index:Ae.endResSampleIdx}:{samples:de.samples,index:de.samples.length-1},j=Fe?{samples:X.samples,index:Fe.startSample}:{samples:X.samples,index:0},re=jo(Te,j,null,h,Zo);u1(g,T,re,!0,h.showPoints)}}y.appendChild(_),y.appendChild(T);let R=0,B=p,V=0,P=x;for(const W of A){const X=W.cx-W.w/2,te=W.cx+W.w/2,ne=W.cy-W.h/2,de=W.cy+W.h/2;X<R&&(R=X),te>B&&(B=te),ne<V&&(V=ne),de>P&&(P=de)}const D=B-R,N=P-V;return(D>p||N>x)&&(y.setAttribute("viewBox",`${R} ${V} ${D} ${N}`),y.setAttribute("width",`${D}`),y.setAttribute("height",`${N}`)),y}function Wn(s){return!!s&&(s.type==="helix"||s.type==="strand")}function $l(s){for(let e=s.runs.length-1;e>=0;e--)if(Wn(s.runs[e]))return s.runs[e];return null}function e2(s){for(const e of s.runs)if(Wn(e))return e;return null}function t2(s,e,t,i,n,r,o,a=!1,l=!1,d=!1){const{samples:c,residues:u}=i,h=n?i.runs.map(f=>{if(f.type!=="strand")return f;const S=h1(c,f.startSample,f.endResSampleIdx);return S===f.endResSampleIdx?f:{...f,endResSampleIdx:S}}):i.runs;for(let f=0;f<h.length;f++){const S=h[f];if(S.type==="helix"||S.type==="strand"){const y=n&&S.type==="strand";Wl(s,c,S.startSample,S.endResSampleIdx,S.type,y,d),d||(Ga(e,c,S.startSample,S.startResSeq,!0,r),S.endResSeq!==S.startResSeq&&Ga(e,c,S.endResSampleIdx,S.endResSeq,!1,r));continue}const C=Wn(h[f-1])?h[f-1]:null,p=Wn(h[f+1])?h[f+1]:null;if(C===null&&a||p===null&&l)continue;const x=u.slice(S.residueStart,S.residueEnd+1);Yl(s,t,c,S,C,p,x,o,d)}}const js={width:64,height:180,margin:{top:6,right:6,bottom:6,left:6},zRangeMin:30,bins:60,smoothingSigma:1.8};function cr(s,e){if(s.length===0)return s.slice();const t=Math.max(1,Math.ceil(e*3)),i=[];for(let o=-t;o<=t;o++)i.push(Math.exp(-(o*o)/(2*e*e)));const n=i.reduce((o,a)=>o+a,0);for(let o=0;o<i.length;o++)i[o]/=n;const r=new Array(s.length).fill(0);for(let o=0;o<s.length;o++){let a=0,l=0;for(let d=-t;d<=t;d++){const c=o+d;if(c<0||c>=s.length)continue;const u=i[d+t];a+=s[c]*u,l+=u}r[o]=l>0?a/l:0}return r}function i2(s,e,t,i){const n=new Array(e).fill(0),r=new Array(e).fill(0),o=new Array(e).fill(0),a=i-t;if(a>0)for(const S of s.calphas){if(S.z<t||S.z>i)continue;const C=(S.z-t)/a,p=Math.min(e-1,Math.max(0,Math.floor(C*e))),x=$r(s.segments,S.resSeq);x==="helix"?n[p]++:x==="strand"?r[p]++:o[p]++}const l=js.smoothingSigma,d=cr(n,l),c=cr(r,l),u=cr(o,l),h=new Array(e);let f=0;for(let S=0;S<e;S++)h[S]=d[S]+c[S]+u[S],h[S]>f&&(f=h[S]);return{helix:d,strand:c,coil:u,total:h,maxBinTotal:f}}function Ns(s,e,t,i){const n=s.length;if(n===0)return"";const r=[];r.push(`M ${t*e[0]} ${i(-.5)}`);for(let o=0;o<n;o++)r.push(`L ${t*(e[o]+s[o])} ${i(o)}`);r.push(`L ${t*(e[n-1]+s[n-1])} ${i(n-.5)}`),r.push(`L ${t*e[n-1]} ${i(n-.5)}`);for(let o=n-1;o>=0;o--)r.push(`L ${t*e[o]} ${i(o)}`);return r.push("Z"),r.join(" ")}function s2(s,e,t,i){const{width:n,height:r,margin:o,bins:a}=js,l=n-o.left-o.right,d=r-o.top-o.bottom,c=document.createElementNS(ft,"svg");c.setAttribute("xmlns",ft),c.setAttribute("viewBox",`0 0 ${n} ${r}`),c.setAttribute("width",`${n}`),c.setAttribute("height",`${r}`),c.setAttribute("role","img"),c.setAttribute("aria-hidden","true");const u=d/(i-t),h=e>0?l/2/e:0,f=o.left+l/2,S=o.top+d/2,C=document.createElementNS(ft,"g");C.setAttribute("transform",`translate(${f}, ${S})`),c.appendChild(C);const p=document.createElementNS(ft,"rect");p.setAttribute("x",`${-l/2}`),p.setAttribute("y",`${-15*u}`),p.setAttribute("width",`${l}`),p.setAttribute("height",`${Ke.membraneHalf*2*u}`),p.setAttribute("fill","#e8edf3"),C.appendChild(p);const x=document.createElementNS(ft,"line");x.setAttribute("x1",`${-l/2}`),x.setAttribute("x2",`${l/2}`),x.setAttribute("y1","0"),x.setAttribute("y2","0"),x.setAttribute("stroke","#bdbdbd"),x.setAttribute("stroke-dasharray","2 3"),C.appendChild(x);const y=R=>-(t+(R+.5)*(i-t)/a)*u,g=s.helix.map(R=>R*h),M=s.strand.map(R=>R*h),w=s.coil.map(R=>R*h),q=new Array(a).fill(0),E=q,m=g,_=g.map((R,B)=>R+M[B]);for(const R of[-1,1]){const B=document.createElementNS(ft,"path");B.setAttribute("d",Ns(w,_,R,y)),B.setAttribute("fill",si.coil),B.setAttribute("opacity","0.35"),C.appendChild(B);const V=document.createElementNS(ft,"path");V.setAttribute("d",Ns(M,m,R,y)),V.setAttribute("fill",si.strand),C.appendChild(V);const P=document.createElementNS(ft,"path");P.setAttribute("d",Ns(g,E,R,y)),P.setAttribute("fill",si.helix),C.appendChild(P)}const A=s.total.map(R=>R*h),T=document.createElementNS(ft,"path");return T.setAttribute("d",Ns(A,q,1,y)+" "+Ns(A,q,-1,y)),T.setAttribute("fill","none"),T.setAttribute("stroke","#5b6f8a"),T.setAttribute("stroke-width","0.8"),T.setAttribute("stroke-linejoin","round"),C.appendChild(T),c}function n2(s){const e=[1e3,900,500,400,100,90,50,40,10,9,5,4,1],t=["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];let i="";for(let n=0;n<e.length;n++)for(;s>=e[n];)i+=t[n],s-=e[n];return i}function r2(s){const e=new Map;for(const i of s){const n=e.get(i.residueCount)??[];n.push(i),e.set(i.residueCount,n)}const t=new Map;for(const i of e.values())for(let n=0;n<i.length;n++){const r=i[n];if(i.length>1){const o=n2(n+1);t.set(r.chainId,{base:i[0].chainId,suffix:o,text:`${i[0].chainId}(${o})`})}else t.set(r.chainId,{base:r.chainId,suffix:null,text:r.chainId})}return t}function x1(s){const e=document.createElement("span");if(e.textContent=s.base,s.suffix){const t=document.createElement("sub");t.textContent=s.suffix,e.appendChild(t)}return e}function o2(s,e,t,i){const n=document.createElement("div");n.className="chain-picker",n.setAttribute("role","group");let r=1/0,o=-1/0;for(const d of s)for(const c of d.calphas)c.z<r&&(r=c.z),c.z>o&&(o=c.z);Number.isFinite(r)||(r=-30,o=js.zRangeMin),r=Math.min(r,-30),o=Math.max(o,js.zRangeMin);const a=s.map(d=>i2(d,js.bins,r,o)),l=Math.max(0,...a.map(d=>d.maxBinTotal));for(let d=0;d<s.length;d++){const c=s[d],u=e.get(c.chainId),h=document.createElement("button");h.type="button",h.className="chain-violin"+(c.chainId===t?" selected":""),h.setAttribute("aria-pressed",c.chainId===t?"true":"false"),h.setAttribute("aria-label",`Select chain ${u.text} (${c.residueCount} residues)`),h.appendChild(s2(a[d],l,r,o));const f=document.createElement("div");f.className="violin-label";const S=x1(u),C=document.createElement("span");C.className="residues",C.textContent=`${c.residueCount} aa`,f.append(S,C),h.appendChild(f),h.addEventListener("click",()=>i(c.chainId)),n.appendChild(h)}return n}let a2=0;const za=class za extends HTMLElement{constructor(){super(),this._instanceId=++a2,this._data=null,this._selectedChainId=null,this._assemblyCache=null,this._view3d=null,this._morphRaf=0;const e=this.attachShadow({mode:"open"});this._styleEl=document.createElement("style"),this._styleEl.textContent=Hl,this._contentEl=document.createElement("div"),e.append(this._styleEl,this._contentEl)}assemblyAnalysis(e){if(this._assemblyCache&&this._assemblyCache.data===this._data)return this._assemblyCache.analysis;const t=Ol(e);return this._data&&(this._assemblyCache={data:this._data,analysis:t}),t}get proteinData(){return this._data}set proteinData(e){this._data=e,this._selectedChainId=null,this.render()}attributeChangedCallback(e,t,i){if(e==="debug-loops"||e==="loop-extreme-points"||e==="loop-extreme-threshold"||e==="show-contacts"){this.render();return}if(e==="protein-data"){if(i===null)this._data=null;else try{this._data=JSON.parse(i)}catch{this._data=null}this._selectedChainId=null,this.render()}}get showLoopPoints(){const e=this.getAttribute("debug-loops");return e!==null&&["on","true","show","1"].includes(e.toLowerCase())}get showContacts(){const e=this.getAttribute("show-contacts");return e!==null&&["on","true","show","1"].includes(e.toLowerCase())}get loopOptions(){const e=this.getAttribute("loop-extreme-points"),t=e===null||!["off","false","none","0"].includes(e.toLowerCase()),i=Number.parseFloat(this.getAttribute("loop-extreme-threshold")??""),n=Number.isFinite(i)?i:$i.extremeThreshold;return{showPoints:this.showLoopPoints,extremePoints:t,extremeThreshold:n}}connectedCallback(){this.render()}disconnectedCallback(){this.teardown3d()}teardown3d(){var e;cancelAnimationFrame(this._morphRaf),this._morphRaf=0,(e=this._view3d)==null||e.dispose(),this._view3d=null}animateMorph(e,t,i){cancelAnimationFrame(this._morphRaf);const n=this._view3d;if(!n){i==null||i();return}if(t){n.setT(e),i==null||i();return}const r=n.morph,o=performance.now(),a=3300,l=d=>{const c=Math.min(1,(d-o)/a),u=c*c*(3-2*c);n.setT(r+(e-r)*u),c<1?this._morphRaf=requestAnimationFrame(l):i==null||i()};this._morphRaf=requestAnimationFrame(l)}prefersReducedMotion(){return typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches}async enter3d(e,t,i,n,r,o,a){var d;if(i.classList.remove("active"),n.classList.add("active"),!this._view3d){const[{buildScene:c},{TopologyView3D:u}]=await Promise.all([Ua(()=>Promise.resolve().then(()=>z2),void 0,import.meta.url),Ua(()=>Promise.resolve().then(()=>Rx),void 0,import.meta.url)]);if(!n.classList.contains("active"))return;const h=new u(e);h.setFlatPixelScale(Ke.arcPxPerA),h.setScene(c(r,{analysis:o,assembly:a})),h.setT(0),this._view3d=h}const l=t.querySelector("svg");if(l){const c=l.getBoundingClientRect(),u=t.clientWidth||c.width;c.width>0&&c.height>0&&(e.style.width=`${Math.round(Math.min(c.width,u))}px`,e.style.height=`${Math.round(c.height)}px`,e.style.minHeight="0")}t.style.display="none",e.style.display="block",(d=this._view3d)==null||d.resize(),this.animateMorph(1,this.prefersReducedMotion())}exit3d(e,t,i,n){if(n.classList.remove("active"),i.classList.add("active"),!this._view3d){t.style.display="",e.style.display="none";return}this.animateMorph(0,this.prefersReducedMotion(),()=>{this.teardown3d(),e.style.display="none",e.replaceChildren(),t.style.display=""})}render(){var q,E,m;if(this.teardown3d(),this._contentEl.replaceChildren(),!this._data){const _=document.createElement("div");_.className="placeholder",_.textContent="Loading…",this._contentEl.appendChild(_);return}const e=document.createElement("div");e.setAttribute("role","region"),e.setAttribute("aria-label","Protein topology");const t=document.createElement("div");t.className="protein-id",t.textContent=this._data.pdbId,e.appendChild(t);const i=this._data.chains.filter(_=>Array.isArray(_.calphas)&&_.calphas.length>0);if(i.length===0){const _=document.createElement("div");_.className="placeholder",_.textContent="No Cα coordinates available for this protein.",e.appendChild(_),this._contentEl.appendChild(e);return}const n=Al(i,{max:1}),r=((q=n.selected[0])==null?void 0:q.chainId)??((E=i[0])==null?void 0:E.chainId)??null,o=this._selectedChainId&&((m=i.find(_=>_.chainId===this._selectedChainId))==null?void 0:m.chainId)||r,a=r2(i);if(i.length>1&&o){const _=`chain-picker-label-${this._instanceId}`,A=document.createElement("div");A.className="chain-picker-label",A.id=_,A.textContent="Select chain",e.appendChild(A);const T=o2(i,a,o,R=>{this._selectedChainId=R,this.render()});T.setAttribute("aria-labelledby",_),e.appendChild(T)}const l=i.find(_=>_.chainId===o)??i[0];if(!l){this._contentEl.appendChild(e);return}const d=a.get(l.chainId)??{base:l.chainId,suffix:null,text:l.chainId};if(!n.fellBackToLargest&&n.selected[0]&&l.chainId!==n.selected[0].chainId){const _=document.createElement("div");_.className="chain-note",_.textContent=`Chain ${d.text} does not appear to span the membrane.`,e.appendChild(_)}else if(n.fellBackToLargest){const _=document.createElement("div");_.className="chain-note",_.textContent="No chain in this protein crosses the bilayer.",e.appendChild(_)}const c=document.createElement("div");c.className="chain-block";const u=document.createElement("div");u.className="chain-label";const h=Ko(l.segments),f=h.filter(_=>_.type==="helix").length,S=a1(l.calphas,h),C=S.strands.length;u.append("Chain ",x1(d),` · ${l.residueCount} residues · ${f} helices · ${C} strands`);let p;if(!S.cylindrical&&i.length>1){const _=this.assemblyAnalysis(i),A=_.ringOrder.some(T=>_.strands[T].chainId===l.chainId);_.cylindrical&&A&&(p={chains:i,analysis:_,focalChainId:l.chainId})}if(S.cylindrical){const _=Number.isFinite(S.shear)?`, shear ${Math.round(S.shear)}`:"";u.append(` · β-barrel (${S.strandCount} strands${_}, ${Math.round(S.tiltDeg)}° tilt)`)}else if(p){const _=new Set(p.analysis.ringOrder.map(A=>p.analysis.strands[A].chainId)).size;u.append(` · β-barrel (${p.analysis.strandCount} strands across ${_} chains, ${Math.round(p.analysis.tiltDeg)}° tilt)`)}c.appendChild(u);const x=document.createElement("div");x.className="svg-scroll",x.appendChild(Ql(l,this.loopOptions,S,this.showContacts,p));const y=document.createElement("div");y.className="topo-stage";const g=document.createElement("div");g.className="view-toggle",g.setAttribute("role","group"),g.setAttribute("aria-label","2D / 3D view");const M=document.createElement("button");M.type="button",M.textContent="2D",M.className="active";const w=document.createElement("button");w.type="button",w.textContent="3D",M.addEventListener("click",()=>this.exit3d(y,x,M,w)),w.addEventListener("click",()=>{this.enter3d(y,x,M,w,l,S,p)}),g.append(M,w),c.appendChild(g),c.appendChild(x),c.appendChild(y),e.appendChild(c),this._contentEl.appendChild(e)}};za.observedAttributes=["protein-data","debug-loops","loop-extreme-points","loop-extreme-threshold","show-contacts"];let Xn=za;customElements.get("topology-display")||customElements.define("topology-display",Xn);const d2=`
  :host { display: block; font-family: sans-serif; padding: 0.5rem; }
  .loading { color: #666; font-style: italic; }
  .error { color: #c00; }
  .error-detail { font-size: 0.85rem; color: #800; margin-top: 0.25rem; }
`,ga=class ga extends HTMLElement{constructor(){super(),this._pdbId=null,this._simId=null,this._generation=0,this._abortController=null;const e=this.attachShadow({mode:"open"});this._styleEl=document.createElement("style"),this._styleEl.textContent=d2,this._contentEl=document.createElement("div"),e.append(this._styleEl,this._contentEl)}attributeChangedCallback(e,t,i){t!==i&&(e==="pdb-id"?this._pdbId=i:e==="sim-id"&&(this._simId=i),this.isConnected&&this.load())}connectedCallback(){this.load()}disconnectedCallback(){var e;(e=this._abortController)==null||e.abort(),this._abortController=null}renderLoading(){const e=document.createElement("div");e.className="loading",e.setAttribute("aria-live","polite"),e.textContent=`Loading ${this._pdbId??""}…`,this._contentEl.replaceChildren(e)}renderError(e){const t=document.createElement("div");t.className="error",t.textContent=`Failed to load ${this._pdbId??"protein"}`;const i=document.createElement("div");i.className="error-detail",i.textContent=e,this._contentEl.replaceChildren(t,i)}renderData(e){const t=document.createElement("topology-display");t.proteinData=e,this._contentEl.replaceChildren(t)}async load(){var a;if(!this._pdbId)return;(a=this._abortController)==null||a.abort();const e=new AbortController;this._abortController=e;const t=++this._generation;this.renderLoading();const i=this._pdbId,r=`https://memprotmd.bioch.ox.ac.uk/data/memprotmd/simulations/${this._simId??`${i}_default_dppc`}/files/structures/at.pdb`,o=`https://pdb-redo.eu/dssp/get?pdb-id=${i}&format=mmcif`;try{const[l,d]=await Promise.all([fetch(r,{signal:e.signal}),fetch(o,{signal:e.signal})]);if(!l.ok)throw new Error(`PDB fetch failed: ${l.status} ${l.statusText}`);if(!d.ok)throw new Error(`DSSP fetch failed: ${d.status} ${d.statusText}`);const[c,u]=await Promise.all([l.text(),d.text()]);if(t!==this._generation||!this.isConnected)return;const h=nl(c),f=ol(u),S=al(i,h,f);this.renderData(S)}catch(l){if((l==null?void 0:l.name)==="AbortError"||t!==this._generation||!this.isConnected)return;const d=l instanceof Error?l.message:String(l);this.renderError(d)}}};ga.observedAttributes=["pdb-id","sim-id"];let eo=ga;customElements.get("topology-loader")||customElements.define("topology-loader",eo);const l2={"3k19":{pdbId:"3k19",chains:[{chainId:"A",residueCount:340,segments:[{start:2,end:6,type:"strand"},{start:9,end:23,type:"strand"},{start:31,end:31,type:"strand"},{start:36,end:37,type:"strand"},{start:40,end:50,type:"strand"},{start:55,end:66,type:"strand"},{start:73,end:76,type:"helix"},{start:80,end:90,type:"strand"},{start:94,end:102,type:"strand"},{start:106,end:109,type:"helix"},{start:110,end:112,type:"helix"},{start:132,end:141,type:"strand"},{start:143,end:146,type:"helix"},{start:151,end:158,type:"strand"},{start:161,end:161,type:"strand"},{start:170,end:170,type:"strand"},{start:173,end:182,type:"strand"},{start:185,end:195,type:"strand"},{start:196,end:197,type:"helix"},{start:198,end:201,type:"helix"},{start:205,end:205,type:"strand"},{start:210,end:222,type:"strand"},{start:225,end:235,type:"strand"},{start:239,end:242,type:"strand"},{start:247,end:250,type:"strand"},{start:253,end:263,type:"strand"},{start:269,end:283,type:"strand"},{start:287,end:301,type:"strand"},{start:307,end:316,type:"strand"},{start:329,end:329,type:"strand"},{start:331,end:339,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:-8.613,y:-.6,z:-10.9},{resSeq:2,iCode:"",x:-6.582,y:-3.275,z:-12.663},{resSeq:3,iCode:"",x:-3.028,y:-1.907,z:-12.64},{resSeq:4,iCode:"",x:-1.308,y:-4.961,z:-14.082},{resSeq:5,iCode:"",x:-2.038,y:-7.734,z:-16.569},{resSeq:6,iCode:"",x:.719,y:-9.772,z:-18.216},{resSeq:7,iCode:"",x:1.454,y:-13.475,z:-18.663},{resSeq:8,iCode:"",x:-1.936,y:-14.694,z:-17.459},{resSeq:9,iCode:"",x:-1.561,y:-12.809,z:-14.167},{resSeq:10,iCode:"",x:-3.604,y:-9.682,z:-13.443},{resSeq:11,iCode:"",x:-3.304,y:-7.62,z:-10.27},{resSeq:12,iCode:"",x:-6.124,y:-5.327,z:-9.205},{resSeq:13,iCode:"",x:-5.16,y:-2.514,z:-6.829},{resSeq:14,iCode:"",x:-8.364,y:-1.013,z:-5.436},{resSeq:15,iCode:"",x:-9.277,y:1.279,z:-2.531},{resSeq:16,iCode:"",x:-11.249,y:4.377,z:-1.591},{resSeq:17,iCode:"",x:-11.399,y:7.649,z:.303},{resSeq:18,iCode:"",x:-14.633,y:8.073,z:2.26},{resSeq:19,iCode:"",x:-15.348,y:11.433,z:3.862},{resSeq:20,iCode:"",x:-17.976,y:10.578,z:6.445},{resSeq:21,iCode:"",x:-19.851,y:12.245,z:9.304},{resSeq:22,iCode:"",x:-22.45,y:11.024,z:11.793},{resSeq:23,iCode:"",x:-25.203,y:13.246,z:13.162},{resSeq:24,iCode:"",x:-26.906,y:12.393,z:16.455},{resSeq:25,iCode:"",x:-28.004,y:14.398,z:19.495},{resSeq:26,iCode:"",x:-25.82,y:14.691,z:22.595},{resSeq:27,iCode:"",x:-22.349,y:13.165,z:22.798},{resSeq:28,iCode:"",x:-23.668,y:10.476,z:20.461},{resSeq:29,iCode:"",x:-23.193,y:7.933,z:23.237},{resSeq:30,iCode:"",x:-26.891,y:7.081,z:23.465},{resSeq:31,iCode:"",x:-27.574,y:7.121,z:19.719},{resSeq:32,iCode:"",x:-27.596,y:4.245,z:17.216},{resSeq:33,iCode:"",x:-24.384,y:4.932,z:15.316},{resSeq:34,iCode:"",x:-22.625,y:7.621,z:17.324},{resSeq:35,iCode:"",x:-21.723,y:11.195,z:16.433},{resSeq:36,iCode:"",x:-18.87,y:13.017,z:14.694},{resSeq:37,iCode:"",x:-16.218,y:12.496,z:12.021},{resSeq:38,iCode:"",x:-16.186,y:8.962,z:10.613},{resSeq:39,iCode:"",x:-13.792,y:9.474,z:7.703},{resSeq:40,iCode:"",x:-11.796,y:6.447,z:6.577},{resSeq:41,iCode:"",x:-9.973,y:4.897,z:3.624},{resSeq:42,iCode:"",x:-9.461,y:1.462,z:2.084},{resSeq:43,iCode:"",x:-6.601,y:-.222,z:.253},{resSeq:44,iCode:"",x:-6.197,y:-3.742,z:-1.101},{resSeq:45,iCode:"",x:-5.412,y:-6.025,z:-4.012},{resSeq:46,iCode:"",x:-7.135,y:-8.874,z:-5.847},{resSeq:47,iCode:"",x:-4.55,y:-11.085,z:-7.535},{resSeq:48,iCode:"",x:-5.471,y:-13.686,z:-10.128},{resSeq:49,iCode:"",x:-3.203,y:-15.946,z:-12.149},{resSeq:50,iCode:"",x:-4.177,y:-18.586,z:-14.703},{resSeq:51,iCode:"",x:-1.967,y:-21.597,z:-14.033},{resSeq:52,iCode:"",x:-3.651,y:-23.114,z:-17.087},{resSeq:53,iCode:"",x:-7.002,y:-23.743,z:-18.797},{resSeq:54,iCode:"",x:-8.755,y:-25.089,z:-15.717},{resSeq:55,iCode:"",x:-6.554,y:-23.862,z:-12.886},{resSeq:56,iCode:"",x:-6.662,y:-20.381,z:-11.366},{resSeq:57,iCode:"",x:-4.596,y:-19.184,z:-8.429},{resSeq:58,iCode:"",x:-5.707,y:-16.085,z:-6.543},{resSeq:59,iCode:"",x:-4.926,y:-13.994,z:-3.481},{resSeq:60,iCode:"",x:-6.434,y:-10.967,z:-1.772},{resSeq:61,iCode:"",x:-5.673,y:-8.435,z:.956},{resSeq:62,iCode:"",x:-7.818,y:-5.562,z:2.197},{resSeq:63,iCode:"",x:-6.915,y:-3.046,z:4.901},{resSeq:64,iCode:"",x:-8.844,y:-.3,z:6.685},{resSeq:65,iCode:"",x:-7.169,y:3.025,z:7.477},{resSeq:66,iCode:"",x:-9.16,y:5.275,z:9.795},{resSeq:67,iCode:"",x:-9.037,y:8.981,z:8.983},{resSeq:68,iCode:"",x:-10.71,y:10.405,z:12.071},{resSeq:69,iCode:"",x:-7.766,y:9.843,z:14.389},{resSeq:70,iCode:"",x:-5.082,y:12.392,z:15.196},{resSeq:71,iCode:"",x:-1.428,y:11.847,z:14.364},{resSeq:72,iCode:"",x:-.6,y:11.421,z:18.048},{resSeq:73,iCode:"",x:-1.024,y:8.467,z:20.384},{resSeq:74,iCode:"",x:-4.344,y:7.335,z:18.921},{resSeq:75,iCode:"",x:-3.114,y:7.235,z:15.332},{resSeq:76,iCode:"",x:-3.843,y:3.514,z:15.198},{resSeq:77,iCode:"",x:-7.382,y:3.342,z:16.601},{resSeq:78,iCode:"",x:-9.563,y:1.413,z:14.154},{resSeq:79,iCode:"",x:-6.976,y:.237,z:11.631},{resSeq:80,iCode:"",x:-6.981,y:-3.463,z:10.798},{resSeq:81,iCode:"",x:-6.644,y:-6.07,z:8.09},{resSeq:82,iCode:"",x:-10.116,y:-7.025,z:6.872},{resSeq:83,iCode:"",x:-9.215,y:-9.74,z:4.38},{resSeq:84,iCode:"",x:-6.156,y:-11.868,z:3.678},{resSeq:85,iCode:"",x:-6.272,y:-15.214,z:1.891},{resSeq:86,iCode:"",x:-5.156,y:-17.23,z:-1.141},{resSeq:87,iCode:"",x:-6.682,y:-20.132,z:-3.08},{resSeq:88,iCode:"",x:-7.31,y:-22.152,z:-6.241},{resSeq:89,iCode:"",x:-10.269,y:-22.578,z:-8.623},{resSeq:90,iCode:"",x:-10.312,y:-25.768,z:-10.673},{resSeq:91,iCode:"",x:-12.424,y:-26.501,z:-13.759},{resSeq:92,iCode:"",x:-15.818,y:-27.63,z:-12.481},{resSeq:93,iCode:"",x:-14.441,y:-29.211,z:-9.301},{resSeq:94,iCode:"",x:-14.771,y:-26.04,z:-7.207},{resSeq:95,iCode:"",x:-12.508,y:-23.578,z:-5.391},{resSeq:96,iCode:"",x:-10.612,y:-23.577,z:-2.108},{resSeq:97,iCode:"",x:-8.919,y:-20.814,z:-.119},{resSeq:98,iCode:"",x:-7.507,y:-20.215,z:3.356},{resSeq:99,iCode:"",x:-6.858,y:-17.189,z:5.561},{resSeq:100,iCode:"",x:-8.983,y:-14.373,z:6.919},{resSeq:101,iCode:"",x:-12.198,y:-14.463,z:4.896},{resSeq:102,iCode:"",x:-15.979,y:-14.225,z:5.249},{resSeq:103,iCode:"",x:-17.869,y:-16.874,z:7.203},{resSeq:104,iCode:"",x:-20.231,y:-19.138,z:5.278},{resSeq:105,iCode:"",x:-23.328,y:-17.842,z:7.056},{resSeq:106,iCode:"",x:-22.609,y:-14.457,z:5.483},{resSeq:107,iCode:"",x:-23.511,y:-16.054,z:2.178},{resSeq:108,iCode:"",x:-27.05,y:-15.52,z:3.449},{resSeq:109,iCode:"",x:-26.774,y:-12.301,z:5.477},{resSeq:110,iCode:"",x:-25.084,y:-10.694,z:2.466},{resSeq:111,iCode:"",x:-28.511,y:-10.355,z:.864},{resSeq:112,iCode:"",x:-29.668,y:-7.498,z:3.095},{resSeq:113,iCode:"",x:-26.226,y:-6.035,z:3.717},{resSeq:114,iCode:"",x:-26.996,y:-3.332,z:1.161},{resSeq:115,iCode:"",x:-27.689,y:-.073,z:2.994},{resSeq:116,iCode:"",x:-25.671,y:3.056,z:2.078},{resSeq:117,iCode:"",x:-23.869,y:3.178,z:5.43},{resSeq:118,iCode:"",x:-25.408,y:1.031,z:8.169},{resSeq:119,iCode:"",x:-27.383,y:-2.216,z:7.987},{resSeq:120,iCode:"",x:-25.993,y:-5.754,z:8.068},{resSeq:121,iCode:"",x:-26.242,y:-5.455,z:11.834},{resSeq:122,iCode:"",x:-26.031,y:-9.184,z:12.56},{resSeq:123,iCode:"",x:-22.87,y:-9.709,z:10.512},{resSeq:124,iCode:"",x:-20.356,y:-9.109,z:13.307},{resSeq:125,iCode:"",x:-16.603,y:-9.439,z:12.799},{resSeq:126,iCode:"",x:-14.649,y:-12.232,z:14.44},{resSeq:127,iCode:"",x:-18.008,y:-13.67,z:15.437},{resSeq:128,iCode:"",x:-17.768,y:-17.25,z:14.208},{resSeq:129,iCode:"",x:-19.609,y:-17.66,z:10.9},{resSeq:130,iCode:"",x:-21.613,y:-14.457,z:10.385},{resSeq:131,iCode:"",x:-18.75,y:-12.116,z:9.431},{resSeq:132,iCode:"",x:-15.053,y:-11.848,z:8.66},{resSeq:133,iCode:"",x:-13.04,y:-14.334,z:10.734},{resSeq:134,iCode:"",x:-9.441,y:-15.531,z:10.853},{resSeq:135,iCode:"",x:-8.193,y:-18.983,z:9.893},{resSeq:136,iCode:"",x:-11.089,y:-20.341,z:7.84},{resSeq:137,iCode:"",x:-10.705,y:-22.922,z:5.091},{resSeq:138,iCode:"",x:-13.447,y:-22.43,z:2.513},{resSeq:139,iCode:"",x:-14.441,y:-24.817,z:-.274},{resSeq:140,iCode:"",x:-16.977,y:-23.525,z:-2.794},{resSeq:141,iCode:"",x:-18.752,y:-25.135,z:-5.748},{resSeq:142,iCode:"",x:-20.472,y:-23.452,z:-8.711},{resSeq:143,iCode:"",x:-23.381,y:-24.971,z:-10.615},{resSeq:144,iCode:"",x:-23.121,y:-28.229,z:-8.695},{resSeq:145,iCode:"",x:-19.931,y:-29.145,z:-10.569},{resSeq:146,iCode:"",x:-21.242,y:-27.461,z:-13.716},{resSeq:147,iCode:"",x:-24.1,y:-29.98,z:-13.732},{resSeq:148,iCode:"",x:-26.831,y:-27.675,z:-12.395},{resSeq:149,iCode:"",x:-27.074,y:-23.971,z:-13.274},{resSeq:150,iCode:"",x:-27.519,y:-21.464,z:-10.443},{resSeq:151,iCode:"",x:-26.954,y:-24.086,z:-7.749},{resSeq:152,iCode:"",x:-24.012,y:-23.28,z:-5.476},{resSeq:153,iCode:"",x:-22.896,y:-24.716,z:-2.144},{resSeq:154,iCode:"",x:-19.962,y:-24.244,z:.24},{resSeq:155,iCode:"",x:-18.412,y:-26.045,z:3.217},{resSeq:156,iCode:"",x:-16.147,y:-24.216,z:5.695},{resSeq:157,iCode:"",x:-13.868,y:-25.208,z:8.598},{resSeq:158,iCode:"",x:-13.167,y:-22.601,z:11.27},{resSeq:159,iCode:"",x:-9.849,y:-23.01,z:13.074},{resSeq:160,iCode:"",x:-9.622,y:-22.488,z:16.821},{resSeq:161,iCode:"",x:-8.8,y:-18.873,z:17.703},{resSeq:162,iCode:"",x:-8.053,y:-18.322,z:21.389},{resSeq:163,iCode:"",x:-7.387,y:-14.588,z:21.595},{resSeq:164,iCode:"",x:-7.178,y:-12.266,z:24.585},{resSeq:165,iCode:"",x:-10.838,y:-11.317,z:24.337},{resSeq:166,iCode:"",x:-13.922,y:-13.447,z:24.818},{resSeq:167,iCode:"",x:-15.571,y:-11.387,z:22.09},{resSeq:168,iCode:"",x:-12.891,y:-12.125,z:19.496},{resSeq:169,iCode:"",x:-12.382,y:-15.817,z:20.257},{resSeq:170,iCode:"",x:-13.778,y:-19.068,z:18.872},{resSeq:171,iCode:"",x:-13.214,y:-22.824,z:19.011},{resSeq:172,iCode:"",x:-13.272,y:-25.347,z:16.182},{resSeq:173,iCode:"",x:-16.37,y:-25.545,z:14.005},{resSeq:174,iCode:"",x:-17.829,y:-26.494,z:10.639},{resSeq:175,iCode:"",x:-20.398,y:-24.762,z:8.454},{resSeq:176,iCode:"",x:-21.921,y:-24.61,z:4.997},{resSeq:177,iCode:"",x:-24.308,y:-22.919,z:2.594},{resSeq:178,iCode:"",x:-26.538,y:-23.875,z:-.312},{resSeq:179,iCode:"",x:-27.765,y:-21.069,z:-2.559},{resSeq:180,iCode:"",x:-29.873,y:-21.317,z:-5.706},{resSeq:181,iCode:"",x:-30.411,y:-18.389,z:-8.055},{resSeq:182,iCode:"",x:-32.695,y:-18.462,z:-11.077},{resSeq:183,iCode:"",x:-33.39,y:-15.373,z:-13.163},{resSeq:184,iCode:"",x:-33.576,y:-12.346,z:-10.843},{resSeq:185,iCode:"",x:-34.353,y:-14.634,z:-7.919},{resSeq:186,iCode:"",x:-32.118,y:-16.115,z:-5.219},{resSeq:187,iCode:"",x:-32.695,y:-18.307,z:-2.192},{resSeq:188,iCode:"",x:-29.97,y:-19.046,z:.38},{resSeq:189,iCode:"",x:-29.505,y:-21.235,z:3.432},{resSeq:190,iCode:"",x:-26.447,y:-21.215,z:5.666},{resSeq:191,iCode:"",x:-25.547,y:-22.914,z:8.925},{resSeq:192,iCode:"",x:-22.554,y:-23.411,z:11.204},{resSeq:193,iCode:"",x:-21.649,y:-24.554,z:14.693},{resSeq:194,iCode:"",x:-18.441,y:-24.288,z:16.703},{resSeq:195,iCode:"",x:-16.899,y:-24.955,z:20.108},{resSeq:196,iCode:"",x:-16.784,y:-22.015,z:22.493},{resSeq:197,iCode:"",x:-13.458,y:-21.322,z:24.195},{resSeq:198,iCode:"",x:-13.02,y:-21.476,z:27.964},{resSeq:199,iCode:"",x:-12.735,y:-17.703,z:28.185},{resSeq:200,iCode:"",x:-16.061,y:-17.501,z:26.362},{resSeq:201,iCode:"",x:-17.82,y:-19.883,z:28.742},{resSeq:202,iCode:"",x:-16.261,y:-18.081,z:31.707},{resSeq:203,iCode:"",x:-18.387,y:-15.068,z:30.791},{resSeq:204,iCode:"",x:-21.387,y:-13.999,z:32.908},{resSeq:205,iCode:"",x:-23.737,y:-13.678,z:29.921},{resSeq:206,iCode:"",x:-24.384,y:-16.726,z:27.745},{resSeq:207,iCode:"",x:-24.485,y:-20.389,z:28.676},{resSeq:208,iCode:"",x:-23.399,y:-23.411,z:26.655},{resSeq:209,iCode:"",x:-20.457,y:-25.241,z:25.114},{resSeq:210,iCode:"",x:-21.634,y:-24.93,z:21.513},{resSeq:211,iCode:"",x:-22.261,y:-21.913,z:19.257},{resSeq:212,iCode:"",x:-24.746,y:-21.998,z:16.373},{resSeq:213,iCode:"",x:-25.609,y:-19.615,z:13.569},{resSeq:214,iCode:"",x:-28.055,y:-20.196,z:10.739},{resSeq:215,iCode:"",x:-29.719,y:-17.733,z:8.388},{resSeq:216,iCode:"",x:-31.851,y:-17.975,z:5.273},{resSeq:217,iCode:"",x:-32.189,y:-15.32,z:2.59},{resSeq:218,iCode:"",x:-34.603,y:-14.524,z:-.201},{resSeq:219,iCode:"",x:-34.015,y:-11.852,z:-2.837},{resSeq:220,iCode:"",x:-35.201,y:-10.468,z:-6.145},{resSeq:221,iCode:"",x:-32.402,y:-8.754,z:-8.073},{resSeq:222,iCode:"",x:-33.169,y:-7.373,z:-11.538},{resSeq:223,iCode:"",x:-34.7,y:-4.428,z:-13.414},{resSeq:224,iCode:"",x:-33.144,y:-1.761,z:-11.197},{resSeq:225,iCode:"",x:-35.067,y:-3.445,z:-8.396},{resSeq:226,iCode:"",x:-33.453,y:-4.916,z:-5.297},{resSeq:227,iCode:"",x:-35.686,y:-6.663,z:-2.772},{resSeq:228,iCode:"",x:-34.193,y:-8.9,z:-.085},{resSeq:229,iCode:"",x:-35.177,y:-10.42,z:3.253},{resSeq:230,iCode:"",x:-33.169,y:-12.393,z:5.812},{resSeq:231,iCode:"",x:-34.193,y:-14.488,z:8.776},{resSeq:232,iCode:"",x:-31.785,y:-16.196,z:11.163},{resSeq:233,iCode:"",x:-31.172,y:-17.344,z:14.718},{resSeq:234,iCode:"",x:-28.198,y:-17.969,z:16.984},{resSeq:235,iCode:"",x:-27.185,y:-20.007,z:20.016},{resSeq:236,iCode:"",x:-24.608,y:-18.439,z:22.316},{resSeq:237,iCode:"",x:-23.02,y:-16.576,z:19.398},{resSeq:238,iCode:"",x:-24.253,y:-12.98,z:19.294},{resSeq:239,iCode:"",x:-22.078,y:-10.798,z:21.552},{resSeq:240,iCode:"",x:-23.985,y:-8.561,z:23.985},{resSeq:241,iCode:"",x:-23.198,y:-6.105,z:26.78},{resSeq:242,iCode:"",x:-25.189,y:-5.065,z:29.833},{resSeq:243,iCode:"",x:-24.174,y:-1.4,z:30.056},{resSeq:244,iCode:"",x:-25.688,y:-1.181,z:33.555},{resSeq:245,iCode:"",x:-23.819,y:-3.929,z:35.407},{resSeq:246,iCode:"",x:-20.932,y:-3.805,z:32.939},{resSeq:247,iCode:"",x:-21.442,y:-7.475,z:32.095},{resSeq:248,iCode:"",x:-20.209,y:-9.057,z:28.861},{resSeq:249,iCode:"",x:-20.871,y:-12.291,z:26.989},{resSeq:250,iCode:"",x:-23.223,y:-13.834,z:24.458},{resSeq:251,iCode:"",x:-26.99,y:-14.03,z:24.03},{resSeq:252,iCode:"",x:-28.252,y:-17.566,z:24.646},{resSeq:253,iCode:"",x:-30.643,y:-17.164,z:21.741},{resSeq:254,iCode:"",x:-31.37,y:-14.533,z:19.086},{resSeq:255,iCode:"",x:-33.872,y:-14.111,z:16.264},{resSeq:256,iCode:"",x:-32.907,y:-11.842,z:13.394},{resSeq:257,iCode:"",x:-34.973,y:-10.217,z:10.647},{resSeq:258,iCode:"",x:-33.52,y:-8.019,z:7.899},{resSeq:259,iCode:"",x:-35.59,y:-6.396,z:5.141},{resSeq:260,iCode:"",x:-34.272,y:-4.222,z:2.316},{resSeq:261,iCode:"",x:-35.95,y:-2.491,z:-.621},{resSeq:262,iCode:"",x:-33.952,y:-.397,z:-3.093},{resSeq:263,iCode:"",x:-34.426,y:1.023,z:-6.578},{resSeq:264,iCode:"",x:-31.774,y:2.21,z:-9.03},{resSeq:265,iCode:"",x:-32.946,y:5.183,z:-11.094},{resSeq:266,iCode:"",x:-31.127,y:5.728,z:-14.385},{resSeq:267,iCode:"",x:-29.843,y:9.223,z:-13.655},{resSeq:268,iCode:"",x:-27.95,y:7.738,z:-10.712},{resSeq:269,iCode:"",x:-30.201,y:7.953,z:-7.662},{resSeq:270,iCode:"",x:-30.764,y:4.822,z:-5.576},{resSeq:271,iCode:"",x:-33.26,y:5.329,z:-2.717},{resSeq:272,iCode:"",x:-33.167,y:2.719,z:.051},{resSeq:273,iCode:"",x:-35.794,y:1.431,z:2.479},{resSeq:274,iCode:"",x:-34.819,y:-1.049,z:5.182},{resSeq:275,iCode:"",x:-36.043,y:-2.599,z:8.419},{resSeq:276,iCode:"",x:-33.872,y:-4.462,z:10.929},{resSeq:277,iCode:"",x:-34.81,y:-6.185,z:14.163},{resSeq:278,iCode:"",x:-32.604,y:-8.471,z:16.229},{resSeq:279,iCode:"",x:-34.017,y:-9.677,z:19.544},{resSeq:280,iCode:"",x:-32.162,y:-11.764,z:22.126},{resSeq:281,iCode:"",x:-33.932,y:-14.439,z:24.155},{resSeq:282,iCode:"",x:-33.188,y:-15.784,z:27.633},{resSeq:283,iCode:"",x:-30.608,y:-13.153,z:28.486},{resSeq:284,iCode:"",x:-29.815,y:-14.362,z:32.003},{resSeq:285,iCode:"",x:-31.841,y:-12.002,z:34.189},{resSeq:286,iCode:"",x:-33.193,y:-9.628,z:31.549},{resSeq:287,iCode:"",x:-35.134,y:-12.209,z:29.565},{resSeq:288,iCode:"",x:-36.046,y:-10.882,z:26.129},{resSeq:289,iCode:"",x:-34.307,y:-7.755,z:24.919},{resSeq:290,iCode:"",x:-33.999,y:-6.09,z:21.552},{resSeq:291,iCode:"",x:-30.399,y:-5.617,z:20.433},{resSeq:292,iCode:"",x:-31.202,y:-3.873,z:17.169},{resSeq:293,iCode:"",x:-34.464,y:-2.338,z:15.965},{resSeq:294,iCode:"",x:-34.97,y:.426,z:13.41},{resSeq:295,iCode:"",x:-36.379,y:1.608,z:10.103},{resSeq:296,iCode:"",x:-33.922,y:2.941,z:7.545},{resSeq:297,iCode:"",x:-34.557,y:5.602,z:4.92},{resSeq:298,iCode:"",x:-31.628,y:6.636,z:2.73},{resSeq:299,iCode:"",x:-30.312,y:7.153,z:-.776},{resSeq:300,iCode:"",x:-27.008,y:6.863,z:-2.603},{resSeq:301,iCode:"",x:-26.3,y:9.057,z:-5.606},{resSeq:302,iCode:"",x:-23.742,y:7.759,z:-8.094},{resSeq:303,iCode:"",x:-22.027,y:10.375,z:-10.226},{resSeq:304,iCode:"",x:-20.441,y:7.324,z:-11.819},{resSeq:305,iCode:"",x:-18.545,y:4.142,z:-10.944},{resSeq:306,iCode:"",x:-15.841,y:6.119,z:-9.122},{resSeq:307,iCode:"",x:-17.675,y:8.919,z:-7.291},{resSeq:308,iCode:"",x:-20.831,y:9.076,z:-5.178},{resSeq:309,iCode:"",x:-22.409,y:10.487,z:-2.024},{resSeq:310,iCode:"",x:-25.201,y:9.339,z:.251},{resSeq:311,iCode:"",x:-27.437,y:10.127,z:3.193},{resSeq:312,iCode:"",x:-28.332,y:7.234,z:5.467},{resSeq:313,iCode:"",x:-30.946,y:7.874,z:8.135},{resSeq:314,iCode:"",x:-31.769,y:5.44,z:10.933},{resSeq:315,iCode:"",x:-35.094,y:5.84,z:12.719},{resSeq:316,iCode:"",x:-34.259,y:4.001,z:15.934},{resSeq:317,iCode:"",x:-37.112,y:1.788,z:17.135},{resSeq:318,iCode:"",x:-35.311,y:.991,z:20.374},{resSeq:319,iCode:"",x:-36.839,y:2.812,z:23.337},{resSeq:320,iCode:"",x:-35.175,y:4.449,z:26.342},{resSeq:321,iCode:"",x:-36.243,y:1.541,z:28.528},{resSeq:322,iCode:"",x:-33.917,y:-.973,z:26.9},{resSeq:323,iCode:"",x:-32.834,y:-3.492,z:29.546},{resSeq:324,iCode:"",x:-29.289,y:-3.741,z:28.184},{resSeq:325,iCode:"",x:-28.756,y:-.029,z:27.549},{resSeq:326,iCode:"",x:-28.72,y:-.222,z:23.764},{resSeq:327,iCode:"",x:-28.659,y:3.313,z:22.358},{resSeq:328,iCode:"",x:-32.141,y:4.593,z:21.564},{resSeq:329,iCode:"",x:-31.405,y:7.748,z:19.563},{resSeq:330,iCode:"",x:-31.447,y:8.261,z:15.807},{resSeq:331,iCode:"",x:-28.386,y:8.657,z:13.604},{resSeq:332,iCode:"",x:-27.986,y:10.292,z:10.212},{resSeq:333,iCode:"",x:-24.898,y:9.595,z:8.114},{resSeq:334,iCode:"",x:-23.599,y:11.828,z:5.327},{resSeq:335,iCode:"",x:-20.94,y:10.451,z:2.994},{resSeq:336,iCode:"",x:-18.94,y:11.493,z:-.049},{resSeq:337,iCode:"",x:-17.001,y:8.591,z:-1.544},{resSeq:338,iCode:"",x:-14.267,y:8.411,z:-4.162},{resSeq:339,iCode:"",x:-12.951,y:4.995,z:-5.189},{resSeq:340,iCode:"",x:-10.842,y:3.251,z:-7.82}]},{chainId:"B",residueCount:340,segments:[{start:2,end:6,type:"strand"},{start:9,end:23,type:"strand"},{start:31,end:31,type:"strand"},{start:36,end:37,type:"strand"},{start:40,end:50,type:"strand"},{start:55,end:66,type:"strand"},{start:73,end:76,type:"helix"},{start:80,end:90,type:"strand"},{start:94,end:102,type:"strand"},{start:106,end:109,type:"helix"},{start:110,end:112,type:"helix"},{start:132,end:141,type:"strand"},{start:143,end:146,type:"helix"},{start:151,end:158,type:"strand"},{start:161,end:161,type:"strand"},{start:170,end:170,type:"strand"},{start:173,end:182,type:"strand"},{start:185,end:195,type:"strand"},{start:196,end:197,type:"helix"},{start:198,end:201,type:"helix"},{start:205,end:205,type:"strand"},{start:210,end:222,type:"strand"},{start:225,end:235,type:"strand"},{start:239,end:242,type:"strand"},{start:247,end:250,type:"strand"},{start:253,end:263,type:"strand"},{start:269,end:283,type:"strand"},{start:287,end:301,type:"strand"},{start:307,end:316,type:"strand"},{start:329,end:329,type:"strand"},{start:331,end:339,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:3.432,y:8.143,z:-10.673},{resSeq:2,iCode:"",x:.137,y:7.762,z:-12.531},{resSeq:3,iCode:"",x:-.449,y:4.002,z:-12.611},{resSeq:4,iCode:"",x:-3.931,y:4.07,z:-14.103},{resSeq:5,iCode:"",x:-5.927,y:6.145,z:-16.586},{resSeq:6,iCode:"",x:-9.027,y:4.817,z:-18.33},{resSeq:7,iCode:"",x:-12.594,y:6.042,z:-18.807},{resSeq:8,iCode:"",x:-11.979,y:9.562,z:-17.506},{resSeq:9,iCode:"",x:-10.601,y:8.216,z:-14.225},{resSeq:10,iCode:"",x:-6.886,y:8.399,z:-13.422},{resSeq:11,iCode:"",x:-5.313,y:7.032,z:-10.245},{resSeq:12,iCode:"",x:-1.939,y:8.302,z:-9.084},{resSeq:13,iCode:"",x:-.04,y:6.004,z:-6.723},{resSeq:14,iCode:"",x:2.833,y:7.999,z:-5.221},{resSeq:15,iCode:"",x:5.218,y:7.576,z:-2.281},{resSeq:16,iCode:"",x:8.865,y:7.701,z:-1.256},{resSeq:17,iCode:"",x:11.733,y:6.146,z:.672},{resSeq:18,iCode:"",x:13.667,y:8.685,z:2.723},{resSeq:19,iCode:"",x:16.908,y:7.591,z:4.367},{resSeq:20,iCode:"",x:17.421,y:10.232,z:7.022},{resSeq:21,iCode:"",x:19.739,y:10.949,z:9.955},{resSeq:22,iCode:"",x:19.94,y:13.741,z:12.521},{resSeq:23,iCode:"",x:23.214,y:14.981,z:13.983},{resSeq:24,iCode:"",x:23.248,y:16.796,z:17.324},{resSeq:25,iCode:"",x:25.468,y:16.687,z:20.408},{resSeq:26,iCode:"",x:24.58,y:14.582,z:23.446},{resSeq:27,iCode:"",x:21.571,y:12.308,z:23.291},{resSeq:28,iCode:"",x:19.967,y:15.077,z:21.236},{resSeq:29,iCode:"",x:17.399,y:15.658,z:23.958},{resSeq:30,iCode:"",x:18.497,y:19.278,z:24.3},{resSeq:31,iCode:"",x:18.948,y:19.937,z:20.575},{resSeq:32,iCode:"",x:16.526,y:21.458,z:18.053},{resSeq:33,iCode:"",x:15.565,y:18.381,z:16.046},{resSeq:34,iCode:"",x:16.966,y:15.473,z:18.039},{resSeq:35,iCode:"",x:19.623,y:12.928,z:17.134},{resSeq:36,iCode:"",x:19.815,y:9.597,z:15.304},{resSeq:37,iCode:"",x:18.09,y:7.615,z:12.559},{resSeq:38,iCode:"",x:15.039,y:9.387,z:11.132},{resSeq:39,iCode:"",x:14.352,y:7.137,z:8.136},{resSeq:40,iCode:"",x:10.759,y:6.938,z:6.935},{resSeq:41,iCode:"",x:8.568,y:6.194,z:3.928},{resSeq:42,iCode:"",x:5.369,y:7.51,z:2.344},{resSeq:43,iCode:"",x:2.524,y:5.927,z:.42},{resSeq:44,iCode:"",x:-.697,y:7.363,z:-.978},{resSeq:45,iCode:"",x:-3.009,y:7.91,z:-3.921},{resSeq:46,iCode:"",x:-4.574,y:10.861,z:-5.718},{resSeq:47,iCode:"",x:-7.743,y:9.775,z:-7.503},{resSeq:48,iCode:"",x:-9.481,y:11.932,z:-10.082},{resSeq:49,iCode:"",x:-12.537,y:11.151,z:-12.187},{resSeq:50,iCode:"",x:-14.287,y:13.393,z:-14.714},{resSeq:51,iCode:"",x:-18.015,y:12.956,z:-14.132},{resSeq:52,iCode:"",x:-18.413,y:15.242,z:-17.151},{resSeq:53,iCode:"",x:-17.244,y:18.496,z:-18.745},{resSeq:54,iCode:"",x:-17.596,y:20.618,z:-15.62},{resSeq:55,iCode:"",x:-17.704,y:18.029,z:-12.853},{resSeq:56,iCode:"",x:-14.665,y:16.361,z:-11.3},{resSeq:57,iCode:"",x:-14.731,y:13.875,z:-8.434},{resSeq:58,iCode:"",x:-11.526,y:13.244,z:-6.501},{resSeq:59,iCode:"",x:-10.173,y:11.435,z:-3.45},{resSeq:60,iCode:"",x:-6.833,y:11.201,z:-1.68},{resSeq:61,iCode:"",x:-5.077,y:9.206,z:1.039},{resSeq:62,iCode:"",x:-1.535,y:9.605,z:2.357},{resSeq:63,iCode:"",x:.14,y:7.494,z:5.04},{resSeq:64,iCode:"",x:3.443,y:7.75,z:6.911},{resSeq:65,iCode:"",x:5.468,y:4.618,z:7.666},{resSeq:66,iCode:"",x:8.363,y:5.163,z:10.06},{resSeq:67,iCode:"",x:11.525,y:3.211,z:9.285},{resSeq:68,iCode:"",x:13.541,y:3.884,z:12.414},{resSeq:69,iCode:"",x:11.533,y:1.562,z:14.636},{resSeq:70,iCode:"",x:12.383,y:-2.048,z:15.376},{resSeq:71,iCode:"",x:10.103,y:-4.92,z:14.411},{resSeq:72,iCode:"",x:9.244,y:-5.525,z:18.06},{resSeq:73,iCode:"",x:6.843,y:-3.74,z:20.397},{resSeq:74,iCode:"",x:7.545,y:-.253,z:19.049},{resSeq:75,iCode:"",x:6.925,y:-1.189,z:15.421},{resSeq:76,iCode:"",x:4.067,y:1.308,z:15.282},{resSeq:77,iCode:"",x:5.645,y:4.427,z:16.808},{resSeq:78,iCode:"",x:5.126,y:7.336,z:14.41},{resSeq:79,iCode:"",x:2.871,y:5.744,z:11.798},{resSeq:80,iCode:"",x:-.313,y:7.621,z:10.945},{resSeq:81,iCode:"",x:-2.687,y:8.697,z:8.21},{resSeq:82,iCode:"",x:-1.754,y:12.211,z:7.096},{resSeq:83,iCode:"",x:-4.503,y:12.848,z:4.566},{resSeq:84,iCode:"",x:-7.861,y:11.27,z:3.747},{resSeq:85,iCode:"",x:-10.664,y:13.09,z:1.95},{resSeq:86,iCode:"",x:-12.921,y:13.21,z:-1.107},{resSeq:87,iCode:"",x:-14.618,y:16.043,z:-3.017},{resSeq:88,iCode:"",x:-15.981,y:17.659,z:-6.183},{resSeq:89,iCode:"",x:-14.825,y:20.493,z:-8.475},{resSeq:90,iCode:"",x:-17.531,y:22.174,z:-10.54},{resSeq:91,iCode:"",x:-17.055,y:24.447,z:-13.555},{resSeq:92,iCode:"",x:-16.355,y:27.919,z:-12.172},{resSeq:93,iCode:"",x:-18.474,y:27.435,z:-9.045},{resSeq:94,iCode:"",x:-15.606,y:26.09,z:-6.921},{resSeq:95,iCode:"",x:-14.651,y:22.851,z:-5.174},{resSeq:96,iCode:"",x:-15.656,y:21.123,z:-1.956},{resSeq:97,iCode:"",x:-14.15,y:18.239,z:.001},{resSeq:98,iCode:"",x:-14.412,y:16.62,z:3.433},{resSeq:99,iCode:"",x:-12.16,y:14.487,z:5.633},{resSeq:100,iCode:"",x:-8.687,y:14.888,z:7.071},{resSeq:101,iCode:"",x:-7.113,y:17.772,z:5.146},{resSeq:102,iCode:"",x:-5.026,y:20.919,z:5.624},{resSeq:103,iCode:"",x:-6.417,y:23.836,z:7.629},{resSeq:104,iCode:"",x:-7.161,y:27.053,z:5.762},{resSeq:105,iCode:"",x:-4.528,y:29.053,z:7.639},{resSeq:106,iCode:"",x:-1.932,y:26.774,z:6.078},{resSeq:107,iCode:"",x:-2.792,y:28.436,z:2.786},{resSeq:108,iCode:"",x:-.582,y:31.199,z:4.17},{resSeq:109,iCode:"",x:2.016,y:29.301,z:6.205},{resSeq:110,iCode:"",x:2.618,y:27.115,z:3.145},{resSeq:111,iCode:"",x:4.67,y:29.954,z:1.672},{resSeq:112,iCode:"",x:7.685,y:29.469,z:3.941},{resSeq:113,iCode:"",x:7.218,y:25.736,z:4.456},{resSeq:114,iCode:"",x:9.985,y:25.113,z:1.938},{resSeq:115,iCode:"",x:13.113,y:24.037,z:3.831},{resSeq:116,iCode:"",x:14.843,y:20.766,z:2.856},{resSeq:117,iCode:"",x:13.976,y:19.055,z:6.151},{resSeq:118,iCode:"",x:12.83,y:21.388,z:8.928},{resSeq:119,iCode:"",x:11.008,y:24.735,z:8.8},{resSeq:120,iCode:"",x:7.245,y:25.29,z:8.813},{resSeq:121,iCode:"",x:7.556,y:25.267,z:12.583},{resSeq:122,iCode:"",x:4.201,y:26.926,z:13.279},{resSeq:123,iCode:"",x:2.205,y:24.508,z:11.124},{resSeq:124,iCode:"",x:1.417,y:21.958,z:13.849},{resSeq:125,iCode:"",x:-.729,y:18.887,z:13.215},{resSeq:126,iCode:"",x:-4.154,y:18.541,z:14.78},{resSeq:127,iCode:"",x:-3.745,y:22.146,z:15.882},{resSeq:128,iCode:"",x:-6.942,y:23.746,z:14.623},{resSeq:129,iCode:"",x:-6.317,y:25.635,z:11.373},{resSeq:130,iCode:"",x:-2.522,y:25.783,z:10.947},{resSeq:131,iCode:"",x:-1.901,y:22.162,z:9.901},{resSeq:132,iCode:"",x:-3.511,y:18.851,z:9.012},{resSeq:133,iCode:"",x:-6.706,y:18.303,z:11.015},{resSeq:134,iCode:"",x:-9.534,y:15.774,z:11.005},{resSeq:135,iCode:"",x:-13.127,y:16.433,z:9.973},{resSeq:136,iCode:"",x:-12.824,y:19.668,z:8.003},{resSeq:137,iCode:"",x:-15.199,y:20.701,z:5.239},{resSeq:138,iCode:"",x:-13.348,y:22.9,z:2.766},{resSeq:139,iCode:"",x:-14.853,y:25.031,z:.007},{resSeq:140,iCode:"",x:-12.418,y:26.639,z:-2.428},{resSeq:141,iCode:"",x:-12.869,y:29.049,z:-5.336},{resSeq:142,iCode:"",x:-10.494,y:29.776,z:-8.235},{resSeq:143,iCode:"",x:-10.317,y:33.104,z:-10.052},{resSeq:144,iCode:"",x:-13.309,y:34.447,z:-8.156},{resSeq:145,iCode:"",x:-15.66,y:32.198,z:-10.145},{resSeq:146,iCode:"",x:-13.472,y:32.562,z:-13.233},{resSeq:147,iCode:"",x:-14.231,y:36.29,z:-13.176},{resSeq:148,iCode:"",x:-10.902,y:37.47,z:-11.732},{resSeq:149,iCode:"",x:-7.555,y:35.85,z:-12.588},{resSeq:150,iCode:"",x:-5.224,y:34.918,z:-9.725},{resSeq:151,iCode:"",x:-7.834,y:35.674,z:-7.072},{resSeq:152,iCode:"",x:-8.641,y:32.665,z:-4.89},{resSeq:153,iCode:"",x:-10.513,y:32.342,z:-1.599},{resSeq:154,iCode:"",x:-11.62,y:29.504,z:.695},{resSeq:155,iCode:"",x:-14.011,y:28.978,z:3.605},{resSeq:156,iCode:"",x:-13.606,y:26.048,z:6.021},{resSeq:157,iCode:"",x:-15.675,y:24.502,z:8.845},{resSeq:158,iCode:"",x:-13.819,y:22.526,z:11.51},{resSeq:159,iCode:"",x:-15.865,y:19.807,z:13.198},{resSeq:160,iCode:"",x:-15.596,y:19.255,z:16.938},{resSeq:161,iCode:"",x:-12.897,y:16.714,z:17.816},{resSeq:162,iCode:"",x:-12.878,y:15.693,z:21.48},{resSeq:163,iCode:"",x:-9.972,y:13.257,z:21.691},{resSeq:164,iCode:"",x:-8.118,y:11.841,z:24.679},{resSeq:165,iCode:"",x:-5.469,y:14.544,z:24.548},{resSeq:166,iCode:"",x:-5.785,y:18.268,z:25.122},{resSeq:167,iCode:"",x:-3.122,y:18.729,z:22.458},{resSeq:168,iCode:"",x:-5.05,y:16.852,z:19.765},{resSeq:169,iCode:"",x:-8.515,y:18.223,z:20.507},{resSeq:170,iCode:"",x:-10.608,y:21.09,z:19.151},{resSeq:171,iCode:"",x:-14.148,y:22.473,z:19.242},{resSeq:172,iCode:"",x:-16.233,y:23.866,z:16.407},{resSeq:173,iCode:"",x:-14.806,y:26.697,z:14.328},{resSeq:174,iCode:"",x:-14.839,y:28.511,z:10.999},{resSeq:175,iCode:"",x:-12.011,y:29.938,z:8.915},{resSeq:176,iCode:"",x:-11.066,y:31.287,z:5.514},{resSeq:177,iCode:"",x:-8.355,y:32.542,z:3.19},{resSeq:178,iCode:"",x:-8.001,y:35.024,z:.351},{resSeq:179,iCode:"",x:-4.912,y:34.738,z:-1.839},{resSeq:180,iCode:"",x:-4.013,y:36.755,z:-4.924},{resSeq:181,iCode:"",x:-1.165,y:35.825,z:-7.237},{resSeq:182,iCode:"",x:-.02,y:37.925,z:-10.184},{resSeq:183,iCode:"",x:3.039,y:37.023,z:-12.231},{resSeq:184,iCode:"",x:5.702,y:35.625,z:-9.886},{resSeq:185,iCode:"",x:4.051,y:37.374,z:-6.953},{resSeq:186,iCode:"",x:1.606,y:36.103,z:-4.338},{resSeq:187,iCode:"",x:-.072,y:37.617,z:-1.303},{resSeq:188,iCode:"",x:-2.125,y:35.572,z:1.174},{resSeq:189,iCode:"",x:-4.31,y:36.181,z:4.205},{resSeq:190,iCode:"",x:-5.849,y:33.46,z:6.338},{resSeq:191,iCode:"",x:-7.859,y:33.454,z:9.553},{resSeq:192,iCode:"",x:-9.826,y:31.05,z:11.736},{resSeq:193,iCode:"",x:-11.332,y:30.747,z:15.191},{resSeq:194,iCode:"",x:-12.75,y:27.8,z:17.1},{resSeq:195,iCode:"",x:-14.174,y:26.719,z:20.443},{resSeq:196,iCode:"",x:-11.738,y:25.089,z:22.848},{resSeq:197,iCode:"",x:-12.833,y:21.811,z:24.444},{resSeq:198,iCode:"",x:-13.257,y:21.427,z:28.201},{resSeq:199,iCode:"",x:-10.135,y:19.287,z:28.428},{resSeq:200,iCode:"",x:-8.266,y:22.105,z:26.704},{resSeq:201,iCode:"",x:-9.493,y:24.761,z:29.138},{resSeq:202,iCode:"",x:-8.783,y:22.435,z:32.064},{resSeq:203,iCode:"",x:-5.096,y:22.801,z:31.222},{resSeq:204,iCode:"",x:-2.704,y:24.806,z:33.443},{resSeq:205,iCode:"",x:-1.194,y:26.743,z:30.533},{resSeq:206,iCode:"",x:-3.458,y:28.889,z:28.362},{resSeq:207,iCode:"",x:-6.606,y:30.781,z:29.274},{resSeq:208,iCode:"",x:-9.73,y:31.399,z:27.213},{resSeq:209,iCode:"",x:-12.744,y:29.801,z:25.563},{resSeq:210,iCode:"",x:-11.812,y:30.753,z:22.008},{resSeq:211,iCode:"",x:-8.846,y:29.844,z:19.777},{resSeq:212,iCode:"",x:-7.618,y:32.121,z:16.988},{resSeq:213,iCode:"",x:-5.07,y:31.75,z:14.218},{resSeq:214,iCode:"",x:-4.292,y:34.227,z:11.463},{resSeq:215,iCode:"",x:-1.276,y:34.49,z:9.178},{resSeq:216,iCode:"",x:-.36,y:36.542,z:6.13},{resSeq:217,iCode:"",x:2.161,y:35.573,z:3.476},{resSeq:218,iCode:"",x:4.111,y:37.334,z:.763},{resSeq:219,iCode:"",x:6.184,y:35.559,z:-1.872},{resSeq:220,iCode:"",x:8.046,y:35.977,z:-5.14},{resSeq:221,iCode:"",x:8.175,y:32.743,z:-7.137},{resSeq:222,iCode:"",x:9.831,y:32.794,z:-10.572},{resSeq:223,iCode:"",x:13.188,y:32.709,z:-12.385},{resSeq:224,iCode:"",x:14.668,y:29.972,z:-10.195},{resSeq:225,iCode:"",x:14.118,y:32.411,z:-7.347},{resSeq:226,iCode:"",x:11.967,y:31.669,z:-4.31},{resSeq:227,iCode:"",x:11.523,y:34.42,z:-1.723},{resSeq:228,iCode:"",x:8.783,y:34.174,z:.904},{resSeq:229,iCode:"",x:7.892,y:35.691,z:4.264},{resSeq:230,iCode:"",x:5.136,y:34.869,z:6.748},{resSeq:231,iCode:"",x:3.75,y:36.739,z:9.723},{resSeq:232,iCode:"",x:1.026,y:35.448,z:12.026},{resSeq:233,iCode:"",x:-.34,y:35.393,z:15.554},{resSeq:234,iCode:"",x:-2.42,y:33.073,z:17.722},{resSeq:235,iCode:"",x:-4.748,y:33.149,z:20.71},{resSeq:236,iCode:"",x:-4.725,y:30.082,z:22.939},{resSeq:237,iCode:"",x:-3.838,y:27.854,z:19.976},{resSeq:238,iCode:"",x:-.104,y:27.114,z:19.915},{resSeq:239,iCode:"",x:.652,y:24.077,z:22.124},{resSeq:240,iCode:"",x:3.485,y:24.557,z:24.635},{resSeq:241,iCode:"",x:5.177,y:22.58,z:27.414},{resSeq:242,iCode:"",x:7.005,y:23.714,z:30.535},{resSeq:243,iCode:"",x:9.664,y:20.998,z:30.749},{resSeq:244,iCode:"",x:10.531,y:22.111,z:34.294},{resSeq:245,iCode:"",x:7.182,y:21.816,z:36.071},{resSeq:246,iCode:"",x:5.902,y:19.321,z:33.505},{resSeq:247,iCode:"",x:2.994,y:21.613,z:32.669},{resSeq:248,iCode:"",x:1.068,y:21.402,z:29.39},{resSeq:249,iCode:"",x:-1.347,y:23.662,z:27.523},{resSeq:250,iCode:"",x:-1.472,y:26.523,z:25.055},{resSeq:251,iCode:"",x:.241,y:29.89,z:24.744},{resSeq:252,iCode:"",x:-2.199,y:32.735,z:25.385},{resSeq:253,iCode:"",x:-.595,y:34.679,z:22.563},{resSeq:254,iCode:"",x:2.094,y:34.062,z:19.935},{resSeq:255,iCode:"",x:3.763,y:36.095,z:17.198},{resSeq:256,iCode:"",x:5.315,y:34.193,z:14.315},{resSeq:257,iCode:"",x:7.812,y:35.238,z:11.647},{resSeq:258,iCode:"",x:9.036,y:32.958,z:8.86},{resSeq:259,iCode:"",x:11.534,y:34.006,z:6.174},{resSeq:260,iCode:"",x:12.809,y:31.847,z:3.317},{resSeq:261,iCode:"",x:15.21,y:32.51,z:.439},{resSeq:262,iCode:"",x:16.09,y:29.788,z:-2.072},{resSeq:263,iCode:"",x:17.629,y:29.569,z:-5.527},{resSeq:264,iCode:"",x:17.381,y:26.74,z:-8.058},{resSeq:265,iCode:"",x:20.585,y:26.329,z:-10.067},{resSeq:266,iCode:"",x:20.211,y:24.558,z:-13.404},{resSeq:267,iCode:"",x:22.586,y:21.678,z:-12.702},{resSeq:268,iCode:"",x:20.292,y:20.728,z:-9.827},{resSeq:269,iCode:"",x:21.55,y:22.484,z:-6.705},{resSeq:270,iCode:"",x:19.068,y:24.477,z:-4.626},{resSeq:271,iCode:"",x:20.693,y:26.315,z:-1.69},{resSeq:272,iCode:"",x:18.328,y:27.471,z:1.07},{resSeq:273,iCode:"",x:18.486,y:30.335,z:3.57},{resSeq:274,iCode:"",x:15.79,y:30.654,z:6.229},{resSeq:275,iCode:"",x:14.989,y:32.421,z:9.491},{resSeq:276,iCode:"",x:12.243,y:31.399,z:11.924},{resSeq:277,iCode:"",x:11.147,y:32.999,z:15.177},{resSeq:278,iCode:"",x:8.023,y:32.171,z:17.158},{resSeq:279,iCode:"",x:7.614,y:33.915,z:20.51},{resSeq:280,iCode:"",x:4.837,y:33.287,z:23.02},{resSeq:281,iCode:"",x:3.356,y:36.109,z:25.093},{resSeq:282,iCode:"",x:1.749,y:36.043,z:28.537},{resSeq:283,iCode:"",x:2.717,y:32.47,z:29.325},{resSeq:284,iCode:"",x:1.208,y:32.294,z:32.805},{resSeq:285,iCode:"",x:4.221,y:32.823,z:35.074},{resSeq:286,iCode:"",x:7.009,y:32.881,z:32.494},{resSeq:287,iCode:"",x:5.776,y:35.891,z:30.545},{resSeq:288,iCode:"",x:7.454,y:36.115,z:27.154},{resSeq:289,iCode:"",x:9.31,y:33.076,z:25.905},{resSeq:290,iCode:"",x:10.68,y:32.055,z:22.545},{resSeq:291,iCode:"",x:9.314,y:28.728,z:21.304},{resSeq:292,iCode:"",x:11.285,y:28.646,z:18.077},{resSeq:293,iCode:"",x:14.274,y:30.723,z:16.99},{resSeq:294,iCode:"",x:16.981,y:29.849,z:14.472},{resSeq:295,iCode:"",x:18.766,y:30.564,z:11.211},{resSeq:296,iCode:"",x:18.735,y:27.833,z:8.58},{resSeq:297,iCode:"",x:21.419,y:27.121,z:5.981},{resSeq:298,iCode:"",x:20.907,y:24.128,z:3.712},{resSeq:299,iCode:"",x:20.773,y:22.815,z:.165},{resSeq:300,iCode:"",x:18.898,y:20.139,z:-1.75},{resSeq:301,iCode:"",x:20.511,y:18.49,z:-4.762},{resSeq:302,iCode:"",x:18.155,y:16.988,z:-7.339},{resSeq:303,iCode:"",x:19.618,y:14.25,z:-9.51},{resSeq:304,iCode:"",x:16.218,y:14.442,z:-11.176},{resSeq:305,iCode:"",x:12.502,y:14.364,z:-10.39},{resSeq:306,iCode:"",x:12.828,y:10.992,z:-8.644},{resSeq:307,iCode:"",x:16.121,y:11.144,z:-6.736},{resSeq:308,iCode:"",x:17.801,y:13.742,z:-4.517},{resSeq:309,iCode:"",x:19.733,y:14.322,z:-1.306},{resSeq:310,iCode:"",x:20.087,y:17.261,z:1.051},{resSeq:311,iCode:"",x:21.827,y:18.736,z:4.059},{resSeq:312,iCode:"",x:19.724,y:20.907,z:6.345},{resSeq:313,iCode:"",x:21.525,y:22.766,z:9.105},{resSeq:314,iCode:"",x:19.771,y:24.614,z:11.922},{resSeq:315,iCode:"",x:21.728,y:27.272,z:13.806},{resSeq:316,iCode:"",x:19.66,y:27.385,z:16.989},{resSeq:317,iCode:"",x:19.149,y:30.93,z:18.265},{resSeq:318,iCode:"",x:17.486,y:29.684,z:21.447},{resSeq:319,iCode:"",x:19.774,y:30.02,z:24.463},{resSeq:320,iCode:"",x:20.294,y:27.686,z:27.422},{resSeq:321,iCode:"",x:18.257,y:30.025,z:29.625},{resSeq:322,iCode:"",x:14.954,y:29.295,z:27.916},{resSeq:323,iCode:"",x:12.179,y:29.543,z:30.51},{resSeq:324,iCode:"",x:10.219,y:26.646,z:29.018},{resSeq:325,iCode:"",x:13.182,y:24.349,z:28.388},{resSeq:326,iCode:"",x:13.07,y:24.491,z:24.612},{resSeq:327,iCode:"",x:16.144,y:22.712,z:23.237},{resSeq:328,iCode:"",x:19.003,y:25.11,z:22.554},{resSeq:329,iCode:"",x:21.406,y:22.945,z:20.544},{resSeq:330,iCode:"",x:21.958,y:22.817,z:16.793},{resSeq:331,iCode:"",x:20.809,y:20.03,z:14.499},{resSeq:332,iCode:"",x:22.101,y:18.945,z:11.106},{resSeq:333,iCode:"",x:20.007,y:16.67,z:8.904},{resSeq:334,iCode:"",x:21.34,y:14.509,z:6.087},{resSeq:335,iCode:"",x:18.878,y:12.941,z:3.667},{resSeq:336,iCode:"",x:18.837,y:10.772,z:.567},{resSeq:337,iCode:"",x:15.385,y:10.576,z:-1.002},{resSeq:338,iCode:"",x:13.922,y:8.361,z:-3.707},{resSeq:339,iCode:"",x:10.323,y:8.959,z:-4.798},{resSeq:340,iCode:"",x:7.814,y:8.067,z:-7.503}]},{chainId:"C",residueCount:340,segments:[{start:2,end:6,type:"strand"},{start:9,end:23,type:"strand"},{start:31,end:31,type:"strand"},{start:36,end:37,type:"strand"},{start:40,end:50,type:"strand"},{start:55,end:66,type:"strand"},{start:73,end:76,type:"helix"},{start:80,end:90,type:"strand"},{start:94,end:102,type:"strand"},{start:106,end:109,type:"helix"},{start:110,end:112,type:"helix"},{start:132,end:141,type:"strand"},{start:143,end:146,type:"helix"},{start:151,end:158,type:"strand"},{start:161,end:161,type:"strand"},{start:170,end:170,type:"strand"},{start:173,end:182,type:"strand"},{start:185,end:195,type:"strand"},{start:196,end:197,type:"helix"},{start:198,end:201,type:"helix"},{start:205,end:205,type:"strand"},{start:210,end:222,type:"strand"},{start:225,end:235,type:"strand"},{start:239,end:242,type:"strand"},{start:247,end:250,type:"strand"},{start:253,end:263,type:"strand"},{start:269,end:283,type:"strand"},{start:287,end:301,type:"strand"},{start:307,end:316,type:"strand"},{start:329,end:329,type:"strand"},{start:331,end:339,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:4.961,y:-6.606,z:-10.649},{resSeq:2,iCode:"",x:6.312,y:-3.519,z:-12.413},{resSeq:3,iCode:"",x:3.349,y:-1.128,z:-12.503},{resSeq:4,iCode:"",x:5.187,y:1.881,z:-13.899},{resSeq:5,iCode:"",x:8.032,y:2.627,z:-16.293},{resSeq:6,iCode:"",x:8.472,y:6.02,z:-17.961},{resSeq:7,iCode:"",x:11.322,y:8.514,z:-18.308},{resSeq:8,iCode:"",x:14.031,y:6.191,z:-16.992},{resSeq:9,iCode:"",x:12.095,y:5.59,z:-13.764},{resSeq:10,iCode:"",x:10.389,y:2.26,z:-13.084},{resSeq:11,iCode:"",x:8.34,y:1.507,z:-9.971},{resSeq:12,iCode:"",x:7.738,y:-2.082,z:-8.914},{resSeq:13,iCode:"",x:4.747,y:-2.638,z:-6.624},{resSeq:14,iCode:"",x:5.009,y:-6.151,z:-5.187},{resSeq:15,iCode:"",x:3.389,y:-8.078,z:-2.325},{resSeq:16,iCode:"",x:1.66,y:-11.326,z:-1.424},{resSeq:17,iCode:"",x:-1.161,y:-13.087,z:.398},{resSeq:18,iCode:"",x:.03,y:-16.08,z:2.397},{resSeq:19,iCode:"",x:-2.578,y:-18.371,z:3.933},{resSeq:20,iCode:"",x:-.616,y:-20.206,z:6.595},{resSeq:21,iCode:"",x:-1.211,y:-22.639,z:9.451},{resSeq:22,iCode:"",x:1.063,y:-24.271,z:12.026},{resSeq:23,iCode:"",x:.465,y:-27.763,z:13.391},{resSeq:24,iCode:"",x:1.946,y:-28.779,z:16.745},{resSeq:25,iCode:"",x:.674,y:-30.722,z:19.751},{resSeq:26,iCode:"",x:-.784,y:-28.96,z:22.793},{resSeq:27,iCode:"",x:-1.121,y:-25.167,z:22.828},{resSeq:28,iCode:"",x:2.017,y:-25.169,z:20.731},{resSeq:29,iCode:"",x:3.729,y:-23.29,z:23.547},{resSeq:30,iCode:"",x:6.309,y:-26.059,z:23.889},{resSeq:31,iCode:"",x:6.736,y:-26.702,z:20.154},{resSeq:32,iCode:"",x:9.317,y:-25.3,z:17.728},{resSeq:33,iCode:"",x:7.177,y:-22.874,z:15.738},{resSeq:34,iCode:"",x:3.911,y:-22.674,z:17.638},{resSeq:35,iCode:"",x:.408,y:-23.704,z:16.642},{resSeq:36,iCode:"",x:-2.528,y:-22.153,z:14.783},{resSeq:37,iCode:"",x:-3.333,y:-19.614,z:12.073},{resSeq:38,iCode:"",x:-.237,y:-17.822,z:10.758},{resSeq:39,iCode:"",x:-1.785,y:-16.029,z:7.774},{resSeq:40,iCode:"",x:-.137,y:-12.788,z:6.686},{resSeq:41,iCode:"",x:.381,y:-10.457,z:3.738},{resSeq:42,iCode:"",x:3.151,y:-8.301,z:2.27},{resSeq:43,iCode:"",x:3.236,y:-4.991,z:.429},{resSeq:44,iCode:"",x:6.118,y:-2.879,z:-.85},{resSeq:45,iCode:"",x:7.809,y:-1.072,z:-3.706},{resSeq:46,iCode:"",x:11.193,y:-1.146,z:-5.431},{resSeq:47,iCode:"",x:11.883,y:2.176,z:-7.117},{resSeq:48,iCode:"",x:14.678,y:2.671,z:-9.616},{resSeq:49,iCode:"",x:15.567,y:5.754,z:-11.638},{resSeq:50,iCode:"",x:18.432,y:6.221,z:-14.085},{resSeq:51,iCode:"",x:19.893,y:9.65,z:-13.387},{resSeq:52,iCode:"",x:22.151,y:8.933,z:-16.365},{resSeq:53,iCode:"",x:24.415,y:6.318,z:-17.982},{resSeq:54,iCode:"",x:26.375,y:5.506,z:-14.822},{resSeq:55,iCode:"",x:24.113,y:6.825,z:-12.07},{resSeq:56,iCode:"",x:21.108,y:4.99,z:-10.645},{resSeq:57,iCode:"",x:18.928,y:6.205,z:-7.794},{resSeq:58,iCode:"",x:16.749,y:3.7,z:-5.959},{resSeq:59,iCode:"",x:14.437,y:3.348,z:-2.975},{resSeq:60,iCode:"",x:12.519,y:.537,z:-1.32},{resSeq:61,iCode:"",x:9.861,y:-.056,z:1.333},{resSeq:62,iCode:"",x:8.4,y:-3.345,z:2.54},{resSeq:63,iCode:"",x:5.668,y:-3.815,z:5.144},{resSeq:64,iCode:"",x:4.212,y:-6.854,z:6.903},{resSeq:65,iCode:"",x:.478,y:-7.069,z:7.569},{resSeq:66,iCode:"",x:-.557,y:-9.899,z:9.874},{resSeq:67,iCode:"",x:-3.803,y:-11.642,z:8.981},{resSeq:68,iCode:"",x:-4.289,y:-13.803,z:12.047},{resSeq:69,iCode:"",x:-5.36,y:-10.966,z:14.325},{resSeq:70,iCode:"",x:-8.934,y:-9.92,z:14.992},{resSeq:71,iCode:"",x:-10.26,y:-6.492,z:14.094},{resSeq:72,iCode:"",x:-10.427,y:-5.539,z:17.768},{resSeq:73,iCode:"",x:-7.739,y:-4.396,z:20.188},{resSeq:74,iCode:"",x:-5.046,y:-6.712,z:18.836},{resSeq:75,iCode:"",x:-5.466,y:-5.624,z:15.22},{resSeq:76,iCode:"",x:-1.877,y:-4.383,z:15.212},{resSeq:77,iCode:"",x:.013,y:-7.346,z:16.704},{resSeq:78,iCode:"",x:2.843,y:-8.294,z:14.342},{resSeq:79,iCode:"",x:2.646,y:-5.475,z:11.801},{resSeq:80,iCode:"",x:5.875,y:-3.623,z:11.063},{resSeq:81,iCode:"",x:8.052,y:-2.038,z:8.413},{resSeq:82,iCode:"",x:10.659,y:-4.577,z:7.296},{resSeq:83,iCode:"",x:12.648,y:-2.446,z:4.865},{resSeq:84,iCode:"",x:12.968,y:1.262,z:4.141},{resSeq:85,iCode:"",x:15.994,y:2.819,z:2.452},{resSeq:86,iCode:"",x:17.282,y:4.791,z:-.537},{resSeq:87,iCode:"",x:20.617,y:4.894,z:-2.374},{resSeq:88,iCode:"",x:22.778,y:5.355,z:-5.474},{resSeq:89,iCode:"",x:24.718,y:2.99,z:-7.765},{resSeq:90,iCode:"",x:27.57,y:4.547,z:-9.726},{resSeq:91,iCode:"",x:29.37,y:3.077,z:-12.747},{resSeq:92,iCode:"",x:31.992,y:.697,z:-11.359},{resSeq:93,iCode:"",x:32.563,y:2.707,z:-8.175},{resSeq:94,iCode:"",x:29.924,y:.853,z:-6.149},{resSeq:95,iCode:"",x:26.6,y:1.578,z:-4.457},{resSeq:96,iCode:"",x:25.531,y:3.232,z:-1.216},{resSeq:97,iCode:"",x:22.231,y:3.326,z:.652},{resSeq:98,iCode:"",x:20.875,y:4.274,z:4.081},{resSeq:99,iCode:"",x:17.856,y:3.338,z:6.186},{resSeq:100,iCode:"",x:16.442,y:.096,z:7.516},{resSeq:101,iCode:"",x:18.2,y:-2.661,z:5.57},{resSeq:102,iCode:"",x:19.877,y:-6.053,z:6},{resSeq:103,iCode:"",x:23.056,y:-6.347,z:8.065},{resSeq:104,iCode:"",x:26.258,y:-7.263,z:6.262},{resSeq:105,iCode:"",x:26.625,y:-10.58,z:8.07},{resSeq:106,iCode:"",x:23.397,y:-11.658,z:6.392},{resSeq:107,iCode:"",x:25.342,y:-11.666,z:3.144},{resSeq:108,iCode:"",x:26.61,y:-14.985,z:4.492},{resSeq:109,iCode:"",x:23.625,y:-16.35,z:6.422},{resSeq:110,iCode:"",x:21.494,y:-15.709,z:3.327},{resSeq:111,iCode:"",x:22.968,y:-18.857,z:1.807},{resSeq:112,iCode:"",x:20.998,y:-21.281,z:3.971},{resSeq:113,iCode:"",x:17.979,y:-19.04,z:4.485},{resSeq:114,iCode:"",x:16.119,y:-21.057,z:1.869},{resSeq:115,iCode:"",x:13.587,y:-23.277,z:3.646},{resSeq:116,iCode:"",x:9.91,y:-23.124,z:2.596},{resSeq:117,iCode:"",x:8.787,y:-21.595,z:5.896},{resSeq:118,iCode:"",x:11.322,y:-21.839,z:8.727},{resSeq:119,iCode:"",x:15.119,y:-21.918,z:8.685},{resSeq:120,iCode:"",x:17.472,y:-18.937,z:8.823},{resSeq:121,iCode:"",x:17.216,y:-19.288,z:12.579},{resSeq:122,iCode:"",x:20.31,y:-17.234,z:13.401},{resSeq:123,iCode:"",x:19.25,y:-14.242,z:11.294},{resSeq:124,iCode:"",x:17.383,y:-12.346,z:14.015},{resSeq:125,iCode:"",x:15.806,y:-8.942,z:13.438},{resSeq:126,iCode:"",x:17.175,y:-5.841,z:15.112},{resSeq:127,iCode:"",x:20.069,y:-8.021,z:16.229},{resSeq:128,iCode:"",x:23.084,y:-6.016,z:15.08},{resSeq:129,iCode:"",x:24.48,y:-7.425,z:11.829},{resSeq:130,iCode:"",x:22.73,y:-10.769,z:11.28},{resSeq:131,iCode:"",x:19.305,y:-9.472,z:10.2},{resSeq:132,iCode:"",x:17.241,y:-6.416,z:9.33},{resSeq:133,iCode:"",x:18.314,y:-3.418,z:11.417},{resSeq:134,iCode:"",x:17.543,y:.293,z:11.479},{resSeq:135,iCode:"",x:19.931,y:3.102,z:10.591},{resSeq:136,iCode:"",x:22.623,y:1.268,z:8.633},{resSeq:137,iCode:"",x:24.766,y:2.877,z:5.953},{resSeq:138,iCode:"",x:25.808,y:.235,z:3.432},{resSeq:139,iCode:"",x:28.467,y:.545,z:.734},{resSeq:140,iCode:"",x:28.702,y:-2.303,z:-1.767},{resSeq:141,iCode:"",x:31.081,y:-3.043,z:-4.64},{resSeq:142,iCode:"",x:30.599,y:-5.395,z:-7.601},{resSeq:143,iCode:"",x:33.434,y:-7.157,z:-9.402},{resSeq:144,iCode:"",x:36.045,y:-5.279,z:-7.395},{resSeq:145,iCode:"",x:35.31,y:-2.075,z:-9.318},{resSeq:146,iCode:"",x:34.623,y:-4.079,z:-12.477},{resSeq:147,iCode:"",x:38.227,y:-5.286,z:-12.369},{resSeq:148,iCode:"",x:37.559,y:-8.801,z:-11.039},{resSeq:149,iCode:"",x:34.503,y:-10.872,z:-12.003},{resSeq:150,iCode:"",x:32.463,y:-12.492,z:-9.225},{resSeq:151,iCode:"",x:34.361,y:-10.679,z:-6.479},{resSeq:152,iCode:"",x:32.097,y:-8.52,z:-4.296},{resSeq:153,iCode:"",x:32.677,y:-6.82,z:-.956},{resSeq:154,iCode:"",x:30.72,y:-4.5,z:1.355},{resSeq:155,iCode:"",x:31.388,y:-2.238,z:4.339},{resSeq:156,iCode:"",x:28.588,y:-1.18,z:6.717},{resSeq:157,iCode:"",x:28.209,y:1.322,z:9.596},{resSeq:158,iCode:"",x:25.502,y:.625,z:12.174},{resSeq:159,iCode:"",x:24.139,y:3.711,z:13.911},{resSeq:160,iCode:"",x:23.441,y:3.667,z:17.639},{resSeq:161,iCode:"",x:19.869,y:2.573,z:18.404},{resSeq:162,iCode:"",x:18.895,y:2.972,z:22.062},{resSeq:163,iCode:"",x:15.333,y:1.66,z:22.158},{resSeq:164,iCode:"",x:13.11,y:.695,z:25.077},{resSeq:165,iCode:"",x:14.134,y:-2.945,z:24.881},{resSeq:166,iCode:"",x:17.512,y:-4.537,z:25.49},{resSeq:167,iCode:"",x:16.646,y:-7.015,z:22.747},{resSeq:168,iCode:"",x:16.037,y:-4.341,z:20.108},{resSeq:169,iCode:"",x:18.935,y:-2.038,z:20.967},{resSeq:170,iCode:"",x:22.496,y:-1.625,z:19.695},{resSeq:171,iCode:"",x:25.462,y:.75,z:19.921},{resSeq:172,iCode:"",x:27.766,y:1.943,z:17.154},{resSeq:173,iCode:"",x:29.564,y:-.663,z:15.067},{resSeq:174,iCode:"",x:31.226,y:-1.464,z:11.758},{resSeq:175,iCode:"",x:31.108,y:-4.576,z:9.594},{resSeq:176,iCode:"",x:31.863,y:-5.992,z:6.173},{resSeq:177,iCode:"",x:31.662,y:-8.904,z:3.773},{resSeq:178,iCode:"",x:33.71,y:-10.375,z:.944},{resSeq:179,iCode:"",x:31.979,y:-12.853,z:-1.351},{resSeq:180,iCode:"",x:33.34,y:-14.573,z:-4.446},{resSeq:181,iCode:"",x:31.174,y:-16.52,z:-6.866},{resSeq:182,iCode:"",x:32.494,y:-18.482,z:-9.823},{resSeq:183,iCode:"",x:30.235,y:-20.643,z:-11.979},{resSeq:184,iCode:"",x:27.635,y:-22.305,z:-9.738},{resSeq:185,iCode:"",x:29.901,y:-21.816,z:-6.732},{resSeq:186,iCode:"",x:29.97,y:-19.136,z:-4.048},{resSeq:187,iCode:"",x:32.041,y:-18.501,z:-.951},{resSeq:188,iCode:"",x:31.238,y:-15.763,z:1.573},{resSeq:189,iCode:"",x:32.772,y:-14.253,z:4.682},{resSeq:190,iCode:"",x:31.162,y:-11.599,z:6.84},{resSeq:191,iCode:"",x:32.069,y:-9.937,z:10.117},{resSeq:192,iCode:"",x:30.908,y:-7.096,z:12.346},{resSeq:193,iCode:"",x:31.317,y:-5.721,z:15.85},{resSeq:194,iCode:"",x:29.427,y:-3.065,z:17.78},{resSeq:195,iCode:"",x:29.113,y:-1.371,z:21.161},{resSeq:196,iCode:"",x:26.432,y:-2.733,z:23.461},{resSeq:197,iCode:"",x:24.099,y:-.195,z:25.064},{resSeq:198,iCode:"",x:23.9,y:.282,z:28.833},{resSeq:199,iCode:"",x:20.484,y:-1.366,z:28.942},{resSeq:200,iCode:"",x:22.03,y:-4.356,z:27.189},{resSeq:201,iCode:"",x:24.89,y:-4.668,z:29.675},{resSeq:202,iCode:"",x:22.453,y:-4.192,z:32.552},{resSeq:203,iCode:"",x:20.955,y:-7.556,z:31.604},{resSeq:204,iCode:"",x:21.456,y:-10.675,z:33.758},{resSeq:205,iCode:"",x:22.456,y:-12.886,z:30.822},{resSeq:206,iCode:"",x:25.489,y:-11.938,z:28.742},{resSeq:207,iCode:"",x:28.675,y:-10.179,z:29.769},{resSeq:208,iCode:"",x:30.81,y:-7.729,z:27.798},{resSeq:209,iCode:"",x:30.968,y:-4.275,z:26.25},{resSeq:210,iCode:"",x:31.415,y:-5.469,z:22.673},{resSeq:211,iCode:"",x:29.198,y:-7.531,z:20.352},{resSeq:212,iCode:"",x:30.615,y:-9.663,z:17.532},{resSeq:213,iCode:"",x:29.081,y:-11.626,z:14.68},{resSeq:214,iCode:"",x:30.905,y:-13.461,z:11.917},{resSeq:215,iCode:"",x:29.698,y:-16.152,z:9.542},{resSeq:216,iCode:"",x:31.083,y:-17.898,z:6.483},{resSeq:217,iCode:"",x:29.056,y:-19.527,z:3.729},{resSeq:218,iCode:"",x:29.662,y:-22.042,z:.976},{resSeq:219,iCode:"",x:27.143,y:-22.892,z:-1.736},{resSeq:220,iCode:"",x:26.657,y:-24.625,z:-5.058},{resSeq:221,iCode:"",x:23.834,y:-23.08,z:-7.083},{resSeq:222,iCode:"",x:23.144,y:-24.459,z:-10.573},{resSeq:223,iCode:"",x:21.434,y:-27.266,z:-12.501},{resSeq:224,iCode:"",x:18.274,y:-27.246,z:-10.383},{resSeq:225,iCode:"",x:20.586,y:-28.055,z:-7.482},{resSeq:226,iCode:"",x:20.96,y:-25.898,z:-4.393},{resSeq:227,iCode:"",x:23.501,y:-26.944,z:-1.771},{resSeq:228,iCode:"",x:24.59,y:-24.518,z:.945},{resSeq:229,iCode:"",x:26.269,y:-24.578,z:4.351},{resSeq:230,iCode:"",x:26.889,y:-21.831,z:6.904},{resSeq:231,iCode:"",x:29.113,y:-21.642,z:9.945},{resSeq:232,iCode:"",x:29.309,y:-18.707,z:12.326},{resSeq:233,iCode:"",x:29.864,y:-17.57,z:15.892},{resSeq:234,iCode:"",x:28.845,y:-14.658,z:18.1},{resSeq:235,iCode:"",x:29.991,y:-12.757,z:21.171},{resSeq:236,iCode:"",x:27.269,y:-11.298,z:23.367},{resSeq:237,iCode:"",x:24.968,y:-10.884,z:20.362},{resSeq:238,iCode:"",x:22.466,y:-13.751,z:20.185},{resSeq:239,iCode:"",x:19.412,y:-12.947,z:22.342},{resSeq:240,iCode:"",x:18.356,y:-15.703,z:24.756},{resSeq:241,iCode:"",x:15.737,y:-16.247,z:27.462},{resSeq:242,iCode:"",x:15.736,y:-18.468,z:30.532},{resSeq:243,iCode:"",x:12.057,y:-19.431,z:30.636},{resSeq:244,iCode:"",x:12.505,y:-20.823,z:34.165},{resSeq:245,iCode:"",x:13.869,y:-17.814,z:36.063},{resSeq:246,iCode:"",x:12.412,y:-15.404,z:33.512},{resSeq:247,iCode:"",x:15.868,y:-14.009,z:32.776},{resSeq:248,iCode:"",x:16.722,y:-12.155,z:29.563},{resSeq:249,iCode:"",x:19.922,y:-11.128,z:27.791},{resSeq:250,iCode:"",x:22.524,y:-12.396,z:25.349},{resSeq:251,iCode:"",x:24.591,y:-15.556,z:25.013},{resSeq:252,iCode:"",x:28.257,y:-14.866,z:25.753},{resSeq:253,iCode:"",x:29.213,y:-17.162,z:22.893},{resSeq:254,iCode:"",x:27.391,y:-19.12,z:20.181},{resSeq:255,iCode:"",x:28.378,y:-21.519,z:17.412},{resSeq:256,iCode:"",x:26.022,y:-21.841,z:14.462},{resSeq:257,iCode:"",x:25.749,y:-24.461,z:11.719},{resSeq:258,iCode:"",x:23.225,y:-24.328,z:8.881},{resSeq:259,iCode:"",x:22.955,y:-26.934,z:6.117},{resSeq:260,iCode:"",x:20.502,y:-26.894,z:3.21},{resSeq:261,iCode:"",x:19.944,y:-29.234,z:.268},{resSeq:262,iCode:"",x:17.213,y:-28.586,z:-2.303},{resSeq:263,iCode:"",x:16.355,y:-29.724,z:-5.812},{resSeq:264,iCode:"",x:14.08,y:-28.031,z:-8.349},{resSeq:265,iCode:"",x:12.163,y:-30.547,z:-10.464},{resSeq:266,iCode:"",x:10.901,y:-29.267,z:-13.802},{resSeq:267,iCode:"",x:7.206,y:-29.912,z:-13.2},{resSeq:268,iCode:"",x:7.456,y:-27.522,z:-10.265},{resSeq:269,iCode:"",x:8.285,y:-29.561,z:-7.176},{resSeq:270,iCode:"",x:11.193,y:-28.458,z:-4.995},{resSeq:271,iCode:"",x:11.913,y:-30.855,z:-2.099},{resSeq:272,iCode:"",x:14.025,y:-29.447,z:.739},{resSeq:273,iCode:"",x:16.365,y:-31.058,z:3.266},{resSeq:274,iCode:"",x:17.938,y:-28.957,z:6.01},{resSeq:275,iCode:"",x:19.773,y:-29.214,z:9.316},{resSeq:276,iCode:"",x:20.218,y:-26.391,z:11.816},{resSeq:277,iCode:"",x:22.069,y:-26.316,z:15.119},{resSeq:278,iCode:"",x:22.867,y:-23.248,z:17.192},{resSeq:279,iCode:"",x:24.501,y:-23.842,z:20.572},{resSeq:280,iCode:"",x:25.285,y:-21.187,z:23.162},{resSeq:281,iCode:"",x:28.419,y:-21.358,z:25.303},{resSeq:282,iCode:"",x:29.087,y:-20.021,z:28.797},{resSeq:283,iCode:"",x:25.493,y:-19.106,z:29.53},{resSeq:284,iCode:"",x:26.015,y:-17.787,z:33.053},{resSeq:285,iCode:"",x:24.932,y:-20.721,z:35.222},{resSeq:286,iCode:"",x:23.633,y:-23.098,z:32.557},{resSeq:287,iCode:"",x:26.909,y:-23.486,z:30.678},{resSeq:288,iCode:"",x:26.334,y:-24.965,z:27.238},{resSeq:289,iCode:"",x:22.795,y:-25.026,z:25.905},{resSeq:290,iCode:"",x:21.313,y:-25.616,z:22.481},{resSeq:291,iCode:"",x:19.14,y:-22.748,z:21.277},{resSeq:292,iCode:"",x:18.158,y:-24.346,z:17.988},{resSeq:293,iCode:"",x:18.501,y:-27.933,z:16.81},{resSeq:294,iCode:"",x:16.448,y:-29.778,z:14.2},{resSeq:295,iCode:"",x:16.257,y:-31.608,z:10.895},{resSeq:296,iCode:"",x:13.954,y:-30.169,z:8.246},{resSeq:297,iCode:"",x:12.064,y:-32.068,z:5.553},{resSeq:298,iCode:"",x:9.785,y:-30.083,z:3.267},{resSeq:299,iCode:"",x:8.796,y:-29.207,z:-.272},{resSeq:300,iCode:"",x:7.448,y:-26.206,z:-2.15},{resSeq:301,iCode:"",x:5.293,y:-26.714,z:-5.23},{resSeq:302,iCode:"",x:5.22,y:-23.861,z:-7.737},{resSeq:303,iCode:"",x:2.169,y:-23.71,z:-9.974},{resSeq:304,iCode:"",x:4.065,y:-20.817,z:-11.527},{resSeq:305,iCode:"",x:5.832,y:-17.568,z:-10.617},{resSeq:306,iCode:"",x:2.708,y:-16.222,z:-8.909},{resSeq:307,iCode:"",x:1.151,y:-19.185,z:-7.101},{resSeq:308,iCode:"",x:2.516,y:-21.993,z:-4.928},{resSeq:309,iCode:"",x:1.987,y:-24.052,z:-1.782},{resSeq:310,iCode:"",x:4.309,y:-25.875,z:.587},{resSeq:311,iCode:"",x:4.642,y:-28.185,z:3.554},{resSeq:312,iCode:"",x:7.522,y:-27.5,z:5.918},{resSeq:313,iCode:"",x:8.182,y:-30.061,z:8.628},{resSeq:314,iCode:"",x:10.594,y:-29.533,z:11.51},{resSeq:315,iCode:"",x:11.862,y:-32.599,z:13.361},{resSeq:316,iCode:"",x:12.922,y:-30.946,z:16.607},{resSeq:317,iCode:"",x:16.21,y:-32.301,z:17.934},{resSeq:318,iCode:"",x:15.89,y:-30.315,z:21.147},{resSeq:319,iCode:"",x:14.983,y:-32.536,z:24.092},{resSeq:320,iCode:"",x:12.631,y:-31.893,z:27.016},{resSeq:321,iCode:"",x:15.615,y:-31.352,z:29.296},{resSeq:322,iCode:"",x:16.675,y:-28.085,z:27.692},{resSeq:323,iCode:"",x:18.206,y:-25.874,z:30.378},{resSeq:324,iCode:"",x:16.707,y:-22.686,z:28.944},{resSeq:325,iCode:"",x:13.25,y:-24.081,z:28.197},{resSeq:326,iCode:"",x:13.523,y:-23.976,z:24.422},{resSeq:327,iCode:"",x:10.487,y:-25.715,z:22.927},{resSeq:328,iCode:"",x:11.15,y:-29.375,z:22.171},{resSeq:329,iCode:"",x:8.127,y:-30.326,z:20.065},{resSeq:330,iCode:"",x:7.827,y:-30.649,z:16.3},{resSeq:331,iCode:"",x:6.025,y:-28.207,z:14.026},{resSeq:332,iCode:"",x:4.524,y:-28.698,z:10.582},{resSeq:333,iCode:"",x:3.645,y:-25.7,z:8.439},{resSeq:334,iCode:"",x:1.172,y:-25.718,z:5.561},{resSeq:335,iCode:"",x:1.102,y:-22.726,z:3.212},{resSeq:336,iCode:"",x:-.688,y:-21.535,z:.1},{resSeq:337,iCode:"",x:.894,y:-18.416,z:-1.367},{resSeq:338,iCode:"",x:-.229,y:-15.966,z:-4.027},{resSeq:339,iCode:"",x:2.104,y:-13.122,z:-4.992},{resSeq:340,iCode:"",x:2.641,y:-10.439,z:-7.633}]}]},"2omf":{pdbId:"2omf",chains:[{chainId:"A",residueCount:340,segments:[{start:2,end:6,type:"strand"},{start:9,end:23,type:"strand"},{start:31,end:31,type:"strand"},{start:36,end:37,type:"strand"},{start:40,end:50,type:"strand"},{start:55,end:66,type:"strand"},{start:80,end:90,type:"strand"},{start:94,end:102,type:"strand"},{start:106,end:109,type:"helix"},{start:110,end:112,type:"helix"},{start:132,end:141,type:"strand"},{start:143,end:146,type:"helix"},{start:151,end:158,type:"strand"},{start:161,end:161,type:"strand"},{start:170,end:170,type:"strand"},{start:173,end:182,type:"strand"},{start:185,end:195,type:"strand"},{start:196,end:197,type:"helix"},{start:198,end:201,type:"helix"},{start:205,end:205,type:"strand"},{start:210,end:222,type:"strand"},{start:225,end:235,type:"strand"},{start:239,end:242,type:"strand"},{start:247,end:250,type:"strand"},{start:253,end:263,type:"strand"},{start:269,end:283,type:"strand"},{start:287,end:302,type:"strand"},{start:307,end:316,type:"strand"},{start:329,end:329,type:"strand"},{start:331,end:339,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:-5.095,y:6.68,z:-10.336},{resSeq:2,iCode:"",x:-6.45,y:3.802,z:-12.374},{resSeq:3,iCode:"",x:-3.476,y:1.502,z:-12.391},{resSeq:4,iCode:"",x:-5.363,y:-1.535,z:-13.7},{resSeq:5,iCode:"",x:-8.141,y:-2.283,z:-16.132},{resSeq:6,iCode:"",x:-8.414,y:-5.596,z:-17.927},{resSeq:7,iCode:"",x:-11.11,y:-8.228,z:-18.283},{resSeq:8,iCode:"",x:-13.821,y:-6.002,z:-16.891},{resSeq:9,iCode:"",x:-11.892,y:-5.329,z:-13.704},{resSeq:10,iCode:"",x:-10.5,y:-1.928,z:-12.979},{resSeq:11,iCode:"",x:-8.494,y:-.981,z:-9.929},{resSeq:12,iCode:"",x:-7.865,y:2.558,z:-8.893},{resSeq:13,iCode:"",x:-4.972,y:2.929,z:-6.416},{resSeq:14,iCode:"",x:-5.156,y:6.383,z:-4.883},{resSeq:15,iCode:"",x:-3.47,y:8.458,z:-2.219},{resSeq:16,iCode:"",x:-2.04,y:11.739,z:-1.091},{resSeq:17,iCode:"",x:.8,y:13.301,z:.855},{resSeq:18,iCode:"",x:-.377,y:16.363,z:2.768},{resSeq:19,iCode:"",x:2.231,y:18.723,z:4.24},{resSeq:20,iCode:"",x:.129,y:20.503,z:6.881},{resSeq:21,iCode:"",x:.656,y:22.966,z:9.729},{resSeq:22,iCode:"",x:-1.713,y:24.576,z:12.245},{resSeq:23,iCode:"",x:-1.061,y:27.99,z:13.76},{resSeq:24,iCode:"",x:-2.88,y:28.814,z:17.016},{resSeq:25,iCode:"",x:-1.596,y:30.82,z:19.979},{resSeq:26,iCode:"",x:-.446,y:29.273,z:23.24},{resSeq:27,iCode:"",x:-.114,y:25.502,z:23.334},{resSeq:28,iCode:"",x:-3.154,y:25.425,z:21.086},{resSeq:29,iCode:"",x:-4.863,y:23.755,z:24.048},{resSeq:30,iCode:"",x:-7.509,y:26.521,z:24.115},{resSeq:31,iCode:"",x:-7.641,y:27.05,z:20.343},{resSeq:32,iCode:"",x:-10.077,y:25.626,z:17.819},{resSeq:33,iCode:"",x:-7.838,y:23.182,z:15.948},{resSeq:34,iCode:"",x:-4.606,y:22.945,z:17.901},{resSeq:35,iCode:"",x:-1.163,y:23.984,z:16.767},{resSeq:36,iCode:"",x:1.859,y:22.485,z:15.049},{resSeq:37,iCode:"",x:2.715,y:19.91,z:12.376},{resSeq:38,iCode:"",x:-.296,y:17.937,z:11.185},{resSeq:39,iCode:"",x:1.264,y:16.299,z:8.132},{resSeq:40,iCode:"",x:-.311,y:13.013,z:6.961},{resSeq:41,iCode:"",x:-.823,y:10.701,z:4.009},{resSeq:42,iCode:"",x:-3.608,y:8.495,z:2.718},{resSeq:43,iCode:"",x:-3.51,y:5.293,z:.69},{resSeq:44,iCode:"",x:-6.524,y:3.374,z:-.542},{resSeq:45,iCode:"",x:-7.94,y:1.319,z:-3.359},{resSeq:46,iCode:"",x:-11.328,y:1.273,z:-5.126},{resSeq:47,iCode:"",x:-12.062,y:-1.77,z:-7.287},{resSeq:48,iCode:"",x:-14.972,y:-2.421,z:-9.615},{resSeq:49,iCode:"",x:-15.679,y:-5.481,z:-11.705},{resSeq:50,iCode:"",x:-18.371,y:-5.97,z:-14.343},{resSeq:51,iCode:"",x:-19.841,y:-9.365,z:-13.637},{resSeq:52,iCode:"",x:-22.141,y:-8.829,z:-16.648},{resSeq:53,iCode:"",x:-24.16,y:-5.962,z:-18.135},{resSeq:54,iCode:"",x:-26.455,y:-5.357,z:-15.134},{resSeq:55,iCode:"",x:-24.234,y:-6.556,z:-12.308},{resSeq:56,iCode:"",x:-21.218,y:-4.789,z:-10.844},{resSeq:57,iCode:"",x:-19.197,y:-5.824,z:-7.815},{resSeq:58,iCode:"",x:-16.933,y:-3.371,z:-6.077},{resSeq:59,iCode:"",x:-14.819,y:-2.813,z:-3.008},{resSeq:60,iCode:"",x:-12.895,y:-.075,z:-1.3},{resSeq:61,iCode:"",x:-10.296,y:.376,z:1.418},{resSeq:62,iCode:"",x:-8.714,y:3.598,z:2.618},{resSeq:63,iCode:"",x:-6.089,y:4.11,z:5.28},{resSeq:64,iCode:"",x:-4.708,y:7.059,z:7.202},{resSeq:65,iCode:"",x:-.957,y:7.286,z:7.952},{resSeq:66,iCode:"",x:-.047,y:10.191,z:10.302},{resSeq:67,iCode:"",x:3.072,y:12.073,z:9.166},{resSeq:68,iCode:"",x:3.626,y:13.964,z:12.398},{resSeq:69,iCode:"",x:4.693,y:11.132,z:14.754},{resSeq:70,iCode:"",x:8.266,y:10.101,z:15.555},{resSeq:71,iCode:"",x:9.772,y:6.787,z:14.487},{resSeq:72,iCode:"",x:9.729,y:5.982,z:18.179},{resSeq:73,iCode:"",x:6.98,y:4.564,z:20.392},{resSeq:74,iCode:"",x:4.373,y:7.071,z:19.234},{resSeq:75,iCode:"",x:4.896,y:6.099,z:15.582},{resSeq:76,iCode:"",x:1.317,y:4.705,z:15.117},{resSeq:77,iCode:"",x:-.603,y:7.515,z:16.77},{resSeq:78,iCode:"",x:-3.611,y:8.396,z:14.62},{resSeq:79,iCode:"",x:-3.205,y:5.633,z:12.04},{resSeq:80,iCode:"",x:-6.377,y:3.873,z:11.062},{resSeq:81,iCode:"",x:-8.499,y:2.337,z:8.381},{resSeq:82,iCode:"",x:-11.166,y:4.838,z:7.387},{resSeq:83,iCode:"",x:-13.233,y:2.672,z:5.012},{resSeq:84,iCode:"",x:-13.371,y:-1.073,z:4.253},{resSeq:85,iCode:"",x:-16.34,y:-2.527,z:2.38},{resSeq:86,iCode:"",x:-17.472,y:-4.696,z:-.529},{resSeq:87,iCode:"",x:-20.748,y:-4.688,z:-2.437},{resSeq:88,iCode:"",x:-22.822,y:-5.276,z:-5.588},{resSeq:89,iCode:"",x:-24.889,y:-2.974,z:-7.81},{resSeq:90,iCode:"",x:-27.596,y:-4.506,z:-9.921},{resSeq:91,iCode:"",x:-29.221,y:-2.8,z:-12.879},{resSeq:92,iCode:"",x:-31.784,y:-.26,z:-11.608},{resSeq:93,iCode:"",x:-32.594,y:-2.348,z:-8.546},{resSeq:94,iCode:"",x:-29.991,y:-.708,z:-6.336},{resSeq:95,iCode:"",x:-26.696,y:-1.356,z:-4.592},{resSeq:96,iCode:"",x:-25.861,y:-3.101,z:-1.39},{resSeq:97,iCode:"",x:-22.625,y:-3.065,z:.581},{resSeq:98,iCode:"",x:-21.316,y:-4.007,z:3.999},{resSeq:99,iCode:"",x:-18.297,y:-3.014,z:6.069},{resSeq:100,iCode:"",x:-16.863,y:.17,z:7.544},{resSeq:101,iCode:"",x:-18.528,y:2.985,z:5.651},{resSeq:102,iCode:"",x:-20.357,y:6.31,z:6.094},{resSeq:103,iCode:"",x:-23.552,y:6.447,z:8.167},{resSeq:104,iCode:"",x:-26.689,y:7.512,z:6.22},{resSeq:105,iCode:"",x:-27.112,y:10.83,z:8.046},{resSeq:106,iCode:"",x:-23.86,y:11.848,z:6.368},{resSeq:107,iCode:"",x:-25.878,y:11.73,z:3.109},{resSeq:108,iCode:"",x:-27.04,y:15.059,z:4.463},{resSeq:109,iCode:"",x:-24.026,y:16.435,z:6.348},{resSeq:110,iCode:"",x:-21.929,y:15.883,z:3.294},{resSeq:111,iCode:"",x:-23.478,y:19.042,z:1.801},{resSeq:112,iCode:"",x:-21.415,y:21.382,z:3.95},{resSeq:113,iCode:"",x:-18.36,y:19.177,z:4.559},{resSeq:114,iCode:"",x:-16.478,y:21.126,z:1.926},{resSeq:115,iCode:"",x:-14.09,y:23.432,z:3.798},{resSeq:116,iCode:"",x:-10.372,y:23.405,z:2.757},{resSeq:117,iCode:"",x:-9.178,y:21.946,z:6.086},{resSeq:118,iCode:"",x:-11.913,y:22.282,z:8.773},{resSeq:119,iCode:"",x:-15.732,y:22.111,z:8.69},{resSeq:120,iCode:"",x:-18.005,y:19.08,z:8.95},{resSeq:121,iCode:"",x:-17.848,y:19.393,z:12.742},{resSeq:122,iCode:"",x:-20.923,y:17.345,z:13.428},{resSeq:123,iCode:"",x:-19.889,y:14.384,z:11.251},{resSeq:124,iCode:"",x:-18,y:12.51,z:14.059},{resSeq:125,iCode:"",x:-16.431,y:9.091,z:13.6},{resSeq:126,iCode:"",x:-17.818,y:5.983,z:15.304},{resSeq:127,iCode:"",x:-20.783,y:8.054,z:16.333},{resSeq:128,iCode:"",x:-23.833,y:6.161,z:15.065},{resSeq:129,iCode:"",x:-25.012,y:7.429,z:11.632},{resSeq:130,iCode:"",x:-23.211,y:10.775,z:11.161},{resSeq:131,iCode:"",x:-19.713,y:9.729,z:10.017},{resSeq:132,iCode:"",x:-17.697,y:6.565,z:9.347},{resSeq:133,iCode:"",x:-18.806,y:3.566,z:11.441},{resSeq:134,iCode:"",x:-18.144,y:-.137,z:11.42},{resSeq:135,iCode:"",x:-20.551,y:-2.928,z:10.575},{resSeq:136,iCode:"",x:-23.141,y:-1.099,z:8.523},{resSeq:137,iCode:"",x:-25.147,y:-2.789,z:5.751},{resSeq:138,iCode:"",x:-26.343,y:-.164,z:3.257},{resSeq:139,iCode:"",x:-28.909,y:-.417,z:.462},{resSeq:140,iCode:"",x:-29.104,y:2.505,z:-1.952},{resSeq:141,iCode:"",x:-31.513,y:3.237,z:-4.724},{resSeq:142,iCode:"",x:-31.022,y:5.667,z:-7.582},{resSeq:143,iCode:"",x:-33.734,y:7.32,z:-9.639},{resSeq:144,iCode:"",x:-36.442,y:5.362,z:-7.872},{resSeq:145,iCode:"",x:-35.791,y:2.042,z:-9.651},{resSeq:146,iCode:"",x:-35.124,y:4.13,z:-12.729},{resSeq:147,iCode:"",x:-38.652,y:5.451,z:-12.776},{resSeq:148,iCode:"",x:-37.993,y:8.896,z:-11.266},{resSeq:149,iCode:"",x:-34.88,y:10.809,z:-12.393},{resSeq:150,iCode:"",x:-33.176,y:12.478,z:-9.441},{resSeq:151,iCode:"",x:-35.013,y:10.747,z:-6.637},{resSeq:152,iCode:"",x:-32.781,y:8.483,z:-4.525},{resSeq:153,iCode:"",x:-33.041,y:6.836,z:-1.164},{resSeq:154,iCode:"",x:-31.129,y:4.606,z:1.155},{resSeq:155,iCode:"",x:-31.776,y:2.493,z:4.219},{resSeq:156,iCode:"",x:-29.024,y:1.352,z:6.506},{resSeq:157,iCode:"",x:-28.72,y:-1.304,z:9.186},{resSeq:158,iCode:"",x:-26.132,y:-.705,z:11.867},{resSeq:159,iCode:"",x:-25.016,y:-3.696,z:13.87},{resSeq:160,iCode:"",x:-24.105,y:-3.507,z:17.541},{resSeq:161,iCode:"",x:-20.478,y:-2.521,z:18.225},{resSeq:162,iCode:"",x:-19.536,y:-3.007,z:21.85},{resSeq:163,iCode:"",x:-16.109,y:-1.47,z:22.105},{resSeq:164,iCode:"",x:-14.031,y:-.828,z:25.244},{resSeq:165,iCode:"",x:-15.152,y:2.782,z:25.035},{resSeq:166,iCode:"",x:-18.539,y:4.446,z:25.378},{resSeq:167,iCode:"",x:-17.535,y:6.966,z:22.699},{resSeq:168,iCode:"",x:-16.708,y:4.374,z:20.056},{resSeq:169,iCode:"",x:-19.62,y:2.021,z:20.836},{resSeq:170,iCode:"",x:-23.195,y:1.537,z:19.532},{resSeq:171,iCode:"",x:-26.16,y:-.832,z:19.725},{resSeq:172,iCode:"",x:-28.337,y:-1.938,z:16.783},{resSeq:173,iCode:"",x:-30.212,y:.653,z:14.771},{resSeq:174,iCode:"",x:-31.688,y:1.564,z:11.392},{resSeq:175,iCode:"",x:-31.499,y:4.736,z:9.393},{resSeq:176,iCode:"",x:-32.466,y:6.049,z:5.977},{resSeq:177,iCode:"",x:-32.245,y:9.068,z:3.726},{resSeq:178,iCode:"",x:-34.218,y:10.435,z:.8},{resSeq:179,iCode:"",x:-32.792,y:13.097,z:-1.462},{resSeq:180,iCode:"",x:-33.8,y:14.777,z:-4.676},{resSeq:181,iCode:"",x:-31.693,y:16.535,z:-7.215},{resSeq:182,iCode:"",x:-32.959,y:18.745,z:-9.953},{resSeq:183,iCode:"",x:-30.653,y:20.808,z:-12.075},{resSeq:184,iCode:"",x:-28.068,y:22.215,z:-9.7},{resSeq:185,iCode:"",x:-30.431,y:21.913,z:-6.775},{resSeq:186,iCode:"",x:-30.439,y:19.171,z:-4.261},{resSeq:187,iCode:"",x:-32.424,y:18.575,z:-1.121},{resSeq:188,iCode:"",x:-31.927,y:15.756,z:1.36},{resSeq:189,iCode:"",x:-33.513,y:14.377,z:4.48},{resSeq:190,iCode:"",x:-31.781,y:11.774,z:6.664},{resSeq:191,iCode:"",x:-32.615,y:10.053,z:9.928},{resSeq:192,iCode:"",x:-31.443,y:7.181,z:12.091},{resSeq:193,iCode:"",x:-32.107,y:5.818,z:15.61},{resSeq:194,iCode:"",x:-30.175,y:3.134,z:17.486},{resSeq:195,iCode:"",x:-29.779,y:1.446,z:20.824},{resSeq:196,iCode:"",x:-27.154,y:2.774,z:23.239},{resSeq:197,iCode:"",x:-24.922,y:.201,z:24.936},{resSeq:198,iCode:"",x:-24.751,y:-.49,z:28.705},{resSeq:199,iCode:"",x:-21.453,y:1.392,z:28.908},{resSeq:200,iCode:"",x:-22.892,y:4.357,z:27.035},{resSeq:201,iCode:"",x:-25.68,y:4.433,z:29.559},{resSeq:202,iCode:"",x:-23.251,y:4.188,z:32.473},{resSeq:203,iCode:"",x:-21.805,y:7.549,z:31.432},{resSeq:204,iCode:"",x:-22.108,y:10.719,z:33.55},{resSeq:205,iCode:"",x:-23.471,y:12.966,z:30.743},{resSeq:206,iCode:"",x:-26.632,y:12.245,z:28.702},{resSeq:207,iCode:"",x:-29.731,y:10.164,z:29.571},{resSeq:208,iCode:"",x:-31.716,y:7.69,z:27.454},{resSeq:209,iCode:"",x:-31.7,y:4.174,z:26.001},{resSeq:210,iCode:"",x:-31.872,y:5.244,z:22.363},{resSeq:211,iCode:"",x:-29.76,y:7.552,z:20.178},{resSeq:212,iCode:"",x:-31.203,y:9.717,z:17.375},{resSeq:213,iCode:"",x:-29.793,y:11.913,z:14.656},{resSeq:214,iCode:"",x:-31.488,y:13.642,z:11.711},{resSeq:215,iCode:"",x:-30.336,y:16.386,z:9.388},{resSeq:216,iCode:"",x:-31.735,y:18.066,z:6.338},{resSeq:217,iCode:"",x:-29.688,y:19.772,z:3.698},{resSeq:218,iCode:"",x:-30.157,y:22.102,z:.794},{resSeq:219,iCode:"",x:-27.748,y:23.028,z:-1.919},{resSeq:220,iCode:"",x:-27.195,y:24.867,z:-5.165},{resSeq:221,iCode:"",x:-24.303,y:23.328,z:-7.041},{resSeq:222,iCode:"",x:-23.72,y:24.743,z:-10.523},{resSeq:223,iCode:"",x:-22.097,y:27.595,z:-12.459},{resSeq:224,iCode:"",x:-18.904,y:27.598,z:-10.401},{resSeq:225,iCode:"",x:-21.039,y:28.328,z:-7.387},{resSeq:226,iCode:"",x:-21.497,y:26.138,z:-4.347},{resSeq:227,iCode:"",x:-23.9,y:27.166,z:-1.643},{resSeq:228,iCode:"",x:-25.076,y:24.644,z:.914},{resSeq:229,iCode:"",x:-26.824,y:24.559,z:4.255},{resSeq:230,iCode:"",x:-27.542,y:21.888,z:6.819},{resSeq:231,iCode:"",x:-29.712,y:21.82,z:9.909},{resSeq:232,iCode:"",x:-30.048,y:18.793,z:12.119},{resSeq:233,iCode:"",x:-30.562,y:17.711,z:15.703},{resSeq:234,iCode:"",x:-29.591,y:14.813,z:17.907},{resSeq:235,iCode:"",x:-30.581,y:13.177,z:21.19},{resSeq:236,iCode:"",x:-27.976,y:11.433,z:23.338},{resSeq:237,iCode:"",x:-25.743,y:10.967,z:20.314},{resSeq:238,iCode:"",x:-23.196,y:13.808,z:20.22},{resSeq:239,iCode:"",x:-20.169,y:13.133,z:22.428},{resSeq:240,iCode:"",x:-19.105,y:15.912,z:24.827},{resSeq:241,iCode:"",x:-16.566,y:16.273,z:27.672},{resSeq:242,iCode:"",x:-16.471,y:18.636,z:30.598},{resSeq:243,iCode:"",x:-12.806,y:19.676,z:30.594},{resSeq:244,iCode:"",x:-13.185,y:21.007,z:34.131},{resSeq:245,iCode:"",x:-14.59,y:17.885,z:35.732},{resSeq:246,iCode:"",x:-13.032,y:15.648,z:33.108},{resSeq:247,iCode:"",x:-16.468,y:14.158,z:32.769},{resSeq:248,iCode:"",x:-17.796,y:12.617,z:29.589},{resSeq:249,iCode:"",x:-20.866,y:11.375,z:27.864},{resSeq:250,iCode:"",x:-23.336,y:12.519,z:25.248},{resSeq:251,iCode:"",x:-25.385,y:15.673,z:24.811},{resSeq:252,iCode:"",x:-29.001,y:15.059,z:25.696},{resSeq:253,iCode:"",x:-29.876,y:17.328,z:22.777},{resSeq:254,iCode:"",x:-28.195,y:19.395,z:20.056},{resSeq:255,iCode:"",x:-29.305,y:21.709,z:17.292},{resSeq:256,iCode:"",x:-26.785,y:22.068,z:14.546},{resSeq:257,iCode:"",x:-26.439,y:24.58,z:11.736},{resSeq:258,iCode:"",x:-23.881,y:24.723,z:8.972},{resSeq:259,iCode:"",x:-23.728,y:27.059,z:5.96},{resSeq:260,iCode:"",x:-21.135,y:27.199,z:3.204},{resSeq:261,iCode:"",x:-20.625,y:29.427,z:.195},{resSeq:262,iCode:"",x:-17.759,y:28.993,z:-2.215},{resSeq:263,iCode:"",x:-16.908,y:29.935,z:-5.786},{resSeq:264,iCode:"",x:-14.523,y:28.301,z:-8.189},{resSeq:265,iCode:"",x:-12.658,y:30.752,z:-10.379},{resSeq:266,iCode:"",x:-11.501,y:29.493,z:-13.72},{resSeq:267,iCode:"",x:-7.844,y:30.085,z:-12.885},{resSeq:268,iCode:"",x:-7.787,y:27.7,z:-9.903},{resSeq:269,iCode:"",x:-8.697,y:29.794,z:-6.882},{resSeq:270,iCode:"",x:-11.648,y:28.612,z:-4.789},{resSeq:271,iCode:"",x:-12.531,y:31.001,z:-1.95},{resSeq:272,iCode:"",x:-14.64,y:29.739,z:.942},{resSeq:273,iCode:"",x:-16.892,y:31.364,z:3.467},{resSeq:274,iCode:"",x:-18.665,y:29.265,z:6.119},{resSeq:275,iCode:"",x:-20.499,y:29.434,z:9.413},{resSeq:276,iCode:"",x:-20.936,y:26.642,z:11.926},{resSeq:277,iCode:"",x:-22.732,y:26.411,z:15.219},{resSeq:278,iCode:"",x:-23.622,y:23.366,z:17.273},{resSeq:279,iCode:"",x:-25.245,y:23.96,z:20.622},{resSeq:280,iCode:"",x:-26.061,y:21.375,z:23.246},{resSeq:281,iCode:"",x:-29.215,y:21.63,z:25.331},{resSeq:282,iCode:"",x:-29.93,y:20.291,z:28.817},{resSeq:283,iCode:"",x:-26.392,y:19.125,z:29.456},{resSeq:284,iCode:"",x:-26.63,y:17.606,z:32.943},{resSeq:285,iCode:"",x:-25.194,y:20.372,z:35.068},{resSeq:286,iCode:"",x:-24.421,y:23.169,z:32.598},{resSeq:287,iCode:"",x:-27.751,y:23.813,z:30.889},{resSeq:288,iCode:"",x:-27.255,y:25.077,z:27.323},{resSeq:289,iCode:"",x:-23.654,y:25.213,z:25.998},{resSeq:290,iCode:"",x:-22.174,y:25.862,z:22.553},{resSeq:291,iCode:"",x:-19.923,y:23.076,z:21.337},{resSeq:292,iCode:"",x:-18.916,y:24.629,z:18.013},{resSeq:293,iCode:"",x:-19.317,y:28.221,z:16.914},{resSeq:294,iCode:"",x:-17.226,y:30.046,z:14.356},{resSeq:295,iCode:"",x:-16.863,y:31.697,z:10.963},{resSeq:296,iCode:"",x:-14.428,y:30.357,z:8.433},{resSeq:297,iCode:"",x:-12.675,y:32.178,z:5.662},{resSeq:298,iCode:"",x:-10.346,y:30.232,z:3.48},{resSeq:299,iCode:"",x:-9.126,y:29.498,z:.022},{resSeq:300,iCode:"",x:-7.797,y:26.627,z:-2.035},{resSeq:301,iCode:"",x:-5.74,y:27.038,z:-5.125},{resSeq:302,iCode:"",x:-5.635,y:24.181,z:-7.552},{resSeq:303,iCode:"",x:-2.489,y:24.006,z:-9.616},{resSeq:304,iCode:"",x:-4.148,y:21.077,z:-11.4},{resSeq:305,iCode:"",x:-5.972,y:17.866,z:-10.396},{resSeq:306,iCode:"",x:-2.92,y:16.525,z:-8.552},{resSeq:307,iCode:"",x:-1.59,y:19.555,z:-6.76},{resSeq:308,iCode:"",x:-3.096,y:22.21,z:-4.568},{resSeq:309,iCode:"",x:-2.467,y:24.399,z:-1.489},{resSeq:310,iCode:"",x:-4.792,y:26.211,z:.877},{resSeq:311,iCode:"",x:-5.168,y:28.307,z:3.988},{resSeq:312,iCode:"",x:-8.155,y:27.755,z:6.19},{resSeq:313,iCode:"",x:-8.807,y:30.334,z:8.871},{resSeq:314,iCode:"",x:-11.211,y:29.724,z:11.775},{resSeq:315,iCode:"",x:-12.601,y:32.825,z:13.493},{resSeq:316,iCode:"",x:-13.774,y:31.177,z:16.645},{resSeq:317,iCode:"",x:-16.927,y:32.691,z:18.143},{resSeq:318,iCode:"",x:-16.802,y:30.426,z:21.163},{resSeq:319,iCode:"",x:-16.235,y:32.555,z:24.263},{resSeq:320,iCode:"",x:-13.635,y:32.117,z:26.997},{resSeq:321,iCode:"",x:-16.358,y:31.484,z:29.593},{resSeq:322,iCode:"",x:-17.724,y:28.439,z:27.77},{resSeq:323,iCode:"",x:-19,y:26.036,z:30.456},{resSeq:324,iCode:"",x:-17.534,y:22.822,z:29.01},{resSeq:325,iCode:"",x:-14.048,y:24.136,z:28.434},{resSeq:326,iCode:"",x:-14.388,y:24.226,z:24.671},{resSeq:327,iCode:"",x:-11.493,y:26.286,z:23.278},{resSeq:328,iCode:"",x:-12.044,y:29.903,z:22.178},{resSeq:329,iCode:"",x:-8.872,y:30.713,z:20.212},{resSeq:330,iCode:"",x:-8.542,y:31.015,z:16.434},{resSeq:331,iCode:"",x:-6.661,y:28.573,z:14.223},{resSeq:332,iCode:"",x:-5.067,y:28.964,z:10.8},{resSeq:333,iCode:"",x:-4.179,y:25.901,z:8.737},{resSeq:334,iCode:"",x:-1.803,y:25.975,z:5.799},{resSeq:335,iCode:"",x:-1.298,y:22.981,z:3.63},{resSeq:336,iCode:"",x:.246,y:21.634,z:.504},{resSeq:337,iCode:"",x:-1.286,y:18.594,z:-1.138},{resSeq:338,iCode:"",x:-.031,y:16.161,z:-3.759},{resSeq:339,iCode:"",x:-2.434,y:13.44,z:-4.754},{resSeq:340,iCode:"",x:-3.122,y:10.735,z:-7.265}]},{chainId:"B",residueCount:340,segments:[],calphas:[{resSeq:1,iCode:"",x:-3.241,y:-7.753,z:-10.335},{resSeq:2,iCode:"",x:-.072,y:-7.488,z:-12.374},{resSeq:3,iCode:"",x:.433,y:-3.762,z:-12.391},{resSeq:4,iCode:"",x:4.007,y:-3.878,z:-13.7},{resSeq:5,iCode:"",x:6.043,y:-5.91,z:-16.133},{resSeq:6,iCode:"",x:9.048,y:-4.49,z:-17.929},{resSeq:7,iCode:"",x:12.676,y:-5.508,z:-18.285},{resSeq:8,iCode:"",x:12.104,y:-8.969,z:-16.893},{resSeq:9,iCode:"",x:10.558,y:-7.635,z:-13.706},{resSeq:10,iCode:"",x:6.915,y:-8.13,z:-12.98},{resSeq:11,iCode:"",x:5.094,y:-6.866,z:-9.93},{resSeq:12,iCode:"",x:1.714,y:-8.091,z:-8.893},{resSeq:13,iCode:"",x:-.053,y:-5.771,z:-6.416},{resSeq:14,iCode:"",x:-2.952,y:-7.657,z:-4.882},{resSeq:15,iCode:"",x:-5.591,y:-7.235,z:-2.217},{resSeq:16,iCode:"",x:-9.147,y:-7.636,z:-1.089},{resSeq:17,iCode:"",x:-11.919,y:-5.958,z:.857},{resSeq:18,iCode:"",x:-13.983,y:-8.507,z:2.772},{resSeq:19,iCode:"",x:-17.33,y:-7.429,z:4.244},{resSeq:20,iCode:"",x:-17.82,y:-10.14,z:6.885},{resSeq:21,iCode:"",x:-20.216,y:-10.915,z:9.733},{resSeq:22,iCode:"",x:-20.425,y:-13.771,z:12.25},{resSeq:23,iCode:"",x:-23.708,y:-14.914,z:13.765},{resSeq:24,iCode:"",x:-23.511,y:-16.901,z:17.021},{resSeq:25,iCode:"",x:-25.89,y:-16.792,z:19.985},{resSeq:26,iCode:"",x:-25.124,y:-15.021,z:23.246},{resSeq:27,iCode:"",x:-22.025,y:-12.849,z:23.339},{resSeq:28,iCode:"",x:-20.438,y:-15.444,z:21.091},{resSeq:29,iCode:"",x:-18.137,y:-16.088,z:24.053},{resSeq:30,iCode:"",x:-19.21,y:-19.762,z:24.12},{resSeq:31,iCode:"",x:-19.603,y:-20.141,z:20.348},{resSeq:32,iCode:"",x:-17.151,y:-21.539,z:17.823},{resSeq:33,iCode:"",x:-16.155,y:-18.379,z:15.952},{resSeq:34,iCode:"",x:-17.566,y:-15.461,z:17.905},{resSeq:35,iCode:"",x:-20.187,y:-12.998,z:16.772},{resSeq:36,iCode:"",x:-20.4,y:-9.633,z:15.053},{resSeq:37,iCode:"",x:-18.599,y:-7.604,z:12.38},{resSeq:38,iCode:"",x:-15.385,y:-9.224,z:11.189},{resSeq:39,iCode:"",x:-14.747,y:-7.054,z:8.136},{resSeq:40,iCode:"",x:-11.113,y:-6.776,z:6.963},{resSeq:41,iCode:"",x:-8.856,y:-6.063,z:4.011},{resSeq:42,iCode:"",x:-5.553,y:-7.372,z:2.72},{resSeq:43,iCode:"",x:-2.83,y:-5.686,z:.69},{resSeq:44,iCode:"",x:.339,y:-7.338,z:-.542},{resSeq:45,iCode:"",x:2.826,y:-7.535,z:-3.359},{resSeq:46,iCode:"",x:4.56,y:-10.447,z:-5.127},{resSeq:47,iCode:"",x:7.562,y:-9.561,z:-7.288},{resSeq:48,iCode:"",x:9.579,y:-11.756,z:-9.616},{resSeq:49,iCode:"",x:12.583,y:-10.838,z:-11.708},{resSeq:50,iCode:"",x:14.351,y:-12.926,z:-14.346},{resSeq:51,iCode:"",x:18.027,y:-12.501,z:-13.64},{resSeq:52,iCode:"",x:18.712,y:-14.761,z:-16.651},{resSeq:53,iCode:"",x:17.238,y:-17.944,z:-18.137},{resSeq:54,iCode:"",x:17.862,y:-20.233,z:-15.136},{resSeq:55,iCode:"",x:17.791,y:-17.71,z:-12.31},{resSeq:56,iCode:"",x:14.753,y:-15.981,z:-10.846},{resSeq:57,iCode:"",x:14.639,y:-13.714,z:-7.817},{resSeq:58,iCode:"",x:11.383,y:-12.979,z:-6.078},{resSeq:59,iCode:"",x:9.844,y:-11.428,z:-3.009},{resSeq:60,iCode:"",x:6.511,y:-11.13,z:-1.301},{resSeq:61,iCode:"",x:4.821,y:-9.104,z:1.417},{resSeq:62,iCode:"",x:1.241,y:-9.345,z:2.618},{resSeq:63,iCode:"",x:-.514,y:-7.328,z:5.28},{resSeq:64,iCode:"",x:-3.759,y:-7.607,z:7.203},{resSeq:65,iCode:"",x:-5.831,y:-4.471,z:7.954},{resSeq:66,iCode:"",x:-8.801,y:-5.136,z:10.304},{resSeq:67,iCode:"",x:-11.991,y:-3.376,z:9.169},{resSeq:68,iCode:"",x:-13.905,y:-3.841,z:12.401},{resSeq:69,iCode:"",x:-11.986,y:-1.501,z:14.757},{resSeq:70,iCode:"",x:-12.879,y:2.108,z:15.558},{resSeq:71,iCode:"",x:-10.762,y:5.07,z:14.489},{resSeq:72,iCode:"",x:-10.043,y:5.436,z:18.181},{resSeq:73,iCode:"",x:-7.44,y:3.763,z:20.393},{resSeq:74,iCode:"",x:-8.308,y:.252,z:19.235},{resSeq:75,iCode:"",x:-7.727,y:1.191,z:15.583},{resSeq:76,iCode:"",x:-4.731,y:-1.212,z:15.118},{resSeq:77,iCode:"",x:-6.205,y:-4.279,z:16.772},{resSeq:78,iCode:"",x:-5.464,y:-7.325,z:14.622},{resSeq:79,iCode:"",x:-3.275,y:-5.592,z:12.04},{resSeq:80,iCode:"",x:-.164,y:-7.459,z:11.062},{resSeq:81,iCode:"",x:2.226,y:-8.528,z:8.381},{resSeq:82,iCode:"",x:1.393,y:-12.089,z:7.388},{resSeq:83,iCode:"",x:4.302,y:-12.796,z:5.011},{resSeq:84,iCode:"",x:7.615,y:-11.044,z:4.252},{resSeq:85,iCode:"",x:10.358,y:-12.887,z:2.379},{resSeq:86,iCode:"",x:12.802,y:-12.783,z:-.531},{resSeq:87,iCode:"",x:14.432,y:-15.625,z:-2.439},{resSeq:88,iCode:"",x:15.977,y:-17.127,z:-5.59},{resSeq:89,iCode:"",x:15.017,y:-20.068,z:-7.812},{resSeq:90,iCode:"",x:17.698,y:-21.646,z:-9.924},{resSeq:91,iCode:"",x:17.032,y:-23.907,z:-12.882},{resSeq:92,iCode:"",x:16.113,y:-27.397,z:-11.611},{resSeq:93,iCode:"",x:18.327,y:-27.054,z:-8.549},{resSeq:94,iCode:"",x:15.606,y:-25.62,z:-6.338},{resSeq:95,iCode:"",x:14.52,y:-22.441,z:-4.594},{resSeq:96,iCode:"",x:15.614,y:-20.846,z:-1.392},{resSeq:97,iCode:"",x:13.966,y:-18.061,z:.579},{resSeq:98,iCode:"",x:14.129,y:-16.457,z:3.997},{resSeq:99,iCode:"",x:11.759,y:-14.338,z:6.067},{resSeq:100,iCode:"",x:8.284,y:-14.689,z:7.543},{resSeq:101,iCode:"",x:6.679,y:-17.538,z:5.651},{resSeq:102,iCode:"",x:4.714,y:-20.785,z:6.094},{resSeq:103,iCode:"",x:6.193,y:-23.621,z:8.167},{resSeq:104,iCode:"",x:6.839,y:-26.869,z:6.22},{resSeq:105,iCode:"",x:4.178,y:-28.895,z:8.047},{resSeq:106,iCode:"",x:1.669,y:-26.588,z:6.369},{resSeq:107,iCode:"",x:2.78,y:-28.276,z:3.11},{resSeq:108,iCode:"",x:.478,y:-30.947,z:4.464},{resSeq:109,iCode:"",x:-2.221,y:-29.024,z:6.349},{resSeq:110,iCode:"",x:-2.791,y:-26.932,z:3.296},{resSeq:111,iCode:"",x:-4.753,y:-29.854,z:1.803},{resSeq:112,iCode:"",x:-7.81,y:-29.237,z:3.953},{resSeq:113,iCode:"",x:-7.427,y:-25.489,z:4.561},{resSeq:114,iCode:"",x:-10.058,y:-24.833,z:1.929},{resSeq:115,iCode:"",x:-13.248,y:-23.918,z:3.802},{resSeq:116,iCode:"",x:-15.084,y:-20.685,z:2.761},{resSeq:117,iCode:"",x:-14.417,y:-18.921,z:6.089},{resSeq:118,iCode:"",x:-13.34,y:-21.458,z:8.777},{resSeq:119,iCode:"",x:-11.283,y:-24.68,z:8.694},{resSeq:120,iCode:"",x:-7.52,y:-25.132,z:8.952},{resSeq:121,iCode:"",x:-7.869,y:-25.153,z:12.744},{resSeq:122,iCode:"",x:-4.558,y:-26.792,z:13.43},{resSeq:123,iCode:"",x:-2.511,y:-24.416,z:11.253},{resSeq:124,iCode:"",x:-1.832,y:-21.843,z:14.061},{resSeq:125,iCode:"",x:.345,y:-18.774,z:13.601},{resSeq:126,iCode:"",x:3.729,y:-18.422,z:15.304},{resSeq:127,iCode:"",x:3.419,y:-22.024,z:16.333},{resSeq:128,iCode:"",x:6.583,y:-23.72,z:15.065},{resSeq:129,iCode:"",x:6.074,y:-25.375,z:11.632},{resSeq:130,iCode:"",x:2.276,y:-25.488,z:11.162},{resSeq:131,iCode:"",x:1.432,y:-21.936,z:10.017},{resSeq:132,iCode:"",x:3.164,y:-18.609,z:9.347},{resSeq:133,iCode:"",x:6.316,y:-18.069,z:11.441},{resSeq:134,iCode:"",x:9.192,y:-15.644,z:11.419},{resSeq:135,iCode:"",x:12.812,y:-16.334,z:10.573},{resSeq:136,iCode:"",x:12.523,y:-19.491,z:8.521},{resSeq:137,iCode:"",x:14.99,y:-20.383,z:5.749},{resSeq:138,iCode:"",x:13.313,y:-22.731,z:3.255},{resSeq:139,iCode:"",x:14.815,y:-24.828,z:.46},{resSeq:140,iCode:"",x:12.382,y:-26.458,z:-1.953},{resSeq:141,iCode:"",x:12.951,y:-28.909,z:-4.725},{resSeq:142,iCode:"",x:10.601,y:-29.7,z:-7.583},{resSeq:143,iCode:"",x:10.525,y:-32.876,z:-9.64},{resSeq:144,iCode:"",x:13.575,y:-34.241,z:-7.874},{resSeq:145,iCode:"",x:16.124,y:-32.017,z:-9.653},{resSeq:146,iCode:"",x:13.982,y:-32.484,z:-12.731},{resSeq:147,iCode:"",x:14.601,y:-36.2,z:-12.778},{resSeq:148,iCode:"",x:11.289,y:-37.352,z:-11.266},{resSeq:149,iCode:"",x:8.075,y:-35.612,z:-12.393},{resSeq:150,iCode:"",x:5.778,y:-34.97,z:-9.441},{resSeq:151,iCode:"",x:8.197,y:-35.697,z:-6.637},{resSeq:152,iCode:"",x:9.043,y:-32.631,z:-4.526},{resSeq:153,iCode:"",x:10.599,y:-32.033,z:-1.165},{resSeq:154,iCode:"",x:11.575,y:-29.263,z:1.154},{resSeq:155,iCode:"",x:13.729,y:-28.766,z:4.218},{resSeq:156,iCode:"",x:13.341,y:-25.812,z:6.505},{resSeq:157,iCode:"",x:15.491,y:-24.22,z:9.184},{resSeq:158,iCode:"",x:13.678,y:-22.278,z:11.865},{resSeq:159,iCode:"",x:15.71,y:-19.817,z:13.868},{resSeq:160,iCode:"",x:15.092,y:-19.121,z:17.539},{resSeq:161,iCode:"",x:12.425,y:-16.473,z:18.223},{resSeq:162,iCode:"",x:12.376,y:-15.415,z:21.848},{resSeq:163,iCode:"",x:9.331,y:-13.214,z:22.104},{resSeq:164,iCode:"",x:7.736,y:-11.737,z:25.243},{resSeq:165,iCode:"",x:5.17,y:-14.512,z:25.034},{resSeq:166,iCode:"",x:5.424,y:-18.277,z:25.378},{resSeq:167,iCode:"",x:2.738,y:-18.668,z:22.699},{resSeq:168,iCode:"",x:4.569,y:-16.656,z:20.056},{resSeq:169,iCode:"",x:8.063,y:-18.001,z:20.835},{resSeq:170,iCode:"",x:10.269,y:-20.855,z:19.53},{resSeq:171,iCode:"",x:13.803,y:-22.238,z:19.723},{resSeq:172,iCode:"",x:15.849,y:-23.571,z:16.781},{resSeq:173,iCode:"",x:14.542,y:-26.49,z:14.769},{resSeq:174,iCode:"",x:14.491,y:-28.224,z:11.391},{resSeq:175,iCode:"",x:11.649,y:-29.647,z:9.392},{resSeq:176,iCode:"",x:10.995,y:-31.141,z:5.976},{resSeq:177,iCode:"",x:8.269,y:-32.458,z:3.726},{resSeq:178,iCode:"",x:8.072,y:-34.852,z:.8},{resSeq:179,iCode:"",x:5.053,y:-34.947,z:-1.462},{resSeq:180,iCode:"",x:4.1,y:-36.66,z:-4.676},{resSeq:181,iCode:"",x:1.525,y:-35.715,z:-7.214},{resSeq:182,iCode:"",x:.243,y:-37.917,z:-9.951},{resSeq:183,iCode:"",x:-2.698,y:-36.95,z:-12.073},{resSeq:184,iCode:"",x:-5.207,y:-35.416,z:-9.697},{resSeq:185,iCode:"",x:-3.764,y:-37.311,z:-6.773},{resSeq:186,iCode:"",x:-1.385,y:-35.947,z:-4.259},{resSeq:187,iCode:"",x:.125,y:-37.368,z:-1.119},{resSeq:188,iCode:"",x:2.317,y:-35.527,z:1.361},{resSeq:189,iCode:"",x:4.305,y:-36.211,z:4.48},{resSeq:190,iCode:"",x:5.694,y:-33.411,z:6.664},{resSeq:191,iCode:"",x:7.603,y:-33.272,z:9.928},{resSeq:192,iCode:"",x:9.504,y:-30.82,z:12.09},{resSeq:193,iCode:"",x:11.017,y:-30.714,z:15.609},{resSeq:194,iCode:"",x:12.376,y:-27.699,z:17.485},{resSeq:195,iCode:"",x:13.64,y:-26.511,z:20.823},{resSeq:196,iCode:"",x:11.178,y:-24.903,z:23.238},{resSeq:197,iCode:"",x:12.291,y:-21.683,z:24.934},{resSeq:198,iCode:"",x:12.804,y:-21.189,z:28.703},{resSeq:199,iCode:"",x:9.526,y:-19.274,z:28.907},{resSeq:200,iCode:"",x:7.677,y:-22.003,z:27.035},{resSeq:201,iCode:"",x:9.006,y:-24.455,z:29.558},{resSeq:202,iCode:"",x:8.004,y:-22.229,z:32.473},{resSeq:203,iCode:"",x:4.37,y:-22.657,z:31.432},{resSeq:204,iCode:"",x:1.777,y:-24.504,z:33.55},{resSeq:205,iCode:"",x:.511,y:-26.808,z:30.744},{resSeq:206,iCode:"",x:2.716,y:-29.186,z:28.703},{resSeq:207,iCode:"",x:6.068,y:-30.829,z:29.571},{resSeq:208,iCode:"",x:9.204,y:-31.311,z:27.453},{resSeq:209,iCode:"",x:12.239,y:-29.54,z:26},{resSeq:210,iCode:"",x:11.398,y:-30.223,z:22.362},{resSeq:211,iCode:"",x:8.343,y:-29.549,z:20.177},{resSeq:212,iCode:"",x:7.189,y:-31.881,z:17.375},{resSeq:213,iCode:"",x:4.581,y:-31.757,z:14.657},{resSeq:214,iCode:"",x:3.931,y:-34.09,z:11.712},{resSeq:215,iCode:"",x:.978,y:-34.464,z:9.389},{resSeq:216,iCode:"",x:.222,y:-36.516,z:6.34},{resSeq:217,iCode:"",x:-2.279,y:-35.596,z:3.7},{resSeq:218,iCode:"",x:-4.063,y:-37.168,z:.796},{resSeq:219,iCode:"",x:-6.07,y:-35.545,z:-1.916},{resSeq:220,iCode:"",x:-7.94,y:-35.986,z:-5.162},{resSeq:221,iCode:"",x:-8.054,y:-32.711,z:-7.038},{resSeq:222,iCode:"",x:-9.571,y:-32.915,z:-10.52},{resSeq:223,iCode:"",x:-12.853,y:-32.934,z:-12.456},{resSeq:224,iCode:"",x:-14.452,y:-30.17,z:-10.397},{resSeq:225,iCode:"",x:-14.016,y:-32.385,z:-7.382},{resSeq:226,iCode:"",x:-11.89,y:-31.686,z:-4.344},{resSeq:227,iCode:"",x:-11.578,y:-34.282,z:-1.64},{resSeq:228,iCode:"",x:-8.805,y:-34.039,z:.917},{resSeq:229,iCode:"",x:-7.857,y:-35.51,z:4.258},{resSeq:230,iCode:"",x:-5.185,y:-34.796,z:6.822},{resSeq:231,iCode:"",x:-4.04,y:-36.641,z:9.911},{resSeq:232,iCode:"",x:-1.25,y:-35.418,z:12.121},{resSeq:233,iCode:"",x:-.055,y:-35.323,z:15.704},{resSeq:234,iCode:"",x:1.97,y:-33.032,z:17.908},{resSeq:235,iCode:"",x:3.882,y:-33.072,z:21.191},{resSeq:236,iCode:"",x:4.09,y:-29.944,z:23.339},{resSeq:237,iCode:"",x:3.377,y:-27.777,z:20.315},{resSeq:238,iCode:"",x:-.357,y:-26.991,z:20.221},{resSeq:239,iCode:"",x:-1.286,y:-24.033,z:22.43},{resSeq:240,iCode:"",x:-4.223,y:-24.5,z:24.829},{resSeq:241,iCode:"",x:-5.805,y:-22.483,z:27.674},{resSeq:242,iCode:"",x:-7.899,y:-23.581,z:30.6},{resSeq:243,iCode:"",x:-10.631,y:-20.928,z:30.597},{resSeq:244,iCode:"",x:-11.594,y:-21.921,z:34.134},{resSeq:245,iCode:"",x:-8.188,y:-21.576,z:35.734},{resSeq:246,iCode:"",x:-7.03,y:-19.109,z:33.11},{resSeq:247,iCode:"",x:-4.022,y:-21.34,z:32.771},{resSeq:248,iCode:"",x:-2.024,y:-21.719,z:29.591},{resSeq:249,iCode:"",x:.587,y:-23.757,z:27.865},{resSeq:250,iCode:"",x:.83,y:-26.468,z:25.249},{resSeq:251,iCode:"",x:-.877,y:-29.82,z:24.812},{resSeq:252,iCode:"",x:1.463,y:-32.644,z:25.697},{resSeq:253,iCode:"",x:-.066,y:-34.537,z:22.778},{resSeq:254,iCode:"",x:-2.696,y:-34.114,z:20.058},{resSeq:255,iCode:"",x:-4.146,y:-36.234,z:17.294},{resSeq:256,iCode:"",x:-5.717,y:-34.231,z:14.549},{resSeq:257,iCode:"",x:-8.066,y:-35.187,z:11.739},{resSeq:258,iCode:"",x:-9.47,y:-33.043,z:8.975},{resSeq:259,iCode:"",x:-11.57,y:-34.079,z:5.963},{resSeq:260,iCode:"",x:-12.987,y:-31.903,z:3.208},{resSeq:261,iCode:"",x:-15.173,y:-32.575,z:.2},{resSeq:262,iCode:"",x:-16.231,y:-29.876,z:-2.21},{resSeq:263,iCode:"",x:-17.473,y:-29.611,z:-5.781},{resSeq:264,iCode:"",x:-17.251,y:-26.729,z:-8.185},{resSeq:265,iCode:"",x:-20.306,y:-26.338,z:-10.373},{resSeq:266,iCode:"",x:-19.795,y:-24.708,z:-13.715},{resSeq:267,iCode:"",x:-22.136,y:-21.836,z:-12.88},{resSeq:268,iCode:"",x:-20.098,y:-20.594,z:-9.898},{resSeq:269,iCode:"",x:-21.456,y:-22.429,z:-6.877},{resSeq:270,iCode:"",x:-18.957,y:-24.394,z:-4.785},{resSeq:271,iCode:"",x:-20.583,y:-26.354,z:-1.944},{resSeq:272,iCode:"",x:-18.436,y:-27.549,z:.947},{resSeq:273,iCode:"",x:-18.716,y:-30.311,z:3.472},{resSeq:274,iCode:"",x:-16.012,y:-30.796,z:6.124},{resSeq:275,iCode:"",x:-15.24,y:-32.469,z:9.418},{resSeq:276,iCode:"",x:-12.603,y:-31.452,z:11.93},{resSeq:277,iCode:"",x:-11.504,y:-32.891,z:15.222},{resSeq:278,iCode:"",x:-8.422,y:-32.14,z:17.276},{resSeq:279,iCode:"",x:-8.124,y:-33.842,z:20.625},{resSeq:280,iCode:"",x:-5.477,y:-33.255,z:23.249},{resSeq:281,iCode:"",x:-4.121,y:-36.115,z:25.333},{resSeq:282,iCode:"",x:-2.603,y:-36.064,z:28.819},{resSeq:283,iCode:"",x:-3.362,y:-32.418,z:29.458},{resSeq:284,iCode:"",x:-1.927,y:-31.864,z:32.944},{resSeq:285,iCode:"",x:-5.04,y:-32.004,z:35.071},{resSeq:286,iCode:"",x:-7.849,y:-32.732,z:32.601},{resSeq:287,iCode:"",x:-6.742,y:-35.939,z:30.892},{resSeq:288,iCode:"",x:-8.086,y:-36.142,z:27.326},{resSeq:289,iCode:"",x:-10.004,y:-33.091,z:26.001},{resSeq:290,iCode:"",x:-11.306,y:-32.134,z:22.556},{resSeq:291,iCode:"",x:-10.02,y:-28.791,z:21.34},{resSeq:292,iCode:"",x:-11.868,y:-28.696,z:18.017},{resSeq:293,iCode:"",x:-14.779,y:-30.839,z:16.918},{resSeq:294,iCode:"",x:-17.406,y:-29.941,z:14.361},{resSeq:295,iCode:"",x:-19.019,y:-30.452,z:10.968},{resSeq:296,iCode:"",x:-19.075,y:-27.674,z:8.438},{resSeq:297,iCode:"",x:-21.529,y:-27.066,z:5.668},{resSeq:298,iCode:"",x:-21.009,y:-24.076,z:3.485},{resSeq:299,iCode:"",x:-20.984,y:-22.652,z:.027},{resSeq:300,iCode:"",x:-19.163,y:-20.066,z:-2.03},{resSeq:301,iCode:"",x:-20.548,y:-18.491,z:-5.12},{resSeq:302,iCode:"",x:-18.127,y:-16.971,z:-7.547},{resSeq:303,iCode:"",x:-19.548,y:-14.159,z:-9.611},{resSeq:304,iCode:"",x:-16.183,y:-14.131,z:-11.396},{resSeq:305,iCode:"",x:-12.49,y:-14.106,z:-10.393},{resSeq:306,iCode:"",x:-12.854,y:-10.791,z:-8.549},{resSeq:307,iCode:"",x:-16.142,y:-11.155,z:-6.756},{resSeq:308,iCode:"",x:-17.689,y:-13.787,z:-4.564},{resSeq:309,iCode:"",x:-19.898,y:-14.336,z:-1.484},{resSeq:310,iCode:"",x:-20.304,y:-17.256,z:.882},{resSeq:311,iCode:"",x:-21.931,y:-18.63,z:3.993},{resSeq:312,iCode:"",x:-19.96,y:-20.94,z:6.195},{resSeq:313,iCode:"",x:-21.866,y:-22.794,z:8.876},{resSeq:314,iCode:"",x:-20.135,y:-24.571,z:11.78},{resSeq:315,iCode:"",x:-22.125,y:-27.325,z:13.499},{resSeq:316,iCode:"",x:-20.111,y:-27.517,z:16.651},{resSeq:317,iCode:"",x:-19.845,y:-31.004,z:18.148},{resSeq:318,iCode:"",x:-17.946,y:-29.763,z:21.168},{resSeq:319,iCode:"",x:-20.072,y:-30.336,z:24.268},{resSeq:320,iCode:"",x:-20.992,y:-27.867,z:27.003},{resSeq:321,iCode:"",x:-19.082,y:-29.908,z:29.598},{resSeq:322,iCode:"",x:-15.762,y:-29.568,z:27.774},{resSeq:323,iCode:"",x:-13.043,y:-29.472,z:30.46},{resSeq:324,iCode:"",x:-10.993,y:-26.595,z:29.014},{resSeq:325,iCode:"",x:-13.874,y:-24.233,z:28.438},{resSeq:326,iCode:"",x:-13.782,y:-24.572,z:24.675},{resSeq:327,iCode:"",x:-17.014,y:-23.095,z:23.282},{resSeq:328,iCode:"",x:-19.871,y:-25.382,z:22.183},{resSeq:329,iCode:"",x:-22.159,y:-23.039,z:20.217},{resSeq:330,iCode:"",x:-22.586,y:-22.905,z:16.44},{resSeq:331,iCode:"",x:-21.413,y:-20.054,z:14.228},{resSeq:332,iCode:"",x:-22.549,y:-18.87,z:10.805},{resSeq:333,iCode:"",x:-20.341,y:-16.57,z:8.742},{resSeq:334,iCode:"",x:-21.593,y:-14.549,z:5.804},{resSeq:335,iCode:"",x:-19.254,y:-12.615,z:3.634},{resSeq:336,iCode:"",x:-18.859,y:-10.604,z:.508},{resSeq:337,iCode:"",x:-15.461,y:-10.411,z:-1.134},{resSeq:338,iCode:"",x:-13.982,y:-8.108,z:-3.755},{resSeq:339,iCode:"",x:-10.424,y:-8.829,z:-4.752},{resSeq:340,iCode:"",x:-7.738,y:-8.072,z:-7.263}]},{chainId:"C",residueCount:340,segments:[],calphas:[{resSeq:1,iCode:"",x:8.332,y:1.069,z:-10.337},{resSeq:2,iCode:"",x:6.517,y:3.681,z:-12.375},{resSeq:3,iCode:"",x:3.038,y:2.256,z:-12.392},{resSeq:4,iCode:"",x:1.352,y:5.409,z:-13.701},{resSeq:5,iCode:"",x:2.092,y:8.188,z:-16.134},{resSeq:6,iCode:"",x:-.641,y:10.08,z:-17.929},{resSeq:7,iCode:"",x:-1.573,y:13.731,z:-18.285},{resSeq:8,iCode:"",x:1.711,y:14.966,z:-16.894},{resSeq:9,iCode:"",x:1.33,y:12.96,z:-13.706},{resSeq:10,iCode:"",x:3.579,y:10.053,z:-12.981},{resSeq:11,iCode:"",x:3.396,y:7.843,z:-9.931},{resSeq:12,iCode:"",x:6.147,y:5.529,z:-8.894},{resSeq:13,iCode:"",x:5.022,y:2.84,z:-6.417},{resSeq:14,iCode:"",x:8.105,y:1.272,z:-4.884},{resSeq:15,iCode:"",x:9.06,y:-1.225,z:-2.219},{resSeq:16,iCode:"",x:11.186,y:-4.104,z:-1.091},{resSeq:17,iCode:"",x:11.119,y:-7.344,z:.855},{resSeq:18,iCode:"",x:14.359,y:-7.856,z:2.769},{resSeq:19,iCode:"",x:15.1,y:-11.294,z:4.241},{resSeq:20,iCode:"",x:17.691,y:-10.363,z:6.882},{resSeq:21,iCode:"",x:19.561,y:-12.05,z:9.73},{resSeq:22,iCode:"",x:22.14,y:-10.803,z:12.246},{resSeq:23,iCode:"",x:24.771,y:-13.074,z:13.761},{resSeq:24,iCode:"",x:26.395,y:-11.911,z:17.016},{resSeq:25,iCode:"",x:27.49,y:-14.025,z:19.98},{resSeq:26,iCode:"",x:25.574,y:-14.247,z:23.242},{resSeq:27,iCode:"",x:22.144,y:-12.649,z:23.335},{resSeq:28,iCode:"",x:23.597,y:-9.978,z:21.086},{resSeq:29,iCode:"",x:23.005,y:-7.662,z:24.048},{resSeq:30,iCode:"",x:26.724,y:-6.754,z:24.115},{resSeq:31,iCode:"",x:27.247,y:-6.905,z:20.343},{resSeq:32,iCode:"",x:27.231,y:-4.083,z:17.818},{resSeq:33,iCode:"",x:23.996,y:-4.801,z:15.947},{resSeq:34,iCode:"",x:22.175,y:-7.482,z:17.901},{resSeq:35,iCode:"",x:21.352,y:-10.983,z:16.768},{resSeq:36,iCode:"",x:18.544,y:-12.85,z:15.05},{resSeq:37,iCode:"",x:15.886,y:-12.304,z:12.377},{resSeq:38,iCode:"",x:15.682,y:-8.711,z:11.186},{resSeq:39,iCode:"",x:13.483,y:-9.244,z:8.133},{resSeq:40,iCode:"",x:11.425,y:-6.236,z:6.961},{resSeq:41,iCode:"",x:9.679,y:-4.638,z:4.009},{resSeq:42,iCode:"",x:9.161,y:-1.123,z:2.718},{resSeq:43,iCode:"",x:6.338,y:.392,z:.689},{resSeq:44,iCode:"",x:6.184,y:3.962,z:-.543},{resSeq:45,iCode:"",x:5.111,y:6.215,z:-3.36},{resSeq:46,iCode:"",x:6.765,y:9.171,z:-5.129},{resSeq:47,iCode:"",x:4.497,y:11.328,z:-7.29},{resSeq:48,iCode:"",x:5.389,y:14.174,z:-9.618},{resSeq:49,iCode:"",x:3.091,y:16.315,z:-11.709},{resSeq:50,iCode:"",x:4.015,y:18.891,z:-14.347},{resSeq:51,iCode:"",x:1.808,y:21.862,z:-13.641},{resSeq:52,iCode:"",x:3.423,y:23.586,z:-16.652},{resSeq:53,iCode:"",x:6.916,y:23.9,z:-18.14},{resSeq:54,iCode:"",x:8.588,y:25.585,z:-15.139},{resSeq:55,iCode:"",x:6.438,y:24.262,z:-12.313},{resSeq:56,iCode:"",x:6.46,y:20.766,z:-10.848},{resSeq:57,iCode:"",x:4.554,y:19.535,z:-7.819},{resSeq:58,iCode:"",x:5.547,y:16.347,z:-6.08},{resSeq:59,iCode:"",x:4.973,y:14.238,z:-3.011},{resSeq:60,iCode:"",x:6.382,y:11.203,z:-1.303},{resSeq:61,iCode:"",x:5.473,y:8.727,z:1.416},{resSeq:62,iCode:"",x:7.472,y:5.747,z:2.617},{resSeq:63,iCode:"",x:6.604,y:3.219,z:5.279},{resSeq:64,iCode:"",x:8.467,y:.548,z:7.201},{resSeq:65,iCode:"",x:6.789,y:-2.814,z:7.952},{resSeq:66,iCode:"",x:8.849,y:-5.054,z:10.302},{resSeq:67,iCode:"",x:8.92,y:-8.696,z:9.168},{resSeq:68,iCode:"",x:10.281,y:-10.121,z:12.4},{resSeq:69,iCode:"",x:7.295,y:-9.628,z:14.756},{resSeq:70,iCode:"",x:4.616,y:-12.207,z:15.557},{resSeq:71,iCode:"",x:.992,y:-11.855,z:14.49},{resSeq:72,iCode:"",x:.316,y:-11.414,z:18.182},{resSeq:73,iCode:"",x:.463,y:-8.324,z:20.393},{resSeq:74,iCode:"",x:3.938,y:-7.32,z:19.235},{resSeq:75,iCode:"",x:2.834,y:-7.288,z:15.583},{resSeq:76,iCode:"",x:3.417,y:-3.491,z:15.118},{resSeq:77,iCode:"",x:6.811,y:-3.233,z:16.77},{resSeq:78,iCode:"",x:9.078,y:-1.069,z:14.62},{resSeq:79,iCode:"",x:6.482,y:-.039,z:12.039},{resSeq:80,iCode:"",x:6.543,y:3.587,z:11.061},{resSeq:81,iCode:"",x:6.274,y:6.193,z:8.38},{resSeq:82,iCode:"",x:9.773,y:7.251,z:7.385},{resSeq:83,iCode:"",x:8.931,y:10.124,z:5.009},{resSeq:84,iCode:"",x:5.756,y:12.117,z:4.25},{resSeq:85,iCode:"",x:5.982,y:15.413,z:2.377},{resSeq:86,iCode:"",x:4.669,y:17.478,z:-.533},{resSeq:87,iCode:"",x:6.314,y:20.31,z:-2.441},{resSeq:88,iCode:"",x:6.841,y:22.4,z:-5.593},{resSeq:89,iCode:"",x:9.868,y:23.039,z:-7.815},{resSeq:90,iCode:"",x:9.894,y:26.149,z:-9.927},{resSeq:91,iCode:"",x:12.184,y:26.703,z:-12.885},{resSeq:92,iCode:"",x:15.666,y:27.652,z:-11.615},{resSeq:93,iCode:"",x:14.263,y:29.398,z:-8.553},{resSeq:94,iCode:"",x:14.382,y:26.325,z:-6.342},{resSeq:95,iCode:"",x:12.173,y:23.795,z:-4.597},{resSeq:96,iCode:"",x:10.245,y:23.945,z:-1.395},{resSeq:97,iCode:"",x:8.658,y:21.125,z:.576},{resSeq:98,iCode:"",x:7.187,y:20.464,z:3.994},{resSeq:99,iCode:"",x:6.538,y:17.353,z:6.065},{resSeq:100,iCode:"",x:8.579,y:14.52,z:7.541},{resSeq:101,iCode:"",x:11.849,y:14.553,z:5.648},{resSeq:102,iCode:"",x:15.643,y:14.475,z:6.09},{resSeq:103,iCode:"",x:17.36,y:17.173,z:8.163},{resSeq:104,iCode:"",x:19.85,y:19.357,z:6.215},{resSeq:105,iCode:"",x:22.935,y:18.066,z:8.041},{resSeq:106,iCode:"",x:22.191,y:14.739,z:6.364},{resSeq:107,iCode:"",x:23.097,y:16.545,z:3.104},{resSeq:108,iCode:"",x:26.562,y:15.888,z:4.458},{resSeq:109,iCode:"",x:26.246,y:12.59,z:6.343},{resSeq:110,iCode:"",x:24.72,y:11.049,z:3.291},{resSeq:111,iCode:"",x:28.23,y:10.811,z:1.797},{resSeq:112,iCode:"",x:29.224,y:7.854,z:3.947},{resSeq:113,iCode:"",x:25.788,y:6.312,z:4.556},{resSeq:114,iCode:"",x:26.535,y:3.706,z:1.923},{resSeq:115,iCode:"",x:27.337,y:.486,z:3.796},{resSeq:116,iCode:"",x:25.455,y:-2.721,z:2.756},{resSeq:117,iCode:"",x:23.595,y:-3.025,z:6.085},{resSeq:118,iCode:"",x:25.253,y:-.824,z:8.772},{resSeq:119,iCode:"",x:27.015,y:2.57,z:8.688},{resSeq:120,iCode:"",x:25.526,y:6.054,z:8.947},{resSeq:121,iCode:"",x:25.719,y:5.762,z:12.739},{resSeq:122,iCode:"",x:25.483,y:9.448,z:13.425},{resSeq:123,iCode:"",x:22.402,y:10.033,z:11.248},{resSeq:124,iCode:"",x:19.834,y:9.335,z:14.056},{resSeq:125,iCode:"",x:16.088,y:9.685,z:13.598},{resSeq:126,iCode:"",x:14.092,y:12.441,z:15.3},{resSeq:127,iCode:"",x:17.367,y:13.973,z:16.329},{resSeq:128,iCode:"",x:17.253,y:17.562,z:15.061},{resSeq:129,iCode:"",x:18.94,y:17.948,z:11.628},{resSeq:130,iCode:"",x:20.937,y:14.715,z:11.157},{resSeq:131,iCode:"",x:18.282,y:12.208,z:10.013},{resSeq:132,iCode:"",x:14.534,y:12.045,z:9.343},{resSeq:133,iCode:"",x:12.491,y:14.505,z:11.437},{resSeq:134,iCode:"",x:8.954,y:15.783,z:11.417},{resSeq:135,iCode:"",x:7.741,y:19.263,z:10.571},{resSeq:136,iCode:"",x:10.618,y:20.591,z:8.518},{resSeq:137,iCode:"",x:10.158,y:23.173,z:5.746},{resSeq:138,iCode:"",x:13.029,y:22.895,z:3.252},{resSeq:139,iCode:"",x:14.093,y:25.244,z:.456},{resSeq:140,iCode:"",x:16.721,y:23.951,z:-1.958},{resSeq:141,iCode:"",x:18.559,y:25.67,z:-4.73},{resSeq:142,iCode:"",x:20.418,y:24.03,z:-7.588},{resSeq:143,iCode:"",x:23.205,y:25.552,z:-9.645},{resSeq:144,iCode:"",x:22.863,y:28.875,z:-7.88},{resSeq:145,iCode:"",x:19.663,y:29.972,z:-9.658},{resSeq:146,iCode:"",x:21.138,y:28.349,z:-12.736},{resSeq:147,iCode:"",x:24.046,y:30.745,z:-12.784},{resSeq:148,iCode:"",x:26.7,y:28.452,z:-11.273},{resSeq:149,iCode:"",x:26.8,y:24.799,z:-12.4},{resSeq:150,iCode:"",x:27.393,y:22.489,z:-9.447},{resSeq:151,iCode:"",x:26.813,y:24.947,z:-6.644},{resSeq:152,iCode:"",x:23.736,y:24.146,z:-4.531},{resSeq:153,iCode:"",x:22.44,y:25.195,z:-1.17},{resSeq:154,iCode:"",x:19.554,y:24.655,z:1.149},{resSeq:155,iCode:"",x:18.047,y:26.272,z:4.213},{resSeq:156,iCode:"",x:15.684,y:24.46,z:6.5},{resSeq:157,iCode:"",x:13.23,y:25.525,z:9.181},{resSeq:158,iCode:"",x:12.455,y:22.984,z:11.862},{resSeq:159,iCode:"",x:9.308,y:23.514,z:13.865},{resSeq:160,iCode:"",x:9.016,y:22.631,z:17.536},{resSeq:161,iCode:"",x:8.057,y:18.998,z:18.221},{resSeq:162,iCode:"",x:7.165,y:18.426,z:21.846},{resSeq:163,iCode:"",x:6.782,y:14.689,z:22.102},{resSeq:164,iCode:"",x:6.3,y:12.569,z:25.241},{resSeq:165,iCode:"",x:9.987,y:11.735,z:25.032},{resSeq:166,iCode:"",x:13.121,y:13.836,z:25.374},{resSeq:167,iCode:"",x:14.801,y:11.706,z:22.695},{resSeq:168,iCode:"",x:12.143,y:12.285,z:20.053},{resSeq:169,iCode:"",x:11.561,y:15.984,z:20.832},{resSeq:170,iCode:"",x:12.929,y:19.322,z:19.527},{resSeq:171,iCode:"",x:12.36,y:23.073,z:19.72},{resSeq:172,iCode:"",x:12.491,y:25.511,z:16.778},{resSeq:173,iCode:"",x:15.673,y:25.839,z:14.765},{resSeq:174,iCode:"",x:17.199,y:26.661,z:11.386},{resSeq:175,iCode:"",x:19.852,y:24.912,z:9.387},{resSeq:176,iCode:"",x:21.471,y:25.092,z:5.971},{resSeq:177,iCode:"",x:23.975,y:23.39,z:3.72},{resSeq:178,iCode:"",x:26.146,y:24.415,z:.793},{resSeq:179,iCode:"",x:27.737,y:21.848,z:-1.468},{resSeq:180,iCode:"",x:29.696,y:21.88,z:-4.683},{resSeq:181,iCode:"",x:30.165,y:19.177,z:-7.22},{resSeq:182,iCode:"",x:32.712,y:19.168,z:-9.959},{resSeq:183,iCode:"",x:33.346,y:16.138,z:-12.08},{resSeq:184,iCode:"",x:33.272,y:13.197,z:-9.704},{resSeq:185,iCode:"",x:34.191,y:15.395,z:-6.781},{resSeq:186,iCode:"",x:31.821,y:16.773,z:-4.266},{resSeq:187,iCode:"",x:32.297,y:18.791,z:-1.127},{resSeq:188,iCode:"",x:29.608,y:19.77,z:1.355},{resSeq:189,iCode:"",x:29.207,y:21.834,z:4.473},{resSeq:190,iCode:"",x:26.088,y:21.637,z:6.658},{resSeq:191,iCode:"",x:25.014,y:23.22,z:9.922},{resSeq:192,iCode:"",x:21.941,y:23.641,z:12.085},{resSeq:193,iCode:"",x:21.093,y:24.898,z:15.604},{resSeq:194,iCode:"",x:17.802,y:24.568,z:17.48},{resSeq:195,iCode:"",x:16.143,y:25.069,z:20.818},{resSeq:196,iCode:"",x:15.981,y:22.133,z:23.234},{resSeq:197,iCode:"",x:12.636,y:21.486,z:24.931},{resSeq:198,iCode:"",x:11.953,y:21.684,z:28.7},{resSeq:199,iCode:"",x:11.933,y:17.887,z:28.904},{resSeq:200,iCode:"",x:15.221,y:17.651,z:27.031},{resSeq:201,iCode:"",x:16.681,y:20.028,z:29.554},{resSeq:202,iCode:"",x:15.254,y:18.048,z:32.469},{resSeq:203,iCode:"",x:17.442,y:15.115,z:31.428},{resSeq:204,iCode:"",x:20.339,y:13.792,z:33.546},{resSeq:205,iCode:"",x:22.966,y:13.848,z:30.739},{resSeq:206,iCode:"",x:23.922,y:16.946,z:28.697},{resSeq:207,iCode:"",x:23.67,y:20.671,z:29.565},{resSeq:208,iCode:"",x:22.519,y:23.627,z:27.448},{resSeq:209,iCode:"",x:19.467,y:25.37,z:25.995},{resSeq:210,iCode:"",x:20.479,y:24.983,z:22.357},{resSeq:211,iCode:"",x:21.422,y:22.001,z:20.172},{resSeq:212,iCode:"",x:24.017,y:22.167,z:17.369},{resSeq:213,iCode:"",x:25.214,y:19.847,z:14.651},{resSeq:214,iCode:"",x:27.56,y:20.45,z:11.706},{resSeq:215,iCode:"",x:29.359,y:18.079,z:9.383},{resSeq:216,iCode:"",x:31.513,y:18.45,z:6.332},{resSeq:217,iCode:"",x:31.966,y:15.824,z:3.693},{resSeq:218,iCode:"",x:34.219,y:15.065,z:.789},{resSeq:219,iCode:"",x:33.817,y:12.515,z:-1.923},{resSeq:220,iCode:"",x:35.132,y:11.116,z:-5.169},{resSeq:221,iCode:"",x:32.353,y:9.38,z:-7.045},{resSeq:222,iCode:"",x:33.288,y:8.168,z:-10.527},{resSeq:223,iCode:"",x:34.945,y:5.335,z:-12.463},{resSeq:224,iCode:"",x:33.351,y:2.569,z:-10.403},{resSeq:225,iCode:"",x:35.052,y:4.054,z:-7.39},{resSeq:226,iCode:"",x:33.384,y:5.546,z:-4.351},{resSeq:227,iCode:"",x:35.476,y:7.114,z:-1.647},{resSeq:228,iCode:"",x:33.88,y:9.394,z:.91},{resSeq:229,iCode:"",x:34.681,y:10.95,z:4.251},{resSeq:230,iCode:"",x:32.727,y:12.908,z:6.815},{resSeq:231,iCode:"",x:33.753,y:14.822,z:9.904},{resSeq:232,iCode:"",x:31.3,y:16.627,z:12.114},{resSeq:233,iCode:"",x:30.62,y:17.614,z:15.698},{resSeq:234,iCode:"",x:27.625,y:18.222,z:17.902},{resSeq:235,iCode:"",x:26.703,y:19.898,z:21.185},{resSeq:236,iCode:"",x:23.891,y:18.515,z:23.333},{resSeq:237,iCode:"",x:22.37,y:16.814,z:20.309},{resSeq:238,iCode:"",x:23.556,y:13.187,z:20.216},{resSeq:239,iCode:"",x:21.459,y:10.904,z:22.425},{resSeq:240,iCode:"",x:23.334,y:8.593,z:24.824},{resSeq:241,iCode:"",x:22.377,y:6.215,z:27.669},{resSeq:242,iCode:"",x:24.377,y:4.951,z:30.595},{resSeq:243,iCode:"",x:23.444,y:1.258,z:30.593},{resSeq:244,iCode:"",x:24.787,y:.921,z:34.129},{resSeq:245,iCode:"",x:22.786,y:3.698,z:35.729},{resSeq:246,iCode:"",x:20.07,y:3.467,z:33.106},{resSeq:247,iCode:"",x:20.497,y:7.188,z:32.766},{resSeq:248,iCode:"",x:19.826,y:9.107,z:29.586},{resSeq:249,iCode:"",x:20.285,y:12.388,z:27.86},{resSeq:250,iCode:"",x:22.511,y:13.954,z:25.244},{resSeq:251,iCode:"",x:26.267,y:14.152,z:24.806},{resSeq:252,iCode:"",x:27.543,y:17.59,z:25.691},{resSeq:253,iCode:"",x:29.946,y:17.212,z:22.772},{resSeq:254,iCode:"",x:30.895,y:14.723,z:20.051},{resSeq:255,iCode:"",x:33.454,y:14.527,z:17.287},{resSeq:256,iCode:"",x:32.505,y:12.165,z:14.542},{resSeq:257,iCode:"",x:34.507,y:10.609,z:11.732},{resSeq:258,iCode:"",x:33.352,y:8.321,z:8.968},{resSeq:259,iCode:"",x:35.298,y:7.021,z:5.956},{resSeq:260,iCode:"",x:34.122,y:4.704,z:3.201},{resSeq:261,iCode:"",x:35.796,y:3.148,z:.192},{resSeq:262,iCode:"",x:33.988,y:.881,z:-2.217},{resSeq:263,iCode:"",x:34.378,y:-.327,z:-5.788},{resSeq:264,iCode:"",x:31.77,y:-1.576,z:-8.191},{resSeq:265,iCode:"",x:32.96,y:-4.417,z:-10.38},{resSeq:266,iCode:"",x:31.291,y:-4.789,z:-13.721},{resSeq:267,iCode:"",x:29.975,y:-8.252,z:-12.885},{resSeq:268,iCode:"",x:27.881,y:-7.109,z:-9.903},{resSeq:269,iCode:"",x:30.149,y:-7.368,z:-6.882},{resSeq:270,iCode:"",x:30.601,y:-4.22,z:-4.791},{resSeq:271,iCode:"",x:33.113,y:-4.649,z:-1.951},{resSeq:272,iCode:"",x:33.075,y:-2.192,z:.94},{resSeq:273,iCode:"",x:35.608,y:-1.053,z:3.465},{resSeq:274,iCode:"",x:34.677,y:1.532,z:6.117},{resSeq:275,iCode:"",x:35.741,y:3.036,z:9.41},{resSeq:276,iCode:"",x:33.541,y:4.812,z:11.923},{resSeq:277,iCode:"",x:34.239,y:6.483,z:15.215},{resSeq:278,iCode:"",x:32.048,y:8.777,z:17.269},{resSeq:279,iCode:"",x:33.373,y:9.886,z:20.618},{resSeq:280,iCode:"",x:31.543,y:11.885,z:23.242},{resSeq:281,iCode:"",x:33.341,y:14.489,z:25.326},{resSeq:282,iCode:"",x:32.539,y:15.779,z:28.812},{resSeq:283,iCode:"",x:29.76,y:13.299,z:29.451},{resSeq:284,iCode:"",x:28.564,y:14.265,z:32.938},{resSeq:285,iCode:"",x:30.242,y:11.638,z:35.064},{resSeq:286,iCode:"",x:32.277,y:9.57,z:32.594},{resSeq:287,iCode:"",x:34.5,y:12.132,z:30.885},{resSeq:288,iCode:"",x:35.347,y:11.07,z:27.319},{resSeq:289,iCode:"",x:33.663,y:7.883,z:25.994},{resSeq:290,iCode:"",x:33.485,y:6.276,z:22.549},{resSeq:291,iCode:"",x:29.947,y:5.719,z:21.334},{resSeq:292,iCode:"",x:30.789,y:4.07,z:18.011},{resSeq:293,iCode:"",x:34.099,y:2.621,z:16.911},{resSeq:294,iCode:"",x:34.634,y:-.103,z:14.354},{resSeq:295,iCode:"",x:35.883,y:-1.244,z:10.961},{resSeq:296,iCode:"",x:33.504,y:-2.682,z:8.431},{resSeq:297,iCode:"",x:34.204,y:-5.111,z:5.661},{resSeq:298,iCode:"",x:31.355,y:-6.156,z:3.479},{resSeq:299,iCode:"",x:30.108,y:-6.847,z:.022},{resSeq:300,iCode:"",x:26.957,y:-6.563,z:-2.035},{resSeq:301,iCode:"",x:26.286,y:-8.55,z:-5.125},{resSeq:302,iCode:"",x:23.759,y:-7.213,z:-7.552},{resSeq:303,iCode:"",x:22.033,y:-9.85,z:-9.615},{resSeq:304,iCode:"",x:20.326,y:-6.95,z:-11.4},{resSeq:305,iCode:"",x:18.458,y:-3.764,z:-10.397},{resSeq:306,iCode:"",x:15.77,y:-5.737,z:-8.552},{resSeq:307,iCode:"",x:17.729,y:-8.402,z:-6.759},{resSeq:308,iCode:"",x:20.781,y:-8.426,z:-4.567},{resSeq:309,iCode:"",x:22.363,y:-10.064,z:-1.488},{resSeq:310,iCode:"",x:25.095,y:-8.956,z:.877},{resSeq:311,iCode:"",x:27.099,y:-9.678,z:3.988},{resSeq:312,iCode:"",x:28.114,y:-6.815,z:6.19},{resSeq:313,iCode:"",x:30.673,y:-7.539,z:8.871},{resSeq:314,iCode:"",x:31.348,y:-5.151,z:11.774},{resSeq:315,iCode:"",x:34.729,y:-5.498,z:13.492},{resSeq:316,iCode:"",x:33.889,y:-3.658,z:16.644},{resSeq:317,iCode:"",x:36.776,y:-1.684,z:18.141},{resSeq:318,iCode:"",x:34.752,y:-.66,z:21.161},{resSeq:319,iCode:"",x:36.312,y:-2.214,z:24.261},{resSeq:320,iCode:"",x:34.633,y:-4.245,z:26.996},{resSeq:321,iCode:"",x:35.447,y:-1.57,z:29.591},{resSeq:322,iCode:"",x:33.492,y:1.134,z:27.768},{resSeq:323,iCode:"",x:32.05,y:3.441,z:30.454},{resSeq:324,iCode:"",x:28.533,y:3.779,z:29.008},{resSeq:325,iCode:"",x:27.929,y:.102,z:28.432},{resSeq:326,iCode:"",x:28.175,y:.351,z:24.669},{resSeq:327,iCode:"",x:28.512,y:-3.186,z:23.276},{resSeq:328,iCode:"",x:31.92,y:-4.517,z:22.177},{resSeq:329,iCode:"",x:31.035,y:-7.67,z:20.212},{resSeq:330,iCode:"",x:31.131,y:-8.107,z:16.434},{resSeq:331,iCode:"",x:28.076,y:-8.516,z:14.223},{resSeq:332,iCode:"",x:27.617,y:-10.093,z:10.8},{resSeq:333,iCode:"",x:24.521,y:-9.331,z:8.737},{resSeq:334,iCode:"",x:23.396,y:-11.425,z:5.8},{resSeq:335,iCode:"",x:20.551,y:-10.366,z:3.631},{resSeq:336,iCode:"",x:18.611,y:-11.031,z:.505},{resSeq:337,iCode:"",x:16.745,y:-8.184,z:-1.137},{resSeq:338,iCode:"",x:14.011,y:-8.055,z:-3.758},{resSeq:339,iCode:"",x:12.856,y:-4.613,z:-4.754},{resSeq:340,iCode:"",x:10.857,y:-2.666,z:-7.265}]}]},"7ahl":{pdbId:"7ahl",chains:[{chainId:"A",residueCount:293,segments:[{start:2,end:5,type:"helix"},{start:7,end:7,type:"strand"},{start:14,end:14,type:"strand"},{start:19,end:20,type:"helix"},{start:21,end:29,type:"strand"},{start:34,end:43,type:"strand"},{start:48,end:48,type:"strand"},{start:51,end:61,type:"strand"},{start:66,end:66,type:"strand"},{start:70,end:70,type:"strand"},{start:75,end:89,type:"strand"},{start:97,end:102,type:"strand"},{start:109,end:127,type:"strand"},{start:132,end:151,type:"strand"},{start:153,end:158,type:"strand"},{start:164,end:171,type:"strand"},{start:174,end:176,type:"strand"},{start:179,end:182,type:"strand"},{start:188,end:188,type:"strand"},{start:192,end:192,type:"strand"},{start:197,end:197,type:"strand"},{start:206,end:208,type:"helix"},{start:210,end:210,type:"strand"},{start:211,end:212,type:"helix"},{start:213,end:215,type:"helix"},{start:218,end:221,type:"helix"},{start:224,end:224,type:"strand"},{start:228,end:234,type:"strand"},{start:242,end:260,type:"strand"},{start:265,end:285,type:"strand"},{start:290,end:292,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:5.489,y:-15.147,z:59.676},{resSeq:2,iCode:"",x:4.396,y:-15.966,z:63.218},{resSeq:3,iCode:"",x:.758,y:-15.366,z:62.352},{resSeq:4,iCode:"",x:.87,y:-17.835,z:59.436},{resSeq:5,iCode:"",x:1.651,y:-20.66,z:61.792},{resSeq:6,iCode:"",x:-.996,y:-19.545,z:64.351},{resSeq:7,iCode:"",x:1.343,y:-17.931,z:66.885},{resSeq:8,iCode:"",x:.991,y:-14.546,z:68.508},{resSeq:9,iCode:"",x:3.094,y:-12.07,z:66.541},{resSeq:10,iCode:"",x:6.543,y:-11.435,z:68.064},{resSeq:11,iCode:"",x:6.409,y:-14.438,z:70.381},{resSeq:12,iCode:"",x:9.477,y:-15.834,z:68.673},{resSeq:13,iCode:"",x:11.66,y:-12.706,z:68.662},{resSeq:14,iCode:"",x:14.753,y:-12.177,z:70.823},{resSeq:15,iCode:"",x:15.473,y:-9.063,z:72.805},{resSeq:16,iCode:"",x:12.632,y:-9.199,z:75.286},{resSeq:17,iCode:"",x:13.329,y:-7.861,z:78.795},{resSeq:18,iCode:"",x:16.989,y:-7.202,z:78.004},{resSeq:19,iCode:"",x:19.085,y:-4.096,z:78.582},{resSeq:20,iCode:"",x:20.854,y:-3.493,z:75.303},{resSeq:21,iCode:"",x:24.279,y:-1.827,z:75.174},{resSeq:22,iCode:"",x:24.969,y:.123,z:71.985},{resSeq:23,iCode:"",x:27.842,y:2.114,z:70.536},{resSeq:24,iCode:"",x:29.253,y:4.024,z:67.573},{resSeq:25,iCode:"",x:32.809,y:3.724,z:66.253},{resSeq:26,iCode:"",x:33.655,y:6.29,z:63.533},{resSeq:27,iCode:"",x:36.824,y:6.38,z:61.431},{resSeq:28,iCode:"",x:37.622,y:8.374,z:58.296},{resSeq:29,iCode:"",x:40.204,y:6.873,z:55.97},{resSeq:30,iCode:"",x:41.579,y:9.924,z:54.13},{resSeq:31,iCode:"",x:43.8,y:8.071,z:51.568},{resSeq:32,iCode:"",x:40.967,y:5.833,z:50.389},{resSeq:33,iCode:"",x:38.245,y:8.411,z:51.02},{resSeq:34,iCode:"",x:35.925,y:6.194,z:53.057},{resSeq:35,iCode:"",x:33.904,y:7.4,z:56.022},{resSeq:36,iCode:"",x:33.478,y:4.219,z:58.05},{resSeq:37,iCode:"",x:30.922,y:3.864,z:60.826},{resSeq:38,iCode:"",x:30.274,y:.803,z:62.925},{resSeq:39,iCode:"",x:27.13,y:.621,z:65.026},{resSeq:40,iCode:"",x:27.075,y:-2.261,z:67.489},{resSeq:41,iCode:"",x:24.442,y:-3.718,z:69.843},{resSeq:42,iCode:"",x:24.929,y:-6.366,z:72.558},{resSeq:43,iCode:"",x:21.834,y:-8.368,z:73.428},{resSeq:44,iCode:"",x:22.11,y:-10.863,z:76.287},{resSeq:45,iCode:"",x:18.651,y:-12.336,z:76.323},{resSeq:46,iCode:"",x:18.75,y:-14.811,z:79.2},{resSeq:47,iCode:"",x:16.046,y:-16.942,z:77.534},{resSeq:48,iCode:"",x:18.32,y:-17.355,z:74.48},{resSeq:49,iCode:"",x:21.169,y:-19.895,z:74.383},{resSeq:50,iCode:"",x:23.76,y:-17.42,z:73.176},{resSeq:51,iCode:"",x:24.933,y:-13.88,z:73.534},{resSeq:52,iCode:"",x:24.356,y:-11.719,z:70.495},{resSeq:53,iCode:"",x:26.193,y:-8.788,z:68.984},{resSeq:54,iCode:"",x:24.621,y:-7.057,z:65.983},{resSeq:55,iCode:"",x:27.229,y:-5.158,z:63.951},{resSeq:56,iCode:"",x:25.992,y:-2.557,z:61.469},{resSeq:57,iCode:"",x:28.508,y:-1.303,z:58.902},{resSeq:58,iCode:"",x:27.428,y:2.13,z:57.617},{resSeq:59,iCode:"",x:29.108,y:5.346,z:56.547},{resSeq:60,iCode:"",x:30.058,y:6.04,z:52.937},{resSeq:61,iCode:"",x:32.716,y:5.063,z:50.428},{resSeq:62,iCode:"",x:33.311,y:8.014,z:48.055},{resSeq:63,iCode:"",x:32.858,y:7.279,z:44.349},{resSeq:64,iCode:"",x:35.936,y:8.989,z:42.933},{resSeq:65,iCode:"",x:34.811,y:9.198,z:39.303},{resSeq:66,iCode:"",x:37.907,y:11.086,z:38.019},{resSeq:67,iCode:"",x:39.666,y:11.718,z:34.676},{resSeq:68,iCode:"",x:43.203,y:10.914,z:35.807},{resSeq:69,iCode:"",x:45.077,y:10.71,z:32.495},{resSeq:70,iCode:"",x:45.484,y:13.467,z:29.931},{resSeq:71,iCode:"",x:47.795,y:12.692,z:26.978},{resSeq:72,iCode:"",x:46.961,y:15.803,z:24.984},{resSeq:73,iCode:"",x:43.647,y:16.189,z:23.127},{resSeq:74,iCode:"",x:44.095,y:12.721,z:21.593},{resSeq:75,iCode:"",x:43.564,y:10.423,z:24.541},{resSeq:76,iCode:"",x:42.331,y:10.595,z:28.163},{resSeq:77,iCode:"",x:41.506,y:8.138,z:30.952},{resSeq:78,iCode:"",x:38.64,y:8.001,z:33.473},{resSeq:79,iCode:"",x:38.78,y:6.033,z:36.744},{resSeq:80,iCode:"",x:35.257,y:5.082,z:37.973},{resSeq:81,iCode:"",x:34.057,y:2.742,z:40.767},{resSeq:82,iCode:"",x:32.784,y:-.528,z:39.32},{resSeq:83,iCode:"",x:32.3,y:-2.152,z:42.733},{resSeq:84,iCode:"",x:31.909,y:-1.298,z:46.411},{resSeq:85,iCode:"",x:32.482,y:-3.957,z:49.095},{resSeq:86,iCode:"",x:32.1,y:-4.446,z:52.846},{resSeq:87,iCode:"",x:33.46,y:-7.564,z:54.556},{resSeq:88,iCode:"",x:33.537,y:-8.759,z:58.128},{resSeq:89,iCode:"",x:35.967,y:-11.444,z:59.165},{resSeq:90,iCode:"",x:36.63,y:-13.426,z:62.36},{resSeq:91,iCode:"",x:40.122,y:-14.977,z:62.827},{resSeq:92,iCode:"",x:39.899,y:-18.745,z:62.529},{resSeq:93,iCode:"",x:40.708,y:-19.325,z:66.205},{resSeq:94,iCode:"",x:37.669,y:-17.323,z:67.414},{resSeq:95,iCode:"",x:34.846,y:-19.409,z:68.899},{resSeq:96,iCode:"",x:32.209,y:-16.794,z:68.008},{resSeq:97,iCode:"",x:30.393,y:-17.384,z:64.74},{resSeq:98,iCode:"",x:28.561,y:-15.412,z:62.087},{resSeq:99,iCode:"",x:24.96,y:-16.351,z:62.593},{resSeq:100,iCode:"",x:22.8,y:-14.21,z:60.407},{resSeq:101,iCode:"",x:23.233,y:-11.295,z:58.011},{resSeq:102,iCode:"",x:21.061,y:-8.854,z:56.091},{resSeq:103,iCode:"",x:20.31,y:-8.083,z:53.297},{resSeq:104,iCode:"",x:20.507,y:-11.401,z:51.462},{resSeq:105,iCode:"",x:20.135,y:-12.32,z:47.786},{resSeq:106,iCode:"",x:16.688,y:-12.113,z:46.236},{resSeq:107,iCode:"",x:15.155,y:-14.062,z:43.354},{resSeq:108,iCode:"",x:14.587,y:-11.804,z:40.351},{resSeq:109,iCode:"",x:11.43,y:-11.911,z:38.308},{resSeq:110,iCode:"",x:10.363,y:-10.877,z:34.814},{resSeq:111,iCode:"",x:7.154,y:-10.379,z:32.896},{resSeq:112,iCode:"",x:6.332,y:-12.462,z:29.872},{resSeq:113,iCode:"",x:3.492,y:-11.964,z:27.434},{resSeq:114,iCode:"",x:2.402,y:-13.661,z:24.239},{resSeq:115,iCode:"",x:-.021,y:-12.238,z:21.693},{resSeq:116,iCode:"",x:-1.949,y:-13.887,z:18.877},{resSeq:117,iCode:"",x:-3.952,y:-11.701,z:16.556},{resSeq:118,iCode:"",x:-5.562,y:-12.414,z:13.188},{resSeq:119,iCode:"",x:-7.698,y:-10.439,z:10.793},{resSeq:120,iCode:"",x:-9.507,y:-10.289,z:7.497},{resSeq:121,iCode:"",x:-10.243,y:-7.484,z:5.028},{resSeq:122,iCode:"",x:-12.091,y:-6.883,z:1.778},{resSeq:123,iCode:"",x:-11.519,y:-4.02,z:-.663},{resSeq:124,iCode:"",x:-13.756,y:-3.033,z:-3.598},{resSeq:125,iCode:"",x:-12.289,y:-.891,z:-6.378},{resSeq:126,iCode:"",x:-13.633,y:1.037,z:-9.368},{resSeq:127,iCode:"",x:-13.127,y:4.154,z:-11.545},{resSeq:128,iCode:"",x:-14.651,y:6.517,z:-14.132},{resSeq:129,iCode:"",x:-13.79,y:4.034,z:-16.9},{resSeq:130,iCode:"",x:-16.421,y:1.784,z:-15.263},{resSeq:131,iCode:"",x:-13.718,y:-.613,z:-14.09},{resSeq:132,iCode:"",x:-14.153,y:-2.887,z:-11.045},{resSeq:133,iCode:"",x:-11.504,y:-4.406,z:-8.78},{resSeq:134,iCode:"",x:-11.364,y:-6.49,z:-5.614},{resSeq:135,iCode:"",x:-9.199,y:-7.766,z:-2.758},{resSeq:136,iCode:"",x:-9.524,y:-10.296,z:.06},{resSeq:137,iCode:"",x:-6.728,y:-10.307,z:2.617},{resSeq:138,iCode:"",x:-6.08,y:-12.31,z:5.764},{resSeq:139,iCode:"",x:-3.284,y:-12.233,z:8.31},{resSeq:140,iCode:"",x:-1.74,y:-13.538,z:11.522},{resSeq:141,iCode:"",x:1.137,y:-12.363,z:13.709},{resSeq:142,iCode:"",x:2.532,y:-13.802,z:16.919},{resSeq:143,iCode:"",x:4.239,y:-11.442,z:19.348},{resSeq:144,iCode:"",x:6.154,y:-12.016,z:22.554},{resSeq:145,iCode:"",x:7.305,y:-9.391,z:25},{resSeq:146,iCode:"",x:9.578,y:-9.528,z:28.031},{resSeq:147,iCode:"",x:9.654,y:-6.905,z:30.764},{resSeq:148,iCode:"",x:12.076,y:-6.562,z:33.65},{resSeq:149,iCode:"",x:13.678,y:-3.925,z:35.861},{resSeq:150,iCode:"",x:17.405,y:-3.163,z:35.851},{resSeq:151,iCode:"",x:19.098,y:-1.411,z:38.813},{resSeq:152,iCode:"",x:22.117,y:.777,z:38.052},{resSeq:153,iCode:"",x:23.988,y:-1.308,z:40.623},{resSeq:154,iCode:"",x:23.241,y:-4.689,z:42.274},{resSeq:155,iCode:"",x:23.685,y:-5.452,z:46.002},{resSeq:156,iCode:"",x:24.885,y:-9.044,z:46.371},{resSeq:157,iCode:"",x:25.431,y:-10.983,z:49.578},{resSeq:158,iCode:"",x:28.613,y:-13.002,z:49.059},{resSeq:159,iCode:"",x:28.672,y:-16.624,z:50.18},{resSeq:160,iCode:"",x:29.087,y:-16.548,z:53.991},{resSeq:161,iCode:"",x:30.845,y:-18.987,z:56.27},{resSeq:162,iCode:"",x:30.797,y:-18.971,z:60.078},{resSeq:163,iCode:"",x:33.903,y:-16.754,z:60.255},{resSeq:164,iCode:"",x:33.245,y:-14.234,z:57.457},{resSeq:165,iCode:"",x:30.478,y:-12.441,z:55.593},{resSeq:166,iCode:"",x:30.496,y:-9.682,z:53.005},{resSeq:167,iCode:"",x:28.564,y:-7.749,z:50.374},{resSeq:168,iCode:"",x:29.372,y:-6.239,z:47.021},{resSeq:169,iCode:"",x:27.328,y:-3.632,z:45.22},{resSeq:170,iCode:"",x:28.495,y:-3.892,z:41.625},{resSeq:171,iCode:"",x:27.908,y:-1.776,z:38.542},{resSeq:172,iCode:"",x:25.113,y:-3.352,z:36.499},{resSeq:173,iCode:"",x:24.412,y:-.985,z:33.579},{resSeq:174,iCode:"",x:23.327,y:2.611,z:33.031},{resSeq:175,iCode:"",x:21.624,y:4.904,z:30.529},{resSeq:176,iCode:"",x:23.802,y:7.522,z:28.765},{resSeq:177,iCode:"",x:21.879,y:10.561,z:27.486},{resSeq:178,iCode:"",x:18.61,y:8.65,z:27.032},{resSeq:179,iCode:"",x:20.155,y:5.746,z:25.193},{resSeq:180,iCode:"",x:21.622,y:2.377,z:26.008},{resSeq:181,iCode:"",x:21.838,y:1.107,z:28.654},{resSeq:182,iCode:"",x:25.554,y:.422,z:28.705},{resSeq:183,iCode:"",x:27.56,y:-1.974,z:30.83},{resSeq:184,iCode:"",x:31.251,y:-2.827,z:31.174},{resSeq:185,iCode:"",x:30.97,y:-5.082,z:28.143},{resSeq:186,iCode:"",x:29.121,y:-2.843,z:25.689},{resSeq:187,iCode:"",x:30.976,y:-2.93,z:22.387},{resSeq:188,iCode:"",x:30.522,y:-1.182,z:19.068},{resSeq:189,iCode:"",x:32.829,y:-1.576,z:16.008},{resSeq:190,iCode:"",x:32.897,y:2.175,z:15.267},{resSeq:191,iCode:"",x:32.83,y:3.677,z:18.757},{resSeq:192,iCode:"",x:33.786,y:.77,z:21.017},{resSeq:193,iCode:"",x:32.309,y:1.355,z:24.488},{resSeq:194,iCode:"",x:30.042,y:4.387,z:24.793},{resSeq:195,iCode:"",x:29.47,y:4.034,z:28.563},{resSeq:196,iCode:"",x:30.806,y:7.448,z:29.676},{resSeq:197,iCode:"",x:30.997,y:9.221,z:26.328},{resSeq:198,iCode:"",x:29.582,y:12.73,z:26.091},{resSeq:199,iCode:"",x:29.688,y:12.957,z:22.228},{resSeq:200,iCode:"",x:30.604,y:10.642,z:19.319},{resSeq:201,iCode:"",x:32.406,y:13.137,z:17.051},{resSeq:202,iCode:"",x:32.902,y:16.265,z:19.198},{resSeq:203,iCode:"",x:36.179,y:18.071,z:18.68},{resSeq:204,iCode:"",x:37.365,y:18.86,z:22.212},{resSeq:205,iCode:"",x:40.151,y:17.606,z:24.459},{resSeq:206,iCode:"",x:39.627,y:13.874,z:25.126},{resSeq:207,iCode:"",x:39.263,y:14.892,z:28.784},{resSeq:208,iCode:"",x:36.171,y:17.002,z:28.072},{resSeq:209,iCode:"",x:34.355,y:14.271,z:26.208},{resSeq:210,iCode:"",x:33.548,y:12.248,z:29.368},{resSeq:211,iCode:"",x:29.931,y:12.304,z:30.674},{resSeq:212,iCode:"",x:28.942,y:14.913,z:33.311},{resSeq:213,iCode:"",x:28.946,y:12.975,z:36.64},{resSeq:214,iCode:"",x:25.746,y:14.876,z:37.398},{resSeq:215,iCode:"",x:24.171,y:13.014,z:34.466},{resSeq:216,iCode:"",x:25.418,y:9.572,z:35.546},{resSeq:217,iCode:"",x:24.552,y:7.444,z:38.601},{resSeq:218,iCode:"",x:25.457,y:9.453,z:41.724},{resSeq:219,iCode:"",x:27.098,y:6.391,z:43.253},{resSeq:220,iCode:"",x:29.858,y:6.849,z:40.662},{resSeq:221,iCode:"",x:30.902,y:10.225,z:42.059},{resSeq:222,iCode:"",x:29.464,y:11.06,z:45.501},{resSeq:223,iCode:"",x:29.608,y:7.522,z:46.755},{resSeq:224,iCode:"",x:27.757,y:4.614,z:48.254},{resSeq:225,iCode:"",x:26.407,y:4.365,z:51.827},{resSeq:226,iCode:"",x:26.51,y:.743,z:53.17},{resSeq:227,iCode:"",x:23.884,y:-.356,z:55.701},{resSeq:228,iCode:"",x:24.462,y:-4.008,z:56.307},{resSeq:229,iCode:"",x:23.658,y:-6.042,z:59.424},{resSeq:230,iCode:"",x:25.709,y:-8.987,z:60.73},{resSeq:231,iCode:"",x:24.735,y:-10.811,z:63.889},{resSeq:232,iCode:"",x:27.514,y:-12.681,z:65.687},{resSeq:233,iCode:"",x:26.835,y:-15.301,z:68.363},{resSeq:234,iCode:"",x:28.925,y:-16.364,z:71.352},{resSeq:235,iCode:"",x:28.776,y:-19.226,z:73.85},{resSeq:236,iCode:"",x:28.181,y:-18.1,z:77.431},{resSeq:237,iCode:"",x:30.528,y:-20.876,z:78.597},{resSeq:238,iCode:"",x:33.417,y:-20.08,z:76.199},{resSeq:239,iCode:"",x:36.911,y:-19.712,z:77.65},{resSeq:240,iCode:"",x:37.968,y:-16.413,z:76.096},{resSeq:241,iCode:"",x:35.157,y:-13.867,z:76.118},{resSeq:242,iCode:"",x:37.135,y:-11.595,z:73.826},{resSeq:243,iCode:"",x:36.887,y:-11.534,z:70.043},{resSeq:244,iCode:"",x:38.894,y:-9.904,z:67.24},{resSeq:245,iCode:"",x:37.071,y:-8.912,z:64.095},{resSeq:246,iCode:"",x:38.404,y:-7.221,z:60.958},{resSeq:247,iCode:"",x:36.173,y:-5.006,z:58.818},{resSeq:248,iCode:"",x:37.166,y:-4.205,z:55.25},{resSeq:249,iCode:"",x:35.742,y:-1.462,z:53.067},{resSeq:250,iCode:"",x:36.902,y:-1.487,z:49.458},{resSeq:251,iCode:"",x:36.411,y:.15,z:46.122},{resSeq:252,iCode:"",x:37.206,y:-1.547,z:42.837},{resSeq:253,iCode:"",x:37.971,y:.988,z:40.076},{resSeq:254,iCode:"",x:37.825,y:.404,z:36.314},{resSeq:255,iCode:"",x:39.773,y:2.289,z:33.621},{resSeq:256,iCode:"",x:37.676,y:3.958,z:30.902},{resSeq:257,iCode:"",x:39.713,y:5.375,z:27.978},{resSeq:258,iCode:"",x:38.614,y:7.751,z:25.225},{resSeq:259,iCode:"",x:40.621,y:8.313,z:22.087},{resSeq:260,iCode:"",x:40.093,y:10.018,z:18.733},{resSeq:261,iCode:"",x:40.205,y:7.897,z:15.566},{resSeq:262,iCode:"",x:40.352,y:11.145,z:13.576},{resSeq:263,iCode:"",x:36.707,y:10.852,z:12.531},{resSeq:264,iCode:"",x:35.073,y:9.828,z:15.829},{resSeq:265,iCode:"",x:35.68,y:8.851,z:19.449},{resSeq:266,iCode:"",x:36.59,y:5.429,z:20.812},{resSeq:267,iCode:"",x:35.686,y:3.999,z:24.208},{resSeq:268,iCode:"",x:37.686,y:1.289,z:25.97},{resSeq:269,iCode:"",x:37.009,y:-.001,z:29.509},{resSeq:270,iCode:"",x:39.664,y:-2.008,z:31.391},{resSeq:271,iCode:"",x:38.011,y:-3.979,z:34.211},{resSeq:272,iCode:"",x:39.076,y:-4.007,z:37.881},{resSeq:273,iCode:"",x:42.065,y:-1.827,z:37.061},{resSeq:274,iCode:"",x:42.472,y:-.607,z:40.651},{resSeq:275,iCode:"",x:41.512,y:-1.677,z:44.179},{resSeq:276,iCode:"",x:41.354,y:.467,z:47.339},{resSeq:277,iCode:"",x:41.139,y:-1.429,z:50.655},{resSeq:278,iCode:"",x:40.588,y:-.034,z:54.128},{resSeq:279,iCode:"",x:41.002,y:-2.719,z:56.774},{resSeq:280,iCode:"",x:40.482,y:-2.118,z:60.502},{resSeq:281,iCode:"",x:40.528,y:-4.38,z:63.537},{resSeq:282,iCode:"",x:38.119,y:-4.134,z:66.442},{resSeq:283,iCode:"",x:38.02,y:-5.818,z:69.829},{resSeq:284,iCode:"",x:34.824,y:-7.296,z:71.203},{resSeq:285,iCode:"",x:34.551,y:-7.601,z:74.98},{resSeq:286,iCode:"",x:31.642,y:-9.922,z:75.598},{resSeq:287,iCode:"",x:31.911,y:-9.535,z:79.428},{resSeq:288,iCode:"",x:31.849,y:-5.752,z:79.598},{resSeq:289,iCode:"",x:29.762,y:-5.655,z:76.423},{resSeq:290,iCode:"",x:31.805,y:-3.13,z:74.543},{resSeq:291,iCode:"",x:33.63,y:-2.778,z:71.306},{resSeq:292,iCode:"",x:36.745,y:-.686,z:70.707},{resSeq:293,iCode:"",x:39.262,y:-.111,z:67.894}]},{chainId:"B",residueCount:293,segments:[{start:3,end:5,type:"helix"},{start:7,end:7,type:"strand"},{start:14,end:14,type:"strand"},{start:21,end:29,type:"strand"},{start:34,end:43,type:"strand"},{start:48,end:48,type:"strand"},{start:51,end:61,type:"strand"},{start:66,end:71,type:"strand"},{start:75,end:89,type:"strand"},{start:97,end:102,type:"strand"},{start:105,end:108,type:"helix"},{start:111,end:127,type:"strand"},{start:132,end:151,type:"strand"},{start:153,end:158,type:"strand"},{start:164,end:171,type:"strand"},{start:174,end:176,type:"strand"},{start:179,end:182,type:"strand"},{start:192,end:192,type:"strand"},{start:197,end:197,type:"strand"},{start:206,end:208,type:"helix"},{start:210,end:210,type:"strand"},{start:211,end:212,type:"helix"},{start:213,end:215,type:"helix"},{start:218,end:221,type:"helix"},{start:224,end:224,type:"strand"},{start:228,end:234,type:"strand"},{start:242,end:260,type:"strand"},{start:265,end:285,type:"strand"},{start:290,end:292,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:-9.122,y:-13.777,z:59.403},{resSeq:2,iCode:"",x:-10.319,y:-13.571,z:62.982},{resSeq:3,iCode:"",x:-12.183,y:-10.342,z:62.158},{resSeq:4,iCode:"",x:-13.881,y:-12.03,z:59.195},{resSeq:5,iCode:"",x:-15.575,y:-14.331,z:61.617},{resSeq:6,iCode:"",x:-16.361,y:-11.545,z:64.15},{resSeq:7,iCode:"",x:-13.619,y:-12.489,z:66.61},{resSeq:8,iCode:"",x:-11.234,y:-10.089,z:68.309},{resSeq:9,iCode:"",x:-7.917,y:-10.187,z:66.461},{resSeq:10,iCode:"",x:-5.294,y:-12.557,z:67.809},{resSeq:11,iCode:"",x:-7.746,y:-14.365,z:70.091},{resSeq:12,iCode:"",x:-7.068,y:-17.819,z:68.633},{resSeq:13,iCode:"",x:-3.28,y:-17.331,z:68.46},{resSeq:14,iCode:"",x:-.869,y:-19.434,z:70.551},{resSeq:15,iCode:"",x:1.825,y:-18.095,z:72.85},{resSeq:16,iCode:"",x:.353,y:-15.417,z:75.098},{resSeq:17,iCode:"",x:1.635,y:-15.342,z:78.717},{resSeq:18,iCode:"",x:4.317,y:-17.954,z:77.972},{resSeq:19,iCode:"",x:8.036,y:-17.764,z:78.68},{resSeq:20,iCode:"",x:9.614,y:-18.757,z:75.352},{resSeq:21,iCode:"",x:13.103,y:-20.244,z:75.14},{resSeq:22,iCode:"",x:15.116,y:-19.687,z:71.962},{resSeq:23,iCode:"",x:18.525,y:-20.608,z:70.599},{resSeq:24,iCode:"",x:20.926,y:-20.424,z:67.648},{resSeq:25,iCode:"",x:22.769,y:-23.446,z:66.259},{resSeq:26,iCode:"",x:25.368,y:-22.56,z:63.589},{resSeq:27,iCode:"",x:27.472,y:-24.954,z:61.516},{resSeq:28,iCode:"",x:29.64,y:-24.349,z:58.473},{resSeq:29,iCode:"",x:30.211,y:-27.212,z:56.028},{resSeq:30,iCode:"",x:33.431,y:-26.307,z:54.243},{resSeq:31,iCode:"",x:33.222,y:-29.209,z:51.801},{resSeq:32,iCode:"",x:29.662,y:-28.452,z:50.737},{resSeq:33,iCode:"",x:30.013,y:-24.674,z:51.025},{resSeq:34,iCode:"",x:26.989,y:-24.328,z:53.256},{resSeq:35,iCode:"",x:26.499,y:-22.01,z:56.213},{resSeq:36,iCode:"",x:23.715,y:-23.6,z:58.253},{resSeq:37,iCode:"",x:21.89,y:-21.778,z:61.044},{resSeq:38,iCode:"",x:18.975,y:-23.247,z:62.963},{resSeq:39,iCode:"",x:16.908,y:-20.823,z:65.067},{resSeq:40,iCode:"",x:14.562,y:-22.573,z:67.514},{resSeq:41,iCode:"",x:11.722,y:-21.603,z:69.838},{resSeq:42,iCode:"",x:10.048,y:-23.763,z:72.47},{resSeq:43,iCode:"",x:6.539,y:-22.63,z:73.308},{resSeq:44,iCode:"",x:4.796,y:-24.414,z:76.188},{resSeq:45,iCode:"",x:1.463,y:-22.624,z:76.259},{resSeq:46,iCode:"",x:-.519,y:-24.244,z:79.053},{resSeq:47,iCode:"",x:-3.789,y:-23.359,z:77.336},{resSeq:48,iCode:"",x:-2.754,y:-25.276,z:74.174},{resSeq:49,iCode:"",x:-3.114,y:-29.073,z:74.095},{resSeq:50,iCode:"",x:.549,y:-29.57,z:73.079},{resSeq:51,iCode:"",x:4.114,y:-28.471,z:73.511},{resSeq:52,iCode:"",x:5.506,y:-26.794,z:70.422},{resSeq:53,iCode:"",x:8.869,y:-26.157,z:68.852},{resSeq:54,iCode:"",x:9.296,y:-23.741,z:65.927},{resSeq:55,iCode:"",x:12.436,y:-24.46,z:63.948},{resSeq:56,iCode:"",x:13.651,y:-21.874,z:61.433},{resSeq:57,iCode:"",x:16.25,y:-23.173,z:58.944},{resSeq:58,iCode:"",x:18.262,y:-20.254,z:57.589},{resSeq:59,iCode:"",x:21.849,y:-19.583,z:56.496},{resSeq:60,iCode:"",x:23.295,y:-19.714,z:52.997},{resSeq:61,iCode:"",x:23.983,y:-22.455,z:50.479},{resSeq:62,iCode:"",x:26.783,y:-21.113,z:48.207},{resSeq:63,iCode:"",x:25.947,y:-21.106,z:44.492},{resSeq:64,iCode:"",x:29.238,y:-22.35,z:43.103},{resSeq:65,iCode:"",x:28.744,y:-21.498,z:39.416},{resSeq:66,iCode:"",x:32.101,y:-22.623,z:37.978},{resSeq:67,iCode:"",x:33.892,y:-23.547,z:34.772},{resSeq:68,iCode:"",x:35.07,y:-26.905,z:36.082},{resSeq:69,iCode:"",x:36.35,y:-28.285,z:32.767},{resSeq:70,iCode:"",x:38.467,y:-26.857,z:29.968},{resSeq:71,iCode:"",x:38.796,y:-29.101,z:26.887},{resSeq:72,iCode:"",x:41.463,y:-27.108,z:25.079},{resSeq:73,iCode:"",x:39.395,y:-24.266,z:23.609},{resSeq:74,iCode:"",x:36.572,y:-25.933,z:21.691},{resSeq:75,iCode:"",x:34.894,y:-27.616,z:24.628},{resSeq:76,iCode:"",x:34.48,y:-26.572,z:28.276},{resSeq:77,iCode:"",x:32.053,y:-27.232,z:31.069},{resSeq:78,iCode:"",x:30.2,y:-25.127,z:33.605},{resSeq:79,iCode:"",x:28.772,y:-26.536,z:36.864},{resSeq:80,iCode:"",x:25.77,y:-24.48,z:38.1},{resSeq:81,iCode:"",x:23.045,y:-24.956,z:40.755},{resSeq:82,iCode:"",x:19.671,y:-25.985,z:39.343},{resSeq:83,iCode:"",x:18.204,y:-26.611,z:42.77},{resSeq:84,iCode:"",x:18.514,y:-25.75,z:46.442},{resSeq:85,iCode:"",x:16.913,y:-28.026,z:49.023},{resSeq:86,iCode:"",x:16.206,y:-28.016,z:52.757},{resSeq:87,iCode:"",x:14.55,y:-31.021,z:54.374},{resSeq:88,iCode:"",x:13.721,y:-31.924,z:57.948},{resSeq:89,iCode:"",x:12.666,y:-35.342,z:59.147},{resSeq:90,iCode:"",x:11.924,y:-37.248,z:62.336},{resSeq:91,iCode:"",x:12.877,y:-40.933,z:62.624},{resSeq:92,iCode:"",x:9.741,y:-43.072,z:62.1},{resSeq:93,iCode:"",x:9.941,y:-44.236,z:65.746},{resSeq:94,iCode:"",x:9.624,y:-40.659,z:67.075},{resSeq:95,iCode:"",x:6.452,y:-39.514,z:68.837},{resSeq:96,iCode:"",x:6.71,y:-35.785,z:67.947},{resSeq:97,iCode:"",x:4.844,y:-34.528,z:64.847},{resSeq:98,iCode:"",x:5.305,y:-32.033,z:62.048},{resSeq:99,iCode:"",x:2.275,y:-29.818,z:62.512},{resSeq:100,iCode:"",x:2.731,y:-26.782,z:60.348},{resSeq:101,iCode:"",x:5.214,y:-25.239,z:57.912},{resSeq:102,iCode:"",x:5.713,y:-22.054,z:55.989},{resSeq:103,iCode:"",x:5.885,y:-21.042,z:53.151},{resSeq:104,iCode:"",x:3.42,y:-23.315,z:51.343},{resSeq:105,iCode:"",x:2.528,y:-23.582,z:47.637},{resSeq:106,iCode:"",x:.986,y:-20.536,z:45.972},{resSeq:107,iCode:"",x:-1.742,y:-20.568,z:43.297},{resSeq:108,iCode:"",x:-.406,y:-18.785,z:40.176},{resSeq:109,iCode:"",x:-2.368,y:-16.358,z:38.043},{resSeq:110,iCode:"",x:-2.283,y:-14.973,z:34.518},{resSeq:111,iCode:"",x:-3.914,y:-11.918,z:32.964},{resSeq:112,iCode:"",x:-6.118,y:-12.404,z:29.912},{resSeq:113,iCode:"",x:-7.002,y:-9.897,z:27.175},{resSeq:114,iCode:"",x:-9.434,y:-10.376,z:24.247},{resSeq:115,iCode:"",x:-9.621,y:-7.65,z:21.604},{resSeq:116,iCode:"",x:-12.136,y:-7.26,z:18.794},{resSeq:117,iCode:"",x:-11.42,y:-4.474,z:16.284},{resSeq:118,iCode:"",x:-13.249,y:-3.469,z:13.108},{resSeq:119,iCode:"",x:-12.966,y:-.542,z:10.735},{resSeq:120,iCode:"",x:-13.705,y:.948,z:7.316},{resSeq:121,iCode:"",x:-11.766,y:3.18,z:4.919},{resSeq:122,iCode:"",x:-12.426,y:5.228,z:1.794},{resSeq:123,iCode:"",x:-9.915,y:6.421,z:-.804},{resSeq:124,iCode:"",x:-10.432,y:8.908,z:-3.633},{resSeq:125,iCode:"",x:-7.864,y:8.874,z:-6.429},{resSeq:126,iCode:"",x:-7.126,y:10.851,z:-9.587},{resSeq:127,iCode:"",x:-4.401,y:12.371,z:-11.769},{resSeq:128,iCode:"",x:-3.556,y:15.152,z:-14.213},{resSeq:129,iCode:"",x:-5.073,y:13.152,z:-17.089},{resSeq:130,iCode:"",x:-8.368,y:13.863,z:-15.305},{resSeq:131,iCode:"",x:-8.609,y:10.249,z:-14.148},{resSeq:132,iCode:"",x:-10.695,y:9.297,z:-11.117},{resSeq:133,iCode:"",x:-10.782,y:6.225,z:-8.905},{resSeq:134,iCode:"",x:-12.194,y:4.961,z:-5.629},{resSeq:135,iCode:"",x:-11.621,y:2.441,z:-2.819},{resSeq:136,iCode:"",x:-13.891,y:1.145,z:-.072},{resSeq:137,iCode:"",x:-12.463,y:-1.381,z:2.363},{resSeq:138,iCode:"",x:-13.599,y:-3.053,z:5.591},{resSeq:139,iCode:"",x:-11.605,y:-5.083,z:8.107},{resSeq:140,iCode:"",x:-11.844,y:-7.172,z:11.262},{resSeq:141,iCode:"",x:-9.316,y:-8.242,z:13.95},{resSeq:142,iCode:"",x:-9.367,y:-10.613,z:16.905},{resSeq:143,iCode:"",x:-6.381,y:-10.455,z:19.256},{resSeq:144,iCode:"",x:-5.552,y:-12.407,z:22.412},{resSeq:145,iCode:"",x:-2.976,y:-11.695,z:25.073},{resSeq:146,iCode:"",x:-1.631,y:-13.743,z:27.974},{resSeq:147,iCode:"",x:.447,y:-12.058,z:30.66},{resSeq:148,iCode:"",x:2.167,y:-13.618,z:33.659},{resSeq:149,iCode:"",x:5.194,y:-13.337,z:35.933},{resSeq:150,iCode:"",x:8.124,y:-15.762,z:35.703},{resSeq:151,iCode:"",x:10.5,y:-15.838,z:38.688},{resSeq:152,iCode:"",x:14.104,y:-16.999,z:38.095},{resSeq:153,iCode:"",x:13.662,y:-19.662,z:40.744},{resSeq:154,iCode:"",x:10.535,y:-21.247,z:42.208},{resSeq:155,iCode:"",x:10.139,y:-22.024,z:45.915},{resSeq:156,iCode:"",x:8.166,y:-25.183,z:46.406},{resSeq:157,iCode:"",x:6.841,y:-26.895,z:49.484},{resSeq:158,iCode:"",x:7.433,y:-30.617,z:48.98},{resSeq:159,iCode:"",x:4.632,y:-33.001,z:50.038},{resSeq:160,iCode:"",x:4.831,y:-33.193,z:53.865},{resSeq:161,iCode:"",x:3.986,y:-36.025,z:56.269},{resSeq:162,iCode:"",x:3.736,y:-35.962,z:60.055},{resSeq:163,iCode:"",x:7.454,y:-36.935,z:60.085},{resSeq:164,iCode:"",x:8.95,y:-35.133,z:57.082},{resSeq:165,iCode:"",x:8.835,y:-31.704,z:55.439},{resSeq:166,iCode:"",x:11.035,y:-30.027,z:52.84},{resSeq:167,iCode:"",x:11.374,y:-27.157,z:50.384},{resSeq:168,iCode:"",x:12.952,y:-26.953,z:46.959},{resSeq:169,iCode:"",x:13.944,y:-23.719,z:45.299},{resSeq:170,iCode:"",x:14.377,y:-24.791,z:41.692},{resSeq:171,iCode:"",x:15.654,y:-22.974,z:38.625},{resSeq:172,iCode:"",x:12.812,y:-21.793,z:36.389},{resSeq:173,iCode:"",x:14.139,y:-19.635,z:33.485},{resSeq:174,iCode:"",x:16.403,y:-16.688,z:32.981},{resSeq:175,iCode:"",x:17.04,y:-13.742,z:30.676},{resSeq:176,iCode:"",x:20.444,y:-13.974,z:28.967},{resSeq:177,iCode:"",x:21.603,y:-10.587,z:27.678},{resSeq:178,iCode:"",x:18.103,y:-9.227,z:27.03},{resSeq:179,iCode:"",x:17.108,y:-12.378,z:25.131},{resSeq:180,iCode:"",x:15.395,y:-15.63,z:26.112},{resSeq:181,iCode:"",x:14.309,y:-16.39,z:28.798},{resSeq:182,iCode:"",x:16.096,y:-19.721,z:28.659},{resSeq:183,iCode:"",x:15.569,y:-22.791,z:30.853},{resSeq:184,iCode:"",x:17.112,y:-26.222,z:31.264},{resSeq:185,iCode:"",x:15.34,y:-27.455,z:28.136},{resSeq:186,iCode:"",x:16.014,y:-24.68,z:25.629},{resSeq:187,iCode:"",x:17.203,y:-26.076,z:22.297},{resSeq:188,iCode:"",x:18.33,y:-24.298,z:19.196},{resSeq:189,iCode:"",x:18.663,y:-26.445,z:16.07},{resSeq:190,iCode:"",x:21.89,y:-24.628,z:15.353},{resSeq:191,iCode:"",x:22.978,y:-23.144,z:18.719},{resSeq:192,iCode:"",x:21.613,y:-25.748,z:21.154},{resSeq:193,iCode:"",x:20.818,y:-24.579,z:24.696},{resSeq:194,iCode:"",x:21.946,y:-20.944,z:25.001},{resSeq:195,iCode:"",x:21.402,y:-20.59,z:28.779},{resSeq:196,iCode:"",x:24.89,y:-19.432,z:29.655},{resSeq:197,iCode:"",x:26.677,y:-18.617,z:26.422},{resSeq:198,iCode:"",x:28.133,y:-15.127,z:26.137},{resSeq:199,iCode:"",x:28.522,y:-15.104,z:22.358},{resSeq:200,iCode:"",x:27.055,y:-17.244,z:19.563},{resSeq:201,iCode:"",x:29.974,y:-16.838,z:17.121},{resSeq:202,iCode:"",x:32.516,y:-14.924,z:19.244},{resSeq:203,iCode:"",x:36.013,y:-16.32,z:18.708},{resSeq:204,iCode:"",x:37.465,y:-17.357,z:22.08},{resSeq:205,iCode:"",x:38.573,y:-20.271,z:24.214},{resSeq:206,iCode:"",x:35.568,y:-22.331,z:25.291},{resSeq:207,iCode:"",x:36.136,y:-21.395,z:28.959},{resSeq:208,iCode:"",x:35.549,y:-17.716,z:28.245},{resSeq:209,iCode:"",x:32.278,y:-17.979,z:26.411},{resSeq:210,iCode:"",x:30.302,y:-18.479,z:29.632},{resSeq:211,iCode:"",x:28.105,y:-15.71,z:30.991},{resSeq:212,iCode:"",x:29.547,y:-13.51,z:33.714},{resSeq:213,iCode:"",x:27.893,y:-14.679,z:36.963},{resSeq:214,iCode:"",x:27.426,y:-10.948,z:37.617},{resSeq:215,iCode:"",x:24.922,y:-10.948,z:34.717},{resSeq:216,iCode:"",x:23.035,y:-14.112,z:35.648},{resSeq:217,iCode:"",x:20.788,y:-14.708,z:38.729},{resSeq:218,iCode:"",x:22.773,y:-13.957,z:41.901},{resSeq:219,iCode:"",x:21.664,y:-17.317,z:43.397},{resSeq:220,iCode:"",x:23.75,y:-19.168,z:40.782},{resSeq:221,iCode:"",x:26.964,y:-17.711,z:42.096},{resSeq:222,iCode:"",x:26.617,y:-16.256,z:45.633},{resSeq:223,iCode:"",x:23.908,y:-18.624,z:46.752},{resSeq:224,iCode:"",x:20.453,y:-18.869,z:48.246},{resSeq:225,iCode:"",x:19.604,y:-18.051,z:51.88},{resSeq:226,iCode:"",x:16.831,y:-20.276,z:53.269},{resSeq:227,iCode:"",x:14.216,y:-18.876,z:55.62},{resSeq:228,iCode:"",x:11.75,y:-21.679,z:56.196},{resSeq:229,iCode:"",x:9.764,y:-22.627,z:59.283},{resSeq:230,iCode:"",x:8.529,y:-25.953,z:60.65},{resSeq:231,iCode:"",x:6.333,y:-26.397,z:63.728},{resSeq:232,iCode:"",x:6.71,y:-29.689,z:65.664},{resSeq:233,iCode:"",x:4.153,y:-30.644,z:68.324},{resSeq:234,iCode:"",x:4.675,y:-32.954,z:71.33},{resSeq:235,iCode:"",x:2.297,y:-34.599,z:73.818},{resSeq:236,iCode:"",x:3.019,y:-33.664,z:77.42},{resSeq:237,iCode:"",x:2.47,y:-37.256,z:78.387},{resSeq:238,iCode:"",x:4.452,y:-39.095,z:75.684},{resSeq:239,iCode:"",x:6.894,y:-41.54,z:77.347},{resSeq:240,iCode:"",x:10.135,y:-40.179,z:75.881},{resSeq:241,iCode:"",x:10.636,y:-36.431,z:75.995},{resSeq:242,iCode:"",x:13.769,y:-36.362,z:73.851},{resSeq:243,iCode:"",x:13.475,y:-36.272,z:70.075},{resSeq:244,iCode:"",x:15.938,y:-36.766,z:67.234},{resSeq:245,iCode:"",x:15.642,y:-34.715,z:64.057},{resSeq:246,iCode:"",x:17.706,y:-34.805,z:60.874},{resSeq:247,iCode:"",x:18.102,y:-31.698,z:58.787},{resSeq:248,iCode:"",x:19.531,y:-31.766,z:55.241},{resSeq:249,iCode:"",x:20.787,y:-28.887,z:53.075},{resSeq:250,iCode:"",x:21.255,y:-29.823,z:49.394},{resSeq:251,iCode:"",x:22.565,y:-28.403,z:46.139},{resSeq:252,iCode:"",x:21.846,y:-30.087,z:42.809},{resSeq:253,iCode:"",x:24.246,y:-28.934,z:40.101},{resSeq:254,iCode:"",x:23.749,y:-29.212,z:36.327},{resSeq:255,iCode:"",x:26.419,y:-29.672,z:33.633},{resSeq:256,iCode:"",x:26.353,y:-27.016,z:30.892},{resSeq:257,iCode:"",x:28.933,y:-27.529,z:28.161},{resSeq:258,iCode:"",x:30.064,y:-25.327,z:25.303},{resSeq:259,iCode:"",x:31.483,y:-26.697,z:22.082},{resSeq:260,iCode:"",x:32.64,y:-25.176,z:18.794},{resSeq:261,iCode:"",x:31.092,y:-26.441,z:15.577},{resSeq:262,iCode:"",x:33.476,y:-24.605,z:13.224},{resSeq:263,iCode:"",x:30.749,y:-22.139,z:12.441},{resSeq:264,iCode:"",x:29.352,y:-21.195,z:15.868},{resSeq:265,iCode:"",x:29.068,y:-22.303,z:19.489},{resSeq:266,iCode:"",x:26.733,y:-25.13,z:20.496},{resSeq:267,iCode:"",x:25.496,y:-25.276,z:24.076},{resSeq:268,iCode:"",x:24.399,y:-28.461,z:25.807},{resSeq:269,iCode:"",x:22.919,y:-29.115,z:29.253},{resSeq:270,iCode:"",x:22.743,y:-32.322,z:31.262},{resSeq:271,iCode:"",x:20.424,y:-32.318,z:34.279},{resSeq:272,iCode:"",x:21.072,y:-33.129,z:37.933},{resSeq:273,iCode:"",x:24.616,y:-34.17,z:37.232},{resSeq:274,iCode:"",x:25.953,y:-33.727,z:40.802},{resSeq:275,iCode:"",x:24.356,y:-33.548,z:44.255},{resSeq:276,iCode:"",x:25.954,y:-31.918,z:47.298},{resSeq:277,iCode:"",x:24.272,y:-33.012,z:50.505},{resSeq:278,iCode:"",x:24.981,y:-31.853,z:54.077},{resSeq:279,iCode:"",x:23.057,y:-33.886,z:56.659},{resSeq:280,iCode:"",x:23.062,y:-33.277,z:60.398},{resSeq:281,iCode:"",x:21.306,y:-34.61,z:63.508},{resSeq:282,iCode:"",x:20.041,y:-32.444,z:66.385},{resSeq:283,iCode:"",x:18.712,y:-33.491,z:69.779},{resSeq:284,iCode:"",x:15.474,y:-32.005,z:71.089},{resSeq:285,iCode:"",x:14.877,y:-32.028,z:74.835},{resSeq:286,iCode:"",x:11.28,y:-31.079,z:75.534},{resSeq:287,iCode:"",x:11.873,y:-31.233,z:79.294},{resSeq:288,iCode:"",x:14.712,y:-28.706,z:79.434},{resSeq:289,iCode:"",x:13.503,y:-26.836,z:76.312},{resSeq:290,iCode:"",x:16.85,y:-27.123,z:74.603},{resSeq:291,iCode:"",x:18.162,y:-28.184,z:71.198},{resSeq:292,iCode:"",x:21.716,y:-29.36,z:70.491},{resSeq:293,iCode:"",x:23.959,y:-31.003,z:67.903}]},{chainId:"C",residueCount:293,segments:[{start:3,end:5,type:"helix"},{start:7,end:7,type:"strand"},{start:14,end:14,type:"strand"},{start:21,end:29,type:"strand"},{start:34,end:43,type:"strand"},{start:48,end:48,type:"strand"},{start:51,end:61,type:"strand"},{start:66,end:70,type:"strand"},{start:75,end:89,type:"strand"},{start:97,end:102,type:"strand"},{start:109,end:127,type:"strand"},{start:132,end:149,type:"strand"},{start:153,end:158,type:"strand"},{start:164,end:171,type:"strand"},{start:174,end:174,type:"strand"},{start:182,end:182,type:"strand"},{start:192,end:192,type:"strand"},{start:197,end:197,type:"strand"},{start:206,end:208,type:"helix"},{start:210,end:210,type:"strand"},{start:211,end:212,type:"helix"},{start:213,end:215,type:"helix"},{start:224,end:224,type:"strand"},{start:228,end:234,type:"strand"},{start:242,end:260,type:"strand"},{start:265,end:285,type:"strand"},{start:290,end:292,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:-16.729,y:-1.8,z:59.271},{resSeq:2,iCode:"",x:-17.407,y:-.583,z:62.786},{resSeq:3,iCode:"",x:-16.017,y:2.816,z:61.835},{resSeq:4,iCode:"",x:-18.475,y:3.174,z:58.978},{resSeq:5,iCode:"",x:-21.295,y:3.015,z:61.466},{resSeq:6,iCode:"",x:-19.746,y:5.431,z:64},{resSeq:7,iCode:"",x:-18.802,y:2.647,z:66.415},{resSeq:8,iCode:"",x:-15.47,y:2.223,z:68.198},{resSeq:9,iCode:"",x:-13.433,y:-.301,z:66.23},{resSeq:10,iCode:"",x:-13.65,y:-3.698,z:67.898},{resSeq:11,iCode:"",x:-16.7,y:-2.993,z:70.042},{resSeq:12,iCode:"",x:-18.796,y:-5.788,z:68.516},{resSeq:13,iCode:"",x:-16.14,y:-8.521,z:68.284},{resSeq:14,iCode:"",x:-16.169,y:-11.684,z:70.434},{resSeq:15,iCode:"",x:-13.328,y:-12.879,z:72.671},{resSeq:16,iCode:"",x:-12.381,y:-10.161,z:75.156},{resSeq:17,iCode:"",x:-11.495,y:-11.234,z:78.75},{resSeq:18,iCode:"",x:-11.875,y:-14.937,z:77.927},{resSeq:19,iCode:"",x:-9.268,y:-17.666,z:78.561},{resSeq:20,iCode:"",x:-9.111,y:-19.491,z:75.246},{resSeq:21,iCode:"",x:-8.288,y:-23.203,z:75.015},{resSeq:22,iCode:"",x:-6.557,y:-24.224,z:71.794},{resSeq:23,iCode:"",x:-5.244,y:-27.416,z:70.325},{resSeq:24,iCode:"",x:-3.521,y:-29.334,z:67.58},{resSeq:25,iCode:"",x:-4.651,y:-32.642,z:66.057},{resSeq:26,iCode:"",x:-2.332,y:-34.067,z:63.384},{resSeq:27,iCode:"",x:-2.81,y:-37.205,z:61.341},{resSeq:28,iCode:"",x:-1.044,y:-38.539,z:58.265},{resSeq:29,iCode:"",x:-2.858,y:-40.76,z:55.746},{resSeq:30,iCode:"",x:-.246,y:-42.787,z:53.859},{resSeq:31,iCode:"",x:-2.766,y:-44.511,z:51.646},{resSeq:32,iCode:"",x:-4.176,y:-41.14,z:50.503},{resSeq:33,iCode:"",x:-1.066,y:-38.96,z:50.68},{resSeq:34,iCode:"",x:-2.596,y:-36.424,z:53.043},{resSeq:35,iCode:"",x:-1.075,y:-34.537,z:55.958},{resSeq:36,iCode:"",x:-4.108,y:-33.451,z:57.974},{resSeq:37,iCode:"",x:-3.914,y:-30.881,z:60.785},{resSeq:38,iCode:"",x:-6.922,y:-29.56,z:62.755},{resSeq:39,iCode:"",x:-6.232,y:-26.488,z:64.874},{resSeq:40,iCode:"",x:-9.111,y:-25.785,z:67.226},{resSeq:41,iCode:"",x:-10.042,y:-22.89,z:69.54},{resSeq:42,iCode:"",x:-12.768,y:-22.87,z:72.209},{resSeq:43,iCode:"",x:-14.065,y:-19.4,z:73.09},{resSeq:44,iCode:"",x:-16.493,y:-19.107,z:75.992},{resSeq:45,iCode:"",x:-17.381,y:-15.425,z:76.074},{resSeq:46,iCode:"",x:-19.843,y:-14.903,z:78.936},{resSeq:47,iCode:"",x:-21.222,y:-11.823,z:77.194},{resSeq:48,iCode:"",x:-22,y:-13.863,z:74.048},{resSeq:49,iCode:"",x:-25.128,y:-16.015,z:73.873},{resSeq:50,iCode:"",x:-23.399,y:-19.286,z:72.789},{resSeq:51,iCode:"",x:-20.116,y:-21.124,z:73.2},{resSeq:52,iCode:"",x:-17.929,y:-21.116,z:70.086},{resSeq:53,iCode:"",x:-15.406,y:-23.497,z:68.595},{resSeq:54,iCode:"",x:-13.29,y:-22.277,z:65.677},{resSeq:55,iCode:"",x:-11.854,y:-25.197,z:63.741},{resSeq:56,iCode:"",x:-9.056,y:-24.575,z:61.269},{resSeq:57,iCode:"",x:-8.408,y:-27.357,z:58.737},{resSeq:58,iCode:"",x:-4.806,y:-27.169,z:57.471},{resSeq:59,iCode:"",x:-1.98,y:-29.533,z:56.505},{resSeq:60,iCode:"",x:-1.492,y:-30.487,z:52.831},{resSeq:61,iCode:"",x:-2.944,y:-32.901,z:50.264},{resSeq:62,iCode:"",x:-.18,y:-34.073,z:47.908},{resSeq:63,iCode:"",x:-.772,y:-33.453,z:44.223},{resSeq:64,iCode:"",x:.302,y:-36.865,z:42.929},{resSeq:65,iCode:"",x:.741,y:-36.05,z:39.222},{resSeq:66,iCode:"",x:1.771,y:-39.61,z:38.132},{resSeq:67,iCode:"",x:2.318,y:-41.7,z:34.953},{resSeq:68,iCode:"",x:.31,y:-44.522,z:36.456},{resSeq:69,iCode:"",x:-.092,y:-46.438,z:33.177},{resSeq:70,iCode:"",x:2.001,y:-47.371,z:30.184},{resSeq:71,iCode:"",x:.697,y:-49.762,z:27.524},{resSeq:72,iCode:"",x:3.797,y:-49.979,z:25.342},{resSeq:73,iCode:"",x:5.834,y:-47.158,z:23.832},{resSeq:74,iCode:"",x:2.728,y:-45.758,z:22.139},{resSeq:75,iCode:"",x:.18,y:-45.263,z:24.94},{resSeq:76,iCode:"",x:.634,y:-43.913,z:28.459},{resSeq:77,iCode:"",x:-1.686,y:-42.411,z:31.045},{resSeq:78,iCode:"",x:-1.162,y:-39.675,z:33.622},{resSeq:79,iCode:"",x:-3.201,y:-39.146,z:36.834},{resSeq:80,iCode:"",x:-3.476,y:-35.517,z:37.934},{resSeq:81,iCode:"",x:-5.498,y:-33.676,z:40.637},{resSeq:82,iCode:"",x:-8.373,y:-31.703,z:39.239},{resSeq:83,iCode:"",x:-9.902,y:-30.903,z:42.629},{resSeq:84,iCode:"",x:-9.013,y:-30.552,z:46.315},{resSeq:85,iCode:"",x:-11.824,y:-30.74,z:48.867},{resSeq:86,iCode:"",x:-12.257,y:-30.255,z:52.61},{resSeq:87,iCode:"",x:-15.58,y:-30.85,z:54.332},{resSeq:88,iCode:"",x:-16.896,y:-30.761,z:57.877},{resSeq:89,iCode:"",x:-20.05,y:-32.555,z:58.855},{resSeq:90,iCode:"",x:-22.098,y:-32.649,z:62.033},{resSeq:91,iCode:"",x:-24.572,y:-35.552,z:62.326},{resSeq:92,iCode:"",x:-28.134,y:-34.255,z:62.02},{resSeq:93,iCode:"",x:-29.097,y:-35.214,z:65.592},{resSeq:94,iCode:"",x:-26.42,y:-32.789,z:66.879},{resSeq:95,iCode:"",x:-27.615,y:-29.617,z:68.605},{resSeq:96,iCode:"",x:-24.431,y:-27.67,z:67.729},{resSeq:97,iCode:"",x:-24.506,y:-25.607,z:64.498},{resSeq:98,iCode:"",x:-22.157,y:-24.265,z:61.844},{resSeq:99,iCode:"",x:-22.311,y:-20.536,z:62.237},{resSeq:100,iCode:"",x:-19.616,y:-18.968,z:60.139},{resSeq:101,iCode:"",x:-16.8,y:-19.957,z:57.771},{resSeq:102,iCode:"",x:-13.983,y:-18.359,z:55.907},{resSeq:103,iCode:"",x:-13.059,y:-17.879,z:53.038},{resSeq:104,iCode:"",x:-16.299,y:-17.337,z:51.126},{resSeq:105,iCode:"",x:-17.097,y:-16.827,z:47.44},{resSeq:106,iCode:"",x:-16.05,y:-13.519,z:45.882},{resSeq:107,iCode:"",x:-17.647,y:-11.6,z:43.05},{resSeq:108,iCode:"",x:-15.29,y:-11.533,z:40.087},{resSeq:109,iCode:"",x:-14.433,y:-8.531,z:38.064},{resSeq:110,iCode:"",x:-13.462,y:-7.664,z:34.522},{resSeq:111,iCode:"",x:-12.02,y:-4.642,z:32.812},{resSeq:112,iCode:"",x:-13.839,y:-3.161,z:29.872},{resSeq:113,iCode:"",x:-12.373,y:-.796,z:27.27},{resSeq:114,iCode:"",x:-13.788,y:.892,z:24.136},{resSeq:115,iCode:"",x:-11.981,y:2.835,z:21.389},{resSeq:116,iCode:"",x:-13.202,y:5.009,z:18.528},{resSeq:117,iCode:"",x:-10.547,y:6.19,z:16.124},{resSeq:118,iCode:"",x:-10.881,y:8.062,z:12.876},{resSeq:119,iCode:"",x:-8.349,y:9.717,z:10.664},{resSeq:120,iCode:"",x:-7.724,y:11.373,z:7.333},{resSeq:121,iCode:"",x:-4.771,y:11.451,z:4.922},{resSeq:122,iCode:"",x:-3.638,y:13.17,z:1.754},{resSeq:123,iCode:"",x:-1.025,y:11.915,z:-.695},{resSeq:124,iCode:"",x:.602,y:13.669,z:-3.65},{resSeq:125,iCode:"",x:2.419,y:11.698,z:-6.325},{resSeq:126,iCode:"",x:4.278,y:12.422,z:-9.546},{resSeq:127,iCode:"",x:7.246,y:11.195,z:-11.557},{resSeq:128,iCode:"",x:9.943,y:12.07,z:-14.09},{resSeq:129,iCode:"",x:7.426,y:11.893,z:-16.947},{resSeq:130,iCode:"",x:5.875,y:15.038,z:-15.394},{resSeq:131,iCode:"",x:2.878,y:13.079,z:-14.124},{resSeq:132,iCode:"",x:.861,y:14.144,z:-11.058},{resSeq:133,iCode:"",x:-1.46,y:12.125,z:-8.838},{resSeq:134,iCode:"",x:-3.321,y:12.328,z:-5.553},{resSeq:135,iCode:"",x:-5.154,y:10.47,z:-2.774},{resSeq:136,iCode:"",x:-7.691,y:11.553,z:-.144},{resSeq:137,iCode:"",x:-8.533,y:8.816,z:2.32},{resSeq:138,iCode:"",x:-10.649,y:8.608,z:5.45},{resSeq:139,iCode:"",x:-11.288,y:5.966,z:8.093},{resSeq:140,iCode:"",x:-13.03,y:4.937,z:11.281},{resSeq:141,iCode:"",x:-12.498,y:2.046,z:13.721},{resSeq:142,iCode:"",x:-14.124,y:.555,z:16.797},{resSeq:143,iCode:"",x:-12.167,y:-1.616,z:19.192},{resSeq:144,iCode:"",x:-13.433,y:-3.51,z:22.214},{resSeq:145,iCode:"",x:-11.019,y:-4.853,z:24.824},{resSeq:146,iCode:"",x:-11.909,y:-7.14,z:27.723},{resSeq:147,iCode:"",x:-9.438,y:-7.861,z:30.53},{resSeq:148,iCode:"",x:-9.583,y:-10.229,z:33.469},{resSeq:149,iCode:"",x:-7.492,y:-12.528,z:35.691},{resSeq:150,iCode:"",x:-7.473,y:-16.313,z:35.584},{resSeq:151,iCode:"",x:-6.145,y:-18.172,z:38.634},{resSeq:152,iCode:"",x:-4.774,y:-21.678,z:38.003},{resSeq:153,iCode:"",x:-7.103,y:-23.102,z:40.627},{resSeq:154,iCode:"",x:-10.297,y:-21.567,z:41.978},{resSeq:155,iCode:"",x:-11.235,y:-21.746,z:45.669},{resSeq:156,iCode:"",x:-14.961,y:-22.174,z:46.116},{resSeq:157,iCode:"",x:-17.043,y:-22.274,z:49.245},{resSeq:158,iCode:"",x:-19.706,y:-24.879,z:48.726},{resSeq:159,iCode:"",x:-23.227,y:-24.108,z:49.901},{resSeq:160,iCode:"",x:-23.318,y:-24.645,z:53.683},{resSeq:161,iCode:"",x:-26.149,y:-25.764,z:55.871},{resSeq:162,iCode:"",x:-26.18,y:-25.693,z:59.68},{resSeq:163,iCode:"",x:-24.693,y:-29.215,z:59.765},{resSeq:164,iCode:"",x:-22.396,y:-29.119,z:56.745},{resSeq:165,iCode:"",x:-19.79,y:-26.882,z:55.09},{resSeq:166,iCode:"",x:-17.078,y:-27.56,z:52.528},{resSeq:167,iCode:"",x:-14.551,y:-26.028,z:50.177},{resSeq:168,iCode:"",x:-13.271,y:-27.215,z:46.832},{resSeq:169,iCode:"",x:-10.185,y:-25.937,z:45.056},{resSeq:170,iCode:"",x:-10.753,y:-26.774,z:41.388},{resSeq:171,iCode:"",x:-8.43,y:-26.742,z:38.353},{resSeq:172,iCode:"",x:-9.161,y:-23.707,z:36.19},{resSeq:173,iCode:"",x:-6.588,y:-23.626,z:33.382},{resSeq:174,iCode:"",x:-2.861,y:-23.672,z:32.768},{resSeq:175,iCode:"",x:-.146,y:-22.43,z:30.421},{resSeq:176,iCode:"",x:1.78,y:-25.307,z:28.801},{resSeq:177,iCode:"",x:5.203,y:-23.922,z:27.828},{resSeq:178,iCode:"",x:3.922,y:-20.382,z:27.193},{resSeq:179,iCode:"",x:1.098,y:-21.44,z:24.818},{resSeq:180,iCode:"",x:-2.515,y:-22.136,z:25.833},{resSeq:181,iCode:"",x:-3.906,y:-21.834,z:28.379},{resSeq:182,iCode:"",x:-5.435,y:-25.299,z:28.183},{resSeq:183,iCode:"",x:-8.171,y:-26.751,z:30.395},{resSeq:184,iCode:"",x:-10.07,y:-30.059,z:30.838},{resSeq:185,iCode:"",x:-12.199,y:-29.368,z:27.787},{resSeq:186,iCode:"",x:-9.414,y:-28.135,z:25.501},{resSeq:187,iCode:"",x:-9.591,y:-29.766,z:22.116},{resSeq:188,iCode:"",x:-7.671,y:-29.663,z:18.879},{resSeq:189,iCode:"",x:-8.892,y:-32.091,z:16.165},{resSeq:190,iCode:"",x:-5.245,y:-32.964,z:15.485},{resSeq:191,iCode:"",x:-3.518,y:-32.948,z:18.876},{resSeq:192,iCode:"",x:-6.571,y:-33.523,z:21.068},{resSeq:193,iCode:"",x:-6.265,y:-31.998,z:24.549},{resSeq:194,iCode:"",x:-2.752,y:-30.579,z:24.997},{resSeq:195,iCode:"",x:-2.738,y:-29.823,z:28.757},{resSeq:196,iCode:"",x:.295,y:-31.965,z:29.718},{resSeq:197,iCode:"",x:1.808,y:-32.862,z:26.332},{resSeq:198,iCode:"",x:5.571,y:-32.23,z:26.206},{resSeq:199,iCode:"",x:6.088,y:-32.37,z:22.394},{resSeq:200,iCode:"",x:3.585,y:-32.669,z:19.544},{resSeq:201,iCode:"",x:5.937,y:-34.969,z:17.6},{resSeq:202,iCode:"",x:8.678,y:-37.015,z:19.236},{resSeq:203,iCode:"",x:10.667,y:-40.208,z:18.7},{resSeq:204,iCode:"",x:10.409,y:-40.848,z:22.47},{resSeq:205,iCode:"",x:7.954,y:-43.284,z:24.013},{resSeq:206,iCode:"",x:4.686,y:-42.132,z:25.6},{resSeq:207,iCode:"",x:5.758,y:-42.147,z:29.273},{resSeq:208,iCode:"",x:8.432,y:-39.598,z:28.295},{resSeq:209,iCode:"",x:6.174,y:-37.037,z:26.61},{resSeq:210,iCode:"",x:4.319,y:-35.676,z:29.656},{resSeq:211,iCode:"",x:4.962,y:-32.177,z:31.01},{resSeq:212,iCode:"",x:7.728,y:-31.671,z:33.588},{resSeq:213,iCode:"",x:5.913,y:-31.169,z:36.93},{resSeq:214,iCode:"",x:8.486,y:-28.464,z:37.69},{resSeq:215,iCode:"",x:6.976,y:-26.635,z:34.715},{resSeq:216,iCode:"",x:3.297,y:-27.088,z:35.687},{resSeq:217,iCode:"",x:1.393,y:-25.543,z:38.629},{resSeq:218,iCode:"",x:2.92,y:-26.638,z:41.969},{resSeq:219,iCode:"",x:-.425,y:-27.897,z:43.239},{resSeq:220,iCode:"",x:-.443,y:-30.675,z:40.642},{resSeq:221,iCode:"",x:2.544,y:-32.491,z:42.172},{resSeq:222,iCode:"",x:3.703,y:-31.161,z:45.558},{resSeq:223,iCode:"",x:.226,y:-30.344,z:46.773},{resSeq:224,iCode:"",x:-2.245,y:-27.839,z:48.125},{resSeq:225,iCode:"",x:-2.299,y:-26.658,z:51.744},{resSeq:226,iCode:"",x:-5.776,y:-25.887,z:53.082},{resSeq:227,iCode:"",x:-6.334,y:-23.007,z:55.519},{resSeq:228,iCode:"",x:-10.07,y:-22.769,z:55.995},{resSeq:229,iCode:"",x:-12.054,y:-21.727,z:59.099},{resSeq:230,iCode:"",x:-15.429,y:-22.965,z:60.37},{resSeq:231,iCode:"",x:-17.257,y:-21.503,z:63.39},{resSeq:232,iCode:"",x:-19.457,y:-23.897,z:65.374},{resSeq:233,iCode:"",x:-21.862,y:-22.613,z:68.05},{resSeq:234,iCode:"",x:-23.346,y:-24.522,z:70.978},{resSeq:235,iCode:"",x:-26.144,y:-23.598,z:73.336},{resSeq:236,iCode:"",x:-25.057,y:-23.54,z:77.001},{resSeq:237,iCode:"",x:-28.347,y:-25.065,z:78.149},{resSeq:238,iCode:"",x:-28.073,y:-28.075,z:75.836},{resSeq:239,iCode:"",x:-28.323,y:-31.517,z:77.517},{resSeq:240,iCode:"",x:-25.582,y:-33.171,z:75.461},{resSeq:241,iCode:"",x:-22.336,y:-31.181,z:75.642},{resSeq:242,iCode:"",x:-20.356,y:-33.698,z:73.536},{resSeq:243,iCode:"",x:-20.476,y:-33.365,z:69.731},{resSeq:244,iCode:"",x:-19.217,y:-35.641,z:66.954},{resSeq:245,iCode:"",x:-17.894,y:-34.149,z:63.731},{resSeq:246,iCode:"",x:-16.355,y:-35.784,z:60.665},{resSeq:247,iCode:"",x:-13.694,y:-33.934,z:58.718},{resSeq:248,iCode:"",x:-13.005,y:-35.208,z:55.196},{resSeq:249,iCode:"",x:-10.01,y:-34.397,z:53.017},{resSeq:250,iCode:"",x:-10.435,y:-35.471,z:49.376},{resSeq:251,iCode:"",x:-8.535,y:-35.535,z:46.069},{resSeq:252,iCode:"",x:-10.225,y:-35.86,z:42.695},{resSeq:253,iCode:"",x:-8.019,y:-37.074,z:39.917},{resSeq:254,iCode:"",x:-8.461,y:-37.012,z:36.172},{resSeq:255,iCode:"",x:-6.976,y:-39.382,z:33.597},{resSeq:256,iCode:"",x:-4.819,y:-37.717,z:30.887},{resSeq:257,iCode:"",x:-3.836,y:-40.174,z:28.151},{resSeq:258,iCode:"",x:-1.26,y:-39.684,z:25.438},{resSeq:259,iCode:"",x:-.933,y:-41.737,z:22.285},{resSeq:260,iCode:"",x:.885,y:-41.75,z:18.982},{resSeq:261,iCode:"",x:-1.199,y:-41.426,z:15.814},{resSeq:262,iCode:"",x:1.978,y:-42.341,z:13.935},{resSeq:263,iCode:"",x:2.362,y:-38.767,z:12.7},{resSeq:264,iCode:"",x:1.816,y:-36.804,z:15.926},{resSeq:265,iCode:"",x:.805,y:-37.094,z:19.586},{resSeq:266,iCode:"",x:-2.848,y:-37.039,z:20.598},{resSeq:267,iCode:"",x:-4.01,y:-36.369,z:24.144},{resSeq:268,iCode:"",x:-7.298,y:-37.106,z:25.884},{resSeq:269,iCode:"",x:-8.587,y:-36.289,z:29.397},{resSeq:270,iCode:"",x:-11.276,y:-38.215,z:31.306},{resSeq:271,iCode:"",x:-12.75,y:-36.109,z:34.127},{resSeq:272,iCode:"",x:-13.153,y:-37.256,z:37.723},{resSeq:273,iCode:"",x:-11.71,y:-40.679,z:37.073},{resSeq:274,iCode:"",x:-10.738,y:-41.358,z:40.694},{resSeq:275,iCode:"",x:-11.529,y:-39.999,z:44.155},{resSeq:276,iCode:"",x:-9.234,y:-40.376,z:47.18},{resSeq:277,iCode:"",x:-11.298,y:-39.687,z:50.28},{resSeq:278,iCode:"",x:-9.695,y:-39.393,z:53.729},{resSeq:279,iCode:"",x:-12.4,y:-39.262,z:56.379},{resSeq:280,iCode:"",x:-12.096,y:-38.992,z:60.152},{resSeq:281,iCode:"",x:-14.14,y:-38.429,z:63.329},{resSeq:282,iCode:"",x:-13.452,y:-36.124,z:66.249},{resSeq:283,iCode:"",x:-15.258,y:-35.658,z:69.504},{resSeq:284,iCode:"",x:-15.894,y:-32.211,z:70.895},{resSeq:285,iCode:"",x:-16.233,y:-31.857,z:74.668},{resSeq:286,iCode:"",x:-17.949,y:-28.536,z:75.374},{resSeq:287,iCode:"",x:-17.564,y:-28.877,z:79.187},{resSeq:288,iCode:"",x:-13.843,y:-29.766,z:79.286},{resSeq:289,iCode:"",x:-13.178,y:-27.725,z:76.136},{resSeq:290,iCode:"",x:-11.061,y:-30.161,z:74.143},{resSeq:291,iCode:"",x:-11.27,y:-31.964,z:70.812},{resSeq:292,iCode:"",x:-10.032,y:-35.532,z:70.348},{resSeq:293,iCode:"",x:-10.007,y:-38.358,z:67.776}]},{chainId:"F",residueCount:293,segments:[{start:2,end:5,type:"helix"},{start:7,end:7,type:"strand"},{start:14,end:14,type:"strand"},{start:21,end:29,type:"strand"},{start:34,end:43,type:"strand"},{start:48,end:48,type:"strand"},{start:51,end:61,type:"strand"},{start:66,end:70,type:"strand"},{start:75,end:89,type:"strand"},{start:97,end:102,type:"strand"},{start:109,end:127,type:"strand"},{start:132,end:151,type:"strand"},{start:153,end:158,type:"strand"},{start:164,end:171,type:"strand"},{start:174,end:176,type:"strand"},{start:179,end:182,type:"strand"},{start:188,end:188,type:"strand"},{start:192,end:192,type:"strand"},{start:197,end:197,type:"strand"},{start:206,end:208,type:"helix"},{start:210,end:210,type:"strand"},{start:211,end:212,type:"helix"},{start:213,end:215,type:"helix"},{start:218,end:221,type:"helix"},{start:224,end:224,type:"strand"},{start:228,end:234,type:"strand"},{start:242,end:260,type:"strand"},{start:265,end:285,type:"strand"},{start:290,end:292,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:13.544,y:9.577,z:59.522},{resSeq:2,iCode:"",x:14.662,y:8.676,z:63.028},{resSeq:3,iCode:"",x:14.811,y:4.975,z:62.219},{resSeq:4,iCode:"",x:17.247,y:5.703,z:59.378},{resSeq:5,iCode:"",x:19.716,y:7.095,z:61.881},{resSeq:6,iCode:"",x:19.086,y:4.283,z:64.39},{resSeq:7,iCode:"",x:17.069,y:6.415,z:66.787},{resSeq:8,iCode:"",x:13.809,y:5.298,z:68.376},{resSeq:9,iCode:"",x:10.946,y:6.791,z:66.388},{resSeq:10,iCode:"",x:9.613,y:10.037,z:67.781},{resSeq:11,iCode:"",x:12.526,y:10.495,z:70.162},{resSeq:12,iCode:"",x:13.36,y:13.946,z:68.761},{resSeq:13,iCode:"",x:9.817,y:15.273,z:68.57},{resSeq:14,iCode:"",x:8.334,y:18.135,z:70.552},{resSeq:15,iCode:"",x:5.102,y:17.886,z:72.522},{resSeq:16,iCode:"",x:6.004,y:15.305,z:75.133},{resSeq:17,iCode:"",x:4.579,y:15.921,z:78.639},{resSeq:18,iCode:"",x:2.933,y:19.211,z:77.691},{resSeq:19,iCode:"",x:-.5,y:20.649,z:78.246},{resSeq:20,iCode:"",x:-1.442,y:22.209,z:74.932},{resSeq:21,iCode:"",x:-3.802,y:25.179,z:74.762},{resSeq:22,iCode:"",x:-5.858,y:25.304,z:71.564},{resSeq:23,iCode:"",x:-8.446,y:27.555,z:69.987},{resSeq:24,iCode:"",x:-10.612,y:28.585,z:67.041},{resSeq:25,iCode:"",x:-11.154,y:32.171,z:65.794},{resSeq:26,iCode:"",x:-13.734,y:32.294,z:62.966},{resSeq:27,iCode:"",x:-14.396,y:35.324,z:60.767},{resSeq:28,iCode:"",x:-16.579,y:35.723,z:57.686},{resSeq:29,iCode:"",x:-15.73,y:38.533,z:55.268},{resSeq:30,iCode:"",x:-19.03,y:39.094,z:53.481},{resSeq:31,iCode:"",x:-17.738,y:41.484,z:50.797},{resSeq:32,iCode:"",x:-14.823,y:39.298,z:49.723},{resSeq:33,iCode:"",x:-16.897,y:36.198,z:50.414},{resSeq:34,iCode:"",x:-14.248,y:34.438,z:52.472},{resSeq:35,iCode:"",x:-14.757,y:32.074,z:55.388},{resSeq:36,iCode:"",x:-11.636,y:32.392,z:57.508},{resSeq:37,iCode:"",x:-10.745,y:30.058,z:60.387},{resSeq:38,iCode:"",x:-7.505,y:30.202,z:62.397},{resSeq:39,iCode:"",x:-6.744,y:27.13,z:64.547},{resSeq:40,iCode:"",x:-3.877,y:27.717,z:67.017},{resSeq:41,iCode:"",x:-1.952,y:25.534,z:69.406},{resSeq:42,iCode:"",x:.427,y:26.759,z:72.127},{resSeq:43,iCode:"",x:3.105,y:24.233,z:72.976},{resSeq:44,iCode:"",x:5.336,y:24.995,z:75.962},{resSeq:45,iCode:"",x:7.639,y:21.984,z:76.011},{resSeq:46,iCode:"",x:9.984,y:22.588,z:78.908},{resSeq:47,iCode:"",x:12.742,y:20.572,z:77.246},{resSeq:48,iCode:"",x:12.619,y:22.755,z:74.134},{resSeq:49,iCode:"",x:14.485,y:26.077,z:74.003},{resSeq:50,iCode:"",x:11.484,y:28.183,z:72.929},{resSeq:51,iCode:"",x:7.746,y:28.349,z:73.275},{resSeq:52,iCode:"",x:5.765,y:27.318,z:70.204},{resSeq:53,iCode:"",x:2.681,y:28.593,z:68.405},{resSeq:54,iCode:"",x:1.27,y:26.476,z:65.551},{resSeq:55,iCode:"",x:-1.23,y:28.51,z:63.487},{resSeq:56,iCode:"",x:-3.346,y:26.56,z:60.997},{resSeq:57,iCode:"",x:-5.1,y:28.7,z:58.415},{resSeq:58,iCode:"",x:-8.268,y:26.968,z:57.17},{resSeq:59,iCode:"",x:-11.684,y:28.016,z:55.924},{resSeq:60,iCode:"",x:-12.753,y:28.629,z:52.336},{resSeq:61,iCode:"",x:-12.212,y:31.325,z:49.742},{resSeq:62,iCode:"",x:-15.272,y:31.434,z:47.447},{resSeq:63,iCode:"",x:-14.44,y:30.934,z:43.784},{resSeq:64,iCode:"",x:-16.88,y:33.5,z:42.384},{resSeq:65,iCode:"",x:-16.71,y:32.439,z:38.738},{resSeq:66,iCode:"",x:-19.404,y:34.635,z:37.155},{resSeq:67,iCode:"",x:-20.494,y:36.548,z:34.04},{resSeq:68,iCode:"",x:-19.893,y:40.101,z:35.271},{resSeq:69,iCode:"",x:-20.89,y:41.775,z:32.01},{resSeq:70,iCode:"",x:-23.225,y:41.078,z:29.087},{resSeq:71,iCode:"",x:-22.13,y:43.729,z:26.566},{resSeq:72,iCode:"",x:-24.899,y:43.031,z:24.054},{resSeq:73,iCode:"",x:-25.252,y:39.478,z:22.755},{resSeq:74,iCode:"",x:-21.864,y:39.065,z:21.095},{resSeq:75,iCode:"",x:-19.776,y:40.619,z:23.845},{resSeq:76,iCode:"",x:-19.521,y:39.36,z:27.437},{resSeq:77,iCode:"",x:-16.986,y:39.077,z:30.242},{resSeq:78,iCode:"",x:-16.357,y:36.382,z:32.846},{resSeq:79,iCode:"",x:-14.523,y:36.896,z:36.154},{resSeq:80,iCode:"",x:-12.863,y:33.68,z:37.296},{resSeq:81,iCode:"",x:-10.263,y:33.089,z:40.043},{resSeq:82,iCode:"",x:-6.738,y:32.563,z:38.737},{resSeq:83,iCode:"",x:-5.056,y:32.421,z:42.177},{resSeq:84,iCode:"",x:-5.98,y:31.935,z:45.834},{resSeq:85,iCode:"",x:-3.608,y:33.234,z:48.538},{resSeq:86,iCode:"",x:-2.856,y:32.985,z:52.278},{resSeq:87,iCode:"",x:-.2,y:35.076,z:54.034},{resSeq:88,iCode:"",x:1.011,y:35.522,z:57.583},{resSeq:89,iCode:"",x:2.978,y:38.581,z:58.633},{resSeq:90,iCode:"",x:4.758,y:39.443,z:61.862},{resSeq:91,iCode:"",x:5.423,y:43.207,z:62.163},{resSeq:92,iCode:"",x:9.095,y:44.09,z:61.868},{resSeq:93,iCode:"",x:9.587,y:45.009,z:65.547},{resSeq:94,iCode:"",x:8.448,y:41.558,z:66.721},{resSeq:95,iCode:"",x:11.105,y:39.285,z:68.266},{resSeq:96,iCode:"",x:9.009,y:36.186,z:67.651},{resSeq:97,iCode:"",x:10.018,y:34.324,z:64.498},{resSeq:98,iCode:"",x:8.611,y:32.121,z:61.806},{resSeq:99,iCode:"",x:10.352,y:28.796,z:62.274},{resSeq:100,iCode:"",x:8.56,y:26.265,z:60.067},{resSeq:101,iCode:"",x:5.614,y:25.901,z:57.684},{resSeq:102,iCode:"",x:3.793,y:23.2,z:55.793},{resSeq:103,iCode:"",x:3.324,y:22.246,z:52.904},{resSeq:104,iCode:"",x:6.486,y:23.232,z:51.032},{resSeq:105,iCode:"",x:7.458,y:22.992,z:47.387},{resSeq:106,iCode:"",x:8.124,y:19.589,z:45.886},{resSeq:107,iCode:"",x:10.373,y:18.451,z:43.066},{resSeq:108,iCode:"",x:8.308,y:17.33,z:40.072},{resSeq:109,iCode:"",x:9.134,y:14.321,z:37.94},{resSeq:110,iCode:"",x:8.201,y:12.935,z:34.58},{resSeq:111,iCode:"",x:8.452,y:9.522,z:32.922},{resSeq:112,iCode:"",x:10.589,y:9.036,z:29.862},{resSeq:113,iCode:"",x:10.776,y:6.169,z:27.398},{resSeq:114,iCode:"",x:12.92,y:5.515,z:24.325},{resSeq:115,iCode:"",x:11.753,y:2.865,z:21.854},{resSeq:116,iCode:"",x:13.894,y:1.282,z:19.09},{resSeq:117,iCode:"",x:12.138,y:-.983,z:16.652},{resSeq:118,iCode:"",x:13.056,y:-2.453,z:13.288},{resSeq:119,iCode:"",x:11.769,y:-5.188,z:11.022},{resSeq:120,iCode:"",x:12.087,y:-7.085,z:7.744},{resSeq:121,iCode:"",x:9.533,y:-8.468,z:5.273},{resSeq:122,iCode:"",x:9.27,y:-10.328,z:2.006},{resSeq:123,iCode:"",x:6.364,y:-10.636,z:-.404},{resSeq:124,iCode:"",x:5.925,y:-12.987,z:-3.358},{resSeq:125,iCode:"",x:3.494,y:-11.978,z:-6.059},{resSeq:126,iCode:"",x:1.942,y:-13.742,z:-9.059},{resSeq:127,iCode:"",x:-1.16,y:-13.993,z:-11.258},{resSeq:128,iCode:"",x:-3.082,y:-16.009,z:-13.822},{resSeq:129,iCode:"",x:-.862,y:-14.762,z:-16.682},{resSeq:130,iCode:"",x:1.928,y:-16.7,z:-14.935},{resSeq:131,iCode:"",x:3.656,y:-13.459,z:-13.957},{resSeq:132,iCode:"",x:5.823,y:-13.383,z:-10.812},{resSeq:133,iCode:"",x:6.815,y:-10.587,z:-8.468},{resSeq:134,iCode:"",x:8.962,y:-9.902,z:-5.431},{resSeq:135,iCode:"",x:9.377,y:-7.478,z:-2.542},{resSeq:136,iCode:"",x:11.941,y:-7.203,z:.231},{resSeq:137,iCode:"",x:11.549,y:-4.301,z:2.619},{resSeq:138,iCode:"",x:13.247,y:-3.278,z:5.836},{resSeq:139,iCode:"",x:12.467,y:-.552,z:8.39},{resSeq:140,iCode:"",x:13.593,y:1.219,z:11.557},{resSeq:141,iCode:"",x:11.855,y:3.641,z:13.892},{resSeq:142,iCode:"",x:12.982,y:5.704,z:16.871},{resSeq:143,iCode:"",x:10.246,y:6.915,z:19.164},{resSeq:144,iCode:"",x:10.392,y:9.033,z:22.302},{resSeq:145,iCode:"",x:7.467,y:9.427,z:24.662},{resSeq:146,iCode:"",x:7.273,y:11.794,z:27.634},{resSeq:147,iCode:"",x:4.614,y:11.554,z:30.345},{resSeq:148,iCode:"",x:3.679,y:13.694,z:33.288},{resSeq:149,iCode:"",x:.826,y:14.625,z:35.621},{resSeq:150,iCode:"",x:-.548,y:18.124,z:35.719},{resSeq:151,iCode:"",x:-2.952,y:19.375,z:38.426},{resSeq:152,iCode:"",x:-5.616,y:21.965,z:37.661},{resSeq:153,iCode:"",x:-4.012,y:24.28,z:40.244},{resSeq:154,iCode:"",x:-.537,y:24.212,z:41.814},{resSeq:155,iCode:"",x:-.113,y:24.98,z:45.52},{resSeq:156,iCode:"",x:3.123,y:26.848,z:46.12},{resSeq:157,iCode:"",x:4.996,y:28.003,z:49.226},{resSeq:158,iCode:"",x:6.184,y:31.556,z:48.539},{resSeq:159,iCode:"",x:9.731,y:32.426,z:49.638},{resSeq:160,iCode:"",x:9.497,y:32.962,z:53.384},{resSeq:161,iCode:"",x:11.521,y:35.127,z:55.732},{resSeq:162,iCode:"",x:11.53,y:34.924,z:59.539},{resSeq:163,iCode:"",x:8.731,y:37.512,z:59.664},{resSeq:164,iCode:"",x:6.367,y:36.382,z:56.888},{resSeq:165,iCode:"",x:5.252,y:33.326,z:54.986},{resSeq:166,iCode:"",x:2.636,y:32.605,z:52.377},{resSeq:167,iCode:"",x:1.175,y:30.183,z:49.913},{resSeq:168,iCode:"",x:-.435,y:30.696,z:46.541},{resSeq:169,iCode:"",x:-2.686,y:28.182,z:44.819},{resSeq:170,iCode:"",x:-2.477,y:29.126,z:41.138},{resSeq:171,iCode:"",x:-4.477,y:27.994,z:38.14},{resSeq:172,iCode:"",x:-2.361,y:25.643,z:36.013},{resSeq:173,iCode:"",x:-4.362,y:24.294,z:33.035},{resSeq:174,iCode:"",x:-7.657,y:22.626,z:32.37},{resSeq:175,iCode:"",x:-9.539,y:20.261,z:30.066},{resSeq:176,iCode:"",x:-12.535,y:21.909,z:28.38},{resSeq:177,iCode:"",x:-15.139,y:19.322,z:27.342},{resSeq:178,iCode:"",x:-12.676,y:16.492,z:26.665},{resSeq:179,iCode:"",x:-10.17,y:18.648,z:24.756},{resSeq:180,iCode:"",x:-7.248,y:20.877,z:25.672},{resSeq:181,iCode:"",x:-5.984,y:21.488,z:28.265},{resSeq:182,iCode:"",x:-6.103,y:25.269,z:28.026},{resSeq:183,iCode:"",x:-4.352,y:27.78,z:30.295},{resSeq:184,iCode:"",x:-4.168,y:31.527,z:30.794},{resSeq:185,iCode:"",x:-2.032,y:31.738,z:27.629},{resSeq:186,iCode:"",x:-3.781,y:29.378,z:25.227},{resSeq:187,iCode:"",x:-4.004,y:30.933,z:21.802},{resSeq:188,iCode:"",x:-5.692,y:29.645,z:18.655},{resSeq:189,iCode:"",x:-5.791,y:32.243,z:15.784},{resSeq:190,iCode:"",x:-9.259,y:31.162,z:14.733},{resSeq:191,iCode:"",x:-10.853,y:31.222,z:18.24},{resSeq:192,iCode:"",x:-8.373,y:33.005,z:20.547},{resSeq:193,iCode:"",x:-8.138,y:31.568,z:24.085},{resSeq:194,iCode:"",x:-10.683,y:28.748,z:24.348},{resSeq:195,iCode:"",x:-10.533,y:28.164,z:28.158},{resSeq:196,iCode:"",x:-14.205,y:28.795,z:29.081},{resSeq:197,iCode:"",x:-15.746,y:28.715,z:25.598},{resSeq:198,iCode:"",x:-18.831,y:26.511,z:25.564},{resSeq:199,iCode:"",x:-19.36,y:26.525,z:21.768},{resSeq:200,iCode:"",x:-16.967,y:27.565,z:18.996},{resSeq:201,iCode:"",x:-19.684,y:29.126,z:16.885},{resSeq:202,iCode:"",x:-23.148,y:28.825,z:18.369},{resSeq:203,iCode:"",x:-26.056,y:31.228,z:18.117},{resSeq:204,iCode:"",x:-26.705,y:32.524,z:21.623},{resSeq:205,iCode:"",x:-25.959,y:35.493,z:23.843},{resSeq:206,iCode:"",x:-22.253,y:35.596,z:24.619},{resSeq:207,iCode:"",x:-23.201,y:35.104,z:28.301},{resSeq:208,iCode:"",x:-24.726,y:31.764,z:27.396},{resSeq:209,iCode:"",x:-21.483,y:30.606,z:25.803},{resSeq:210,iCode:"",x:-19.305,y:30.157,z:28.897},{resSeq:211,iCode:"",x:-18.412,y:26.725,z:30.236},{resSeq:212,iCode:"",x:-20.918,y:25.386,z:32.771},{resSeq:213,iCode:"",x:-19.125,y:25.761,z:36.136},{resSeq:214,iCode:"",x:-20.503,y:22.285,z:36.87},{resSeq:215,iCode:"",x:-18.168,y:21.15,z:34.102},{resSeq:216,iCode:"",x:-15.167,y:23.173,z:35.183},{resSeq:217,iCode:"",x:-12.867,y:22.902,z:38.228},{resSeq:218,iCode:"",x:-14.913,y:23.162,z:41.448},{resSeq:219,iCode:"",x:-12.296,y:25.524,z:42.847},{resSeq:220,iCode:"",x:-13.317,y:28.093,z:40.204},{resSeq:221,iCode:"",x:-16.876,y:28.373,z:41.508},{resSeq:222,iCode:"",x:-17.406,y:26.915,z:45.008},{resSeq:223,iCode:"",x:-13.924,y:27.775,z:46.214},{resSeq:224,iCode:"",x:-10.693,y:26.591,z:47.763},{resSeq:225,iCode:"",x:-10.249,y:25.534,z:51.397},{resSeq:226,iCode:"",x:-6.761,y:26.338,z:52.732},{resSeq:227,iCode:"",x:-4.997,y:24.04,z:55.194},{resSeq:228,iCode:"",x:-1.582,y:25.509,z:55.773},{resSeq:229,iCode:"",x:.514,y:25.261,z:58.96},{resSeq:230,iCode:"",x:2.916,y:27.923,z:60.3},{resSeq:231,iCode:"",x:5.049,y:27.349,z:63.395},{resSeq:232,iCode:"",x:6.081,y:30.477,z:65.271},{resSeq:233,iCode:"",x:8.729,y:30.42,z:67.976},{resSeq:234,iCode:"",x:9.386,y:32.835,z:70.863},{resSeq:235,iCode:"",x:12.163,y:33.21,z:73.426},{resSeq:236,iCode:"",x:11.012,y:32.64,z:76.966},{resSeq:237,iCode:"",x:12.998,y:35.673,z:78.067},{resSeq:238,iCode:"",x:11.755,y:38.088,z:75.413},{resSeq:239,iCode:"",x:10.959,y:41.507,z:76.918},{resSeq:240,iCode:"",x:7.328,y:41.722,z:75.831},{resSeq:241,iCode:"",x:5.444,y:38.428,z:75.589},{resSeq:242,iCode:"",x:2.659,y:39.73,z:73.33},{resSeq:243,iCode:"",x:2.712,y:39.504,z:69.532},{resSeq:244,iCode:"",x:.733,y:40.959,z:66.647},{resSeq:245,iCode:"",x:.282,y:39.028,z:63.469},{resSeq:246,iCode:"",x:-1.548,y:39.845,z:60.264},{resSeq:247,iCode:"",x:-3.222,y:37.166,z:58.205},{resSeq:248,iCode:"",x:-4.377,y:37.865,z:54.66},{resSeq:249,iCode:"",x:-6.576,y:35.791,z:52.375},{resSeq:250,iCode:"",x:-6.601,y:36.775,z:48.71},{resSeq:251,iCode:"",x:-8.286,y:35.95,z:45.462},{resSeq:252,iCode:"",x:-6.825,y:37.27,z:42.206},{resSeq:253,iCode:"",x:-9.42,y:37.341,z:39.417},{resSeq:254,iCode:"",x:-8.808,y:37.287,z:35.64},{resSeq:255,iCode:"",x:-11.051,y:38.532,z:32.844},{resSeq:256,iCode:"",x:-12.258,y:36.045,z:30.206},{resSeq:257,iCode:"",x:-13.966,y:37.777,z:27.277},{resSeq:258,iCode:"",x:-15.998,y:36.331,z:24.395},{resSeq:259,iCode:"",x:-16.844,y:38.184,z:21.179},{resSeq:260,iCode:"",x:-18.582,y:36.964,z:18.016},{resSeq:261,iCode:"",x:-16.762,y:37.521,z:14.707},{resSeq:262,iCode:"",x:-19.882,y:36.606,z:12.742},{resSeq:263,iCode:"",x:-18.461,y:33.207,z:11.819},{resSeq:264,iCode:"",x:-17.21,y:31.975,z:15.197},{resSeq:265,iCode:"",x:-16.636,y:33.023,z:18.797},{resSeq:266,iCode:"",x:-13.3,y:34.432,z:19.831},{resSeq:267,iCode:"",x:-12.129,y:34.128,z:23.417},{resSeq:268,iCode:"",x:-9.522,y:36.283,z:25.098},{resSeq:269,iCode:"",x:-8.161,y:36.462,z:28.681},{resSeq:270,iCode:"",x:-6.413,y:39.352,z:30.464},{resSeq:271,iCode:"",x:-4.421,y:38.287,z:33.527},{resSeq:272,iCode:"",x:-4.731,y:39.465,z:37.148},{resSeq:273,iCode:"",x:-7.531,y:41.898,z:36.497},{resSeq:274,iCode:"",x:-8.768,y:42.214,z:40.072},{resSeq:275,iCode:"",x:-7.425,y:41.402,z:43.512},{resSeq:276,iCode:"",x:-9.593,y:40.73,z:46.546},{resSeq:277,iCode:"",x:-7.695,y:41.186,z:49.817},{resSeq:278,iCode:"",x:-9.138,y:40.203,z:53.189},{resSeq:279,iCode:"",x:-6.755,y:41.077,z:55.972},{resSeq:280,iCode:"",x:-6.964,y:40.58,z:59.727},{resSeq:281,iCode:"",x:-4.857,y:41.274,z:62.815},{resSeq:282,iCode:"",x:-4.553,y:38.932,z:65.809},{resSeq:283,iCode:"",x:-2.906,y:39.314,z:69.19},{resSeq:284,iCode:"",x:-.796,y:36.478,z:70.563},{resSeq:285,iCode:"",x:-.366,y:36.362,z:74.334},{resSeq:286,iCode:"",x:2.475,y:34.01,z:75.258},{resSeq:287,iCode:"",x:1.872,y:34.431,z:79.013},{resSeq:288,iCode:"",x:-1.824,y:33.564,z:78.97},{resSeq:289,iCode:"",x:-1.383,y:31.274,z:75.956},{resSeq:290,iCode:"",x:-4.307,y:32.599,z:73.997},{resSeq:291,iCode:"",x:-4.892,y:34.294,z:70.674},{resSeq:292,iCode:"",x:-7.534,y:36.961,z:69.965},{resSeq:293,iCode:"",x:-8.832,y:39.168,z:67.182}]},{chainId:"G",residueCount:293,segments:[{start:2,end:5,type:"helix"},{start:7,end:7,type:"strand"},{start:14,end:14,type:"strand"},{start:21,end:29,type:"strand"},{start:34,end:43,type:"strand"},{start:48,end:48,type:"strand"},{start:51,end:61,type:"strand"},{start:66,end:70,type:"strand"},{start:75,end:89,type:"strand"},{start:97,end:102,type:"strand"},{start:109,end:127,type:"strand"},{start:132,end:151,type:"strand"},{start:153,end:158,type:"strand"},{start:159,end:160,type:"helix"},{start:164,end:171,type:"strand"},{start:174,end:176,type:"strand"},{start:179,end:182,type:"strand"},{start:188,end:188,type:"strand"},{start:192,end:192,type:"strand"},{start:197,end:197,type:"strand"},{start:206,end:208,type:"helix"},{start:210,end:210,type:"strand"},{start:211,end:212,type:"helix"},{start:213,end:215,type:"helix"},{start:224,end:224,type:"strand"},{start:228,end:234,type:"strand"},{start:242,end:260,type:"strand"},{start:265,end:285,type:"strand"},{start:290,end:292,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:15.458,y:-4.799,z:59.471},{resSeq:2,iCode:"",x:15.5,y:-6.128,z:63.042},{resSeq:3,iCode:"",x:12.694,y:-8.606,z:62.342},{resSeq:4,iCode:"",x:14.688,y:-10.037,z:59.463},{resSeq:5,iCode:"",x:17.382,y:-11.127,z:61.854},{resSeq:6,iCode:"",x:14.888,y:-12.505,z:64.431},{resSeq:7,iCode:"",x:15.203,y:-9.578,z:66.779},{resSeq:8,iCode:"",x:12.247,y:-7.722,z:68.312},{resSeq:9,iCode:"",x:11.479,y:-4.457,z:66.498},{resSeq:10,iCode:"",x:13.399,y:-1.463,z:67.822},{resSeq:11,iCode:"",x:15.433,y:-3.448,z:70.362},{resSeq:12,iCode:"",x:18.584,y:-2.061,z:68.762},{resSeq:13,iCode:"",x:17.63,y:1.639,z:68.424},{resSeq:14,iCode:"",x:18.991,y:4.49,z:70.562},{resSeq:15,iCode:"",x:17.015,y:6.765,z:72.849},{resSeq:16,iCode:"",x:14.739,y:4.84,z:75.175},{resSeq:17,iCode:"",x:14.437,y:6.131,z:78.76},{resSeq:18,iCode:"",x:16.254,y:9.319,z:77.895},{resSeq:19,iCode:"",x:15.194,y:12.907,z:78.593},{resSeq:20,iCode:"",x:15.873,y:14.665,z:75.286},{resSeq:21,iCode:"",x:16.668,y:18.374,z:75.028},{resSeq:22,iCode:"",x:15.65,y:20.089,z:71.773},{resSeq:23,iCode:"",x:15.874,y:23.548,z:70.287},{resSeq:24,iCode:"",x:15.22,y:25.796,z:67.285},{resSeq:25,iCode:"",x:17.708,y:28.357,z:65.956},{resSeq:26,iCode:"",x:16.258,y:30.671,z:63.249},{resSeq:27,iCode:"",x:18.179,y:33.109,z:61.001},{resSeq:28,iCode:"",x:17.08,y:35.039,z:57.916},{resSeq:29,iCode:"",x:19.843,y:36.241,z:55.622},{resSeq:30,iCode:"",x:18.237,y:39.103,z:53.687},{resSeq:31,iCode:"",x:21.315,y:39.715,z:51.606},{resSeq:32,iCode:"",x:21.018,y:36.168,z:50.293},{resSeq:33,iCode:"",x:17.302,y:35.407,z:50.558},{resSeq:34,iCode:"",x:17.617,y:32.42,z:52.908},{resSeq:35,iCode:"",x:15.355,y:31.394,z:55.791},{resSeq:36,iCode:"",x:17.656,y:29.217,z:57.844},{resSeq:37,iCode:"",x:16.301,y:27.007,z:60.599},{resSeq:38,iCode:"",x:18.393,y:24.615,z:62.611},{resSeq:39,iCode:"",x:16.502,y:22.075,z:64.74},{resSeq:40,iCode:"",x:18.729,y:20.208,z:67.168},{resSeq:41,iCode:"",x:18.323,y:17.376,z:69.659},{resSeq:42,iCode:"",x:20.719,y:16.144,z:72.346},{resSeq:43,iCode:"",x:20.428,y:12.481,z:73.275},{resSeq:44,iCode:"",x:22.47,y:11.166,z:76.229},{resSeq:45,iCode:"",x:21.462,y:7.53,z:76.21},{resSeq:46,iCode:"",x:23.521,y:6.095,z:79.076},{resSeq:47,iCode:"",x:23.428,y:2.632,z:77.498},{resSeq:48,iCode:"",x:25.078,y:4.1,z:74.335},{resSeq:49,iCode:"",x:28.846,y:4.649,z:74.19},{resSeq:50,iCode:"",x:28.592,y:8.35,z:73.311},{resSeq:51,iCode:"",x:26.514,y:11.482,z:73.527},{resSeq:52,iCode:"",x:24.512,y:12.31,z:70.416},{resSeq:53,iCode:"",x:23.427,y:15.546,z:68.811},{resSeq:54,iCode:"",x:21.022,y:15.345,z:65.837},{resSeq:55,iCode:"",x:20.992,y:18.536,z:63.786},{resSeq:56,iCode:"",x:18.297,y:19.109,z:61.195},{resSeq:57,iCode:"",x:18.92,y:21.979,z:58.775},{resSeq:58,iCode:"",x:15.527,y:23.155,z:57.415},{resSeq:59,iCode:"",x:14.231,y:26.549,z:56.259},{resSeq:60,iCode:"",x:14.081,y:27.651,z:52.607},{resSeq:61,iCode:"",x:16.545,y:29.023,z:50.012},{resSeq:62,iCode:"",x:14.587,y:31.36,z:47.734},{resSeq:63,iCode:"",x:14.788,y:30.5,z:44.047},{resSeq:64,iCode:"",x:15.308,y:34.001,z:42.641},{resSeq:65,iCode:"",x:14.676,y:33.04,z:39.006},{resSeq:66,iCode:"",x:14.829,y:36.644,z:37.741},{resSeq:67,iCode:"",x:15.597,y:38.405,z:34.469},{resSeq:68,iCode:"",x:18.379,y:40.783,z:35.438},{resSeq:69,iCode:"",x:19.905,y:42.107,z:32.199},{resSeq:70,iCode:"",x:18.357,y:43.879,z:29.223},{resSeq:71,iCode:"",x:20.754,y:45.323,z:26.664},{resSeq:72,iCode:"",x:18.046,y:46.673,z:24.355},{resSeq:73,iCode:"",x:15.221,y:44.752,z:22.65},{resSeq:74,iCode:"",x:17.246,y:41.891,z:21.131},{resSeq:75,iCode:"",x:19.246,y:40.736,z:24.136},{resSeq:76,iCode:"",x:18.335,y:39.858,z:27.741},{resSeq:77,iCode:"",x:19.582,y:37.753,z:30.667},{resSeq:78,iCode:"",x:17.922,y:35.488,z:33.23},{resSeq:79,iCode:"",x:19.534,y:34.459,z:36.547},{resSeq:80,iCode:"",x:18.175,y:31.045,z:37.691},{resSeq:81,iCode:"",x:19.273,y:28.489,z:40.352},{resSeq:82,iCode:"",x:21.106,y:25.41,z:39.126},{resSeq:83,iCode:"",x:21.915,y:24.099,z:42.592},{resSeq:84,iCode:"",x:20.969,y:24.479,z:46.256},{resSeq:85,iCode:"",x:23.454,y:23.25,z:48.926},{resSeq:86,iCode:"",x:23.679,y:22.65,z:52.664},{resSeq:87,iCode:"",x:26.969,y:21.819,z:54.401},{resSeq:88,iCode:"",x:28.053,y:21.305,z:57.988},{resSeq:89,iCode:"",x:31.687,y:21.607,z:58.979},{resSeq:90,iCode:"",x:33.416,y:20.669,z:62.236},{resSeq:91,iCode:"",x:36.913,y:22.015,z:62.757},{resSeq:92,iCode:"",x:39.866,y:19.595,z:62.727},{resSeq:93,iCode:"",x:40.857,y:20.548,z:66.249},{resSeq:94,iCode:"",x:37.497,y:19.183,z:67.422},{resSeq:95,iCode:"",x:37.129,y:15.682,z:68.824},{resSeq:96,iCode:"",x:33.418,y:15.427,z:67.884},{resSeq:97,iCode:"",x:32.666,y:13.405,z:64.749},{resSeq:98,iCode:"",x:30.078,y:13.088,z:61.99},{resSeq:99,iCode:"",x:28.577,y:9.658,z:62.598},{resSeq:100,iCode:"",x:25.471,y:9.457,z:60.413},{resSeq:101,iCode:"",x:23.364,y:11.589,z:58.023},{resSeq:102,iCode:"",x:20.118,y:11.304,z:56.078},{resSeq:103,iCode:"",x:19.138,y:11.169,z:53.131},{resSeq:104,iCode:"",x:21.859,y:9.326,z:51.238},{resSeq:105,iCode:"",x:22.275,y:8.333,z:47.618},{resSeq:106,iCode:"",x:19.863,y:5.892,z:45.997},{resSeq:107,iCode:"",x:20.356,y:3.354,z:43.218},{resSeq:108,iCode:"",x:18.287,y:4.472,z:40.224},{resSeq:109,iCode:"",x:16.484,y:1.869,z:38.143},{resSeq:110,iCode:"",x:15.253,y:1.524,z:34.589},{resSeq:111,iCode:"",x:12.588,y:-.687,z:33.091},{resSeq:112,iCode:"",x:13.382,y:-2.617,z:29.939},{resSeq:113,iCode:"",x:11.298,y:-4.425,z:27.281},{resSeq:114,iCode:"",x:12.087,y:-6.671,z:24.334},{resSeq:115,iCode:"",x:9.481,y:-7.512,z:21.759},{resSeq:116,iCode:"",x:9.835,y:-10.036,z:18.964},{resSeq:117,iCode:"",x:6.918,y:-10.336,z:16.594},{resSeq:118,iCode:"",x:6.425,y:-12.02,z:13.256},{resSeq:119,iCode:"",x:3.488,y:-12.684,z:10.952},{resSeq:120,iCode:"",x:2.229,y:-13.752,z:7.532},{resSeq:121,iCode:"",x:-.423,y:-12.465,z:5.101},{resSeq:122,iCode:"",x:-2.303,y:-13.732,z:2.062},{resSeq:123,iCode:"",x:-4.143,y:-11.62,z:-.507},{resSeq:124,iCode:"",x:-6.197,y:-12.706,z:-3.509},{resSeq:125,iCode:"",x:-7.038,y:-10.224,z:-6.24},{resSeq:126,iCode:"",x:-9.072,y:-10.134,z:-9.456},{resSeq:127,iCode:"",x:-11.558,y:-7.963,z:-11.364},{resSeq:128,iCode:"",x:-14.354,y:-7.797,z:-13.948},{resSeq:129,iCode:"",x:-12.111,y:-8.778,z:-16.854},{resSeq:130,iCode:"",x:-11.692,y:-12.141,z:-15.081},{resSeq:131,iCode:"",x:-8.106,y:-11.423,z:-13.974},{resSeq:132,iCode:"",x:-6.614,y:-13.15,z:-10.908},{resSeq:133,iCode:"",x:-3.768,y:-11.996,z:-8.66},{resSeq:134,iCode:"",x:-2.189,y:-13.224,z:-5.427},{resSeq:135,iCode:"",x:.176,y:-12.077,z:-2.675},{resSeq:136,iCode:"",x:2.053,y:-13.947,z:.025},{resSeq:137,iCode:"",x:3.969,y:-11.853,z:2.521},{resSeq:138,iCode:"",x:5.787,y:-12.444,z:5.799},{resSeq:139,iCode:"",x:7.51,y:-10.156,z:8.297},{resSeq:140,iCode:"",x:9.574,y:-9.811,z:11.458},{resSeq:141,iCode:"",x:10.164,y:-6.983,z:13.903},{resSeq:142,iCode:"",x:12.352,y:-6.718,z:16.98},{resSeq:143,iCode:"",x:11.647,y:-3.806,z:19.321},{resSeq:144,iCode:"",x:13.108,y:-2.475,z:22.571},{resSeq:145,iCode:"",x:11.756,y:.084,z:25.005},{resSeq:146,iCode:"",x:13.584,y:1.752,z:27.879},{resSeq:147,iCode:"",x:11.57,y:3.51,z:30.561},{resSeq:148,iCode:"",x:12.771,y:5.636,z:33.516},{resSeq:149,iCode:"",x:11.624,y:8.481,z:35.746},{resSeq:150,iCode:"",x:13.448,y:11.815,z:35.692},{resSeq:151,iCode:"",x:13.112,y:14.266,z:38.648},{resSeq:152,iCode:"",x:13.466,y:18.019,z:37.926},{resSeq:153,iCode:"",x:16.179,y:18.262,z:40.549},{resSeq:154,iCode:"",x:18.348,y:15.546,z:42.104},{resSeq:155,iCode:"",x:19.248,y:15.569,z:45.783},{resSeq:156,iCode:"",x:22.717,y:14.073,z:46.282},{resSeq:157,iCode:"",x:24.636,y:13.429,z:49.498},{resSeq:158,iCode:"",x:28.177,y:14.642,z:48.862},{resSeq:159,iCode:"",x:30.988,y:12.352,z:50.078},{resSeq:160,iCode:"",x:31.247,y:12.816,z:53.855},{resSeq:161,iCode:"",x:34.262,y:12.675,z:56.13},{resSeq:162,iCode:"",x:34.097,y:12.512,z:59.936},{resSeq:163,iCode:"",x:34.504,y:16.298,z:59.921},{resSeq:164,iCode:"",x:32.134,y:17.337,z:57.156},{resSeq:165,iCode:"",x:28.973,y:16.438,z:55.241},{resSeq:166,iCode:"",x:26.989,y:18.27,z:52.58},{resSeq:167,iCode:"",x:24.028,y:17.812,z:50.282},{resSeq:168,iCode:"",x:23.276,y:19.321,z:46.909},{resSeq:169,iCode:"",x:20.008,y:19.329,z:45.053},{resSeq:170,iCode:"",x:20.96,y:20.022,z:41.464},{resSeq:171,iCode:"",x:18.996,y:20.855,z:38.299},{resSeq:172,iCode:"",x:18.424,y:17.766,z:36.149},{resSeq:173,iCode:"",x:16.205,y:18.602,z:33.17},{resSeq:174,iCode:"",x:12.79,y:20.141,z:32.64},{resSeq:175,iCode:"",x:9.743,y:20.299,z:30.372},{resSeq:176,iCode:"",x:9.212,y:23.603,z:28.574},{resSeq:177,iCode:"",x:5.573,y:23.789,z:27.542},{resSeq:178,iCode:"",x:4.85,y:20.114,z:26.713},{resSeq:179,iCode:"",x:8.226,y:19.552,z:25.036},{resSeq:180,iCode:"",x:11.741,y:18.571,z:25.948},{resSeq:181,iCode:"",x:12.869,y:18.043,z:28.508},{resSeq:182,iCode:"",x:15.827,y:20.438,z:28.329},{resSeq:183,iCode:"",x:18.846,y:20.81,z:30.626},{resSeq:184,iCode:"",x:21.979,y:22.939,z:30.965},{resSeq:185,iCode:"",x:23.435,y:21.352,z:27.814},{resSeq:186,iCode:"",x:20.493,y:21.228,z:25.429},{resSeq:187,iCode:"",x:21.734,y:22.547,z:22.084},{resSeq:188,iCode:"",x:19.728,y:23.086,z:18.917},{resSeq:189,iCode:"",x:21.782,y:24.548,z:16.042},{resSeq:190,iCode:"",x:19.106,y:27.105,z:15.129},{resSeq:191,iCode:"",x:17.822,y:27.674,z:18.67},{resSeq:192,iCode:"",x:20.776,y:27.07,z:20.983},{resSeq:193,iCode:"",x:19.522,y:26.08,z:24.47},{resSeq:194,iCode:"",x:15.713,y:26.285,z:24.716},{resSeq:195,iCode:"",x:15.252,y:25.596,z:28.47},{resSeq:196,iCode:"",x:13.425,y:28.868,z:29.356},{resSeq:197,iCode:"",x:12.488,y:30.496,z:26.056},{resSeq:198,iCode:"",x:8.774,y:31.234,z:25.763},{resSeq:199,iCode:"",x:8.52,y:31.69,z:21.942},{resSeq:200,iCode:"",x:11.007,y:30.485,z:19.317},{resSeq:201,iCode:"",x:10.297,y:33.505,z:17.152},{resSeq:202,iCode:"",x:7.667,y:35.735,z:18.769},{resSeq:203,iCode:"",x:8.045,y:39.506,z:18.289},{resSeq:204,iCode:"",x:8.658,y:40.934,z:21.789},{resSeq:205,iCode:"",x:11.551,y:42.367,z:23.759},{resSeq:206,iCode:"",x:14.148,y:39.76,z:24.753},{resSeq:207,iCode:"",x:12.988,y:40.546,z:28.296},{resSeq:208,iCode:"",x:9.432,y:39.298,z:27.552},{resSeq:209,iCode:"",x:10.349,y:35.977,z:25.884},{resSeq:210,iCode:"",x:11.296,y:34.173,z:29.104},{resSeq:211,iCode:"",x:9.113,y:31.357,z:30.343},{resSeq:212,iCode:"",x:6.692,y:32.299,z:33.078},{resSeq:213,iCode:"",x:8.147,y:30.912,z:36.353},{resSeq:214,iCode:"",x:4.678,y:29.581,z:37.205},{resSeq:215,iCode:"",x:5.15,y:27.376,z:34.178},{resSeq:216,iCode:"",x:8.551,y:26.194,z:35.436},{resSeq:217,iCode:"",x:9.552,y:23.968,z:38.37},{resSeq:218,iCode:"",x:8.591,y:25.955,z:41.494},{resSeq:219,iCode:"",x:12.024,y:25.614,z:43.091},{resSeq:220,iCode:"",x:13.404,y:28.06,z:40.501},{resSeq:221,iCode:"",x:11.222,y:30.859,z:41.791},{resSeq:222,iCode:"",x:9.799,y:30.261,z:45.299},{resSeq:223,iCode:"",x:12.636,y:28.038,z:46.373},{resSeq:224,iCode:"",x:13.694,y:24.807,z:47.949},{resSeq:225,iCode:"",x:13.156,y:23.694,z:51.553},{resSeq:226,iCode:"",x:16.032,y:21.563,z:52.935},{resSeq:227,iCode:"",x:15.194,y:18.765,z:55.356},{resSeq:228,iCode:"",x:18.463,y:17.021,z:56.046},{resSeq:229,iCode:"",x:19.701,y:15.29,z:59.209},{resSeq:230,iCode:"",x:23.223,y:14.786,z:60.49},{resSeq:231,iCode:"",x:24.173,y:13.033,z:63.679},{resSeq:232,iCode:"",x:27.329,y:14.015,z:65.51},{resSeq:233,iCode:"",x:28.819,y:11.834,z:68.269},{resSeq:234,iCode:"",x:30.942,y:13.007,z:71.197},{resSeq:235,iCode:"",x:33.171,y:11.117,z:73.587},{resSeq:236,iCode:"",x:31.946,y:11.612,z:77.16},{resSeq:237,iCode:"",x:35.484,y:11.814,z:78.519},{resSeq:238,iCode:"",x:36.97,y:14.273,z:76.032},{resSeq:239,iCode:"",x:38.598,y:17.309,z:77.632},{resSeq:240,iCode:"",x:37.006,y:19.883,z:75.356},{resSeq:241,iCode:"",x:33.234,y:19.574,z:75.717},{resSeq:242,iCode:"",x:32.476,y:22.532,z:73.453},{resSeq:243,iCode:"",x:32.453,y:22.244,z:69.694},{resSeq:244,iCode:"",x:32.164,y:24.884,z:67.009},{resSeq:245,iCode:"",x:30.338,y:23.988,z:63.823},{resSeq:246,iCode:"",x:29.796,y:25.983,z:60.645},{resSeq:247,iCode:"",x:26.613,y:25.64,z:58.668},{resSeq:248,iCode:"",x:26.521,y:26.974,z:55.117},{resSeq:249,iCode:"",x:23.545,y:27.414,z:52.8},{resSeq:250,iCode:"",x:24.267,y:28.212,z:49.178},{resSeq:251,iCode:"",x:22.674,y:28.879,z:45.829},{resSeq:252,iCode:"",x:24.592,y:28.531,z:42.552},{resSeq:253,iCode:"",x:23.044,y:30.576,z:39.745},{resSeq:254,iCode:"",x:23.337,y:30.154,z:35.992},{resSeq:255,iCode:"",x:23.085,y:32.908,z:33.407},{resSeq:256,iCode:"",x:20.572,y:32.129,z:30.634},{resSeq:257,iCode:"",x:20.655,y:34.707,z:27.828},{resSeq:258,iCode:"",x:18.288,y:35.185,z:24.909},{resSeq:259,iCode:"",x:19.29,y:37.006,z:21.696},{resSeq:260,iCode:"",x:17.347,y:37.611,z:18.487},{resSeq:261,iCode:"",x:19.132,y:36.526,z:15.285},{resSeq:262,iCode:"",x:16.845,y:38.45,z:12.886},{resSeq:263,iCode:"",x:14.947,y:35.236,z:12.124},{resSeq:264,iCode:"",x:14.478,y:33.595,z:15.533},{resSeq:265,iCode:"",x:15.625,y:33.523,z:19.147},{resSeq:266,iCode:"",x:18.803,y:31.807,z:20.209},{resSeq:267,iCode:"",x:19.33,y:30.893,z:23.829},{resSeq:268,iCode:"",x:22.56,y:30.13,z:25.646},{resSeq:269,iCode:"",x:23.273,y:29.103,z:29.223},{resSeq:270,iCode:"",x:26.379,y:29.802,z:31.282},{resSeq:271,iCode:"",x:26.993,y:27.358,z:34.124},{resSeq:272,iCode:"",x:27.796,y:28.372,z:37.699},{resSeq:273,iCode:"",x:27.984,y:32.079,z:37.045},{resSeq:274,iCode:"",x:27.147,y:33.159,z:40.591},{resSeq:275,iCode:"",x:27.348,y:31.577,z:44.041},{resSeq:276,iCode:"",x:25.441,y:33.019,z:47.004},{resSeq:277,iCode:"",x:26.97,y:31.691,z:50.204},{resSeq:278,iCode:"",x:25.436,y:32.222,z:53.685},{resSeq:279,iCode:"",x:27.559,y:30.86,z:56.497},{resSeq:280,iCode:"",x:26.855,y:30.706,z:60.221},{resSeq:281,iCode:"",x:28.875,y:29.393,z:63.175},{resSeq:282,iCode:"",x:27.164,y:27.664,z:66.112},{resSeq:283,iCode:"",x:28.466,y:26.719,z:69.547},{resSeq:284,iCode:"",x:27.572,y:23.288,z:70.928},{resSeq:285,iCode:"",x:27.798,y:22.894,z:74.696},{resSeq:286,iCode:"",x:27.774,y:19.143,z:75.283},{resSeq:287,iCode:"",x:27.706,y:19.635,z:79.049},{resSeq:288,iCode:"",x:24.723,y:21.975,z:79.037},{resSeq:289,iCode:"",x:23.167,y:20.166,z:76.056},{resSeq:290,iCode:"",x:22.412,y:23.436,z:74.409},{resSeq:291,iCode:"",x:23.206,y:24.916,z:71.003},{resSeq:292,iCode:"",x:23.67,y:28.653,z:70.392},{resSeq:293,iCode:"",x:24.51,y:31.068,z:67.573}]},{chainId:"D",residueCount:293,segments:[{start:2,end:5,type:"helix"},{start:7,end:7,type:"strand"},{start:14,end:14,type:"strand"},{start:21,end:29,type:"strand"},{start:34,end:43,type:"strand"},{start:48,end:48,type:"strand"},{start:51,end:61,type:"strand"},{start:66,end:69,type:"strand"},{start:75,end:89,type:"strand"},{start:97,end:102,type:"strand"},{start:105,end:108,type:"helix"},{start:109,end:126,type:"strand"},{start:132,end:151,type:"strand"},{start:153,end:158,type:"strand"},{start:164,end:171,type:"strand"},{start:174,end:176,type:"strand"},{start:179,end:182,type:"strand"},{start:188,end:188,type:"strand"},{start:192,end:192,type:"strand"},{start:197,end:197,type:"strand"},{start:206,end:208,type:"helix"},{start:210,end:210,type:"strand"},{start:211,end:212,type:"helix"},{start:213,end:215,type:"helix"},{start:218,end:221,type:"helix"},{start:224,end:224,type:"strand"},{start:228,end:234,type:"strand"},{start:242,end:262,type:"strand"},{start:264,end:285,type:"strand"},{start:290,end:292,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:-12.311,y:11.735,z:59.348},{resSeq:2,iCode:"",x:-11.941,y:13.171,z:62.844},{resSeq:3,iCode:"",x:-8.384,y:14.026,z:61.885},{resSeq:4,iCode:"",x:-9.511,y:16.232,z:58.991},{resSeq:5,iCode:"",x:-11.433,y:18.461,z:61.361},{resSeq:6,iCode:"",x:-8.622,y:18.649,z:63.975},{resSeq:7,iCode:"",x:-10.159,y:16.238,z:66.486},{resSeq:8,iCode:"",x:-8.429,y:13.311,z:68.184},{resSeq:9,iCode:"",x:-9.15,y:10.16,z:66.186},{resSeq:10,iCode:"",x:-12.103,y:8.15,z:67.478},{resSeq:11,iCode:"",x:-13.233,y:10.917,z:69.817},{resSeq:12,iCode:"",x:-16.792,y:10.932,z:68.469},{resSeq:13,iCode:"",x:-17.224,y:7.164,z:68.235},{resSeq:14,iCode:"",x:-19.687,y:5.171,z:70.306},{resSeq:15,iCode:"",x:-18.857,y:2.063,z:72.269},{resSeq:16,iCode:"",x:-16.338,y:3.068,z:74.88},{resSeq:17,iCode:"",x:-16.692,y:1.802,z:78.475},{resSeq:18,iCode:"",x:-19.788,y:-.24,z:77.657},{resSeq:19,iCode:"",x:-20.193,y:-3.943,z:78.361},{resSeq:20,iCode:"",x:-21.481,y:-5.154,z:75.015},{resSeq:21,iCode:"",x:-23.789,y:-8.155,z:74.851},{resSeq:22,iCode:"",x:-23.556,y:-10.2,z:71.617},{resSeq:23,iCode:"",x:-25.042,y:-13.348,z:70.098},{resSeq:24,iCode:"",x:-25.664,y:-15.629,z:67.096},{resSeq:25,iCode:"",x:-29.006,y:-16.987,z:65.828},{resSeq:26,iCode:"",x:-28.63,y:-19.644,z:63.143},{resSeq:27,iCode:"",x:-31.307,y:-21.107,z:60.919},{resSeq:28,iCode:"",x:-31.103,y:-23.306,z:57.876},{resSeq:29,iCode:"",x:-34.069,y:-23.417,z:55.52},{resSeq:30,iCode:"",x:-33.797,y:-26.784,z:53.728},{resSeq:31,iCode:"",x:-36.507,y:-26.036,z:51.158},{resSeq:32,iCode:"",x:-34.968,y:-22.698,z:50.125},{resSeq:33,iCode:"",x:-31.347,y:-23.745,z:50.497},{resSeq:34,iCode:"",x:-30.438,y:-20.77,z:52.641},{resSeq:35,iCode:"",x:-28.11,y:-20.83,z:55.652},{resSeq:36,iCode:"",x:-29.1,y:-17.769,z:57.63},{resSeq:37,iCode:"",x:-27.081,y:-16.35,z:60.548},{resSeq:38,iCode:"",x:-27.804,y:-13.198,z:62.47},{resSeq:39,iCode:"",x:-25.064,y:-11.834,z:64.655},{resSeq:40,iCode:"",x:-26.225,y:-9.044,z:67.001},{resSeq:41,iCode:"",x:-24.654,y:-6.659,z:69.527},{resSeq:42,iCode:"",x:-26.369,y:-4.502,z:72.104},{resSeq:43,iCode:"",x:-24.481,y:-1.313,z:72.895},{resSeq:44,iCode:"",x:-25.926,y:.756,z:75.755},{resSeq:45,iCode:"",x:-23.523,y:3.675,z:75.942},{resSeq:46,iCode:"",x:-24.82,y:5.961,z:78.739},{resSeq:47,iCode:"",x:-23.099,y:8.928,z:77.075},{resSeq:48,iCode:"",x:-25.156,y:8.306,z:73.902},{resSeq:49,iCode:"",x:-28.82,y:9.36,z:73.699},{resSeq:50,iCode:"",x:-30.182,y:5.958,z:72.659},{resSeq:51,iCode:"",x:-29.567,y:2.267,z:73.12},{resSeq:52,iCode:"",x:-28.11,y:.607,z:69.993},{resSeq:53,iCode:"",x:-28.503,y:-2.768,z:68.369},{resSeq:54,iCode:"",x:-26.185,y:-3.645,z:65.441},{resSeq:55,iCode:"",x:-27.483,y:-6.543,z:63.345},{resSeq:56,iCode:"",x:-25.197,y:-8.247,z:60.84},{resSeq:57,iCode:"",x:-26.979,y:-10.566,z:58.418},{resSeq:58,iCode:"",x:-24.547,y:-13.238,z:57.202},{resSeq:59,iCode:"",x:-24.722,y:-16.928,z:56.193},{resSeq:60,iCode:"",x:-25.067,y:-18.039,z:52.552},{resSeq:61,iCode:"",x:-27.812,y:-18.307,z:49.909},{resSeq:62,iCode:"",x:-27.157,y:-21.347,z:47.68},{resSeq:63,iCode:"",x:-26.8,y:-20.508,z:44.008},{resSeq:64,iCode:"",x:-28.754,y:-23.405,z:42.488},{resSeq:65,iCode:"",x:-27.749,y:-23.099,z:38.813},{resSeq:66,iCode:"",x:-29.9,y:-26.073,z:37.63},{resSeq:67,iCode:"",x:-30.942,y:-27.759,z:34.365},{resSeq:68,iCode:"",x:-34.64,y:-27.953,z:35.28},{resSeq:69,iCode:"",x:-36.389,y:-28.861,z:31.978},{resSeq:70,iCode:"",x:-35.031,y:-31.606,z:29.701},{resSeq:71,iCode:"",x:-37.657,y:-31.664,z:26.933},{resSeq:72,iCode:"",x:-35.474,y:-33.77,z:24.626},{resSeq:73,iCode:"",x:-32.178,y:-33.021,z:22.872},{resSeq:74,iCode:"",x:-33.679,y:-30.117,z:20.884},{resSeq:75,iCode:"",x:-34.727,y:-28.068,z:23.919},{resSeq:76,iCode:"",x:-33.759,y:-27.595,z:27.615},{resSeq:77,iCode:"",x:-33.999,y:-25.126,z:30.49},{resSeq:78,iCode:"",x:-31.599,y:-23.755,z:33.091},{resSeq:79,iCode:"",x:-32.515,y:-21.986,z:36.326},{resSeq:80,iCode:"",x:-29.942,y:-19.504,z:37.595},{resSeq:81,iCode:"",x:-29.945,y:-16.797,z:40.316},{resSeq:82,iCode:"",x:-30.165,y:-13.253,z:38.894},{resSeq:83,iCode:"",x:-30.458,y:-11.629,z:42.297},{resSeq:84,iCode:"",x:-29.802,y:-12.34,z:45.976},{resSeq:85,iCode:"",x:-31.649,y:-10.246,z:48.591},{resSeq:86,iCode:"",x:-31.542,y:-9.444,z:52.286},{resSeq:87,iCode:"",x:-34.211,y:-7.172,z:53.818},{resSeq:88,iCode:"",x:-34.941,y:-6.139,z:57.387},{resSeq:89,iCode:"",x:-38.212,y:-4.658,z:58.472},{resSeq:90,iCode:"",x:-39.751,y:-3.226,z:61.639},{resSeq:91,iCode:"",x:-43.522,y:-3.453,z:61.815},{resSeq:92,iCode:"",x:-44.86,y:.077,z:61.232},{resSeq:93,iCode:"",x:-46.129,y:-.015,z:64.83},{resSeq:94,iCode:"",x:-42.576,y:-.108,z:66.23},{resSeq:95,iCode:"",x:-40.948,y:2.851,z:67.981},{resSeq:96,iCode:"",x:-37.392,y:1.632,z:67.357},{resSeq:97,iCode:"",x:-35.73,y:2.985,z:64.19},{resSeq:98,iCode:"",x:-33.227,y:2.119,z:61.494},{resSeq:99,iCode:"",x:-30.458,y:4.628,z:62.089},{resSeq:100,iCode:"",x:-27.602,y:3.377,z:59.894},{resSeq:101,iCode:"",x:-26.613,y:.603,z:57.49},{resSeq:102,iCode:"",x:-23.553,y:-.675,z:55.714},{resSeq:103,iCode:"",x:-22.579,y:-1.012,z:52.873},{resSeq:104,iCode:"",x:-24.059,y:1.891,z:50.877},{resSeq:105,iCode:"",x:-24.119,y:2.882,z:47.188},{resSeq:106,iCode:"",x:-20.797,y:4.024,z:45.754},{resSeq:107,iCode:"",x:-20.16,y:6.478,z:42.927},{resSeq:108,iCode:"",x:-18.784,y:4.616,z:39.915},{resSeq:109,iCode:"",x:-16.006,y:6.14,z:37.78},{resSeq:110,iCode:"",x:-14.617,y:5.711,z:34.289},{resSeq:111,iCode:"",x:-11.254,y:6.407,z:32.712},{resSeq:112,iCode:"",x:-11.283,y:8.699,z:29.699},{resSeq:113,iCode:"",x:-8.507,y:9.478,z:27.272},{resSeq:114,iCode:"",x:-8.063,y:11.447,z:24.043},{resSeq:115,iCode:"",x:-5.319,y:11.037,z:21.41},{resSeq:116,iCode:"",x:-4.3,y:13.479,z:18.714},{resSeq:117,iCode:"",x:-1.673,y:12.282,z:16.25},{resSeq:118,iCode:"",x:-.316,y:13.658,z:12.98},{resSeq:119,iCode:"",x:2.568,y:12.745,z:10.704},{resSeq:120,iCode:"",x:4.185,y:13.085,z:7.282},{resSeq:121,iCode:"",x:6.084,y:10.849,z:4.875},{resSeq:122,iCode:"",x:8.266,y:11.04,z:1.807},{resSeq:123,iCode:"",x:8.91,y:8.403,z:-.842},{resSeq:124,iCode:"",x:11.46,y:8.206,z:-3.628},{resSeq:125,iCode:"",x:10.868,y:5.685,z:-6.403},{resSeq:126,iCode:"",x:12.578,y:4.533,z:-9.578},{resSeq:127,iCode:"",x:13.737,y:1.483,z:-11.52},{resSeq:128,iCode:"",x:16.183,y:.014,z:-14.04},{resSeq:129,iCode:"",x:14.614,y:1.883,z:-16.98},{resSeq:130,iCode:"",x:15.936,y:5.1,z:-15.384},{resSeq:131,iCode:"",x:12.469,y:6.135,z:-14.123},{resSeq:132,iCode:"",x:12.009,y:8.261,z:-10.986},{resSeq:133,iCode:"",x:9.023,y:9.146,z:-8.814},{resSeq:134,iCode:"",x:7.975,y:10.792,z:-5.573},{resSeq:135,iCode:"",x:5.404,y:10.892,z:-2.797},{resSeq:136,iCode:"",x:4.616,y:13.351,z:-.026},{resSeq:137,iCode:"",x:1.776,y:12.5,z:2.31},{resSeq:138,iCode:"",x:.459,y:13.858,z:5.603},{resSeq:139,iCode:"",x:-2.158,y:12.546,z:8.063},{resSeq:140,iCode:"",x:-4.174,y:13.233,z:11.226},{resSeq:141,iCode:"",x:-6.306,y:11.105,z:13.592},{resSeq:142,iCode:"",x:-8.372,y:11.401,z:16.759},{resSeq:143,iCode:"",x:-8.797,y:8.519,z:19.154},{resSeq:144,iCode:"",x:-11.036,y:8.175,z:22.148},{resSeq:145,iCode:"",x:-10.76,y:5.498,z:24.802},{resSeq:146,iCode:"",x:-13.106,y:4.833,z:27.733},{resSeq:147,iCode:"",x:-12.157,y:2.319,z:30.423},{resSeq:148,iCode:"",x:-14.147,y:1.028,z:33.415},{resSeq:149,iCode:"",x:-14.552,y:-2.003,z:35.736},{resSeq:150,iCode:"",x:-17.577,y:-4.275,z:35.629},{resSeq:151,iCode:"",x:-18.191,y:-6.686,z:38.533},{resSeq:152,iCode:"",x:-20.142,y:-9.874,z:37.86},{resSeq:153,iCode:"",x:-22.771,y:-8.804,z:40.356},{resSeq:154,iCode:"",x:-23.513,y:-5.372,z:41.819},{resSeq:155,iCode:"",x:-24.264,y:-4.802,z:45.496},{resSeq:156,iCode:"",x:-26.983,y:-2.191,z:45.898},{resSeq:157,iCode:"",x:-28.384,y:-.632,z:49.082},{resSeq:158,iCode:"",x:-32.103,y:-.251,z:48.392},{resSeq:159,iCode:"",x:-33.8,y:2.995,z:49.407},{resSeq:160,iCode:"",x:-34.054,y:2.841,z:53.215},{resSeq:161,iCode:"",x:-36.684,y:4.286,z:55.537},{resSeq:162,iCode:"",x:-36.723,y:4.292,z:59.361},{resSeq:163,iCode:"",x:-38.541,y:.955,z:59.322},{resSeq:164,iCode:"",x:-37.16,y:-.941,z:56.36},{resSeq:165,iCode:"",x:-33.826,y:-1.465,z:54.705},{resSeq:166,iCode:"",x:-32.446,y:-4.003,z:52.245},{resSeq:167,iCode:"",x:-29.644,y:-4.911,z:49.897},{resSeq:168,iCode:"",x:-29.811,y:-6.733,z:46.584},{resSeq:169,iCode:"",x:-26.87,y:-8.325,z:44.777},{resSeq:170,iCode:"",x:-27.808,y:-8.414,z:41.103},{resSeq:171,iCode:"",x:-26.224,y:-10.113,z:38.111},{resSeq:172,iCode:"",x:-24.429,y:-7.493,z:36.012},{resSeq:173,iCode:"",x:-22.723,y:-9.344,z:33.115},{resSeq:174,iCode:"",x:-20.31,y:-12.188,z:32.577},{resSeq:175,iCode:"",x:-17.567,y:-13.587,z:30.322},{resSeq:176,iCode:"",x:-18.415,y:-16.86,z:28.58},{resSeq:177,iCode:"",x:-15.325,y:-18.704,z:27.418},{resSeq:178,iCode:"",x:-13.189,y:-15.628,z:26.708},{resSeq:179,iCode:"",x:-15.991,y:-13.748,z:25.021},{resSeq:180,iCode:"",x:-18.742,y:-11.295,z:25.791},{resSeq:181,iCode:"",x:-19.519,y:-10.366,z:28.357},{resSeq:182,iCode:"",x:-23.183,y:-11.317,z:28.019},{resSeq:183,iCode:"",x:-26.185,y:-10.307,z:30.109},{resSeq:184,iCode:"",x:-29.867,y:-10.935,z:30.623},{resSeq:185,iCode:"",x:-30.558,y:-8.692,z:27.637},{resSeq:186,iCode:"",x:-28.073,y:-10.115,z:25.159},{resSeq:187,iCode:"",x:-29.179,y:-10.866,z:21.601},{resSeq:188,iCode:"",x:-27.458,y:-12.11,z:18.446},{resSeq:189,iCode:"",x:-30.027,y:-12.418,z:15.613},{resSeq:190,iCode:"",x:-28.483,y:-15.778,z:14.888},{resSeq:191,iCode:"",x:-27.838,y:-17.204,z:18.363},{resSeq:192,iCode:"",x:-30.076,y:-15.215,z:20.699},{resSeq:193,iCode:"",x:-28.756,y:-14.858,z:24.266},{resSeq:194,iCode:"",x:-25.474,y:-16.815,z:24.505},{resSeq:195,iCode:"",x:-24.991,y:-16.228,z:28.265},{resSeq:196,iCode:"",x:-24.866,y:-19.892,z:29.168},{resSeq:197,iCode:"",x:-24.264,y:-21.728,z:25.921},{resSeq:198,iCode:"",x:-21.266,y:-24.067,z:25.764},{resSeq:199,iCode:"",x:-21.234,y:-24.582,z:21.973},{resSeq:200,iCode:"",x:-22.956,y:-22.612,z:19.235},{resSeq:201,iCode:"",x:-23.639,y:-25.72,z:17.13},{resSeq:202,iCode:"",x:-22.605,y:-28.805,z:19.105},{resSeq:203,iCode:"",x:-24.428,y:-32.082,z:18.503},{resSeq:204,iCode:"",x:-25.52,y:-32.868,z:22.067},{resSeq:205,iCode:"",x:-28.699,y:-33.132,z:24.106},{resSeq:206,iCode:"",x:-29.74,y:-29.543,z:24.811},{resSeq:207,iCode:"",x:-29.232,y:-30.338,z:28.534},{resSeq:208,iCode:"",x:-25.519,y:-30.813,z:27.923},{resSeq:209,iCode:"",x:-25.022,y:-27.542,z:26.052},{resSeq:210,iCode:"",x:-25.012,y:-25.313,z:29.138},{resSeq:211,iCode:"",x:-21.944,y:-23.581,z:30.525},{resSeq:212,iCode:"",x:-20.06,y:-25.579,z:33.14},{resSeq:213,iCode:"",x:-20.757,y:-23.956,z:36.522},{resSeq:214,iCode:"",x:-17.052,y:-24.172,z:37.384},{resSeq:215,iCode:"",x:-16.533,y:-21.88,z:34.39},{resSeq:216,iCode:"",x:-19.322,y:-19.467,z:35.36},{resSeq:217,iCode:"",x:-19.405,y:-17.117,z:38.393},{resSeq:218,iCode:"",x:-19.218,y:-19.236,z:41.577},{resSeq:219,iCode:"",x:-22.132,y:-17.268,z:43.026},{resSeq:220,iCode:"",x:-24.366,y:-18.822,z:40.344},{resSeq:221,iCode:"",x:-23.819,y:-22.341,z:41.652},{resSeq:222,iCode:"",x:-22.284,y:-22.368,z:45.129},{resSeq:223,iCode:"",x:-23.976,y:-19.176,z:46.275},{resSeq:224,iCode:"",x:-23.517,y:-15.776,z:47.872},{resSeq:225,iCode:"",x:-22.601,y:-14.95,z:51.481},{resSeq:226,iCode:"",x:-24.235,y:-11.725,z:52.713},{resSeq:227,iCode:"",x:-22.321,y:-9.528,z:55.148},{resSeq:228,iCode:"",x:-24.559,y:-6.571,z:55.819},{resSeq:229,iCode:"",x:-24.891,y:-4.318,z:58.895},{resSeq:230,iCode:"",x:-27.917,y:-2.275,z:59.99},{resSeq:231,iCode:"",x:-28.023,y:-.324,z:63.219},{resSeq:232,iCode:"",x:-31.305,y:.172,z:65.069},{resSeq:233,iCode:"",x:-31.649,y:2.886,z:67.71},{resSeq:234,iCode:"",x:-34.129,y:2.836,z:70.591},{resSeq:235,iCode:"",x:-35.156,y:5.486,z:73.123},{resSeq:236,iCode:"",x:-34.606,y:4.5,z:76.781},{resSeq:237,iCode:"",x:-37.91,y:6.1,z:77.704},{resSeq:238,iCode:"",x:-40.049,y:4.166,z:75.19},{resSeq:239,iCode:"",x:-43.209,y:2.378,z:76.362},{resSeq:240,iCode:"",x:-42.588,y:-1.065,z:74.899},{resSeq:241,iCode:"",x:-38.934,y:-2.07,z:75.196},{resSeq:242,iCode:"",x:-39.588,y:-5.204,z:73.098},{resSeq:243,iCode:"",x:-39.272,y:-5.058,z:69.297},{resSeq:244,iCode:"",x:-40.229,y:-7.38,z:66.478},{resSeq:245,iCode:"",x:-38.177,y:-7.46,z:63.366},{resSeq:246,iCode:"",x:-38.745,y:-9.48,z:60.206},{resSeq:247,iCode:"",x:-35.798,y:-10.574,z:58.141},{resSeq:248,iCode:"",x:-36.16,y:-11.73,z:54.497},{resSeq:249,iCode:"",x:-33.47,y:-13.641,z:52.597},{resSeq:250,iCode:"",x:-34.356,y:-14.292,z:48.955},{resSeq:251,iCode:"",x:-33.236,y:-15.591,z:45.558},{resSeq:252,iCode:"",x:-34.798,y:-14.542,z:42.243},{resSeq:253,iCode:"",x:-34.198,y:-17.096,z:39.484},{resSeq:254,iCode:"",x:-34.231,y:-16.467,z:35.723},{resSeq:255,iCode:"",x:-35.187,y:-19.061,z:33.073},{resSeq:256,iCode:"",x:-32.543,y:-19.663,z:30.423},{resSeq:257,iCode:"",x:-33.466,y:-21.869,z:27.486},{resSeq:258,iCode:"",x:-31.482,y:-23.532,z:24.713},{resSeq:259,iCode:"",x:-33.407,y:-24.599,z:21.632},{resSeq:260,iCode:"",x:-31.946,y:-26.065,z:18.423},{resSeq:261,iCode:"",x:-32.822,y:-24.212,z:15.251},{resSeq:262,iCode:"",x:-31.765,y:-26.999,z:12.857},{resSeq:263,iCode:"",x:-28.434,y:-25.343,z:12.07},{resSeq:264,iCode:"",x:-27.396,y:-23.81,z:15.388},{resSeq:265,iCode:"",x:-28.405,y:-23.292,z:19.011},{resSeq:266,iCode:"",x:-30.502,y:-20.307,z:20.059},{resSeq:267,iCode:"",x:-30.558,y:-19.004,z:23.614},{resSeq:268,iCode:"",x:-33.482,y:-17.381,z:25.346},{resSeq:269,iCode:"",x:-33.659,y:-15.657,z:28.725},{resSeq:270,iCode:"",x:-36.835,y:-15.019,z:30.686},{resSeq:271,iCode:"",x:-36.367,y:-12.639,z:33.59},{resSeq:272,iCode:"",x:-37.494,y:-13.102,z:37.184},{resSeq:273,iCode:"",x:-39.219,y:-16.363,z:36.539},{resSeq:274,iCode:"",x:-39.052,y:-17.671,z:40.119},{resSeq:275,iCode:"",x:-38.651,y:-16.135,z:43.58},{resSeq:276,iCode:"",x:-37.464,y:-18.157,z:46.61},{resSeq:277,iCode:"",x:-38.184,y:-16.373,z:49.851},{resSeq:278,iCode:"",x:-37.363,y:-17.252,z:53.453},{resSeq:279,iCode:"",x:-38.904,y:-14.86,z:55.956},{resSeq:280,iCode:"",x:-38.315,y:-14.821,z:59.69},{resSeq:281,iCode:"",x:-39.502,y:-12.99,z:62.776},{resSeq:282,iCode:"",x:-36.983,y:-12.124,z:65.538},{resSeq:283,iCode:"",x:-37.794,y:-10.664,z:68.938},{resSeq:284,iCode:"",x:-35.585,y:-7.925,z:70.382},{resSeq:285,iCode:"",x:-35.549,y:-7.417,z:74.17},{resSeq:286,iCode:"",x:-34.008,y:-4.043,z:74.9},{resSeq:287,iCode:"",x:-34.173,y:-4.619,z:78.675},{resSeq:288,iCode:"",x:-32.467,y:-8.036,z:78.93},{resSeq:289,iCode:"",x:-30.375,y:-7.251,z:75.865},{resSeq:290,iCode:"",x:-31.016,y:-10.383,z:73.882},{resSeq:291,iCode:"",x:-32.565,y:-11.391,z:70.608},{resSeq:292,iCode:"",x:-34.478,y:-14.602,z:70.004},{resSeq:293,iCode:"",x:-36.463,y:-16.401,z:67.323}]},{chainId:"E",residueCount:293,segments:[{start:2,end:5,type:"helix"},{start:7,end:7,type:"strand"},{start:14,end:14,type:"strand"},{start:21,end:29,type:"strand"},{start:34,end:43,type:"strand"},{start:48,end:48,type:"strand"},{start:51,end:61,type:"strand"},{start:66,end:70,type:"strand"},{start:72,end:74,type:"helix"},{start:75,end:89,type:"strand"},{start:97,end:102,type:"strand"},{start:105,end:108,type:"helix"},{start:109,end:127,type:"strand"},{start:132,end:132,type:"strand"},{start:135,end:151,type:"strand"},{start:153,end:158,type:"strand"},{start:164,end:171,type:"strand"},{start:174,end:176,type:"strand"},{start:179,end:182,type:"strand"},{start:188,end:188,type:"strand"},{start:192,end:192,type:"strand"},{start:197,end:197,type:"strand"},{start:206,end:208,type:"helix"},{start:210,end:210,type:"strand"},{start:211,end:212,type:"helix"},{start:213,end:215,type:"helix"},{start:218,end:221,type:"helix"},{start:224,end:224,type:"strand"},{start:228,end:234,type:"strand"},{start:242,end:260,type:"strand"},{start:265,end:285,type:"strand"},{start:290,end:292,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:.992,y:16.949,z:59.435},{resSeq:2,iCode:"",x:2.422,y:17.209,z:62.962},{resSeq:3,iCode:"",x:5.457,y:15.134,z:62.14},{resSeq:4,iCode:"",x:6.286,y:17.366,z:59.194},{resSeq:5,iCode:"",x:6.883,y:20.207,z:61.6},{resSeq:6,iCode:"",x:8.755,y:18.166,z:64.238},{resSeq:7,iCode:"",x:5.811,y:17.883,z:66.593},{resSeq:8,iCode:"",x:4.635,y:14.691,z:68.271},{resSeq:9,iCode:"",x:1.704,y:13.33,z:66.294},{resSeq:10,iCode:"",x:-1.678,y:14.235,z:67.783},{resSeq:11,iCode:"",x:-.226,y:16.894,z:70.12},{resSeq:12,iCode:"",x:-2.313,y:19.505,z:68.366},{resSeq:13,iCode:"",x:-5.646,y:17.67,z:68.235},{resSeq:14,iCode:"",x:-8.75,y:18.461,z:70.281},{resSeq:15,iCode:"",x:-10.775,y:16.138,z:72.47},{resSeq:16,iCode:"",x:-8.463,y:14.531,z:75.037},{resSeq:17,iCode:"",x:-9.606,y:13.995,z:78.669},{resSeq:18,iCode:"",x:-13.125,y:14.992,z:77.677},{resSeq:19,iCode:"",x:-16.321,y:13.1,z:78.332},{resSeq:20,iCode:"",x:-18.031,y:13.38,z:74.961},{resSeq:21,iCode:"",x:-21.825,y:13.459,z:74.64},{resSeq:22,iCode:"",x:-23.293,y:11.947,z:71.443},{resSeq:23,iCode:"",x:-26.726,y:11.267,z:70.017},{resSeq:24,iCode:"",x:-28.854,y:10.083,z:67.12},{resSeq:25,iCode:"",x:-31.914,y:11.848,z:65.665},{resSeq:26,iCode:"",x:-33.665,y:9.819,z:62.923},{resSeq:27,iCode:"",x:-36.491,y:11.122,z:60.725},{resSeq:28,iCode:"",x:-38.164,y:9.643,z:57.667},{resSeq:29,iCode:"",x:-39.835,y:12.051,z:55.259},{resSeq:30,iCode:"",x:-42.414,y:9.954,z:53.421},{resSeq:31,iCode:"",x:-43.595,y:12.475,z:50.851},{resSeq:32,iCode:"",x:-39.976,y:13.223,z:49.85},{resSeq:33,iCode:"",x:-38.504,y:9.74,z:50.302},{resSeq:34,iCode:"",x:-35.623,y:10.762,z:52.534},{resSeq:35,iCode:"",x:-34.148,y:8.843,z:55.41},{resSeq:36,iCode:"",x:-32.585,y:11.619,z:57.464},{resSeq:37,iCode:"",x:-30.182,y:10.897,z:60.298},{resSeq:38,iCode:"",x:-28.153,y:13.392,z:62.289},{resSeq:39,iCode:"",x:-25.293,y:12.05,z:64.433},{resSeq:40,iCode:"",x:-24.076,y:14.697,z:66.901},{resSeq:41,iCode:"",x:-21.088,y:14.943,z:69.286},{resSeq:42,iCode:"",x:-20.574,y:17.64,z:71.889},{resSeq:43,iCode:"",x:-16.955,y:18.155,z:72.814},{resSeq:44,iCode:"",x:-16.144,y:20.407,z:75.778},{resSeq:45,iCode:"",x:-12.358,y:20.368,z:75.89},{resSeq:46,iCode:"",x:-11.364,y:22.598,z:78.802},{resSeq:47,iCode:"",x:-8.058,y:23.455,z:77.07},{resSeq:48,iCode:"",x:-9.747,y:24.568,z:73.815},{resSeq:49,iCode:"",x:-11.06,y:28.182,z:73.719},{resSeq:50,iCode:"",x:-14.483,y:26.969,z:72.581},{resSeq:51,iCode:"",x:-17.119,y:24.335,z:73.126},{resSeq:52,iCode:"",x:-17.632,y:22.372,z:69.871},{resSeq:53,iCode:"",x:-20.462,y:20.49,z:68.236},{resSeq:54,iCode:"",x:-19.788,y:18.08,z:65.352},{resSeq:55,iCode:"",x:-22.861,y:17.299,z:63.303},{resSeq:56,iCode:"",x:-22.727,y:14.348,z:60.909},{resSeq:57,iCode:"",x:-25.5,y:14.365,z:58.338},{resSeq:58,iCode:"",x:-26.096,y:10.808,z:57.099},{resSeq:59,iCode:"",x:-29.022,y:8.76,z:55.77},{resSeq:60,iCode:"",x:-30.166,y:8.197,z:52.18},{resSeq:61,iCode:"",x:-32.026,y:10.373,z:49.675},{resSeq:62,iCode:"",x:-33.97,y:7.941,z:47.443},{resSeq:63,iCode:"",x:-33.164,y:8.228,z:43.758},{resSeq:64,iCode:"",x:-36.687,y:7.783,z:42.366},{resSeq:65,iCode:"",x:-35.806,y:7.233,z:38.679},{resSeq:66,iCode:"",x:-39.534,y:7.156,z:37.654},{resSeq:67,iCode:"",x:-41.433,y:7.428,z:34.352},{resSeq:68,iCode:"",x:-44.018,y:9.915,z:35.62},{resSeq:69,iCode:"",x:-45.728,y:10.703,z:32.301},{resSeq:70,iCode:"",x:-47.196,y:8.876,z:29.352},{resSeq:71,iCode:"",x:-48.847,y:10.651,z:26.414},{resSeq:72,iCode:"",x:-49.788,y:7.57,z:24.418},{resSeq:73,iCode:"",x:-47.474,y:5.019,z:22.783},{resSeq:74,iCode:"",x:-45.112,y:7.58,z:21.266},{resSeq:75,iCode:"",x:-44.434,y:9.923,z:24.15},{resSeq:76,iCode:"",x:-43.276,y:9.452,z:27.742},{resSeq:77,iCode:"",x:-41.249,y:11.198,z:30.41},{resSeq:78,iCode:"",x:-38.754,y:9.946,z:32.986},{resSeq:79,iCode:"",x:-37.835,y:11.891,z:36.136},{resSeq:80,iCode:"",x:-34.243,y:11.377,z:37.276},{resSeq:81,iCode:"",x:-32.089,y:12.961,z:40.04},{resSeq:82,iCode:"",x:-29.344,y:15.211,z:38.675},{resSeq:83,iCode:"",x:-28.42,y:16.649,z:42.079},{resSeq:84,iCode:"",x:-28.543,y:15.653,z:45.749},{resSeq:85,iCode:"",x:-28.029,y:18.359,z:48.4},{resSeq:86,iCode:"",x:-27.471,y:18.747,z:52.123},{resSeq:87,iCode:"",x:-27.38,y:22.074,z:53.875},{resSeq:88,iCode:"",x:-27.002,y:23.421,z:57.397},{resSeq:89,iCode:"",x:-28.067,y:26.886,z:58.311},{resSeq:90,iCode:"",x:-27.867,y:28.903,z:61.551},{resSeq:91,iCode:"",x:-30.145,y:31.93,z:61.841},{resSeq:92,iCode:"",x:-27.979,y:35.109,z:61.763},{resSeq:93,iCode:"",x:-28.893,y:36.484,z:65.204},{resSeq:94,iCode:"",x:-27.176,y:33.329,z:66.561},{resSeq:95,iCode:"",x:-23.729,y:33.501,z:68.14},{resSeq:96,iCode:"",x:-22.552,y:29.983,z:67.25},{resSeq:97,iCode:"",x:-20.39,y:29.719,z:64.104},{resSeq:98,iCode:"",x:-19.549,y:27.21,z:61.395},{resSeq:99,iCode:"",x:-15.933,y:26.438,z:62.048},{resSeq:100,iCode:"",x:-15.021,y:23.503,z:59.888},{resSeq:101,iCode:"",x:-16.615,y:21.02,z:57.478},{resSeq:102,iCode:"",x:-15.622,y:17.935,z:55.572},{resSeq:103,iCode:"",x:-15.377,y:16.899,z:52.723},{resSeq:104,iCode:"",x:-13.989,y:19.825,z:50.734},{resSeq:105,iCode:"",x:-13.096,y:20.508,z:47.107},{resSeq:106,iCode:"",x:-10.133,y:18.619,z:45.61},{resSeq:107,iCode:"",x:-7.802,y:19.848,z:42.913},{resSeq:108,iCode:"",x:-8.293,y:17.593,z:39.901},{resSeq:109,iCode:"",x:-5.459,y:16.143,z:37.89},{resSeq:110,iCode:"",x:-4.821,y:14.879,z:34.389},{resSeq:111,iCode:"",x:-2.074,y:12.779,z:32.823},{resSeq:112,iCode:"",x:-.478,y:14.116,z:29.663},{resSeq:113,iCode:"",x:1.961,y:12.475,z:27.265},{resSeq:114,iCode:"",x:3.788,y:13.546,z:24.086},{resSeq:115,iCode:"",x:5.424,y:11.329,z:21.492},{resSeq:116,iCode:"",x:7.895,y:11.945,z:18.743},{resSeq:117,iCode:"",x:8.655,y:9.038,z:16.479},{resSeq:118,iCode:"",x:10.33,y:8.748,z:13.108},{resSeq:119,iCode:"",x:11.526,y:6.003,z:10.836},{resSeq:120,iCode:"",x:12.936,y:5.033,z:7.483},{resSeq:121,iCode:"",x:12.325,y:2.132,z:5.106},{resSeq:122,iCode:"",x:13.85,y:.608,z:1.987},{resSeq:123,iCode:"",x:12.166,y:-1.807,z:-.433},{resSeq:124,iCode:"",x:13.774,y:-3.779,z:-3.287},{resSeq:125,iCode:"",x:11.497,y:-5.022,z:-6.026},{resSeq:126,iCode:"",x:11.743,y:-7.218,z:-9.091},{resSeq:127,iCode:"",x:10.129,y:-9.926,z:-11.205},{resSeq:128,iCode:"",x:10.455,y:-12.757,z:-13.707},{resSeq:129,iCode:"",x:10.809,y:-10.277,z:-16.549},{resSeq:130,iCode:"",x:14.157,y:-9.322,z:-14.949},{resSeq:131,iCode:"",x:12.822,y:-5.93,z:-13.758},{resSeq:132,iCode:"",x:14.337,y:-4.152,z:-10.734},{resSeq:133,iCode:"",x:12.561,y:-1.646,z:-8.501},{resSeq:134,iCode:"",x:13.362,y:.424,z:-5.429},{resSeq:135,iCode:"",x:11.928,y:2.596,z:-2.647},{resSeq:136,iCode:"",x:13.421,y:4.712,z:.116},{resSeq:137,iCode:"",x:10.89,y:6.419,z:2.379},{resSeq:138,iCode:"",x:11.003,y:8.407,z:5.617},{resSeq:139,iCode:"",x:8.423,y:9.607,z:8.14},{resSeq:140,iCode:"",x:7.795,y:11.6,z:11.295},{resSeq:141,iCode:"",x:4.974,y:11.43,z:13.792},{resSeq:142,iCode:"",x:3.807,y:13.785,z:16.564},{resSeq:143,iCode:"",x:1.243,y:12.499,z:19.046},{resSeq:144,iCode:"",x:-.464,y:13.715,z:22.197},{resSeq:145,iCode:"",x:-2.444,y:11.867,z:24.847},{resSeq:146,iCode:"",x:-4.634,y:13.148,z:27.668},{resSeq:147,iCode:"",x:-5.848,y:10.779,z:30.413},{resSeq:148,iCode:"",x:-8.22,y:11.587,z:33.325},{resSeq:149,iCode:"",x:-10.971,y:10.066,z:35.477},{resSeq:150,iCode:"",x:-14.66,y:11.015,z:35.197},{resSeq:151,iCode:"",x:-16.861,y:10.169,z:38.203},{resSeq:152,iCode:"",x:-20.605,y:9.557,z:37.5},{resSeq:153,iCode:"",x:-21.347,y:12.089,z:40.214},{resSeq:154,iCode:"",x:-19.277,y:14.897,z:41.761},{resSeq:155,iCode:"",x:-19.249,y:15.903,z:45.442},{resSeq:156,iCode:"",x:-18.874,y:19.654,z:45.794},{resSeq:157,iCode:"",x:-18.609,y:21.756,z:48.95},{resSeq:158,iCode:"",x:-20.58,y:24.916,z:48.216},{resSeq:159,iCode:"",x:-18.979,y:28.183,z:49.304},{resSeq:160,iCode:"",x:-19.556,y:28.313,z:53.069},{resSeq:161,iCode:"",x:-19.995,y:31.263,z:55.435},{resSeq:162,iCode:"",x:-19.963,y:31.28,z:59.255},{resSeq:163,iCode:"",x:-23.707,y:30.574,z:59.369},{resSeq:164,iCode:"",x:-24.139,y:28.266,z:56.395},{resSeq:165,iCode:"",x:-22.668,y:25.18,z:54.745},{resSeq:166,iCode:"",x:-23.835,y:22.733,z:52.102},{resSeq:167,iCode:"",x:-22.764,y:20.038,z:49.663},{resSeq:168,iCode:"",x:-24.13,y:19.051,z:46.282},{resSeq:169,iCode:"",x:-23.534,y:15.68,z:44.699},{resSeq:170,iCode:"",x:-24.184,y:16.397,z:41.057},{resSeq:171,iCode:"",x:-24.551,y:14.275,z:37.935},{resSeq:172,iCode:"",x:-21.493,y:14.433,z:35.684},{resSeq:173,iCode:"",x:-21.999,y:11.931,z:32.882},{resSeq:174,iCode:"",x:-22.932,y:8.32,z:32.325},{resSeq:175,iCode:"",x:-22.142,y:5.364,z:30.092},{resSeq:176,iCode:"",x:-25.23,y:4.063,z:28.284},{resSeq:177,iCode:"",x:-24.66,y:.41,z:27.337},{resSeq:178,iCode:"",x:-20.91,y:.842,z:26.641},{resSeq:179,iCode:"",x:-21.22,y:4.029,z:24.617},{resSeq:180,iCode:"",x:-20.843,y:7.675,z:25.499},{resSeq:181,iCode:"",x:-20.634,y:8.759,z:28.148},{resSeq:182,iCode:"",x:-23.656,y:11.034,z:27.753},{resSeq:183,iCode:"",x:-24.356,y:14.051,z:29.924},{resSeq:184,iCode:"",x:-27.248,y:16.419,z:30.463},{resSeq:185,iCode:"",x:-26.214,y:18.354,z:27.363},{resSeq:186,iCode:"",x:-25.475,y:15.497,z:24.991},{resSeq:187,iCode:"",x:-26.956,y:16.229,z:21.588},{resSeq:188,iCode:"",x:-27.191,y:14.033,z:18.523},{resSeq:189,iCode:"",x:-29.066,y:15.533,z:15.519},{resSeq:190,iCode:"",x:-30.873,y:12.251,z:14.719},{resSeq:191,iCode:"",x:-31.445,y:11.049,z:18.282},{resSeq:192,iCode:"",x:-31.415,y:14.147,z:20.5},{resSeq:193,iCode:"",x:-30.146,y:13.303,z:23.993},{resSeq:194,iCode:"",x:-29.517,y:9.533,z:24.253},{resSeq:195,iCode:"",x:-28.834,y:9.468,z:28.027},{resSeq:196,iCode:"",x:-31.521,y:6.963,z:29.086},{resSeq:197,iCode:"",x:-32.739,y:5.754,z:25.695},{resSeq:198,iCode:"",x:-32.902,y:1.959,z:25.542},{resSeq:199,iCode:"",x:-33.081,y:1.469,z:21.737},{resSeq:200,iCode:"",x:-32.68,y:4.025,z:18.975},{resSeq:201,iCode:"",x:-35.644,y:2.74,z:16.936},{resSeq:202,iCode:"",x:-37.207,y:-.121,z:18.864},{resSeq:203,iCode:"",x:-40.84,y:-1.132,z:18.334},{resSeq:204,iCode:"",x:-42.26,y:-.765,z:21.855},{resSeq:205,iCode:"",x:-44.109,y:2.154,z:23.331},{resSeq:206,iCode:"",x:-42.29,y:5.146,z:24.843},{resSeq:207,iCode:"",x:-42.573,y:4.095,z:28.511},{resSeq:208,iCode:"",x:-40.866,y:.838,z:27.516},{resSeq:209,iCode:"",x:-37.848,y:2.445,z:25.916},{resSeq:210,iCode:"",x:-36.011,y:3.881,z:28.925},{resSeq:211,iCode:"",x:-32.797,y:2.374,z:30.218},{resSeq:212,iCode:"",x:-33.096,y:-.312,z:32.889},{resSeq:213,iCode:"",x:-32.128,y:1.357,z:36.179},{resSeq:214,iCode:"",x:-30.189,y:-1.811,z:36.999},{resSeq:215,iCode:"",x:-27.977,y:-.738,z:34.074},{resSeq:216,iCode:"",x:-27.705,y:2.89,z:35.238},{resSeq:217,iCode:"",x:-25.807,y:4.453,z:38.18},{resSeq:218,iCode:"",x:-27.344,y:3.09,z:41.401},{resSeq:219,iCode:"",x:-27.668,y:6.602,z:42.805},{resSeq:220,iCode:"",x:-30.354,y:7.377,z:40.165},{resSeq:221,iCode:"",x:-32.663,y:4.72,z:41.517},{resSeq:222,iCode:"",x:-31.69,y:3.544,z:44.989},{resSeq:223,iCode:"",x:-30.23,y:6.867,z:45.965},{resSeq:224,iCode:"",x:-27.368,y:8.626,z:47.665},{resSeq:225,iCode:"",x:-26.127,y:8.143,z:51.251},{resSeq:226,iCode:"",x:-24.683,y:11.398,z:52.684},{resSeq:227,iCode:"",x:-21.756,y:11.405,z:55.111},{resSeq:228,iCode:"",x:-20.785,y:15.034,z:55.616},{resSeq:229,iCode:"",x:-19.448,y:16.641,z:58.825},{resSeq:230,iCode:"",x:-19.922,y:20.208,z:60.081},{resSeq:231,iCode:"",x:-18.122,y:21.597,z:63.147},{resSeq:232,iCode:"",x:-19.822,y:24.404,z:65.065},{resSeq:233,iCode:"",x:-18.167,y:26.512,z:67.757},{resSeq:234,iCode:"",x:-19.748,y:28.28,z:70.704},{resSeq:235,iCode:"",x:-18.395,y:30.778,z:73.154},{resSeq:236,iCode:"",x:-18.843,y:29.669,z:76.787},{resSeq:237,iCode:"",x:-19.749,y:33.114,z:78.007},{resSeq:238,iCode:"",x:-22.317,y:33.871,z:75.347},{resSeq:239,iCode:"",x:-25.601,y:34.835,z:77.02},{resSeq:240,iCode:"",x:-27.784,y:32.694,z:74.795},{resSeq:241,iCode:"",x:-26.693,y:29.063,z:75.114},{resSeq:242,iCode:"",x:-29.41,y:27.644,z:72.846},{resSeq:243,iCode:"",x:-29.184,y:27.498,z:69.099},{resSeq:244,iCode:"",x:-31.597,y:26.563,z:66.388},{resSeq:245,iCode:"",x:-30.219,y:25.072,z:63.198},{resSeq:246,iCode:"",x:-32.12,y:24.063,z:60.1},{resSeq:247,iCode:"",x:-30.905,y:21.105,z:58.071},{resSeq:248,iCode:"",x:-32.24,y:20.704,z:54.512},{resSeq:249,iCode:"",x:-32.132,y:17.531,z:52.389},{resSeq:250,iCode:"",x:-32.725,y:18.224,z:48.728},{resSeq:251,iCode:"",x:-33.266,y:16.372,z:45.444},{resSeq:252,iCode:"",x:-33.247,y:18.141,z:42.067},{resSeq:253,iCode:"",x:-34.921,y:16.119,z:39.323},{resSeq:254,iCode:"",x:-34.506,y:16.563,z:35.584},{resSeq:255,iCode:"",x:-37.171,y:15.706,z:32.944},{resSeq:256,iCode:"",x:-36.003,y:13.288,z:30.234},{resSeq:257,iCode:"",x:-38.51,y:12.68,z:27.495},{resSeq:258,iCode:"",x:-38.691,y:10.273,z:24.609},{resSeq:259,iCode:"",x:-40.566,y:10.701,z:21.408},{resSeq:260,iCode:"",x:-41.039,y:8.565,z:18.36},{resSeq:261,iCode:"",x:-40.594,y:10.547,z:15.143},{resSeq:262,iCode:"",x:-41.946,y:7.502,z:13.295},{resSeq:263,iCode:"",x:-38.481,y:6.868,z:11.856},{resSeq:264,iCode:"",x:-36.555,y:6.677,z:15.137},{resSeq:265,iCode:"",x:-36.498,y:7.712,z:18.814},{resSeq:266,iCode:"",x:-35.526,y:11.167,z:19.951},{resSeq:267,iCode:"",x:-34.634,y:12.106,z:23.515},{resSeq:268,iCode:"",x:-34.88,y:15.371,z:25.335},{resSeq:269,iCode:"",x:-33.659,y:16.599,z:28.699},{resSeq:270,iCode:"",x:-34.95,y:19.626,z:30.556},{resSeq:271,iCode:"",x:-32.807,y:20.668,z:33.508},{resSeq:272,iCode:"",x:-33.796,y:21.279,z:37.113},{resSeq:273,iCode:"",x:-37.41,y:20.663,z:36.385},{resSeq:274,iCode:"",x:-38.353,y:19.765,z:39.954},{resSeq:275,iCode:"",x:-36.924,y:20.295,z:43.445},{resSeq:276,iCode:"",x:-37.806,y:18.131,z:46.487},{resSeq:277,iCode:"",x:-36.782,y:20.005,z:49.627},{resSeq:278,iCode:"",x:-37.108,y:18.486,z:53.145},{resSeq:279,iCode:"",x:-36.277,y:20.87,z:55.976},{resSeq:280,iCode:"",x:-36.109,y:20.334,z:59.715},{resSeq:281,iCode:"",x:-35.187,y:22.394,z:62.771},{resSeq:282,iCode:"",x:-33.226,y:21.142,z:65.745},{resSeq:283,iCode:"",x:-32.546,y:22.885,z:69.038},{resSeq:284,iCode:"",x:-28.938,y:22.757,z:70.239},{resSeq:285,iCode:"",x:-28.582,y:23.064,z:74.022},{resSeq:286,iCode:"",x:-24.95,y:23.874,z:74.829},{resSeq:287,iCode:"",x:-25.479,y:23.868,z:78.625},{resSeq:288,iCode:"",x:-27.039,y:20.426,z:78.704},{resSeq:289,iCode:"",x:-25.035,y:19.197,z:75.697},{resSeq:290,iCode:"",x:-28.078,y:17.799,z:74.025},{resSeq:291,iCode:"",x:-29.72,y:18.183,z:70.644},{resSeq:292,iCode:"",x:-33.428,y:17.679,z:69.851},{resSeq:293,iCode:"",x:-35.977,y:18.143,z:67.083}]}]},"2j1n":{pdbId:"2j1n",chains:[{chainId:"A",residueCount:346,segments:[{start:2,end:6,type:"strand"},{start:9,end:23,type:"strand"},{start:31,end:32,type:"strand"},{start:35,end:45,type:"strand"},{start:50,end:61,type:"strand"},{start:71,end:82,type:"strand"},{start:86,end:94,type:"strand"},{start:98,end:101,type:"helix"},{start:102,end:104,type:"helix"},{start:124,end:134,type:"strand"},{start:135,end:138,type:"helix"},{start:143,end:150,type:"strand"},{start:153,end:153,type:"strand"},{start:155,end:155,type:"strand"},{start:156,end:156,type:"helix"},{start:165,end:165,type:"strand"},{start:172,end:174,type:"helix"},{start:176,end:176,type:"strand"},{start:179,end:188,type:"strand"},{start:191,end:201,type:"strand"},{start:202,end:203,type:"helix"},{start:212,end:212,type:"strand"},{start:217,end:229,type:"strand"},{start:232,end:242,type:"strand"},{start:246,end:246,type:"strand"},{start:251,end:251,type:"strand"},{start:252,end:252,type:"strand"},{start:255,end:265,type:"strand"},{start:271,end:283,type:"strand"},{start:292,end:305,type:"strand"},{start:310,end:319,type:"strand"},{start:325,end:330,type:"helix"},{start:337,end:345,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:4.358,y:7.191,z:-12.422},{resSeq:2,iCode:"",x:1.128,y:7.176,z:-14.464},{resSeq:3,iCode:"",x:.059,y:3.522,z:-14.353},{resSeq:4,iCode:"",x:-3.456,y:3.977,z:-15.751},{resSeq:5,iCode:"",x:-4.96,y:6.39,z:-18.336},{resSeq:6,iCode:"",x:-8.087,y:5.165,z:-20.098},{resSeq:7,iCode:"",x:-11.652,y:6.445,z:-20.896},{resSeq:8,iCode:"",x:-11.056,y:9.753,z:-19.057},{resSeq:9,iCode:"",x:-9.665,y:8.275,z:-15.749},{resSeq:10,iCode:"",x:-5.986,y:8.685,z:-14.846},{resSeq:11,iCode:"",x:-4.108,y:7.146,z:-11.903},{resSeq:12,iCode:"",x:-.608,y:8.218,z:-10.871},{resSeq:13,iCode:"",x:1.081,y:5.881,z:-8.359},{resSeq:14,iCode:"",x:4.118,y:7.6,z:-6.846},{resSeq:15,iCode:"",x:6.575,y:7.279,z:-4.027},{resSeq:16,iCode:"",x:10.127,y:7.272,z:-2.855},{resSeq:17,iCode:"",x:12.607,y:5.427,z:-.699},{resSeq:18,iCode:"",x:14.993,y:7.721,z:1.128},{resSeq:19,iCode:"",x:18.013,y:5.859,z:2.52},{resSeq:20,iCode:"",x:18.849,y:8.403,z:5.165},{resSeq:21,iCode:"",x:21.251,y:8.805,z:8.08},{resSeq:22,iCode:"",x:21.621,y:11.554,z:10.709},{resSeq:23,iCode:"",x:24.863,y:12.45,z:12.479},{resSeq:24,iCode:"",x:24.405,y:14.376,z:15.719},{resSeq:25,iCode:"",x:25.639,y:14.732,z:19.282},{resSeq:26,iCode:"",x:21.908,y:14.554,z:20.075},{resSeq:27,iCode:"",x:21.307,y:10.827,z:20.287},{resSeq:28,iCode:"",x:17.505,y:11.209,z:20.063},{resSeq:29,iCode:"",x:17.895,y:12.249,z:16.376},{resSeq:30,iCode:"",x:21.189,y:10.434,z:15.661},{resSeq:31,iCode:"",x:21.278,y:7.27,z:13.515},{resSeq:32,iCode:"",x:19.241,y:5.57,z:10.771},{resSeq:33,iCode:"",x:16.343,y:7.735,z:9.542},{resSeq:34,iCode:"",x:15.433,y:5.643,z:6.461},{resSeq:35,iCode:"",x:11.851,y:5.971,z:5.273},{resSeq:36,iCode:"",x:9.526,y:5.548,z:2.379},{resSeq:37,iCode:"",x:6.519,y:7.473,z:1.078},{resSeq:38,iCode:"",x:3.814,y:6.13,z:-1.186},{resSeq:39,iCode:"",x:.848,y:7.85,z:-2.739},{resSeq:40,iCode:"",x:-1.693,y:8.093,z:-5.483},{resSeq:41,iCode:"",x:-3.31,y:10.936,z:-7.355},{resSeq:42,iCode:"",x:-6.377,y:10.078,z:-9.391},{resSeq:43,iCode:"",x:-8.515,y:12.207,z:-11.689},{resSeq:44,iCode:"",x:-11.715,y:11.474,z:-13.592},{resSeq:45,iCode:"",x:-13.274,y:13.598,z:-16.351},{resSeq:46,iCode:"",x:-16.972,y:14.119,z:-15.538},{resSeq:47,iCode:"",x:-17.651,y:16.645,z:-18.338},{resSeq:48,iCode:"",x:-15.423,y:18.919,z:-20.456},{resSeq:49,iCode:"",x:-15.62,y:21.474,z:-17.605},{resSeq:50,iCode:"",x:-15.905,y:19.248,z:-14.478},{resSeq:51,iCode:"",x:-13.195,y:16.963,z:-13.068},{resSeq:52,iCode:"",x:-13.256,y:14.837,z:-9.93},{resSeq:53,iCode:"",x:-10.087,y:13.878,z:-8.08},{resSeq:54,iCode:"",x:-8.616,y:12.209,z:-5.073},{resSeq:55,iCode:"",x:-5.201,y:12.039,z:-3.494},{resSeq:56,iCode:"",x:-3.657,y:9.935,z:-.769},{resSeq:57,iCode:"",x:-.15,y:9.917,z:.656},{resSeq:58,iCode:"",x:1.334,y:7.719,z:3.348},{resSeq:59,iCode:"",x:4.705,y:7.556,z:5.101},{resSeq:60,iCode:"",x:6.178,y:4.323,z:6.431},{resSeq:61,iCode:"",x:9.352,y:4.468,z:8.499},{resSeq:62,iCode:"",x:12.07,y:2.086,z:7.299},{resSeq:63,iCode:"",x:14.3,y:2.449,z:10.367},{resSeq:64,iCode:"",x:12.481,y:.195,z:12.874},{resSeq:65,iCode:"",x:12.74,y:-3.489,z:13.718},{resSeq:66,iCode:"",x:9.999,y:-5.869,z:12.498},{resSeq:67,iCode:"",x:8.102,y:-5.998,z:15.824},{resSeq:68,iCode:"",x:6.836,y:-2.48,z:15.253},{resSeq:69,iCode:"",x:5.328,y:-.259,z:12.627},{resSeq:70,iCode:"",x:5.616,y:3.531,z:12.579},{resSeq:71,iCode:"",x:3.524,y:4.889,z:9.711},{resSeq:72,iCode:"",x:.959,y:7.615,z:9.064},{resSeq:73,iCode:"",x:-1.298,y:9.295,z:6.568},{resSeq:74,iCode:"",x:.066,y:12.619,z:5.3},{resSeq:75,iCode:"",x:-2.904,y:13.57,z:3.102},{resSeq:76,iCode:"",x:-6.232,y:12.006,z:2.108},{resSeq:77,iCode:"",x:-8.843,y:14.059,z:.253},{resSeq:78,iCode:"",x:-11.446,y:14.052,z:-2.518},{resSeq:79,iCode:"",x:-12.455,y:17.014,z:-4.616},{resSeq:80,iCode:"",x:-14.152,y:18.607,z:-7.6},{resSeq:81,iCode:"",x:-12.644,y:21.115,z:-10.049},{resSeq:82,iCode:"",x:-14.63,y:23.293,z:-12.509},{resSeq:83,iCode:"",x:-12.79,y:24.906,z:-15.441},{resSeq:84,iCode:"",x:-12.411,y:28.698,z:-14.96},{resSeq:85,iCode:"",x:-14.39,y:28.757,z:-11.684},{resSeq:86,iCode:"",x:-12.56,y:26.87,z:-8.939},{resSeq:87,iCode:"",x:-12.114,y:23.711,z:-6.91},{resSeq:88,iCode:"",x:-13.364,y:22.238,z:-3.639},{resSeq:89,iCode:"",x:-11.926,y:19.367,z:-1.637},{resSeq:90,iCode:"",x:-12.354,y:17.823,z:1.815},{resSeq:91,iCode:"",x:-10.162,y:15.519,z:3.981},{resSeq:92,iCode:"",x:-6.701,y:15.52,z:5.533},{resSeq:93,iCode:"",x:-4.884,y:18.22,z:3.575},{resSeq:94,iCode:"",x:-2.588,y:21.218,z:3.967},{resSeq:95,iCode:"",x:-3.792,y:24.356,z:5.729},{resSeq:96,iCode:"",x:-3.991,y:27.463,z:3.529},{resSeq:97,iCode:"",x:-1.182,y:29.157,z:5.445},{resSeq:98,iCode:"",x:1.091,y:26.595,z:3.736},{resSeq:99,iCode:"",x:.241,y:28.154,z:.33},{resSeq:100,iCode:"",x:2.689,y:30.893,z:1.364},{resSeq:101,iCode:"",x:5.065,y:29.145,z:3.816},{resSeq:102,iCode:"",x:5.654,y:26.174,z:1.448},{resSeq:103,iCode:"",x:7.741,y:28.526,z:-.677},{resSeq:104,iCode:"",x:10.674,y:28.25,z:1.779},{resSeq:105,iCode:"",x:10.095,y:24.529,z:2.57},{resSeq:106,iCode:"",x:12.504,y:23.5,z:-.186},{resSeq:107,iCode:"",x:15.579,y:22.333,z:1.772},{resSeq:108,iCode:"",x:17.189,y:18.897,z:1.183},{resSeq:109,iCode:"",x:16.227,y:17.509,z:4.618},{resSeq:110,iCode:"",x:15.466,y:20.167,z:7.248},{resSeq:111,iCode:"",x:13.505,y:23.44,z:7.042},{resSeq:112,iCode:"",x:9.782,y:24.042,z:7.264},{resSeq:113,iCode:"",x:9.821,y:23.799,z:11.056},{resSeq:114,iCode:"",x:8.718,y:27.159,z:12.443},{resSeq:115,iCode:"",x:5.381,y:25.238,z:12.485},{resSeq:116,iCode:"",x:4.379,y:21.542,z:12.465},{resSeq:117,iCode:"",x:1.727,y:18.986,z:11.488},{resSeq:118,iCode:"",x:-1.698,y:19.044,z:13.209},{resSeq:119,iCode:"",x:-.916,y:22.618,z:14.26},{resSeq:120,iCode:"",x:-4.115,y:24.531,z:13.559},{resSeq:121,iCode:"",x:-4.254,y:25.613,z:9.884},{resSeq:122,iCode:"",x:-.472,y:25.855,z:9.398},{resSeq:123,iCode:"",x:.378,y:22.57,z:7.692},{resSeq:124,iCode:"",x:-1.139,y:19.084,z:7.405},{resSeq:125,iCode:"",x:-4.267,y:18.452,z:9.48},{resSeq:126,iCode:"",x:-7.683,y:16.788,z:9.632},{resSeq:127,iCode:"",x:-11.057,y:18.024,z:8.448},{resSeq:128,iCode:"",x:-10.092,y:20.752,z:5.979},{resSeq:129,iCode:"",x:-12.823,y:21.993,z:3.621},{resSeq:130,iCode:"",x:-10.89,y:24,z:1.019},{resSeq:131,iCode:"",x:-12.221,y:26.319,z:-1.751},{resSeq:132,iCode:"",x:-9.794,y:27.623,z:-4.376},{resSeq:133,iCode:"",x:-10.077,y:30.07,z:-7.289},{resSeq:134,iCode:"",x:-7.284,y:30,z:-9.847},{resSeq:135,iCode:"",x:-6.573,y:32.919,z:-12.205},{resSeq:136,iCode:"",x:-9.763,y:34.773,z:-11.036},{resSeq:137,iCode:"",x:-12.297,y:33.001,z:-13.292},{resSeq:138,iCode:"",x:-9.46,y:32.781,z:-15.852},{resSeq:139,iCode:"",x:-9.389,y:36.591,z:-16.192},{resSeq:140,iCode:"",x:-6.139,y:37.364,z:-14.288},{resSeq:141,iCode:"",x:-3.284,y:34.993,z:-15.102},{resSeq:142,iCode:"",x:-1.225,y:34.035,z:-12.028},{resSeq:143,iCode:"",x:-3.598,y:35.325,z:-9.318},{resSeq:144,iCode:"",x:-4.876,y:32.629,z:-6.934},{resSeq:145,iCode:"",x:-6.889,y:32.685,z:-3.745},{resSeq:146,iCode:"",x:-8.273,y:30.183,z:-1.272},{resSeq:147,iCode:"",x:-10.652,y:30.084,z:1.69},{resSeq:148,iCode:"",x:-10.603,y:27.169,z:4.122},{resSeq:149,iCode:"",x:-12.578,y:25.829,z:7.056},{resSeq:150,iCode:"",x:-11.377,y:23.319,z:9.646},{resSeq:151,iCode:"",x:-13.78,y:21.418,z:11.897},{resSeq:152,iCode:"",x:-13.031,y:20.706,z:15.566},{resSeq:153,iCode:"",x:-10.636,y:17.868,z:16.418},{resSeq:154,iCode:"",x:-11.035,y:17.36,z:20.165},{resSeq:155,iCode:"",x:-10.488,y:14.985,z:23.083},{resSeq:156,iCode:"",x:-10.244,y:11.201,z:22.412},{resSeq:157,iCode:"",x:-13.44,y:9.142,z:22.784},{resSeq:158,iCode:"",x:-13.737,y:6.275,z:25.259},{resSeq:159,iCode:"",x:-11.256,y:7.752,z:27.765},{resSeq:160,iCode:"",x:-13.634,y:9.264,z:30.34},{resSeq:161,iCode:"",x:-13.74,y:12.833,z:29.007},{resSeq:162,iCode:"",x:-16.972,y:14.691,z:29.831},{resSeq:163,iCode:"",x:-16.599,y:17.498,z:27.283},{resSeq:164,iCode:"",x:-14.827,y:18.477,z:24.068},{resSeq:165,iCode:"",x:-14.764,y:14.926,z:22.591},{resSeq:166,iCode:"",x:-14.705,y:14.082,z:18.844},{resSeq:167,iCode:"",x:-14.646,y:10.668,z:17.194},{resSeq:168,iCode:"",x:-11.053,y:11.295,z:16.088},{resSeq:169,iCode:"",x:-9.834,y:13.021,z:19.249},{resSeq:170,iCode:"",x:-6.206,y:13.345,z:20.293},{resSeq:171,iCode:"",x:-3.714,y:14.936,z:22.721},{resSeq:172,iCode:"",x:-4.075,y:18.694,z:23.321},{resSeq:173,iCode:"",x:-.914,y:19.693,z:21.421},{resSeq:174,iCode:"",x:-2.619,y:18.334,z:18.282},{resSeq:175,iCode:"",x:-6.212,y:19.57,z:18.914},{resSeq:176,iCode:"",x:-8.078,y:22.492,z:17.315},{resSeq:177,iCode:"",x:-11.52,y:24.075,z:17.512},{resSeq:178,iCode:"",x:-13.331,y:25.323,z:14.403},{resSeq:179,iCode:"",x:-11.11,y:27.433,z:12.173},{resSeq:180,iCode:"",x:-11.241,y:29.606,z:9.097},{resSeq:181,iCode:"",x:-8.435,y:30.901,z:6.882},{resSeq:182,iCode:"",x:-7.537,y:32.448,z:3.542},{resSeq:183,iCode:"",x:-4.653,y:32.933,z:1.16},{resSeq:184,iCode:"",x:-3.818,y:35.105,z:-1.841},{resSeq:185,iCode:"",x:-.81,y:34.642,z:-4.109},{resSeq:186,iCode:"",x:.27,y:36.38,z:-7.315},{resSeq:187,iCode:"",x:2.991,y:35.074,z:-9.627},{resSeq:188,iCode:"",x:4.232,y:37.139,z:-12.568},{resSeq:189,iCode:"",x:6.962,y:35.587,z:-14.709},{resSeq:190,iCode:"",x:9.573,y:34.504,z:-12.112},{resSeq:191,iCode:"",x:8.314,y:36.658,z:-9.227},{resSeq:192,iCode:"",x:5.818,y:35.731,z:-6.514},{resSeq:193,iCode:"",x:4.104,y:37.601,z:-3.675},{resSeq:194,iCode:"",x:1.638,y:36.141,z:-1.176},{resSeq:195,iCode:"",x:-.225,y:36.487,z:2.1},{resSeq:196,iCode:"",x:-2.325,y:34.303,z:4.397},{resSeq:197,iCode:"",x:-4.457,y:34.547,z:7.536},{resSeq:198,iCode:"",x:-5.872,y:31.879,z:9.861},{resSeq:199,iCode:"",x:-8.053,y:32.026,z:12.967},{resSeq:200,iCode:"",x:-8.921,y:28.944,z:15},{resSeq:201,iCode:"",x:-10.876,y:28.497,z:18.204},{resSeq:202,iCode:"",x:-8.734,y:26.85,z:20.878},{resSeq:203,iCode:"",x:-10.276,y:23.999,z:22.911},{resSeq:204,iCode:"",x:-10.703,y:23.836,z:26.709},{resSeq:205,iCode:"",x:-8.201,y:20.972,z:26.891},{resSeq:206,iCode:"",x:-5.604,y:23.342,z:25.376},{resSeq:207,iCode:"",x:-6.359,y:26.194,z:27.811},{resSeq:208,iCode:"",x:-5.355,y:24.508,z:31.092},{resSeq:209,iCode:"",x:-2.57,y:25.382,z:33.552},{resSeq:210,iCode:"",x:-.595,y:22.398,z:32.215},{resSeq:211,iCode:"",x:.201,y:24.414,z:29.036},{resSeq:212,iCode:"",x:1.757,y:27.851,z:28.482},{resSeq:213,iCode:"",x:.043,y:30.186,z:25.97},{resSeq:214,iCode:"",x:-3.596,y:30.055,z:27.103},{resSeq:215,iCode:"",x:-5.965,y:31.936,z:24.79},{resSeq:216,iCode:"",x:-9.402,y:31.992,z:23.192},{resSeq:217,iCode:"",x:-8.14,y:31.663,z:19.605},{resSeq:218,iCode:"",x:-4.999,y:30.868,z:17.617},{resSeq:219,iCode:"",x:-4.205,y:33.436,z:14.888},{resSeq:220,iCode:"",x:-1.517,y:33.586,z:12.196},{resSeq:221,iCode:"",x:-.545,y:36.327,z:9.721},{resSeq:222,iCode:"",x:1.916,y:35.523,z:6.935},{resSeq:223,iCode:"",x:3.657,y:37.394,z:4.106},{resSeq:224,iCode:"",x:5.915,y:35.783,z:1.519},{resSeq:225,iCode:"",x:8.111,y:36.59,z:-1.48},{resSeq:226,iCode:"",x:9.591,y:34.35,z:-4.177},{resSeq:227,iCode:"",x:11.87,y:34.476,z:-7.219},{resSeq:228,iCode:"",x:12.101,y:31.392,z:-9.461},{resSeq:229,iCode:"",x:13.842,y:31.804,z:-12.844},{resSeq:230,iCode:"",x:17.23,y:31.579,z:-14.593},{resSeq:231,iCode:"",x:18.32,y:28.606,z:-12.407},{resSeq:232,iCode:"",x:17.992,y:30.75,z:-9.248},{resSeq:233,iCode:"",x:15.504,y:30.147,z:-6.451},{resSeq:234,iCode:"",x:15.055,y:32.755,z:-3.728},{resSeq:235,iCode:"",x:12.267,y:32.899,z:-1.16},{resSeq:236,iCode:"",x:11.427,y:34.386,z:2.236},{resSeq:237,iCode:"",x:8.406,y:34.27,z:4.541},{resSeq:238,iCode:"",x:7.526,y:36.157,z:7.714},{resSeq:239,iCode:"",x:4.746,y:35.039,z:10.059},{resSeq:240,iCode:"",x:3.347,y:36.57,z:13.246},{resSeq:241,iCode:"",x:1.343,y:34.145,z:15.412},{resSeq:242,iCode:"",x:-.825,y:34.34,z:18.547},{resSeq:243,iCode:"",x:-1.341,y:31.254,z:20.727},{resSeq:244,iCode:"",x:-.542,y:29.173,z:17.625},{resSeq:245,iCode:"",x:3.175,y:28.238,z:17.639},{resSeq:246,iCode:"",x:4.147,y:25.221,z:19.752},{resSeq:247,iCode:"",x:6.977,y:25.639,z:22.222},{resSeq:248,iCode:"",x:8.152,y:22.047,z:22.254},{resSeq:249,iCode:"",x:6.094,y:20.079,z:24.778},{resSeq:250,iCode:"",x:5.36,y:23.12,z:27.025},{resSeq:251,iCode:"",x:2.316,y:24.373,z:25.09},{resSeq:252,iCode:"",x:2.18,y:27.439,z:22.814},{resSeq:253,iCode:"",x:3.747,y:30.904,z:22.482},{resSeq:254,iCode:"",x:1.582,y:33.87,z:23.483},{resSeq:255,iCode:"",x:3.153,y:35.642,z:20.521},{resSeq:256,iCode:"",x:5.822,y:34.422,z:18.111},{resSeq:257,iCode:"",x:7.567,y:35.996,z:15.131},{resSeq:258,iCode:"",x:8.763,y:33.47,z:12.545},{resSeq:259,iCode:"",x:11.138,y:34.12,z:9.65},{resSeq:260,iCode:"",x:12.513,y:31.782,z:6.959},{resSeq:261,iCode:"",x:14.743,y:32.587,z:3.962},{resSeq:262,iCode:"",x:16.31,y:30.334,z:1.293},{resSeq:263,iCode:"",x:18.755,y:30.743,z:-1.611},{resSeq:264,iCode:"",x:19.338,y:27.957,z:-4.153},{resSeq:265,iCode:"",x:21.081,y:27.589,z:-7.518},{resSeq:266,iCode:"",x:20.761,y:24.79,z:-10.092},{resSeq:267,iCode:"",x:23.909,y:23.916,z:-12.05},{resSeq:268,iCode:"",x:23.492,y:22.389,z:-15.518},{resSeq:269,iCode:"",x:25.465,y:19.309,z:-14.465},{resSeq:270,iCode:"",x:22.931,y:18.489,z:-11.693},{resSeq:271,iCode:"",x:24.22,y:20.034,z:-8.454},{resSeq:272,iCode:"",x:21.881,y:22.266,z:-6.451},{resSeq:273,iCode:"",x:23.463,y:23.951,z:-3.415},{resSeq:274,iCode:"",x:21.152,y:25.53,z:-.846},{resSeq:275,iCode:"",x:21.57,y:28.109,z:1.92},{resSeq:276,iCode:"",x:18.852,y:28.922,z:4.439},{resSeq:277,iCode:"",x:18.147,y:30.703,z:7.701},{resSeq:278,iCode:"",x:15.204,y:30.037,z:10.044},{resSeq:279,iCode:"",x:14.242,y:31.584,z:13.37},{resSeq:280,iCode:"",x:11.223,y:31.64,z:15.666},{resSeq:281,iCode:"",x:11.225,y:34.284,z:18.413},{resSeq:282,iCode:"",x:8.706,y:33.881,z:21.23},{resSeq:283,iCode:"",x:7.537,y:36.754,z:23.438},{resSeq:284,iCode:"",x:5.692,y:37.041,z:26.793},{resSeq:285,iCode:"",x:5.854,y:33.245,z:27.151},{resSeq:286,iCode:"",x:4.903,y:33.016,z:30.847},{resSeq:287,iCode:"",x:6.415,y:31.054,z:33.76},{resSeq:288,iCode:"",x:9.335,y:33.529,z:33.804},{resSeq:289,iCode:"",x:10.536,y:32.454,z:30.344},{resSeq:290,iCode:"",x:9.784,y:35.938,z:28.957},{resSeq:291,iCode:"",x:11.359,y:36.358,z:25.48},{resSeq:292,iCode:"",x:13.124,y:33.269,z:24.099},{resSeq:293,iCode:"",x:14.298,y:31.802,z:20.79},{resSeq:294,iCode:"",x:12.136,y:28.772,z:19.948},{resSeq:295,iCode:"",x:14.145,y:27.957,z:16.806},{resSeq:296,iCode:"",x:17.294,y:29.442,z:15.248},{resSeq:297,iCode:"",x:19.521,y:27.798,z:12.623},{resSeq:298,iCode:"",x:21.514,y:28.154,z:9.43},{resSeq:299,iCode:"",x:21.145,y:25.33,z:6.949},{resSeq:300,iCode:"",x:23.792,y:24.623,z:4.326},{resSeq:301,iCode:"",x:23.322,y:21.74,z:1.919},{resSeq:302,iCode:"",x:23.353,y:20.411,z:-1.595},{resSeq:303,iCode:"",x:21.447,y:17.916,z:-3.706},{resSeq:304,iCode:"",x:22.853,y:16.106,z:-6.702},{resSeq:305,iCode:"",x:20.255,y:15.034,z:-9.258},{resSeq:306,iCode:"",x:21.319,y:12.044,z:-11.335},{resSeq:307,iCode:"",x:17.97,y:12.366,z:-13.073},{resSeq:308,iCode:"",x:14.275,y:12.924,z:-12.184},{resSeq:309,iCode:"",x:14.205,y:9.528,z:-10.396},{resSeq:310,iCode:"",x:17.516,y:9.381,z:-8.457},{resSeq:311,iCode:"",x:19.267,y:11.888,z:-6.256},{resSeq:312,iCode:"",x:21.591,y:12.164,z:-3.273},{resSeq:313,iCode:"",x:22.034,y:14.972,z:-.723},{resSeq:314,iCode:"",x:23.861,y:16.311,z:2.304},{resSeq:315,iCode:"",x:22.22,y:18.845,z:4.63},{resSeq:316,iCode:"",x:24.054,y:20.501,z:7.551},{resSeq:317,iCode:"",x:21.945,y:22.093,z:10.281},{resSeq:318,iCode:"",x:24.149,y:24.588,z:12.108},{resSeq:319,iCode:"",x:22.063,y:25.076,z:15.253},{resSeq:320,iCode:"",x:22.462,y:28.524,z:16.82},{resSeq:321,iCode:"",x:20.27,y:27.776,z:19.866},{resSeq:322,iCode:"",x:22.243,y:27.467,z:23.099},{resSeq:323,iCode:"",x:21.578,y:24.846,z:25.768},{resSeq:324,iCode:"",x:19.631,y:26.606,z:28.542},{resSeq:325,iCode:"",x:16.875,y:25.919,z:31.083},{resSeq:326,iCode:"",x:14.127,y:26.94,z:28.646},{resSeq:327,iCode:"",x:15.222,y:24.634,z:25.789},{resSeq:328,iCode:"",x:15.81,y:21.81,z:28.315},{resSeq:329,iCode:"",x:12.275,y:22.199,z:29.749},{resSeq:330,iCode:"",x:10.686,y:22.304,z:26.277},{resSeq:331,iCode:"",x:12.849,y:19.5,z:24.846},{resSeq:332,iCode:"",x:14.068,y:21.618,z:21.933},{resSeq:333,iCode:"",x:17.129,y:20.311,z:20.045},{resSeq:334,iCode:"",x:20.144,y:22.642,z:20.283},{resSeq:335,iCode:"",x:22.795,y:20.444,z:18.623},{resSeq:336,iCode:"",x:23.931,y:20.536,z:14.977},{resSeq:337,iCode:"",x:22.888,y:17.729,z:12.613},{resSeq:338,iCode:"",x:24.397,y:16.404,z:9.372},{resSeq:339,iCode:"",x:22.024,y:14.426,z:7.133},{resSeq:340,iCode:"",x:23.126,y:12.226,z:4.238},{resSeq:341,iCode:"",x:20.465,y:10.861,z:1.939},{resSeq:342,iCode:"",x:20.166,y:8.714,z:-1.172},{resSeq:343,iCode:"",x:16.744,y:8.792,z:-2.811},{resSeq:344,iCode:"",x:15.037,y:6.727,z:-5.492},{resSeq:345,iCode:"",x:11.633,y:8.016,z:-6.591},{resSeq:346,iCode:"",x:8.915,y:7.228,z:-9.121}]},{chainId:"B",residueCount:346,segments:[{start:2,end:6,type:"strand"},{start:9,end:23,type:"strand"},{start:31,end:32,type:"strand"},{start:35,end:45,type:"strand"},{start:50,end:61,type:"strand"},{start:71,end:82,type:"strand"},{start:86,end:94,type:"strand"},{start:98,end:101,type:"helix"},{start:102,end:104,type:"helix"},{start:124,end:133,type:"strand"},{start:143,end:150,type:"strand"},{start:153,end:153,type:"strand"},{start:155,end:155,type:"strand"},{start:156,end:156,type:"helix"},{start:165,end:165,type:"strand"},{start:172,end:174,type:"helix"},{start:176,end:176,type:"strand"},{start:179,end:188,type:"strand"},{start:191,end:201,type:"strand"},{start:202,end:203,type:"helix"},{start:212,end:212,type:"strand"},{start:217,end:229,type:"strand"},{start:232,end:242,type:"strand"},{start:246,end:246,type:"strand"},{start:251,end:251,type:"strand"},{start:252,end:252,type:"strand"},{start:255,end:265,type:"strand"},{start:271,end:283,type:"strand"},{start:292,end:307,type:"strand"},{start:310,end:319,type:"strand"},{start:325,end:330,type:"helix"},{start:337,end:345,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:-8.243,y:-.009,z:-12.404},{resSeq:2,iCode:"",x:-6.653,y:-2.813,z:-14.43},{resSeq:3,iCode:"",x:-2.944,y:-1.932,z:-14.202},{resSeq:4,iCode:"",x:-1.603,y:-5.203,z:-15.598},{resSeq:5,iCode:"",x:-2.932,y:-7.764,z:-18.09},{resSeq:6,iCode:"",x:-.291,y:-9.958,z:-19.764},{resSeq:7,iCode:"",x:.597,y:-13.616,z:-20.422},{resSeq:8,iCode:"",x:-2.502,y:-14.959,z:-18.646},{resSeq:9,iCode:"",x:-2.287,y:-12.805,z:-15.455},{resSeq:10,iCode:"",x:-4.419,y:-9.744,z:-14.697},{resSeq:11,iCode:"",x:-4.139,y:-7.318,z:-11.751},{resSeq:12,iCode:"",x:-6.805,y:-4.802,z:-10.726},{resSeq:13,iCode:"",x:-5.473,y:-2.198,z:-8.29},{resSeq:14,iCode:"",x:-8.491,y:-.448,z:-6.767},{resSeq:15,iCode:"",x:-9.391,y:1.979,z:-4.021},{resSeq:16,iCode:"",x:-11.214,y:5.011,z:-2.789},{resSeq:17,iCode:"",x:-10.849,y:8.149,z:-.743},{resSeq:18,iCode:"",x:-14.065,y:9.156,z:1.027},{resSeq:19,iCode:"",x:-13.951,y:12.678,z:2.462},{resSeq:20,iCode:"",x:-16.594,y:12.117,z:5.108},{resSeq:21,iCode:"",x:-18.046,y:14.139,z:8.025},{resSeq:22,iCode:"",x:-20.582,y:13.047,z:10.686},{resSeq:23,iCode:"",x:-22.896,y:15.427,z:12.533},{resSeq:24,iCode:"",x:-24.245,y:14.05,z:15.834},{resSeq:25,iCode:"",x:-24.954,y:14.874,z:19.491},{resSeq:26,iCode:"",x:-23.048,y:11.655,z:20.243},{resSeq:27,iCode:"",x:-19.56,y:13.129,z:20.333},{resSeq:28,iCode:"",x:-18,y:9.655,z:20.11},{resSeq:29,iCode:"",x:-19.139,y:9.508,z:16.441},{resSeq:30,iCode:"",x:-19.294,y:13.253,z:15.645},{resSeq:31,iCode:"",x:-16.68,y:14.912,z:13.418},{resSeq:32,iCode:"",x:-14.199,y:14.063,z:10.665},{resSeq:33,iCode:"",x:-14.569,y:10.457,z:9.438},{resSeq:34,iCode:"",x:-12.35,y:10.626,z:6.333},{resSeq:35,iCode:"",x:-10.988,y:7.232,z:5.241},{resSeq:36,iCode:"",x:-9.415,y:5.412,z:2.339},{resSeq:37,iCode:"",x:-9.492,y:1.856,z:1.094},{resSeq:38,iCode:"",x:-7.035,y:.185,z:-1.18},{resSeq:39,iCode:"",x:-7.003,y:-3.327,z:-2.593},{resSeq:40,iCode:"",x:-6.026,y:-5.638,z:-5.412},{resSeq:41,iCode:"",x:-7.836,y:-8.444,z:-7.237},{resSeq:42,iCode:"",x:-5.55,y:-10.689,z:-9.279},{resSeq:43,iCode:"",x:-6.445,y:-13.642,z:-11.496},{resSeq:44,iCode:"",x:-4.349,y:-16.097,z:-13.496},{resSeq:45,iCode:"",x:-5.598,y:-18.526,z:-16.163},{resSeq:46,iCode:"",x:-4.044,y:-21.921,z:-15.411},{resSeq:47,iCode:"",x:-6.062,y:-23.827,z:-18.022},{resSeq:48,iCode:"",x:-9.149,y:-23.023,z:-20.12},{resSeq:49,iCode:"",x:-11.262,y:-24.34,z:-17.189},{resSeq:50,iCode:"",x:-9.078,y:-23.556,z:-14.133},{resSeq:51,iCode:"",x:-8.331,y:-20.059,z:-12.825},{resSeq:52,iCode:"",x:-6.36,y:-18.973,z:-9.777},{resSeq:53,iCode:"",x:-7.069,y:-15.812,z:-7.813},{resSeq:54,iCode:"",x:-6.088,y:-13.628,z:-4.879},{resSeq:55,iCode:"",x:-7.772,y:-10.618,z:-3.281},{resSeq:56,iCode:"",x:-6.704,y:-8.21,z:-.579},{resSeq:57,iCode:"",x:-8.399,y:-5.101,z:.777},{resSeq:58,iCode:"",x:-7.178,y:-2.647,z:3.412},{resSeq:59,iCode:"",x:-8.692,y:.382,z:5.173},{resSeq:60,iCode:"",x:-6.619,y:3.293,z:6.453},{resSeq:61,iCode:"",x:-8.27,y:6.006,z:8.502},{resSeq:62,iCode:"",x:-7.645,y:9.53,z:7.166},{resSeq:63,iCode:"",x:-9.082,y:11.337,z:10.203},{resSeq:64,iCode:"",x:-6.246,y:10.889,z:12.704},{resSeq:65,iCode:"",x:-3.205,y:13.008,z:13.529},{resSeq:66,iCode:"",x:.258,y:11.89,z:12.345},{resSeq:67,iCode:"",x:1.331,y:10.379,z:15.692},{resSeq:68,iCode:"",x:-1.249,y:7.568,z:15.271},{resSeq:69,iCode:"",x:-2.308,y:5.063,z:12.631},{resSeq:70,iCode:"",x:-5.638,y:3.318,z:12.528},{resSeq:71,iCode:"",x:-5.714,y:.719,z:9.745},{resSeq:72,iCode:"",x:-6.825,y:-2.887,z:9.182},{resSeq:73,iCode:"",x:-7.224,y:-5.711,z:6.684},{resSeq:74,iCode:"",x:-10.775,y:-6.146,z:5.482},{resSeq:75,iCode:"",x:-10.133,y:-9.25,z:3.341},{resSeq:76,iCode:"",x:-7.106,y:-11.338,z:2.322},{resSeq:77,iCode:"",x:-7.636,y:-14.652,z:.521},{resSeq:78,iCode:"",x:-6.429,y:-16.947,z:-2.249},{resSeq:79,iCode:"",x:-8.444,y:-19.446,z:-4.257},{resSeq:80,iCode:"",x:-9.029,y:-21.664,z:-7.265},{resSeq:81,iCode:"",x:-12.049,y:-21.696,z:-9.6},{resSeq:82,iCode:"",x:-12.995,y:-24.551,z:-11.954},{resSeq:83,iCode:"",x:-15.623,y:-23.936,z:-14.688},{resSeq:84,iCode:"",x:-18.987,y:-25.59,z:-13.798},{resSeq:85,iCode:"",x:-17.555,y:-27.419,z:-10.752},{resSeq:86,iCode:"",x:-16.982,y:-24.61,z:-8.24},{resSeq:87,iCode:"",x:-14.553,y:-22.33,z:-6.44},{resSeq:88,iCode:"",x:-12.549,y:-22.74,z:-3.244},{resSeq:89,iCode:"",x:-10.788,y:-20.002,z:-1.271},{resSeq:90,iCode:"",x:-9.195,y:-19.621,z:2.176},{resSeq:91,iCode:"",x:-8.282,y:-16.519,z:4.155},{resSeq:92,iCode:"",x:-9.892,y:-13.525,z:5.755},{resSeq:93,iCode:"",x:-13.193,y:-13.277,z:3.894},{resSeq:94,iCode:"",x:-16.96,y:-12.769,z:4.307},{resSeq:95,iCode:"",x:-19.113,y:-15.337,z:6.111},{resSeq:96,iCode:"",x:-21.728,y:-16.981,z:3.903},{resSeq:97,iCode:"",x:-24.571,y:-15.39,z:5.932},{resSeq:98,iCode:"",x:-23.554,y:-12.124,z:4.203},{resSeq:99,iCode:"",x:-24.506,y:-13.715,z:.837},{resSeq:100,iCode:"",x:-28.077,y:-12.864,z:1.901},{resSeq:101,iCode:"",x:-27.759,y:-10.003,z:4.402},{resSeq:102,iCode:"",x:-25.538,y:-8.02,z:1.953},{resSeq:103,iCode:"",x:-28.648,y:-7.417,z:-.157},{resSeq:104,iCode:"",x:-29.795,y:-4.674,z:2.255},{resSeq:105,iCode:"",x:-26.253,y:-3.408,z:2.854},{resSeq:106,iCode:"",x:-26.654,y:-.736,z:.177},{resSeq:107,iCode:"",x:-27.22,y:2.553,z:2.054},{resSeq:108,iCode:"",x:-25.07,y:5.66,z:1.27},{resSeq:109,iCode:"",x:-23.225,y:5.476,z:4.636},{resSeq:110,iCode:"",x:-25.103,y:3.552,z:7.351},{resSeq:111,iCode:"",x:-26.886,y:.163,z:7.314},{resSeq:112,iCode:"",x:-25.535,y:-3.375,z:7.611},{resSeq:113,iCode:"",x:-25.198,y:-3.085,z:11.393},{resSeq:114,iCode:"",x:-27.561,y:-5.672,z:12.89},{resSeq:115,iCode:"",x:-24.258,y:-7.613,z:12.863},{resSeq:116,iCode:"",x:-20.572,y:-6.673,z:12.907},{resSeq:117,iCode:"",x:-17.117,y:-7.787,z:11.871},{resSeq:118,iCode:"",x:-15.391,y:-10.741,z:13.528},{resSeq:119,iCode:"",x:-18.85,y:-11.815,z:14.725},{resSeq:120,iCode:"",x:-18.969,y:-15.528,z:14.014},{resSeq:121,iCode:"",x:-19.94,y:-16.25,z:10.372},{resSeq:122,iCode:"",x:-22.077,y:-13.13,z:9.865},{resSeq:123,iCode:"",x:-19.638,y:-10.851,z:8.021},{resSeq:124,iCode:"",x:-15.831,y:-10.429,z:7.668},{resSeq:125,iCode:"",x:-13.678,y:-12.823,z:9.752},{resSeq:126,iCode:"",x:-10.513,y:-14.931,z:9.877},{resSeq:127,iCode:"",x:-9.925,y:-18.524,z:8.745},{resSeq:128,iCode:"",x:-12.819,y:-19.022,z:6.333},{resSeq:129,iCode:"",x:-12.614,y:-21.988,z:3.97},{resSeq:130,iCode:"",x:-15.346,y:-21.362,z:1.386},{resSeq:131,iCode:"",x:-16.747,y:-23.45,z:-1.447},{resSeq:132,iCode:"",x:-19.011,y:-21.639,z:-3.936},{resSeq:133,iCode:"",x:-21.019,y:-22.943,z:-6.905},{resSeq:134,iCode:"",x:-22.506,y:-20.584,z:-9.511},{resSeq:135,iCode:"",x:-25.522,y:-21.531,z:-11.684},{resSeq:136,iCode:"",x:-25.658,y:-25.014,z:-10.107},{resSeq:137,iCode:"",x:-22.786,y:-26.643,z:-12.013},{resSeq:138,iCode:"",x:-23.942,y:-24.602,z:-15.035},{resSeq:139,iCode:"",x:-27.287,y:-26.463,z:-15.141},{resSeq:140,iCode:"",x:-29.594,y:-23.854,z:-13.549},{resSeq:141,iCode:"",x:-29.025,y:-20.199,z:-14.457},{resSeq:142,iCode:"",x:-29.337,y:-17.892,z:-11.447},{resSeq:143,iCode:"",x:-29.056,y:-20.619,z:-8.754},{resSeq:144,iCode:"",x:-26.045,y:-20.151,z:-6.47},{resSeq:145,iCode:"",x:-24.958,y:-21.908,z:-3.292},{resSeq:146,iCode:"",x:-22.063,y:-21.881,z:-.829},{resSeq:147,iCode:"",x:-20.718,y:-24.096,z:1.969},{resSeq:148,iCode:"",x:-18.251,y:-22.718,z:4.488},{resSeq:149,iCode:"",x:-16.098,y:-23.742,z:7.471},{resSeq:150,iCode:"",x:-14.456,y:-21.386,z:9.93},{resSeq:151,iCode:"",x:-11.595,y:-22.486,z:12.133},{resSeq:152,iCode:"",x:-11.39,y:-21.513,z:15.796},{resSeq:153,iCode:"",x:-9.925,y:-18.058,z:16.601},{resSeq:154,iCode:"",x:-9.347,y:-18.103,z:20.364},{resSeq:155,iCode:"",x:-7.422,y:-16.594,z:23.289},{resSeq:156,iCode:"",x:-4.288,y:-14.487,z:22.705},{resSeq:157,iCode:"",x:-.957,y:-16.336,z:22.808},{resSeq:158,iCode:"",x:1.786,y:-15.367,z:25.254},{resSeq:159,iCode:"",x:-.588,y:-14.063,z:27.928},{resSeq:160,iCode:"",x:-.81,y:-16.907,z:30.462},{resSeq:161,iCode:"",x:-4.027,y:-18.519,z:29.17},{resSeq:162,iCode:"",x:-3.92,y:-22.274,z:29.815},{resSeq:163,iCode:"",x:-6.61,y:-23.267,z:27.303},{resSeq:164,iCode:"",x:-8.396,y:-22.049,z:24.177},{resSeq:165,iCode:"",x:-5.279,y:-20.363,z:22.735},{resSeq:166,iCode:"",x:-4.622,y:-19.832,z:19.016},{resSeq:167,iCode:"",x:-1.655,y:-18.004,z:17.383},{resSeq:168,iCode:"",x:-3.962,y:-15.178,z:16.259},{resSeq:169,iCode:"",x:-6.048,y:-15.004,z:19.442},{resSeq:170,iCode:"",x:-8.081,y:-11.995,z:20.493},{resSeq:171,iCode:"",x:-10.654,y:-10.597,z:22.963},{resSeq:172,iCode:"",x:-13.743,y:-12.732,z:23.684},{resSeq:173,iCode:"",x:-16.132,y:-10.449,z:21.756},{resSeq:174,iCode:"",x:-14.171,y:-11.27,z:18.576},{resSeq:175,iCode:"",x:-13.432,y:-14.98,z:19.212},{resSeq:176,iCode:"",x:-15.11,y:-18.017,z:17.642},{resSeq:177,iCode:"",x:-14.886,y:-21.798,z:17.796},{resSeq:178,iCode:"",x:-15.175,y:-24.128,z:14.803},{resSeq:179,iCode:"",x:-18.128,y:-23.147,z:12.629},{resSeq:180,iCode:"",x:-20.107,y:-24.327,z:9.614},{resSeq:181,iCode:"",x:-22.457,y:-22.378,z:7.361},{resSeq:182,iCode:"",x:-24.306,y:-22.554,z:4.063},{resSeq:183,iCode:"",x:-26.226,y:-20.242,z:1.754},{resSeq:184,iCode:"",x:-28.458,y:-20.553,z:-1.293},{resSeq:185,iCode:"",x:-29.767,y:-17.767,z:-3.527},{resSeq:186,iCode:"",x:-31.917,y:-17.794,z:-6.657},{resSeq:187,iCode:"",x:-32.335,y:-14.836,z:-8.975},{resSeq:188,iCode:"",x:-34.82,y:-14.91,z:-11.879},{resSeq:189,iCode:"",x:-35.093,y:-11.737,z:-13.961},{resSeq:190,iCode:"",x:-35.559,y:-8.862,z:-11.457},{resSeq:191,iCode:"",x:-36.407,y:-11.043,z:-8.461},{resSeq:192,iCode:"",x:-34.246,y:-12.717,z:-5.804},{resSeq:193,iCode:"",x:-34.838,y:-15.078,z:-2.874},{resSeq:194,iCode:"",x:-32.221,y:-16.516,z:-.529},{resSeq:195,iCode:"",x:-31.491,y:-18.272,z:2.709},{resSeq:196,iCode:"",x:-28.528,y:-18.94,z:4.978},{resSeq:197,iCode:"",x:-27.659,y:-20.799,z:8.187},{resSeq:198,iCode:"",x:-24.541,y:-20.742,z:10.361},{resSeq:199,iCode:"",x:-23.601,y:-22.611,z:13.499},{resSeq:200,iCode:"",x:-20.409,y:-21.925,z:15.459},{resSeq:201,iCode:"",x:-19.011,y:-23.451,z:18.655},{resSeq:202,iCode:"",x:-18.625,y:-20.67,z:21.256},{resSeq:203,iCode:"",x:-15.391,y:-20.579,z:23.28},{resSeq:204,iCode:"",x:-14.718,y:-20.908,z:27.02},{resSeq:205,iCode:"",x:-13.678,y:-17.247,z:27.181},{resSeq:206,iCode:"",x:-17.055,y:-16.222,z:25.724},{resSeq:207,iCode:"",x:-19.076,y:-18.379,z:28.128},{resSeq:208,iCode:"",x:-18.275,y:-16.732,z:31.471},{resSeq:209,iCode:"",x:-20.288,y:-14.602,z:33.918},{resSeq:210,iCode:"",x:-18.462,y:-11.591,z:32.412},{resSeq:211,iCode:"",x:-20.823,y:-11.714,z:29.396},{resSeq:212,iCode:"",x:-24.54,y:-12.045,z:28.732},{resSeq:213,iCode:"",x:-25.646,y:-14.636,z:26.162},{resSeq:214,iCode:"",x:-23.859,y:-17.814,z:27.328},{resSeq:215,iCode:"",x:-24.465,y:-20.986,z:25.295},{resSeq:216,iCode:"",x:-22.774,y:-23.88,z:23.511},{resSeq:217,iCode:"",x:-23.18,y:-22.471,z:19.984},{resSeq:218,iCode:"",x:-23.748,y:-19.177,z:18.182},{resSeq:219,iCode:"",x:-26.415,y:-19.78,z:15.496},{resSeq:220,iCode:"",x:-28.095,y:-17.692,z:12.78},{resSeq:221,iCode:"",x:-31.025,y:-18.376,z:10.43},{resSeq:222,iCode:"",x:-31.586,y:-15.842,z:7.637},{resSeq:223,iCode:"",x:-34.086,y:-15.301,z:4.804},{resSeq:224,iCode:"",x:-33.94,y:-12.582,z:2.143},{resSeq:225,iCode:"",x:-35.921,y:-11.135,z:-.79},{resSeq:226,iCode:"",x:-34.832,y:-8.777,z:-3.576},{resSeq:227,iCode:"",x:-36.175,y:-6.795,z:-6.559},{resSeq:228,iCode:"",x:-33.634,y:-5.097,z:-8.846},{resSeq:229,iCode:"",x:-35.12,y:-3.992,z:-12.182},{resSeq:230,iCode:"",x:-36.548,y:-.96,z:-13.984},{resSeq:231,iCode:"",x:-34.454,y:1.564,z:-11.988},{resSeq:232,iCode:"",x:-35.924,y:.292,z:-8.675},{resSeq:233,iCode:"",x:-34.076,y:-1.612,z:-5.931},{resSeq:234,iCode:"",x:-36.078,y:-3.214,z:-3.1},{resSeq:235,iCode:"",x:-34.662,y:-5.61,z:-.499},{resSeq:236,iCode:"",x:-35.537,y:-7.073,z:2.905},{resSeq:237,iCode:"",x:-33.883,y:-9.598,z:5.239},{resSeq:238,iCode:"",x:-34.961,y:-11.28,z:8.499},{resSeq:239,iCode:"",x:-32.41,y:-13.047,z:10.747},{resSeq:240,iCode:"",x:-33.086,y:-14.955,z:13.998},{resSeq:241,iCode:"",x:-29.966,y:-15.406,z:16.097},{resSeq:242,iCode:"",x:-29.001,y:-17.309,z:19.236},{resSeq:243,iCode:"",x:-26.021,y:-16.245,z:21.346},{resSeq:244,iCode:"",x:-24.681,y:-14.597,z:18.127},{resSeq:245,iCode:"",x:-25.791,y:-10.956,z:17.989},{resSeq:246,iCode:"",x:-23.517,y:-8.681,z:20.027},{resSeq:247,iCode:"",x:-25.16,y:-6.411,z:22.58},{resSeq:248,iCode:"",x:-22.693,y:-3.545,z:22.684},{resSeq:249,iCode:"",x:-19.98,y:-4.336,z:25.228},{resSeq:250,iCode:"",x:-22.179,y:-6.634,z:27.378},{resSeq:251,iCode:"",x:-21.815,y:-9.858,z:25.358},{resSeq:252,iCode:"",x:-24.445,y:-11.475,z:23.116},{resSeq:253,iCode:"",x:-28.254,y:-11.754,z:22.912},{resSeq:254,iCode:"",x:-29.633,y:-15.12,z:24.076},{resSeq:255,iCode:"",x:-32.056,y:-14.612,z:21.205},{resSeq:256,iCode:"",x:-32.383,y:-11.756,z:18.713},{resSeq:257,iCode:"",x:-34.743,y:-11.107,z:15.804},{resSeq:258,iCode:"",x:-33.133,y:-8.806,z:13.22},{resSeq:259,iCode:"",x:-34.958,y:-7.105,z:10.311},{resSeq:260,iCode:"",x:-33.661,y:-4.778,z:7.562},{resSeq:261,iCode:"",x:-35.61,y:-3.343,z:4.576},{resSeq:262,iCode:"",x:-34.495,y:-.886,z:1.849},{resSeq:263,iCode:"",x:-36.133,y:.941,z:-1.089},{resSeq:264,iCode:"",x:-34.08,y:2.881,z:-3.664},{resSeq:265,iCode:"",x:-34.64,y:4.436,z:-7.093},{resSeq:266,iCode:"",x:-32.027,y:5.338,z:-9.72},{resSeq:267,iCode:"",x:-32.767,y:8.454,z:-11.777},{resSeq:268,iCode:"",x:-31.271,y:8.56,z:-15.271},{resSeq:269,iCode:"",x:-29.289,y:11.726,z:-14.462},{resSeq:270,iCode:"",x:-27.446,y:10.054,z:-11.525},{resSeq:271,iCode:"",x:-29.444,y:10.769,z:-8.346},{resSeq:272,iCode:"",x:-30.299,y:7.737,z:-6.178},{resSeq:273,iCode:"",x:-32.574,y:8.374,z:-3.161},{resSeq:274,iCode:"",x:-32.795,y:5.709,z:-.472},{resSeq:275,iCode:"",x:-35.191,y:4.854,z:2.368},{resSeq:276,iCode:"",x:-34.446,y:2.124,z:4.936},{resSeq:277,iCode:"",x:-35.549,y:.655,z:8.272},{resSeq:278,iCode:"",x:-33.404,y:-1.549,z:10.556},{resSeq:279,iCode:"",x:-34.233,y:-3.197,z:13.896},{resSeq:280,iCode:"",x:-32.672,y:-5.776,z:16.239},{resSeq:281,iCode:"",x:-34.963,y:-6.974,z:19.014},{resSeq:282,iCode:"",x:-33.25,y:-8.799,z:21.877},{resSeq:283,iCode:"",x:-35.155,y:-11.405,z:23.896},{resSeq:284,iCode:"",x:-34.535,y:-12.87,z:27.37},{resSeq:285,iCode:"",x:-31.249,y:-10.964,z:27.61},{resSeq:286,iCode:"",x:-30.455,y:-11.601,z:31.287},{resSeq:287,iCode:"",x:-29.471,y:-9.474,z:34.288},{resSeq:288,iCode:"",x:-33.055,y:-8.204,z:34.511},{resSeq:289,iCode:"",x:-32.833,y:-6.633,z:31.048},{resSeq:290,iCode:"",x:-35.564,y:-8.987,z:29.716},{resSeq:291,iCode:"",x:-36.512,y:-7.785,z:26.18},{resSeq:292,iCode:"",x:-34.768,y:-4.668,z:24.772},{resSeq:293,iCode:"",x:-34.258,y:-2.998,z:21.4},{resSeq:294,iCode:"",x:-30.582,y:-3.454,z:20.437},{resSeq:295,iCode:"",x:-30.942,y:-1.385,z:17.262},{resSeq:296,iCode:"",x:-33.788,y:.669,z:15.797},{resSeq:297,iCode:"",x:-33.5,y:3.366,z:13.13},{resSeq:298,iCode:"",x:-34.944,y:4.739,z:9.908},{resSeq:299,iCode:"",x:-32.412,y:5.823,z:7.311},{resSeq:300,iCode:"",x:-33.081,y:8.429,z:4.625},{resSeq:301,iCode:"",x:-30.456,y:9.643,z:2.166},{resSeq:302,iCode:"",x:-29.342,y:10.071,z:-1.401},{resSeq:303,iCode:"",x:-26.249,y:9.482,z:-3.527},{resSeq:304,iCode:"",x:-25.408,y:11.496,z:-6.624},{resSeq:305,iCode:"",x:-23.125,y:9.672,z:-9.056},{resSeq:306,iCode:"",x:-21.148,y:12.085,z:-11.203},{resSeq:307,iCode:"",x:-19.805,y:9.035,z:-13.016},{resSeq:308,iCode:"",x:-18.298,y:5.616,z:-12.214},{resSeq:309,iCode:"",x:-15.325,y:7.207,z:-10.352},{resSeq:310,iCode:"",x:-16.914,y:10.069,z:-8.398},{resSeq:311,iCode:"",x:-19.967,y:10.477,z:-6.18},{resSeq:312,iCode:"",x:-21.371,y:12.485,z:-3.294},{resSeq:313,iCode:"",x:-23.937,y:11.6,z:-.659},{resSeq:314,iCode:"",x:-25.987,y:12.619,z:2.325},{resSeq:315,iCode:"",x:-27.243,y:9.995,z:4.799},{resSeq:316,iCode:"",x:-29.527,y:10.636,z:7.776},{resSeq:317,iCode:"",x:-29.775,y:8.065,z:10.568},{resSeq:318,iCode:"",x:-33.025,y:8.686,z:12.453},{resSeq:319,iCode:"",x:-32.328,y:6.794,z:15.692},{resSeq:320,iCode:"",x:-35.527,y:5.519,z:17.321},{resSeq:321,iCode:"",x:-33.798,y:4.041,z:20.396},{resSeq:322,iCode:"",x:-34.306,y:5.813,z:23.715},{resSeq:323,iCode:"",x:-31.521,y:6.593,z:26.207},{resSeq:324,iCode:"",x:-32.083,y:4.152,z:29.115},{resSeq:325,iCode:"",x:-30.123,y:2.028,z:31.608},{resSeq:326,iCode:"",x:-29.665,y:-.808,z:29.119},{resSeq:327,iCode:"",x:-28.281,y:1.343,z:26.275},{resSeq:328,iCode:"",x:-25.984,y:3.207,z:28.705},{resSeq:329,iCode:"",x:-24.749,y:-.117,z:30.11},{resSeq:330,iCode:"",x:-24.114,y:-1.537,z:26.631},{resSeq:331,iCode:"",x:-22.669,y:1.674,z:25.11},{resSeq:332,iCode:"",x:-25.225,y:1.647,z:22.279},{resSeq:333,iCode:"",x:-25.711,y:4.924,z:20.344},{resSeq:334,iCode:"",x:-29.225,y:6.351,z:20.672},{resSeq:335,iCode:"",x:-28.527,y:9.679,z:18.882},{resSeq:336,iCode:"",x:-29.269,y:10.702,z:15.278},{resSeq:337,iCode:"",x:-26.378,y:11.008,z:12.808},{resSeq:338,iCode:"",x:-26.123,y:12.885,z:9.511},{resSeq:339,iCode:"",x:-23.187,y:11.944,z:7.218},{resSeq:340,iCode:"",x:-21.922,y:14.053,z:4.295},{resSeq:341,iCode:"",x:-19.505,y:12.389,z:1.847},{resSeq:342,iCode:"",x:-17.52,y:13.07,z:-1.32},{resSeq:343,iCode:"",x:-16.004,y:9.961,z:-2.857},{resSeq:344,iCode:"",x:-13.296,y:9.438,z:-5.487},{resSeq:345,iCode:"",x:-12.59,y:5.87,z:-6.588},{resSeq:346,iCode:"",x:-10.52,y:3.961,z:-9.136}]},{chainId:"C",residueCount:346,segments:[{start:2,end:6,type:"strand"},{start:9,end:23,type:"strand"},{start:31,end:32,type:"strand"},{start:35,end:45,type:"strand"},{start:50,end:61,type:"strand"},{start:71,end:82,type:"strand"},{start:86,end:94,type:"strand"},{start:98,end:101,type:"helix"},{start:102,end:104,type:"helix"},{start:124,end:133,type:"strand"},{start:135,end:138,type:"helix"},{start:143,end:150,type:"strand"},{start:153,end:153,type:"strand"},{start:155,end:155,type:"strand"},{start:156,end:156,type:"helix"},{start:165,end:165,type:"strand"},{start:172,end:174,type:"helix"},{start:176,end:176,type:"strand"},{start:179,end:188,type:"strand"},{start:191,end:201,type:"strand"},{start:202,end:203,type:"helix"},{start:204,end:206,type:"helix"},{start:212,end:212,type:"strand"},{start:217,end:229,type:"strand"},{start:232,end:242,type:"strand"},{start:246,end:247,type:"strand"},{start:251,end:252,type:"strand"},{start:255,end:265,type:"strand"},{start:271,end:283,type:"strand"},{start:292,end:307,type:"strand"},{start:310,end:319,type:"strand"},{start:321,end:323,type:"helix"},{start:325,end:330,type:"helix"},{start:337,end:345,type:"strand"}],calphas:[{resSeq:1,iCode:"",x:4.381,y:-7.341,z:-12.277},{resSeq:2,iCode:"",x:5.977,y:-4.588,z:-14.359},{resSeq:3,iCode:"",x:3.362,y:-1.793,z:-14.265},{resSeq:4,iCode:"",x:5.575,y:.999,z:-15.638},{resSeq:5,iCode:"",x:8.435,y:1.102,z:-18.171},{resSeq:6,iCode:"",x:8.92,y:4.405,z:-19.927},{resSeq:7,iCode:"",x:11.717,y:6.907,z:-20.652},{resSeq:8,iCode:"",x:14.451,y:4.936,z:-18.814},{resSeq:9,iCode:"",x:12.46,y:4.278,z:-15.585},{resSeq:10,iCode:"",x:10.943,y:.905,z:-14.697},{resSeq:11,iCode:"",x:8.668,y:-.134,z:-11.801},{resSeq:12,iCode:"",x:7.816,y:-3.663,z:-10.682},{resSeq:13,iCode:"",x:4.895,y:-3.874,z:-8.27},{resSeq:14,iCode:"",x:4.882,y:-7.329,z:-6.699},{resSeq:15,iCode:"",x:3.071,y:-9.187,z:-3.947},{resSeq:16,iCode:"",x:1.325,y:-12.277,z:-2.717},{resSeq:17,iCode:"",x:-1.554,y:-13.522,z:-.622},{resSeq:18,iCode:"",x:-.818,y:-16.743,z:1.245},{resSeq:19,iCode:"",x:-3.957,y:-18.412,z:2.607},{resSeq:20,iCode:"",x:-2.207,y:-20.44,z:5.265},{resSeq:21,iCode:"",x:-3.193,y:-22.674,z:8.191},{resSeq:22,iCode:"",x:-1.009,y:-24.424,z:10.784},{resSeq:23,iCode:"",x:-1.996,y:-27.633,z:12.566},{resSeq:24,iCode:"",x:-.076,y:-28.118,z:15.84},{resSeq:25,iCode:"",x:-.476,y:-29.328,z:19.428},{resSeq:26,iCode:"",x:1.355,y:-26.096,z:20.264},{resSeq:27,iCode:"",x:-1.577,y:-23.657,z:20.451},{resSeq:28,iCode:"",x:.774,y:-20.621,z:20.31},{resSeq:29,iCode:"",x:1.472,y:-21.505,z:16.614},{resSeq:30,iCode:"",x:-1.741,y:-23.443,z:15.781},{resSeq:31,iCode:"",x:-4.453,y:-21.891,z:13.578},{resSeq:32,iCode:"",x:-4.923,y:-19.359,z:10.79},{resSeq:33,iCode:"",x:-1.632,y:-17.853,z:9.59},{resSeq:34,iCode:"",x:-2.891,y:-16.009,z:6.482},{resSeq:35,iCode:"",x:-.72,y:-13.089,z:5.367},{resSeq:36,iCode:"",x:.155,y:-10.908,z:2.447},{resSeq:37,iCode:"",x:3.281,y:-9.143,z:1.182},{resSeq:38,iCode:"",x:3.49,y:-6.165,z:-1.138},{resSeq:39,iCode:"",x:6.474,y:-4.443,z:-2.581},{resSeq:40,iCode:"",x:8.032,y:-2.563,z:-5.374},{resSeq:41,iCode:"",x:11.365,y:-2.602,z:-7.16},{resSeq:42,iCode:"",x:12.268,y:.401,z:-9.297},{resSeq:43,iCode:"",x:15.265,y:1.115,z:-11.527},{resSeq:44,iCode:"",x:16.283,y:4.184,z:-13.553},{resSeq:45,iCode:"",x:18.971,y:4.251,z:-16.224},{resSeq:46,iCode:"",x:21.167,y:7.292,z:-15.546},{resSeq:47,iCode:"",x:23.859,y:6.519,z:-18.141},{resSeq:48,iCode:"",x:24.763,y:3.371,z:-20.096},{resSeq:49,iCode:"",x:27.029,y:2.476,z:-17.13},{resSeq:50,iCode:"",x:25.106,y:3.849,z:-14.105},{resSeq:51,iCode:"",x:21.742,y:2.698,z:-12.778},{resSeq:52,iCode:"",x:19.811,y:3.936,z:-9.747},{resSeq:53,iCode:"",x:17.373,y:1.752,z:-7.859},{resSeq:54,iCode:"",x:15.032,y:1.463,z:-4.89},{resSeq:55,iCode:"",x:13.189,y:-1.427,z:-3.258},{resSeq:56,iCode:"",x:10.534,y:-1.659,z:-.534},{resSeq:57,iCode:"",x:8.741,y:-4.731,z:.817},{resSeq:58,iCode:"",x:6.022,y:-4.938,z:3.463},{resSeq:59,iCode:"",x:4.13,y:-7.729,z:5.201},{resSeq:60,iCode:"",x:.559,y:-7.418,z:6.457},{resSeq:61,iCode:"",x:-.896,y:-10.218,z:8.581},{resSeq:62,iCode:"",x:-4.328,y:-11.345,z:7.325},{resSeq:63,iCode:"",x:-5.15,y:-13.522,z:10.347},{resSeq:64,iCode:"",x:-6.161,y:-10.809,z:12.847},{resSeq:65,iCode:"",x:-9.459,y:-9.111,z:13.741},{resSeq:66,iCode:"",x:-10.142,y:-5.602,z:12.394},{resSeq:67,iCode:"",x:-9.433,y:-3.889,z:15.737},{resSeq:68,iCode:"",x:-5.683,y:-4.5,z:15.365},{resSeq:69,iCode:"",x:-2.98,y:-4.31,z:12.696},{resSeq:70,iCode:"",x:.13,y:-6.476,z:12.616},{resSeq:71,iCode:"",x:2.426,y:-5.293,z:9.82},{resSeq:72,iCode:"",x:6.036,y:-4.359,z:9.167},{resSeq:73,iCode:"",x:8.645,y:-3.258,z:6.652},{resSeq:74,iCode:"",x:10.835,y:-6.153,z:5.5},{resSeq:75,iCode:"",x:13.175,y:-4.049,z:3.339},{resSeq:76,iCode:"",x:13.57,y:-.443,z:2.273},{resSeq:77,iCode:"",x:16.709,y:.724,z:.51},{resSeq:78,iCode:"",x:18.045,y:2.874,z:-2.3},{resSeq:79,iCode:"",x:21.215,y:2.474,z:-4.313},{resSeq:80,iCode:"",x:23.42,y:2.975,z:-7.321},{resSeq:81,iCode:"",x:25.168,y:.449,z:-9.563},{resSeq:82,iCode:"",x:28.064,y:1.168,z:-11.919},{resSeq:83,iCode:"",x:28.787,y:-1.519,z:-14.543},{resSeq:84,iCode:"",x:31.963,y:-3.564,z:-13.789},{resSeq:85,iCode:"",x:32.709,y:-1.458,z:-10.679},{resSeq:86,iCode:"",x:30.01,y:-2.44,z:-8.154},{resSeq:87,iCode:"",x:26.841,y:-1.333,z:-6.382},{resSeq:88,iCode:"",x:26.183,y:.573,z:-3.166},{resSeq:89,iCode:"",x:22.896,y:.758,z:-1.268},{resSeq:90,iCode:"",x:21.674,y:1.906,z:2.133},{resSeq:91,iCode:"",x:18.578,y:1.262,z:4.239},{resSeq:92,iCode:"",x:16.722,y:-1.663,z:5.777},{resSeq:93,iCode:"",x:18.204,y:-4.696,z:3.986},{resSeq:94,iCode:"",x:19.669,y:-8.222,z:4.329},{resSeq:95,iCode:"",x:22.942,y:-8.829,z:6.153},{resSeq:96,iCode:"",x:25.691,y:-10.227,z:3.919},{resSeq:97,iCode:"",x:25.721,y:-13.48,z:5.986},{resSeq:98,iCode:"",x:22.418,y:-14.234,z:4.228},{resSeq:99,iCode:"",x:24.234,y:-14.275,z:.886},{resSeq:100,iCode:"",x:25.345,y:-17.768,z:1.96},{resSeq:101,iCode:"",x:22.649,y:-18.886,z:4.432},{resSeq:102,iCode:"",x:19.855,y:-17.981,z:1.961},{resSeq:103,iCode:"",x:20.894,y:-20.968,z:-.144},{resSeq:104,iCode:"",x:19.104,y:-23.326,z:2.275},{resSeq:105,iCode:"",x:16.125,y:-20.943,z:2.917},{resSeq:106,iCode:"",x:14.019,y:-22.616,z:.212},{resSeq:107,iCode:"",x:11.5,y:-24.738,z:2.125},{resSeq:108,iCode:"",x:7.747,y:-24.362,z:1.31},{resSeq:109,iCode:"",x:6.904,y:-22.828,z:4.738},{resSeq:110,iCode:"",x:9.486,y:-23.508,z:7.456},{resSeq:111,iCode:"",x:13.295,y:-23.236,z:7.317},{resSeq:112,iCode:"",x:15.536,y:-20.169,z:7.527},{resSeq:113,iCode:"",x:15.391,y:-20.133,z:11.329},{resSeq:114,iCode:"",x:18.771,y:-20.919,z:12.894},{resSeq:115,iCode:"",x:18.832,y:-17.073,z:12.878},{resSeq:116,iCode:"",x:16.195,y:-14.321,z:12.835},{resSeq:117,iCode:"",x:15.373,y:-10.777,z:11.816},{resSeq:118,iCode:"",x:17.08,y:-7.828,z:13.512},{resSeq:119,iCode:"",x:19.694,y:-10.315,z:14.648},{resSeq:120,iCode:"",x:22.975,y:-8.493,z:14.057},{resSeq:121,iCode:"",x:24.123,y:-8.967,z:10.426},{resSeq:122,iCode:"",x:22.457,y:-12.385,z:9.876},{resSeq:123,iCode:"",x:19.23,y:-11.438,z:8.024},{resSeq:124,iCode:"",x:17.006,y:-8.334,z:7.677},{resSeq:125,iCode:"",x:18.042,y:-5.301,z:9.746},{resSeq:126,iCode:"",x:18.254,y:-1.504,z:9.887},{resSeq:127,iCode:"",x:21.067,y:.774,z:8.773},{resSeq:128,iCode:"",x:23.064,y:-1.499,z:6.448},{resSeq:129,iCode:"",x:25.521,y:.203,z:4.05},{resSeq:130,iCode:"",x:26.329,y:-2.441,z:1.453},{resSeq:131,iCode:"",x:28.858,y:-2.702,z:-1.406},{resSeq:132,iCode:"",x:28.524,y:-5.538,z:-3.926},{resSeq:133,iCode:"",x:30.638,y:-6.623,z:-6.873},{resSeq:134,iCode:"",x:29.389,y:-9.046,z:-9.508},{resSeq:135,iCode:"",x:31.711,y:-11.159,z:-11.672},{resSeq:136,iCode:"",x:34.795,y:-9.589,z:-10.01},{resSeq:137,iCode:"",x:34.76,y:-6.301,z:-11.953},{resSeq:138,iCode:"",x:33.582,y:-8.314,z:-14.982},{resSeq:139,iCode:"",x:36.847,y:-10.306,z:-14.985},{resSeq:140,iCode:"",x:35.627,y:-13.571,z:-13.41},{resSeq:141,iCode:"",x:32.192,y:-14.873,z:-14.435},{resSeq:142,iCode:"",x:30.263,y:-16.093,z:-11.373},{resSeq:143,iCode:"",x:32.571,y:-14.741,z:-8.643},{resSeq:144,iCode:"",x:30.685,y:-12.285,z:-6.394},{resSeq:145,iCode:"",x:31.625,y:-10.477,z:-3.209},{resSeq:146,iCode:"",x:30.133,y:-8.062,z:-.708},{resSeq:147,iCode:"",x:31.357,y:-5.779,z:2.078},{resSeq:148,iCode:"",x:28.87,y:-4.352,z:4.572},{resSeq:149,iCode:"",x:28.621,y:-1.996,z:7.506},{resSeq:150,iCode:"",x:25.762,y:-1.735,z:9.972},{resSeq:151,iCode:"",x:25.251,y:1.338,z:12.161},{resSeq:152,iCode:"",x:24.318,y:1.049,z:15.839},{resSeq:153,iCode:"",x:20.617,y:.636,z:16.657},{resSeq:154,iCode:"",x:20.383,y:1.274,z:20.391},{resSeq:155,iCode:"",x:18.086,y:2.108,z:23.29},{resSeq:156,iCode:"",x:14.793,y:3.904,z:22.574},{resSeq:157,iCode:"",x:14.722,y:7.687,z:22.977},{resSeq:158,iCode:"",x:12.311,y:9.364,z:25.394},{resSeq:159,iCode:"",x:12.448,y:6.437,z:27.853},{resSeq:160,iCode:"",x:14.983,y:7.735,z:30.409},{resSeq:161,iCode:"",x:18.206,y:6.101,z:29.152},{resSeq:162,iCode:"",x:21.474,y:7.973,z:29.687},{resSeq:163,iCode:"",x:23.693,y:6.064,z:27.213},{resSeq:164,iCode:"",x:23.317,y:3.862,z:24.11},{resSeq:165,iCode:"",x:20.306,y:5.743,z:22.66},{resSeq:166,iCode:"",x:19.57,y:6.114,z:18.926},{resSeq:167,iCode:"",x:16.562,y:7.82,z:17.304},{resSeq:168,iCode:"",x:15.245,y:4.41,z:16.196},{resSeq:169,iCode:"",x:15.999,y:2.469,z:19.369},{resSeq:170,iCode:"",x:14.362,y:-.78,z:20.432},{resSeq:171,iCode:"",x:14.389,y:-3.704,z:22.904},{resSeq:172,iCode:"",x:17.761,y:-5.325,z:23.689},{resSeq:173,iCode:"",x:17.101,y:-8.539,z:21.71},{resSeq:174,iCode:"",x:16.836,y:-6.443,z:18.53},{resSeq:175,iCode:"",x:19.655,y:-3.977,z:19.228},{resSeq:176,iCode:"",x:23.124,y:-4.036,z:17.665},{resSeq:177,iCode:"",x:26.316,y:-1.989,z:17.867},{resSeq:178,iCode:"",x:28.428,y:-1.044,z:14.842},{resSeq:179,iCode:"",x:29.165,y:-4.077,z:12.688},{resSeq:180,iCode:"",x:31.19,y:-5.078,z:9.654},{resSeq:181,iCode:"",x:30.858,y:-8.148,z:7.46},{resSeq:182,iCode:"",x:31.699,y:-9.638,z:4.112},{resSeq:183,iCode:"",x:30.809,y:-12.524,z:1.81},{resSeq:184,iCode:"",x:32.286,y:-14.333,z:-1.201},{resSeq:185,iCode:"",x:30.46,y:-16.73,z:-3.548},{resSeq:186,iCode:"",x:31.583,y:-18.547,z:-6.703},{resSeq:187,iCode:"",x:28.973,y:-20.133,z:-8.985},{resSeq:188,iCode:"",x:29.875,y:-22.181,z:-12.058},{resSeq:189,iCode:"",x:27.604,y:-24.465,z:-14.054},{resSeq:190,iCode:"",x:25.247,y:-26.178,z:-11.559},{resSeq:191,iCode:"",x:27.497,y:-25.592,z:-8.534},{resSeq:192,iCode:"",x:28.178,y:-22.993,z:-5.835},{resSeq:193,iCode:"",x:30.511,y:-22.509,z:-2.863},{resSeq:194,iCode:"",x:30.67,y:-19.5,z:-.57},{resSeq:195,iCode:"",x:31.64,y:-18.001,z:2.775},{resSeq:196,iCode:"",x:30.661,y:-15.126,z:5.013},{resSeq:197,iCode:"",x:31.963,y:-13.524,z:8.22},{resSeq:198,iCode:"",x:30.338,y:-10.854,z:10.404},{resSeq:199,iCode:"",x:31.423,y:-9.069,z:13.546},{resSeq:200,iCode:"",x:29.174,y:-6.714,z:15.548},{resSeq:201,iCode:"",x:29.701,y:-4.77,z:18.74},{resSeq:202,iCode:"",x:27.055,y:-5.779,z:21.296},{resSeq:203,iCode:"",x:25.309,y:-3.031,z:23.281},{resSeq:204,iCode:"",x:25.306,y:-2.492,z:27.054},{resSeq:205,iCode:"",x:21.564,y:-3.243,z:27.136},{resSeq:206,iCode:"",x:22.361,y:-6.705,z:25.736},{resSeq:207,iCode:"",x:24.946,y:-7.385,z:28.46},{resSeq:208,iCode:"",x:22.767,y:-7.404,z:31.583},{resSeq:209,iCode:"",x:21.464,y:-9.947,z:34.094},{resSeq:210,iCode:"",x:18.277,y:-10.275,z:32.036},{resSeq:211,iCode:"",x:20.084,y:-12.118,z:29.189},{resSeq:212,iCode:"",x:22.361,y:-15.149,z:28.95},{resSeq:213,iCode:"",x:25.276,y:-14.934,z:26.499},{resSeq:214,iCode:"",x:26.938,y:-11.711,z:27.666},{resSeq:215,iCode:"",x:29.928,y:-10.684,z:25.535},{resSeq:216,iCode:"",x:31.814,y:-7.861,z:23.817},{resSeq:217,iCode:"",x:30.99,y:-8.771,z:20.194},{resSeq:218,iCode:"",x:28.612,y:-10.921,z:18.143},{resSeq:219,iCode:"",x:30.586,y:-12.969,z:15.575},{resSeq:220,iCode:"",x:29.466,y:-15.377,z:12.831},{resSeq:221,iCode:"",x:31.433,y:-17.625,z:10.427},{resSeq:222,iCode:"",x:29.561,y:-19.366,z:7.62},{resSeq:223,iCode:"",x:30.388,y:-21.777,z:4.797},{resSeq:224,iCode:"",x:27.933,y:-23.097,z:2.238},{resSeq:225,iCode:"",x:27.61,y:-25.314,z:-.828},{resSeq:226,iCode:"",x:24.933,y:-25.543,z:-3.485},{resSeq:227,iCode:"",x:24.012,y:-27.482,z:-6.644},{resSeq:228,iCode:"",x:21.178,y:-26.057,z:-8.78},{resSeq:229,iCode:"",x:20.699,y:-27.767,z:-12.182},{resSeq:230,iCode:"",x:18.931,y:-30.536,z:-14.088},{resSeq:231,iCode:"",x:15.752,y:-30.075,z:-11.964},{resSeq:232,iCode:"",x:17.773,y:-30.812,z:-8.805},{resSeq:233,iCode:"",x:18.414,y:-28.463,z:-5.919},{resSeq:234,iCode:"",x:20.86,y:-29.413,z:-3.143},{resSeq:235,iCode:"",x:22.298,y:-27.053,z:-.523},{resSeq:236,iCode:"",x:23.976,y:-27.042,z:2.88},{resSeq:237,iCode:"",x:25.326,y:-24.362,z:5.207},{resSeq:238,iCode:"",x:27.307,y:-24.52,z:8.442},{resSeq:239,iCode:"",x:27.645,y:-21.497,z:10.72},{resSeq:240,iCode:"",x:29.586,y:-21.053,z:13.942},{resSeq:241,iCode:"",x:28.444,y:-18.147,z:16.105},{resSeq:242,iCode:"",x:29.621,y:-16.375,z:19.264},{resSeq:243,iCode:"",x:27.161,y:-14.319,z:21.32},{resSeq:244,iCode:"",x:25.001,y:-13.927,z:18.175},{resSeq:245,iCode:"",x:22.428,y:-16.739,z:18.073},{resSeq:246,iCode:"",x:19.257,y:-16.006,z:20.068},{resSeq:247,iCode:"",x:18.083,y:-18.618,z:22.56},{resSeq:248,iCode:"",x:14.361,y:-17.983,z:22.529},{resSeq:249,iCode:"",x:13.542,y:-15.263,z:25.037},{resSeq:250,iCode:"",x:16.517,y:-16.041,z:27.297},{resSeq:251,iCode:"",x:19.201,y:-14.063,z:25.432},{resSeq:252,iCode:"",x:22.042,y:-15.38,z:23.263},{resSeq:253,iCode:"",x:24.278,y:-18.46,z:23.042},{resSeq:254,iCode:"",x:27.888,y:-17.93,z:24.159},{resSeq:255,iCode:"",x:28.676,y:-20.35,z:21.34},{resSeq:256,iCode:"",x:26.398,y:-22.005,z:18.795},{resSeq:257,iCode:"",x:26.907,y:-24.377,z:15.871},{resSeq:258,iCode:"",x:24.19,y:-24.196,z:13.238},{resSeq:259,iCode:"",x:23.623,y:-26.546,z:10.299},{resSeq:260,iCode:"",x:21.012,y:-26.646,z:7.535},{resSeq:261,iCode:"",x:20.776,y:-28.934,z:4.507},{resSeq:262,iCode:"",x:18.086,y:-29.335,z:1.859},{resSeq:263,iCode:"",x:17.279,y:-31.543,z:-1.144},{resSeq:264,iCode:"",x:14.541,y:-30.778,z:-3.696},{resSeq:265,iCode:"",x:13.442,y:-32.12,z:-7.069},{resSeq:266,iCode:"",x:11.25,y:-30.395,z:-9.681},{resSeq:267,iCode:"",x:8.953,y:-32.729,z:-11.637},{resSeq:268,iCode:"",x:7.969,y:-31.48,z:-15.088},{resSeq:269,iCode:"",x:4.26,y:-31.753,z:-14.239},{resSeq:270,iCode:"",x:4.574,y:-29.133,z:-11.451},{resSeq:271,iCode:"",x:5.27,y:-30.978,z:-8.171},{resSeq:272,iCode:"",x:8.381,y:-30.113,z:-6.148},{resSeq:273,iCode:"",x:9.004,y:-32.381,z:-3.132},{resSeq:274,iCode:"",x:11.424,y:-31.149,z:-.441},{resSeq:275,iCode:"",x:13.462,y:-32.763,z:2.365},{resSeq:276,iCode:"",x:15.444,y:-30.738,z:4.918},{resSeq:277,iCode:"",x:17.286,y:-31.021,z:8.224},{resSeq:278,iCode:"",x:18.034,y:-28.095,z:10.544},{resSeq:279,iCode:"",x:19.803,y:-27.893,z:13.901},{resSeq:280,iCode:"",x:21.254,y:-25.273,z:16.213},{resSeq:281,iCode:"",x:23.305,y:-26.484,z:19.164},{resSeq:282,iCode:"",x:24.285,y:-24.156,z:22.002},{resSeq:283,iCode:"",x:27.392,y:-24.638,z:24.142},{resSeq:284,iCode:"",x:28.423,y:-23.182,z:27.517},{resSeq:285,iCode:"",x:25.047,y:-21.433,z:27.754},{resSeq:286,iCode:"",x:25.442,y:-20.54,z:31.436},{resSeq:287,iCode:"",x:22.914,y:-20.451,z:34.267},{resSeq:288,iCode:"",x:23.246,y:-24.244,z:34.696},{resSeq:289,iCode:"",x:22.049,y:-24.952,z:31.139},{resSeq:290,iCode:"",x:25.473,y:-26.15,z:29.89},{resSeq:291,iCode:"",x:25.043,y:-27.549,z:26.337},{resSeq:292,iCode:"",x:21.504,y:-27.583,z:24.837},{resSeq:293,iCode:"",x:19.742,y:-28.044,z:21.486},{resSeq:294,iCode:"",x:18.208,y:-24.689,z:20.458},{resSeq:295,iCode:"",x:16.63,y:-26.011,z:17.244},{resSeq:296,iCode:"",x:16.336,y:-29.51,z:15.774},{resSeq:297,iCode:"",x:13.903,y:-30.706,z:13.093},{resSeq:298,iCode:"",x:13.371,y:-32.556,z:9.842},{resSeq:299,iCode:"",x:11.107,y:-30.921,z:7.271},{resSeq:300,iCode:"",x:9.248,y:-32.923,z:4.61},{resSeq:301,iCode:"",x:6.949,y:-31.067,z:2.216},{resSeq:302,iCode:"",x:5.913,y:-30.416,z:-1.351},{resSeq:303,iCode:"",x:4.783,y:-27.493,z:-3.458},{resSeq:304,iCode:"",x:2.613,y:-27.85,z:-6.518},{resSeq:305,iCode:"",x:3.023,y:-25.009,z:-9.013},{resSeq:306,iCode:"",x:-.08,y:-24.421,z:-11.125},{resSeq:307,iCode:"",x:2.004,y:-21.755,z:-12.875},{resSeq:308,iCode:"",x:4.291,y:-18.785,z:-12.074},{resSeq:309,iCode:"",x:1.351,y:-16.976,z:-10.304},{resSeq:310,iCode:"",x:-.435,y:-19.771,z:-8.386},{resSeq:311,iCode:"",x:.787,y:-22.512,z:-6.078},{resSeq:312,iCode:"",x:-.184,y:-24.732,z:-3.147},{resSeq:313,iCode:"",x:1.866,y:-26.542,z:-.541},{resSeq:314,iCode:"",x:2.12,y:-28.767,z:2.493},{resSeq:315,iCode:"",x:5.087,y:-28.646,z:4.876},{resSeq:316,iCode:"",x:5.548,y:-30.997,z:7.813},{resSeq:317,iCode:"",x:7.943,y:-29.993,z:10.56},{resSeq:318,iCode:"",x:8.933,y:-33.129,z:12.456},{resSeq:319,iCode:"",x:10.265,y:-31.516,z:15.623},{resSeq:320,iCode:"",x:13.023,y:-33.554,z:17.238},{resSeq:321,iCode:"",x:13.392,y:-31.283,z:20.315},{resSeq:322,iCode:"",x:12.074,y:-32.738,z:23.584},{resSeq:323,iCode:"",x:10.117,y:-30.663,z:26.1},{resSeq:324,iCode:"",x:12.301,y:-29.843,z:29.131},{resSeq:325,iCode:"",x:12.854,y:-26.965,z:31.593},{resSeq:326,iCode:"",x:15.226,y:-25.19,z:29.191},{resSeq:327,iCode:"",x:12.842,y:-25.159,z:26.169},{resSeq:328,iCode:"",x:9.988,y:-24.139,z:28.493},{resSeq:329,iCode:"",x:12.108,y:-21.303,z:29.991},{resSeq:330,iCode:"",x:13.096,y:-20.142,z:26.469},{resSeq:331,iCode:"",x:9.61,y:-20.477,z:24.93},{resSeq:332,iCode:"",x:11.024,y:-22.717,z:22.179},{resSeq:333,iCode:"",x:8.479,y:-24.844,z:20.305},{resSeq:334,iCode:"",x:9.087,y:-28.629,z:20.602},{resSeq:335,iCode:"",x:5.867,y:-29.806,z:18.855},{resSeq:336,iCode:"",x:5.44,y:-30.906,z:15.236},{resSeq:337,iCode:"",x:3.609,y:-28.573,z:12.787},{resSeq:338,iCode:"",x:1.778,y:-29.223,z:9.504},{resSeq:339,iCode:"",x:1.276,y:-26.158,z:7.335},{resSeq:340,iCode:"",x:-1.173,y:-26.058,z:4.398},{resSeq:341,iCode:"",x:-.968,y:-23.053,z:2.064},{resSeq:342,iCode:"",x:-2.594,y:-21.756,z:-1.127},{resSeq:343,iCode:"",x:-.697,y:-18.865,z:-2.746},{resSeq:344,iCode:"",x:-1.531,y:-16.268,z:-5.376},{resSeq:345,iCode:"",x:1.323,y:-13.992,z:-6.433},{resSeq:346,iCode:"",x:2.051,y:-11.269,z:-8.995}]}]},"5g53":{pdbId:"5g53",chains:[{chainId:"A",residueCount:283,segments:[{start:7,end:33,type:"helix"},{start:41,end:54,type:"helix"},{start:55,end:59,type:"helix"},{start:60,end:68,type:"helix"},{start:71,end:72,type:"strand"},{start:74,end:107,type:"helix"},{start:112,end:115,type:"helix"},{start:118,end:136,type:"helix"},{start:138,end:141,type:"helix"},{start:164,end:165,type:"strand"},{start:168,end:171,type:"helix"},{start:174,end:175,type:"helix"},{start:176,end:187,type:"helix"},{start:188,end:210,type:"helix"},{start:225,end:258,type:"helix"},{start:263,end:266,type:"helix"},{start:267,end:278,type:"helix"},{start:280,end:284,type:"helix"},{start:285,end:290,type:"helix"},{start:293,end:310,type:"helix"}],calphas:[{resSeq:6,iCode:"",x:17.097,y:-11.291,z:12.008},{resSeq:7,iCode:"",x:19.64,y:-11.507,z:9.151},{resSeq:8,iCode:"",x:17.17,y:-13.333,z:6.907},{resSeq:9,iCode:"",x:14.638,y:-10.506,z:7.203},{resSeq:10,iCode:"",x:17.23,y:-7.783,z:6.568},{resSeq:11,iCode:"",x:18.718,y:-9.428,z:3.463},{resSeq:12,iCode:"",x:15.405,y:-10.55,z:1.879},{resSeq:13,iCode:"",x:14.165,y:-6.998,z:2.464},{resSeq:14,iCode:"",x:17.319,y:-5.577,z:.848},{resSeq:15,iCode:"",x:16.942,y:-7.919,z:-2.17},{resSeq:16,iCode:"",x:13.424,y:-6.605,z:-2.787},{resSeq:17,iCode:"",x:14.666,y:-2.99,z:-2.538},{resSeq:18,iCode:"",x:17.235,y:-3.688,z:-5.286},{resSeq:19,iCode:"",x:14.715,y:-5.542,z:-7.499},{resSeq:20,iCode:"",x:12.231,y:-2.697,z:-6.883},{resSeq:21,iCode:"",x:14.713,y:-.057,z:-8.035},{resSeq:22,iCode:"",x:15.872,y:-2.103,z:-11.079},{resSeq:23,iCode:"",x:12.442,y:-3.031,z:-12.453},{resSeq:24,iCode:"",x:10.928,y:.427,z:-11.933},{resSeq:25,iCode:"",x:13.871,y:2.427,z:-13.262},{resSeq:26,iCode:"",x:13.639,y:.101,z:-16.284},{resSeq:27,iCode:"",x:9.926,y:1.008,z:-16.649},{resSeq:28,iCode:"",x:10.671,y:4.756,z:-16.314},{resSeq:29,iCode:"",x:13.704,y:4.612,z:-18.618},{resSeq:30,iCode:"",x:11.567,y:2.881,z:-21.276},{resSeq:31,iCode:"",x:9.053,y:5.793,z:-21.26},{resSeq:32,iCode:"",x:11.879,y:8.359,z:-21.607},{resSeq:33,iCode:"",x:13.456,y:6.61,z:-24.608},{resSeq:34,iCode:"",x:10.354,y:5.286,z:-26.43},{resSeq:35,iCode:"",x:8.23,y:8.025,z:-28.051},{resSeq:36,iCode:"",x:5.073,y:5.876,z:-28.293},{resSeq:37,iCode:"",x:5.012,y:5.364,z:-24.502},{resSeq:38,iCode:"",x:4.932,y:9.165,z:-23.947},{resSeq:39,iCode:"",x:1.166,y:9.699,z:-23.61},{resSeq:40,iCode:"",x:-1.325,y:10.605,z:-20.835},{resSeq:41,iCode:"",x:-2.275,y:6.996,z:-19.915},{resSeq:42,iCode:"",x:1.362,y:6.311,z:-18.915},{resSeq:43,iCode:"",x:1.547,y:9.306,z:-16.524},{resSeq:44,iCode:"",x:-.289,y:6.956,z:-14.169},{resSeq:45,iCode:"",x:2.19,y:4.13,z:-14.825},{resSeq:46,iCode:"",x:5.206,y:6.442,z:-14.379},{resSeq:47,iCode:"",x:3.783,y:7.908,z:-11.126},{resSeq:48,iCode:"",x:3.288,y:4.342,z:-9.815},{resSeq:49,iCode:"",x:6.801,y:3.4,z:-10.902},{resSeq:50,iCode:"",x:8.234,y:6.586,z:-9.308},{resSeq:51,iCode:"",x:6.487,y:5.787,z:-5.996},{resSeq:52,iCode:"",x:7.815,y:2.193,z:-6.091},{resSeq:53,iCode:"",x:11.389,y:3.479,z:-6.555},{resSeq:54,iCode:"",x:10.913,y:5.651,z:-3.433},{resSeq:55,iCode:"",x:9.712,y:2.493,z:-1.641},{resSeq:56,iCode:"",x:12.948,y:.722,z:-2.628},{resSeq:57,iCode:"",x:15.336,y:3.621,z:-1.946},{resSeq:58,iCode:"",x:13.742,y:5.281,z:1.111},{resSeq:59,iCode:"",x:10.875,y:3.24,z:2.591},{resSeq:60,iCode:"",x:12.55,y:-.203,z:2.872},{resSeq:61,iCode:"",x:15.766,y:1.105,z:4.496},{resSeq:62,iCode:"",x:13.591,y:3.048,z:6.975},{resSeq:63,iCode:"",x:11.522,y:-.124,z:7.538},{resSeq:64,iCode:"",x:14.741,y:-2.041,z:8.306},{resSeq:65,iCode:"",x:15.691,y:.489,z:11.012},{resSeq:66,iCode:"",x:12.227,y:.169,z:12.655},{resSeq:67,iCode:"",x:12.864,y:-3.609,z:12.99},{resSeq:68,iCode:"",x:16.013,y:-3.165,z:15.119},{resSeq:69,iCode:"",x:14.487,y:-1.258,z:18.042},{resSeq:70,iCode:"",x:17.406,y:1.175,z:18.024},{resSeq:71,iCode:"",x:17.543,y:4.021,z:20.58},{resSeq:72,iCode:"",x:15.809,y:7.24,z:19.506},{resSeq:73,iCode:"",x:13.396,y:9.928,z:20.712},{resSeq:74,iCode:"",x:9.803,y:8.635,z:20.422},{resSeq:75,iCode:"",x:8.748,y:11.418,z:18.03},{resSeq:76,iCode:"",x:11.817,y:10.78,z:15.869},{resSeq:77,iCode:"",x:10.781,y:7.123,z:15.69},{resSeq:78,iCode:"",x:7.189,y:8.115,z:14.863},{resSeq:79,iCode:"",x:8.438,y:10.315,z:11.982},{resSeq:80,iCode:"",x:10.336,y:7.406,z:10.369},{resSeq:81,iCode:"",x:7.347,y:5.049,z:10.724},{resSeq:82,iCode:"",x:5.1,y:7.761,z:9.276},{resSeq:83,iCode:"",x:7.51,y:8.197,z:6.326},{resSeq:84,iCode:"",x:7.228,y:4.457,z:5.566},{resSeq:85,iCode:"",x:3.404,y:4.82,z:5.609},{resSeq:86,iCode:"",x:3.309,y:7.849,z:3.276},{resSeq:87,iCode:"",x:5.486,y:6.222,z:.576},{resSeq:88,iCode:"",x:3.681,y:2.864,z:.632},{resSeq:89,iCode:"",x:.339,y:4.724,z:.545},{resSeq:90,iCode:"",x:1.356,y:6.654,z:-2.583},{resSeq:91,iCode:"",x:2.276,y:3.344,z:-4.236},{resSeq:92,iCode:"",x:-1.247,y:2.041,z:-3.436},{resSeq:93,iCode:"",x:-3.041,y:5.255,z:-4.49},{resSeq:94,iCode:"",x:-1.081,y:5.564,z:-7.771},{resSeq:95,iCode:"",x:-2.107,y:1.921,z:-8.384},{resSeq:96,iCode:"",x:-5.746,y:2.86,z:-7.791},{resSeq:97,iCode:"",x:-5.339,y:5.779,z:-10.242},{resSeq:98,iCode:"",x:-4.496,y:3.315,z:-13.022},{resSeq:99,iCode:"",x:-7.744,y:1.424,z:-12.282},{resSeq:100,iCode:"",x:-9.817,y:4.664,z:-12.282},{resSeq:101,iCode:"",x:-8.184,y:5.621,z:-15.629},{resSeq:102,iCode:"",x:-9.035,y:2.23,z:-17.169},{resSeq:103,iCode:"",x:-12.535,y:2.509,z:-15.713},{resSeq:104,iCode:"",x:-13.137,y:5.841,z:-17.482},{resSeq:105,iCode:"",x:-11.6,y:4.323,z:-20.646},{resSeq:106,iCode:"",x:-13.961,y:1.325,z:-20.735},{resSeq:107,iCode:"",x:-17.125,y:2.931,z:-19.267},{resSeq:108,iCode:"",x:-16.949,y:6.329,z:-21.071},{resSeq:109,iCode:"",x:-14.794,y:5.515,z:-24.118},{resSeq:110,iCode:"",x:-15.748,y:8.492,z:-26.302},{resSeq:111,iCode:"",x:-15.226,y:11.323,z:-23.758},{resSeq:112,iCode:"",x:-11.987,y:9.669,z:-22.428},{resSeq:113,iCode:"",x:-9.7,y:12.067,z:-24.337},{resSeq:114,iCode:"",x:-11.811,y:15.093,z:-23.325},{resSeq:115,iCode:"",x:-11.971,y:14.074,z:-19.654},{resSeq:116,iCode:"",x:-8.47,y:12.568,z:-19.167},{resSeq:117,iCode:"",x:-6.211,y:15.472,z:-20.192},{resSeq:118,iCode:"",x:-2.498,y:15.692,z:-19.376},{resSeq:119,iCode:"",x:-3.113,y:18.555,z:-16.923},{resSeq:120,iCode:"",x:-6.028,y:16.829,z:-15.154},{resSeq:121,iCode:"",x:-3.903,y:13.652,z:-14.896},{resSeq:122,iCode:"",x:-1.328,y:15.707,z:-12.952},{resSeq:123,iCode:"",x:-4.179,y:16.892,z:-10.716},{resSeq:124,iCode:"",x:-5.123,y:13.273,z:-9.932},{resSeq:125,iCode:"",x:-1.465,y:12.286,z:-9.313},{resSeq:126,iCode:"",x:-.953,y:15.268,z:-6.962},{resSeq:127,iCode:"",x:-4.104,y:14.318,z:-5.006},{resSeq:128,iCode:"",x:-2.641,y:10.786,z:-4.637},{resSeq:129,iCode:"",x:.468,y:12.237,z:-2.961},{resSeq:130,iCode:"",x:-1.35,y:14.835,z:-.84},{resSeq:131,iCode:"",x:-3.671,y:12.073,z:.491},{resSeq:132,iCode:"",x:-.561,y:9.979,z:1.218},{resSeq:133,iCode:"",x:1.032,y:12.731,z:3.351},{resSeq:134,iCode:"",x:-2.279,y:13.677,z:5.036},{resSeq:135,iCode:"",x:-2.959,y:10.059,z:6.107},{resSeq:136,iCode:"",x:.599,y:8.816,z:6.725},{resSeq:137,iCode:"",x:1.511,y:11.89,z:8.819},{resSeq:138,iCode:"",x:-1.779,y:11.883,z:10.815},{resSeq:139,iCode:"",x:.001,y:10.156,z:13.751},{resSeq:140,iCode:"",x:2.471,y:13.098,z:13.928},{resSeq:141,iCode:"",x:-.435,y:15.462,z:14.748},{resSeq:142,iCode:"",x:-1.018,y:13.75,z:18.138},{resSeq:143,iCode:"",x:-2.597,y:10.358,z:17.368},{resSeq:144,iCode:"",x:.381,y:8.319,z:18.644},{resSeq:145,iCode:"",x:1.524,y:6.078,z:21.516},{resSeq:146,iCode:"",x:4.324,y:8.469,z:22.644},{resSeq:159,iCode:"",x:18.851,y:4.141,z:25.877},{resSeq:160,iCode:"",x:19.336,y:7.519,z:27.598},{resSeq:161,iCode:"",x:16.484,y:9.287,z:29.428},{resSeq:162,iCode:"",x:13.706,y:10.345,z:27.03},{resSeq:163,iCode:"",x:14.603,y:7.653,z:24.452},{resSeq:164,iCode:"",x:12.799,y:4.416,z:23.547},{resSeq:165,iCode:"",x:13.307,y:1.265,z:21.49},{resSeq:166,iCode:"",x:12.252,y:2.388,z:18.002},{resSeq:167,iCode:"",x:9.577,y:-.18,z:16.999},{resSeq:168,iCode:"",x:6.558,y:.282,z:14.713},{resSeq:169,iCode:"",x:3.838,y:-1.116,z:17.006},{resSeq:170,iCode:"",x:5.324,y:.931,z:19.895},{resSeq:171,iCode:"",x:4.79,y:4.382,z:18.302},{resSeq:172,iCode:"",x:2.007,y:3.883,z:15.716},{resSeq:173,iCode:"",x:-1.352,y:3.056,z:17.401},{resSeq:174,iCode:"",x:-3.281,y:.016,z:16.186},{resSeq:175,iCode:"",x:-6.629,y:1.892,z:16.116},{resSeq:176,iCode:"",x:-5.107,y:4.261,z:13.517},{resSeq:177,iCode:"",x:-3.824,y:1.259,z:11.553},{resSeq:178,iCode:"",x:-7.133,y:-.645,z:11.684},{resSeq:179,iCode:"",x:-9.86,y:2.068,z:11.625},{resSeq:180,iCode:"",x:-8.228,y:4.703,z:9.405},{resSeq:181,iCode:"",x:-5.199,y:3.248,z:7.53},{resSeq:182,iCode:"",x:-6.459,y:-.263,z:6.673},{resSeq:183,iCode:"",x:-9.945,y:1.052,z:5.763},{resSeq:184,iCode:"",x:-8.831,y:4.111,z:3.75},{resSeq:185,iCode:"",x:-5.607,y:2.825,z:2.173},{resSeq:186,iCode:"",x:-6.056,y:-.936,z:1.641},{resSeq:187,iCode:"",x:-9.672,y:-2.101,z:1.953},{resSeq:188,iCode:"",x:-11.423,y:.673,z:.009},{resSeq:189,iCode:"",x:-8.826,y:.615,z:-2.829},{resSeq:190,iCode:"",x:-9.086,y:-3.197,z:-2.996},{resSeq:191,iCode:"",x:-12.908,y:-3.044,z:-3.195},{resSeq:192,iCode:"",x:-12.805,y:-.268,z:-5.805},{resSeq:193,iCode:"",x:-10.142,y:-2.103,z:-7.858},{resSeq:194,iCode:"",x:-12.039,y:-5.399,z:-7.617},{resSeq:195,iCode:"",x:-15.238,y:-3.686,z:-8.792},{resSeq:196,iCode:"",x:-13.482,y:-1.75,z:-11.552},{resSeq:197,iCode:"",x:-11.63,y:-4.732,z:-12.98},{resSeq:198,iCode:"",x:-14.754,y:-6.944,z:-12.903},{resSeq:199,iCode:"",x:-16.566,y:-4.258,z:-14.975},{resSeq:200,iCode:"",x:-13.634,y:-4.097,z:-17.442},{resSeq:201,iCode:"",x:-13.7,y:-7.908,z:-17.687},{resSeq:202,iCode:"",x:-17.464,y:-7.865,z:-18.454},{resSeq:203,iCode:"",x:-16.879,y:-5.382,z:-21.289},{resSeq:204,iCode:"",x:-14.11,y:-7.632,z:-22.653},{resSeq:205,iCode:"",x:-16.313,y:-10.746,z:-22.578},{resSeq:206,iCode:"",x:-19.11,y:-8.785,z:-24.338},{resSeq:207,iCode:"",x:-16.804,y:-7.727,z:-27.152},{resSeq:208,iCode:"",x:-15.293,y:-11.245,z:-27.321},{resSeq:209,iCode:"",x:-18.8,y:-12.606,z:-27.959},{resSeq:210,iCode:"",x:-19.329,y:-10.07,z:-30.826},{resSeq:211,iCode:"",x:-16.197,y:-11.334,z:-32.586},{resSeq:224,iCode:"",x:-13.657,y:-19.04,z:-28.019},{resSeq:225,iCode:"",x:-14.235,y:-19.227,z:-24.29},{resSeq:226,iCode:"",x:-10.437,y:-19.89,z:-24.105},{resSeq:227,iCode:"",x:-10.002,y:-16.146,z:-24.843},{resSeq:228,iCode:"",x:-12.548,y:-15.236,z:-22.097},{resSeq:229,iCode:"",x:-10.798,y:-17.516,z:-19.546},{resSeq:230,iCode:"",x:-7.434,y:-15.912,z:-20.442},{resSeq:231,iCode:"",x:-8.95,y:-12.42,z:-19.927},{resSeq:232,iCode:"",x:-10.531,y:-13.345,z:-16.58},{resSeq:233,iCode:"",x:-7.235,y:-14.886,z:-15.442},{resSeq:234,iCode:"",x:-5.259,y:-11.735,z:-16.316},{resSeq:235,iCode:"",x:-7.568,y:-9.473,z:-14.262},{resSeq:236,iCode:"",x:-7.678,y:-12.012,z:-11.41},{resSeq:237,iCode:"",x:-3.872,y:-11.779,z:-11.262},{resSeq:238,iCode:"",x:-3.885,y:-7.946,z:-10.869},{resSeq:239,iCode:"",x:-6.314,y:-7.912,z:-7.932},{resSeq:240,iCode:"",x:-5.182,y:-11.263,z:-6.525},{resSeq:241,iCode:"",x:-1.552,y:-10.105,z:-6.249},{resSeq:242,iCode:"",x:-2.576,y:-6.822,z:-4.559},{resSeq:243,iCode:"",x:-4.624,y:-8.827,z:-2.049},{resSeq:244,iCode:"",x:-1.822,y:-11.407,z:-1.603},{resSeq:245,iCode:"",x:.735,y:-8.665,z:-.891},{resSeq:246,iCode:"",x:-1.252,y:-6.306,z:1.381},{resSeq:247,iCode:"",x:-3.945,y:-8.291,z:3.231},{resSeq:248,iCode:"",x:-1.644,y:-10.607,z:5.293},{resSeq:249,iCode:"",x:-.009,y:-7.775,z:7.244},{resSeq:250,iCode:"",x:-3.253,y:-5.809,z:7.725},{resSeq:251,iCode:"",x:-5.327,y:-8.914,z:8.593},{resSeq:252,iCode:"",x:-2.679,y:-9.627,z:11.214},{resSeq:253,iCode:"",x:-2.965,y:-5.998,z:12.42},{resSeq:254,iCode:"",x:-6.729,y:-6.478,z:12.936},{resSeq:255,iCode:"",x:-6.032,y:-9.7,z:14.91},{resSeq:256,iCode:"",x:-3.544,y:-7.765,z:17.089},{resSeq:257,iCode:"",x:-5.961,y:-4.867,z:17.66},{resSeq:258,iCode:"",x:-9.176,y:-6.804,z:18.315},{resSeq:259,iCode:"",x:-7.519,y:-9.522,z:20.426},{resSeq:260,iCode:"",x:-5.286,y:-7.782,z:22.986},{resSeq:261,iCode:"",x:-5.435,y:-10.952,z:25.163},{resSeq:262,iCode:"",x:-4.094,y:-13.233,z:22.358},{resSeq:263,iCode:"",x:-.358,y:-13.905,z:22.401},{resSeq:264,iCode:"",x:.984,y:-11.616,z:19.665},{resSeq:265,iCode:"",x:1.74,y:-12.873,z:16.16},{resSeq:266,iCode:"",x:5.242,y:-14.4,z:16.065},{resSeq:267,iCode:"",x:8.113,y:-12.232,z:14.815},{resSeq:268,iCode:"",x:8.877,y:-14.506,z:11.814},{resSeq:269,iCode:"",x:5.26,y:-14.016,z:10.653},{resSeq:270,iCode:"",x:5.627,y:-10.25,z:11.051},{resSeq:271,iCode:"",x:8.797,y:-10.234,z:8.9},{resSeq:272,iCode:"",x:7.076,y:-12.451,z:6.3},{resSeq:273,iCode:"",x:4.008,y:-10.159,z:6.092},{resSeq:274,iCode:"",x:6.067,y:-6.941,z:6.039},{resSeq:275,iCode:"",x:8.248,y:-8.4,z:3.275},{resSeq:276,iCode:"",x:5.099,y:-9.479,z:1.365},{resSeq:277,iCode:"",x:3.67,y:-5.929,z:1.48},{resSeq:278,iCode:"",x:6.916,y:-4.509,z:.029},{resSeq:279,iCode:"",x:6.94,y:-7.163,z:-2.727},{resSeq:280,iCode:"",x:3.982,y:-5.308,z:-4.316},{resSeq:281,iCode:"",x:6.677,y:-2.889,z:-5.561},{resSeq:282,iCode:"",x:8.52,y:-5.722,z:-7.418},{resSeq:283,iCode:"",x:5.439,y:-7.191,z:-9.142},{resSeq:284,iCode:"",x:3.868,y:-3.737,z:-9.888},{resSeq:285,iCode:"",x:6.345,y:-3.115,z:-12.647},{resSeq:286,iCode:"",x:5.706,y:-6.57,z:-14.119},{resSeq:287,iCode:"",x:1.918,y:-6.936,z:-14.21},{resSeq:288,iCode:"",x:1.226,y:-3.329,z:-15.296},{resSeq:289,iCode:"",x:4.057,y:-2.448,z:-17.68},{resSeq:290,iCode:"",x:5.041,y:-5.952,z:-18.818},{resSeq:291,iCode:"",x:1.386,y:-6.439,z:-19.951},{resSeq:292,iCode:"",x:1.98,y:-3.789,z:-22.65},{resSeq:293,iCode:"",x:3.634,y:-5.134,z:-25.839},{resSeq:294,iCode:"",x:5.126,y:-1.669,z:-26.462},{resSeq:295,iCode:"",x:6.911,y:-1.879,z:-23.07},{resSeq:296,iCode:"",x:7.962,y:-5.497,z:-23.774},{resSeq:297,iCode:"",x:9.667,y:-4.669,z:-27.102},{resSeq:298,iCode:"",x:11.345,y:-1.587,z:-25.579},{resSeq:299,iCode:"",x:12.81,y:-3.776,z:-22.815},{resSeq:300,iCode:"",x:14.418,y:-5.999,z:-25.499},{resSeq:301,iCode:"",x:16.049,y:-3.111,z:-27.33},{resSeq:302,iCode:"",x:17.451,y:-1.694,z:-24.049},{resSeq:303,iCode:"",x:19.036,y:-4.922,z:-22.724},{resSeq:304,iCode:"",x:20.287,y:-5.86,z:-26.201},{resSeq:305,iCode:"",x:21.795,y:-2.443,z:-26.967},{resSeq:306,iCode:"",x:23.505,y:-2.53,z:-23.569},{resSeq:307,iCode:"",x:25.222,y:-5.835,z:-24.436},{resSeq:308,iCode:"",x:26.061,y:-4.733,z:-28.039},{resSeq:309,iCode:"",x:27.795,y:-1.81,z:-26.235},{resSeq:310,iCode:"",x:30.307,y:-3.91,z:-24.286},{resSeq:311,iCode:"",x:31.071,y:-6.489,z:-26.983},{resSeq:312,iCode:"",x:32.333,y:-4.199,z:-29.818}]},{chainId:"C",residueCount:196,segments:[{start:41,end:47,type:"strand"},{start:53,end:60,type:"helix"},{start:209,end:214,type:"strand"},{start:217,end:223,type:"strand"},{start:231,end:235,type:"helix"},{start:243,end:249,type:"strand"},{start:265,end:278,type:"helix"},{start:286,end:292,type:"strand"},{start:294,end:303,type:"helix"},{start:308,end:311,type:"helix"},{start:313,end:317,type:"helix"},{start:332,end:351,type:"helix"},{start:359,end:363,type:"strand"},{start:371,end:390,type:"helix"}],calphas:[{resSeq:40,iCode:"",x:-15.109,y:15.6,z:-31.04},{resSeq:41,iCode:"",x:-15.379,y:12.41,z:-33.17},{resSeq:42,iCode:"",x:-14.669,y:12.559,z:-36.9},{resSeq:43,iCode:"",x:-16.573,y:10.294,z:-39.311},{resSeq:44,iCode:"",x:-16.175,y:9.524,z:-43.018},{resSeq:45,iCode:"",x:-19.528,y:9.043,z:-44.812},{resSeq:46,iCode:"",x:-19.397,y:7.249,z:-48.173},{resSeq:47,iCode:"",x:-21.384,y:5.107,z:-50.618},{resSeq:48,iCode:"",x:-22.983,y:5.162,z:-54.069},{resSeq:49,iCode:"",x:-25.479,y:7.529,z:-55.687},{resSeq:50,iCode:"",x:-29.086,y:6.724,z:-54.736},{resSeq:51,iCode:"",x:-27.747,y:4.636,z:-51.85},{resSeq:52,iCode:"",x:-29.625,y:6.945,z:-49.494},{resSeq:53,iCode:"",x:-26.345,y:8.247,z:-48.057},{resSeq:54,iCode:"",x:-27.846,y:11.744,z:-48.373},{resSeq:55,iCode:"",x:-31.055,y:10.812,z:-46.542},{resSeq:56,iCode:"",x:-29.223,y:9.184,z:-43.593},{resSeq:57,iCode:"",x:-27.496,y:12.56,z:-43.13},{resSeq:58,iCode:"",x:-30.816,y:14.4,z:-43.718},{resSeq:59,iCode:"",x:-32.598,y:12.541,z:-40.884},{resSeq:60,iCode:"",x:-29.628,y:13.227,z:-38.549},{resSeq:61,iCode:"",x:-30.171,y:16.969,z:-39.274},{resSeq:208,iCode:"",x:-21.547,y:17.741,z:-46.926},{resSeq:209,iCode:"",x:-19.969,y:18.537,z:-43.511},{resSeq:210,iCode:"",x:-22.342,y:17.434,z:-40.715},{resSeq:211,iCode:"",x:-21.835,y:17.73,z:-36.957},{resSeq:212,iCode:"",x:-24.404,y:16.083,z:-34.652},{resSeq:213,iCode:"",x:-24.862,y:15.594,z:-30.883},{resSeq:214,iCode:"",x:-25.52,y:12.207,z:-29.196},{resSeq:215,iCode:"",x:-25.336,y:11.563,z:-25.409},{resSeq:216,iCode:"",x:-23.434,y:14.876,z:-25.059},{resSeq:217,iCode:"",x:-20.673,y:13.584,z:-27.412},{resSeq:218,iCode:"",x:-19.904,y:15.638,z:-30.54},{resSeq:219,iCode:"",x:-19.587,y:13.958,z:-33.935},{resSeq:220,iCode:"",x:-18.375,y:15.577,z:-37.175},{resSeq:221,iCode:"",x:-19.25,y:13.589,z:-40.343},{resSeq:222,iCode:"",x:-17.987,y:14.292,z:-43.925},{resSeq:223,iCode:"",x:-19.712,y:13.238,z:-47.169},{resSeq:224,iCode:"",x:-17.213,y:12.063,z:-49.838},{resSeq:225,iCode:"",x:-18.384,y:9.043,z:-51.857},{resSeq:226,iCode:"",x:-19.551,y:6.935,z:-54.752},{resSeq:227,iCode:"",x:-16.128,y:6.364,z:-56.366},{resSeq:228,iCode:"",x:-16.961,y:8.766,z:-59.236},{resSeq:229,iCode:"",x:-15.138,y:11.808,z:-57.803},{resSeq:230,iCode:"",x:-14.707,y:13.941,z:-54.628},{resSeq:231,iCode:"",x:-13.376,y:10.887,z:-52.723},{resSeq:232,iCode:"",x:-9.641,y:10.713,z:-53.272},{resSeq:233,iCode:"",x:-9.243,y:14.459,z:-52.547},{resSeq:234,iCode:"",x:-10.942,y:14.545,z:-49.145},{resSeq:235,iCode:"",x:-9.876,y:11.011,z:-48.052},{resSeq:236,iCode:"",x:-6.205,y:11.884,z:-48.089},{resSeq:237,iCode:"",x:-6.944,y:14.854,z:-45.813},{resSeq:238,iCode:"",x:-8.012,y:14.234,z:-42.176},{resSeq:239,iCode:"",x:-6.237,y:11.161,z:-40.906},{resSeq:240,iCode:"",x:-7.82,y:11.005,z:-37.488},{resSeq:241,iCode:"",x:-11.258,y:9.772,z:-38.585},{resSeq:242,iCode:"",x:-12.56,y:7.503,z:-35.791},{resSeq:243,iCode:"",x:-14.665,y:5.46,z:-38.265},{resSeq:244,iCode:"",x:-15.925,y:5.157,z:-41.839},{resSeq:245,iCode:"",x:-19.693,y:5.019,z:-42.362},{resSeq:246,iCode:"",x:-20.358,y:2.904,z:-45.501},{resSeq:247,iCode:"",x:-23.853,y:2.993,z:-47.013},{resSeq:248,iCode:"",x:-25.034,y:.461,z:-49.612},{resSeq:249,iCode:"",x:-28.488,y:.079,z:-51.167},{resSeq:250,iCode:"",x:-29.419,y:-3.583,z:-50.585},{resSeq:251,iCode:"",x:-32.26,y:-3.377,z:-53.135},{resSeq:252,iCode:"",x:-30.032,y:-2.521,z:-56.123},{resSeq:253,iCode:"",x:-28.75,y:-6.005,z:-57.038},{resSeq:254,iCode:"",x:-26.615,y:-4.797,z:-60.031},{resSeq:265,iCode:"",x:-24.907,y:-1.807,z:-58.396},{resSeq:266,iCode:"",x:-24.353,y:-4.122,z:-55.395},{resSeq:267,iCode:"",x:-21.376,y:-5.576,z:-57.293},{resSeq:268,iCode:"",x:-20.033,y:-2.024,z:-57.731},{resSeq:269,iCode:"",x:-20.542,y:-1.412,z:-54.007},{resSeq:270,iCode:"",x:-18.683,y:-4.653,z:-53.208},{resSeq:271,iCode:"",x:-15.731,y:-3.473,z:-55.322},{resSeq:272,iCode:"",x:-15.742,y:-.066,z:-53.6},{resSeq:273,iCode:"",x:-15.821,y:-1.805,z:-50.214},{resSeq:274,iCode:"",x:-12.856,y:-4.068,z:-51.092},{resSeq:275,iCode:"",x:-10.976,y:-.895,z:-52.134},{resSeq:276,iCode:"",x:-11.797,y:.913,z:-48.868},{resSeq:277,iCode:"",x:-10.883,y:-2.208,z:-46.848},{resSeq:278,iCode:"",x:-7.425,y:-2.571,z:-48.46},{resSeq:279,iCode:"",x:-6.581,y:1.159,z:-48.816},{resSeq:280,iCode:"",x:-3.121,y:2.216,z:-47.567},{resSeq:281,iCode:"",x:-4.51,y:5.402,z:-45.969},{resSeq:282,iCode:"",x:-7.494,y:3.61,z:-44.342},{resSeq:283,iCode:"",x:-5.812,y:.273,z:-43.441},{resSeq:284,iCode:"",x:-6.532,y:.447,z:-39.692},{resSeq:285,iCode:"",x:-9.873,y:2.337,z:-39.837},{resSeq:286,iCode:"",x:-13.079,y:.479,z:-38.85},{resSeq:287,iCode:"",x:-16.143,y:.574,z:-41.113},{resSeq:288,iCode:"",x:-19.71,y:1.051,z:-39.79},{resSeq:289,iCode:"",x:-21.758,y:-.696,z:-42.528},{resSeq:290,iCode:"",x:-25.358,y:.383,z:-43.346},{resSeq:291,iCode:"",x:-27.336,y:-2.002,z:-45.556},{resSeq:292,iCode:"",x:-29.987,y:.468,z:-46.691},{resSeq:293,iCode:"",x:-33.464,y:.44,z:-48.256},{resSeq:294,iCode:"",x:-34.403,y:-2.755,z:-46.435},{resSeq:295,iCode:"",x:-38.117,y:-1.994,z:-46.947},{resSeq:296,iCode:"",x:-37.572,y:-1.689,z:-50.718},{resSeq:297,iCode:"",x:-35.562,y:-4.955,z:-50.627},{resSeq:298,iCode:"",x:-38.513,y:-6.681,z:-48.914},{resSeq:299,iCode:"",x:-40.817,y:-5.465,z:-51.702},{resSeq:300,iCode:"",x:-38.338,y:-6.558,z:-54.437},{resSeq:301,iCode:"",x:-37.896,y:-10.021,z:-52.908},{resSeq:302,iCode:"",x:-41.599,y:-10.684,z:-52.17},{resSeq:303,iCode:"",x:-42.504,y:-9.556,z:-55.729},{resSeq:304,iCode:"",x:-40.376,y:-12.293,z:-57.333},{resSeq:305,iCode:"",x:-39.553,y:-10.544,z:-60.658},{resSeq:306,iCode:"",x:-35.776,y:-10.284,z:-60.037},{resSeq:307,iCode:"",x:-33.958,y:-13.404,z:-58.726},{resSeq:308,iCode:"",x:-30.66,y:-12.725,z:-56.893},{resSeq:309,iCode:"",x:-29.115,y:-16.024,z:-58.154},{resSeq:310,iCode:"",x:-29.033,y:-14.347,z:-61.587},{resSeq:311,iCode:"",x:-26.62,y:-11.696,z:-60.279},{resSeq:312,iCode:"",x:-25.132,y:-13.979,z:-57.593},{resSeq:313,iCode:"",x:-25.379,y:-17.724,z:-58.527},{resSeq:314,iCode:"",x:-23.714,y:-18.941,z:-55.299},{resSeq:315,iCode:"",x:-26.873,y:-17.708,z:-53.482},{resSeq:316,iCode:"",x:-28.631,y:-20.932,z:-54.63},{resSeq:317,iCode:"",x:-26.433,y:-22.914,z:-52.199},{resSeq:318,iCode:"",x:-26.747,y:-20.277,z:-49.432},{resSeq:319,iCode:"",x:-28.974,y:-20.928,z:-46.392},{resSeq:320,iCode:"",x:-29.842,y:-18.328,z:-43.7},{resSeq:321,iCode:"",x:-27.359,y:-18.399,z:-40.764},{resSeq:322,iCode:"",x:-28.384,y:-20.129,z:-37.494},{resSeq:323,iCode:"",x:-27.25,y:-17.047,z:-35.512},{resSeq:324,iCode:"",x:-29.453,y:-14.807,z:-37.717},{resSeq:325,iCode:"",x:-32.166,y:-13.121,z:-35.656},{resSeq:326,iCode:"",x:-35.106,y:-12.29,z:-37.974},{resSeq:327,iCode:"",x:-37.803,y:-9.974,z:-36.592},{resSeq:328,iCode:"",x:-41.504,y:-10.908,z:-35.961},{resSeq:329,iCode:"",x:-43.349,y:-11.17,z:-39.317},{resSeq:330,iCode:"",x:-40.307,y:-11.411,z:-41.614},{resSeq:331,iCode:"",x:-40.647,y:-13.77,z:-44.616},{resSeq:332,iCode:"",x:-37.772,y:-16.32,z:-44.375},{resSeq:333,iCode:"",x:-37.04,y:-15.528,z:-48.056},{resSeq:334,iCode:"",x:-36.501,y:-11.822,z:-47.313},{resSeq:335,iCode:"",x:-34.37,y:-12.724,z:-44.255},{resSeq:336,iCode:"",x:-32.254,y:-15.11,z:-46.355},{resSeq:337,iCode:"",x:-31.574,y:-12.515,z:-49.093},{resSeq:338,iCode:"",x:-30.91,y:-9.722,z:-46.569},{resSeq:339,iCode:"",x:-28.372,y:-11.811,z:-44.674},{resSeq:340,iCode:"",x:-26.82,y:-13.022,z:-47.963},{resSeq:341,iCode:"",x:-25.972,y:-9.429,z:-48.9},{resSeq:342,iCode:"",x:-24.622,y:-8.742,z:-45.401},{resSeq:343,iCode:"",x:-22.381,y:-11.819,z:-45.667},{resSeq:344,iCode:"",x:-21.271,y:-10.735,z:-49.162},{resSeq:345,iCode:"",x:-19.783,y:-7.618,z:-47.579},{resSeq:346,iCode:"",x:-18.431,y:-9.523,z:-44.554},{resSeq:347,iCode:"",x:-16.411,y:-12.122,z:-46.539},{resSeq:348,iCode:"",x:-14.301,y:-9.15,z:-47.705},{resSeq:349,iCode:"",x:-13.747,y:-7.933,z:-44.094},{resSeq:350,iCode:"",x:-12.632,y:-11.417,z:-43.091},{resSeq:351,iCode:"",x:-10.444,y:-11.867,z:-46.215},{resSeq:352,iCode:"",x:-7.782,y:-9.546,z:-44.788},{resSeq:353,iCode:"",x:-8.207,y:-10.915,z:-41.271},{resSeq:354,iCode:"",x:-5.557,y:-8.804,z:-39.522},{resSeq:355,iCode:"",x:-7.974,y:-7.677,z:-36.761},{resSeq:356,iCode:"",x:-6.627,y:-4.117,z:-36.5},{resSeq:357,iCode:"",x:-10.062,y:-2.971,z:-37.76},{resSeq:358,iCode:"",x:-13.573,y:-4.465,z:-38.024},{resSeq:359,iCode:"",x:-16.79,y:-4.042,z:-40.047},{resSeq:360,iCode:"",x:-20.004,y:-3.427,z:-38.027},{resSeq:361,iCode:"",x:-23.14,y:-4.21,z:-40.104},{resSeq:362,iCode:"",x:-26.69,y:-2.848,z:-39.834},{resSeq:363,iCode:"",x:-30.051,y:-3.246,z:-41.581},{resSeq:364,iCode:"",x:-31.601,y:.22,z:-42.146},{resSeq:365,iCode:"",x:-35.044,y:.925,z:-43.627},{resSeq:369,iCode:"",x:-35.613,y:5.57,z:-37.047},{resSeq:370,iCode:"",x:-32.454,y:5.581,z:-34.811},{resSeq:371,iCode:"",x:-29.257,y:5.572,z:-36.965},{resSeq:372,iCode:"",x:-27.438,y:8.13,z:-34.831},{resSeq:373,iCode:"",x:-27.493,y:5.75,z:-31.87},{resSeq:374,iCode:"",x:-26.162,y:2.88,z:-34.031},{resSeq:375,iCode:"",x:-23.253,y:5.039,z:-35.188},{resSeq:376,iCode:"",x:-22.702,y:6.143,z:-31.542},{resSeq:377,iCode:"",x:-22.661,y:2.596,z:-30.159},{resSeq:378,iCode:"",x:-20.363,y:1.389,z:-32.953},{resSeq:379,iCode:"",x:-17.835,y:4.165,z:-32.27},{resSeq:380,iCode:"",x:-18.068,y:3.469,z:-28.521},{resSeq:381,iCode:"",x:-17.332,y:-.186,z:-29.286},{resSeq:382,iCode:"",x:-14.445,y:.668,z:-31.639},{resSeq:383,iCode:"",x:-12.548,y:2.827,z:-29.176},{resSeq:384,iCode:"",x:-13.463,y:.652,z:-26.144},{resSeq:385,iCode:"",x:-11.931,y:-2.272,z:-28.079},{resSeq:386,iCode:"",x:-8.898,y:-.092,z:-28.771},{resSeq:387,iCode:"",x:-8.442,y:.245,z:-24.981},{resSeq:388,iCode:"",x:-9.193,y:-3.467,z:-24.425},{resSeq:389,iCode:"",x:-6.613,y:-4.379,z:-27.1},{resSeq:390,iCode:"",x:-4.155,y:-1.971,z:-25.403},{resSeq:391,iCode:"",x:-4.339,y:-4.126,z:-22.239},{resSeq:392,iCode:"",x:-4.007,y:-7.394,z:-24.262},{resSeq:393,iCode:"",x:-7.477,y:-8.292,z:-22.941},{resSeq:394,iCode:"",x:-8.592,y:-8.967,z:-26.554}]}]}};function Us(s,e){const t=document.getElementById(s);if(!(t instanceof Xn))return;const i=l2[e];i&&(t.proteinData=i)}document.addEventListener("DOMContentLoaded",()=>{Us("td-3k19","3k19"),Us("td-2omf","2omf"),Us("td-7ahl","7ahl"),Us("td-2j1n","2j1n"),Us("td-5g53","5g53");const s=document.getElementById("build-info");s&&(s.textContent=`Built ${"2026-06-25T00:59:59.491Z".slice(0,10)} · 83d22ae`)});const c2=15,hr={ribbonThickness:1.4,helixRadius:2.4,loopRadius:.7};function Jo(s){return{x:s.x3??0,y:s.y3??0,z:s.z}}const h2=8;function u2(s,e,t){const i=[];for(let n=e;n<=t&&n<s.samples.length;n++){const r=s.samples[n];i.push({arc:r.arc,z:r.z,pos3d:Jo(r)})}return i}function ka(s){return!!s&&(s.type==="helix"||s.type==="strand")}function f2(s,e){if(s.length===0)return Array.from({length:e},()=>({x:0,y:0,z:0}));if(s.length===1)return Array.from({length:e},()=>({...s[0]}));const t=[];for(let i=0;i<e;i++){const n=i/(e-1)*(s.length-1),r=Math.floor(n),o=n-r,a=s[r],l=s[Math.min(r+1,s.length-1)];t.push({x:a.x+(l.x-a.x)*o,y:a.y+(l.y-a.y)*o,z:a.z+(l.z-a.z)*o})}return t}function x2(s,e,t,i,n,r){const o=t?{samples:s.samples,index:t.endResSampleIdx}:null,a=i?{samples:s.samples,index:i.startSample}:null,l={samples:s.samples,startSample:e.startSample,endSample:e.endSample},d=jo(o,a,l,n,Zo);if(d.length<2)return null;const c=kn(d.map(p=>({x:p.arc,y:p.z,z:0})),h2).samples,u=o?o.index:e.startSample,h=a?a.index:e.endSample,f=[];for(let p=u;p<=h&&p<s.samples.length;p++)f.push(Jo(s.samples[p]));const S=f2(f,c.length);return{type:"loop",samples:c.map((p,x)=>({arc:p.x,z:p.y,pos3d:S[x]})),residues:[],faded:r,control:d,dashed:!1}}function p2(s,e){const t=[];for(let i=e.residueStart;i<=e.residueEnd&&i<s.residues.length;i++){const n=s.residues[i],r=s.samples[n.sampleIndex];t.push({resSeq:n.resSeq,iCode:n.iCode,arc:(r==null?void 0:r.arc)??0,z:n.z,pos3d:r?Jo(r):{x:0,y:0,z:n.z},sampleIndex:Math.max(0,n.sampleIndex-e.startSample)})}return t}function S2(s,e,t,i){const n=[];let r=0,o=0;const a=t?{extremePoints:!1,extremeThreshold:$i.extremeThreshold,tangentMagPx:vs.loopTangentPx}:{extremePoints:!0,extremeThreshold:$i.extremeThreshold};for(let l=0;l<s.length;l++){const d=s[l],c=e?!e[l]:!1,u=t?d.runs.map(S=>S.type==="strand"?{...S,endResSampleIdx:h1(d.samples,S.startSample,S.endResSampleIdx)}:S):d.runs,h=!i&&l>0,f=!i&&l<s.length-1;for(let S=0;S<u.length;S++){const C=u[S];if(C.type==="helix"||C.type==="strand"){const g=u2(d,C.startSample,C.endResSampleIdx);if(g.length<2)continue;const M=p2(d,C);C.type==="helix"?(r++,n.push({type:"helix",samples:g,residues:M,faded:c,arrow:!1})):(o++,n.push({type:"strand",samples:g,residues:M,faded:c,arrow:!0}));continue}const p=ka(u[S-1])?u[S-1]:null,x=ka(u[S+1])?u[S+1]:null;if(p===null&&h||x===null&&f)continue;const y=x2(d,C,p,x,a,c);y&&n.push(y)}}return{elements:n,helices:r,strands:o}}const y2={ribbonHalfWidth:es.halfWidthPx/Ke.arcPxPerA,ribbonArrowHalfWidth:es.arrowHalfWidthPx/Ke.arcPxPerA,ribbonArrowLen:es.arrowLengthPx/Ke.arcPxPerA,ribbonThickness:hr.ribbonThickness,helixRadius:hr.helixRadius,loopRadius:hr.loopRadius};function m2(s,e={}){const t=e.analysis??a1(s.calphas,Ko(s.segments)),i=f1(s,t,e.assembly),{layouts:n,totalArc:r,focalFlags:o,zMin:a,zMax:l,asm:d,cylindrical:c}=i,u=d?"assembly":c?"barrel":"helical",h={helices:0,strands:0};d&&e.assembly?(h.strandCount=e.assembly.analysis.strandCount,h.tiltDeg=e.assembly.analysis.tiltDeg):c&&(h.strandCount=t.strandCount,h.tiltDeg=t.tiltDeg,h.shear=t.shear);const f=!!d||c,{elements:S,helices:C,strands:p}=S2(n,o,f,!!d);return h.helices=C,h.strands=p,{chainId:s.chainId,kind:u,membrane:{half:c2},arcSpan:r,zRange:{min:a,max:l},elements:S,contacts:c&&!d?C2(t,n):[],style:y2,meta:h}}function C2(s,e){const t=new Map;for(const i of e)for(const n of i.residues){const r=i.samples[n.sampleIndex];r&&t.set(n.resSeq,{x:r.x3??0,y:r.y3??0,z:r.z})}return l1(s,e).map(i=>({a:{arc:i.a.arc,z:i.a.z,pos3d:t.get(i.a.resSeq)??{x:0,y:0,z:i.a.z}},b:{arc:i.b.arc,z:i.b.z,pos3d:t.get(i.b.resSeq)??{x:0,y:0,z:i.b.z}}}))}const z2=Object.freeze(Object.defineProperty({__proto__:null,buildScene:m2},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Qo="184",Ms={ROTATE:0,DOLLY:1,PAN:2},qs={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},g2=0,Wa=1,q2=2,Un=1,_2=2,ks=3,Hi=0,Ft=1,Vt=2,gt=0,bs=1,to=2,Xa=3,Ya=4,p1=5,ti=100,v2=101,M2=102,b2=103,E2=104,Ws=200,T2=201,A2=202,w2=203,io=204,so=205,no=206,R2=207,ro=208,P2=209,D2=210,L2=211,I2=212,N2=213,U2=214,oo=0,ao=1,lo=2,Ts=3,co=4,ho=5,uo=6,fo=7,S1=0,F2=1,O2=2,xi=0,$o=1,ea=2,ta=3,ia=4,sa=5,na=6,ra=7,y1=300,ts=301,As=302,ur=303,fr=304,er=306,is=1e3,_i=1001,xo=1002,Ct=1003,B2=1004,an=1005,Tt=1006,xr=1007,Qi=1008,Ut=1009,m1=1010,C1=1011,Qs=1012,oa=1013,pi=1014,ui=1015,qt=1016,aa=1017,da=1018,ws=1020,z1=35902,g1=35899,q1=1021,_1=1022,jt=1023,Mi=1026,Fi=1027,v1=1028,la=1029,ss=1030,ca=1031,ha=1033,Fn=33776,On=33777,Bn=33778,Hn=33779,po=35840,So=35841,yo=35842,mo=35843,Co=36196,zo=37492,go=37496,qo=37488,_o=37489,Yn=37490,vo=37491,Mo=37808,bo=37809,Eo=37810,To=37811,Ao=37812,wo=37813,Ro=37814,Po=37815,Do=37816,Lo=37817,Io=37818,No=37819,Uo=37820,Fo=37821,Oo=36492,Bo=36494,Ho=36495,Go=36283,Vo=36284,jn=36285,ko=36286,H2=3200,G2=3201,Zn=0,V2=1,Ui="",Xt="srgb",Kn="srgb-linear",Jn="linear",$e="srgb",as=7680,ja=519,k2=512,W2=513,X2=514,ua=515,Y2=516,j2=517,fa=518,Z2=519,Za=35044,Ka="300 es",fi=2e3,$s=2001;function K2(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function Qn(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function J2(){const s=Qn("canvas");return s.style.display="block",s}const Ja={};function Qa(...s){const e="THREE."+s.shift();console.log(e,...s)}function M1(s){const e=s[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=s[1];t&&t.isStackTrace?s[0]+=" "+t.getLocation():s[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return s}function Pe(...s){s=M1(s);const e="THREE."+s.shift();{const t=s[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...s)}}function Ze(...s){s=M1(s);const e="THREE."+s.shift();{const t=s[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...s)}}function Wo(...s){const e=s.join(" ");e in Ja||(Ja[e]=!0,Pe(...s))}function Q2(s,e,t){return new Promise(function(i,n){function r(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:n();break;case s.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:i()}}setTimeout(r,t)})}const $2={[oo]:ao,[lo]:uo,[co]:fo,[Ts]:ho,[ao]:oo,[uo]:lo,[fo]:co,[ho]:Ts};class Vi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const n=i[e];if(n!==void 0){const r=n.indexOf(t);r!==-1&&n.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const n=i.slice(0);for(let r=0,o=n.length;r<o;r++)n[r].call(this,e);e.target=null}}}const Rt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let $a=1234567;const Zs=Math.PI/180,en=180/Math.PI;function Ps(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Rt[s&255]+Rt[s>>8&255]+Rt[s>>16&255]+Rt[s>>24&255]+"-"+Rt[e&255]+Rt[e>>8&255]+"-"+Rt[e>>16&15|64]+Rt[e>>24&255]+"-"+Rt[t&63|128]+Rt[t>>8&255]+"-"+Rt[t>>16&255]+Rt[t>>24&255]+Rt[i&255]+Rt[i>>8&255]+Rt[i>>16&255]+Rt[i>>24&255]).toLowerCase()}function ke(s,e,t){return Math.max(e,Math.min(t,s))}function xa(s,e){return(s%e+e)%e}function ec(s,e,t,i,n){return i+(s-e)*(n-i)/(t-e)}function tc(s,e,t){return s!==e?(t-s)/(e-s):0}function Ks(s,e,t){return(1-t)*s+t*e}function ic(s,e,t,i){return Ks(s,e,1-Math.exp(-t*i))}function sc(s,e=1){return e-Math.abs(xa(s,e*2)-e)}function nc(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*(3-2*s))}function rc(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*s*(s*(s*6-15)+10))}function oc(s,e){return s+Math.floor(Math.random()*(e-s+1))}function ac(s,e){return s+Math.random()*(e-s)}function dc(s){return s*(.5-Math.random())}function lc(s){s!==void 0&&($a=s);let e=$a+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function cc(s){return s*Zs}function hc(s){return s*en}function uc(s){return(s&s-1)===0&&s!==0}function fc(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function xc(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function pc(s,e,t,i,n){const r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),d=r((e+i)/2),c=o((e+i)/2),u=r((e-i)/2),h=o((e-i)/2),f=r((i-e)/2),S=o((i-e)/2);switch(n){case"XYX":s.set(a*c,l*u,l*h,a*d);break;case"YZY":s.set(l*h,a*c,l*u,a*d);break;case"ZXZ":s.set(l*u,l*h,a*c,a*d);break;case"XZX":s.set(a*c,l*S,l*f,a*d);break;case"YXY":s.set(l*f,a*c,l*S,a*d);break;case"ZYZ":s.set(l*S,l*f,a*c,a*d);break;default:Pe("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+n)}}function gs(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function Lt(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const Ki={DEG2RAD:Zs,RAD2DEG:en,generateUUID:Ps,clamp:ke,euclideanModulo:xa,mapLinear:ec,inverseLerp:tc,lerp:Ks,damp:ic,pingpong:sc,smoothstep:nc,smootherstep:rc,randInt:oc,randFloat:ac,randFloatSpread:dc,seededRandom:lc,degToRad:cc,radToDeg:hc,isPowerOfTwo:uc,ceilPowerOfTwo:fc,floorPowerOfTwo:xc,setQuaternionFromProperEuler:pc,normalize:Lt,denormalize:gs},qa=class qa{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,n=e.elements;return this.x=n[0]*t+n[3]*i+n[6],this.y=n[1]*t+n[4]*i+n[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=ke(this.x,e.x,t.x),this.y=ke(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=ke(this.x,e,t),this.y=ke(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(ke(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),n=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*i-o*n+e.x,this.y=r*n+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};qa.prototype.isVector2=!0;let _e=qa;class bi{constructor(e=0,t=0,i=0,n=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=n}static slerpFlat(e,t,i,n,r,o,a){let l=i[n+0],d=i[n+1],c=i[n+2],u=i[n+3],h=r[o+0],f=r[o+1],S=r[o+2],C=r[o+3];if(u!==C||l!==h||d!==f||c!==S){let p=l*h+d*f+c*S+u*C;p<0&&(h=-h,f=-f,S=-S,C=-C,p=-p);let x=1-a;if(p<.9995){const y=Math.acos(p),g=Math.sin(y);x=Math.sin(x*y)/g,a=Math.sin(a*y)/g,l=l*x+h*a,d=d*x+f*a,c=c*x+S*a,u=u*x+C*a}else{l=l*x+h*a,d=d*x+f*a,c=c*x+S*a,u=u*x+C*a;const y=1/Math.sqrt(l*l+d*d+c*c+u*u);l*=y,d*=y,c*=y,u*=y}}e[t]=l,e[t+1]=d,e[t+2]=c,e[t+3]=u}static multiplyQuaternionsFlat(e,t,i,n,r,o){const a=i[n],l=i[n+1],d=i[n+2],c=i[n+3],u=r[o],h=r[o+1],f=r[o+2],S=r[o+3];return e[t]=a*S+c*u+l*f-d*h,e[t+1]=l*S+c*h+d*u-a*f,e[t+2]=d*S+c*f+a*h-l*u,e[t+3]=c*S-a*u-l*h-d*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,n){return this._x=e,this._y=t,this._z=i,this._w=n,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,n=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,d=a(i/2),c=a(n/2),u=a(r/2),h=l(i/2),f=l(n/2),S=l(r/2);switch(o){case"XYZ":this._x=h*c*u+d*f*S,this._y=d*f*u-h*c*S,this._z=d*c*S+h*f*u,this._w=d*c*u-h*f*S;break;case"YXZ":this._x=h*c*u+d*f*S,this._y=d*f*u-h*c*S,this._z=d*c*S-h*f*u,this._w=d*c*u+h*f*S;break;case"ZXY":this._x=h*c*u-d*f*S,this._y=d*f*u+h*c*S,this._z=d*c*S+h*f*u,this._w=d*c*u-h*f*S;break;case"ZYX":this._x=h*c*u-d*f*S,this._y=d*f*u+h*c*S,this._z=d*c*S-h*f*u,this._w=d*c*u+h*f*S;break;case"YZX":this._x=h*c*u+d*f*S,this._y=d*f*u+h*c*S,this._z=d*c*S-h*f*u,this._w=d*c*u-h*f*S;break;case"XZY":this._x=h*c*u-d*f*S,this._y=d*f*u-h*c*S,this._z=d*c*S+h*f*u,this._w=d*c*u+h*f*S;break;default:Pe("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,n=Math.sin(i);return this._x=e.x*n,this._y=e.y*n,this._z=e.z*n,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],n=t[4],r=t[8],o=t[1],a=t[5],l=t[9],d=t[2],c=t[6],u=t[10],h=i+a+u;if(h>0){const f=.5/Math.sqrt(h+1);this._w=.25/f,this._x=(c-l)*f,this._y=(r-d)*f,this._z=(o-n)*f}else if(i>a&&i>u){const f=2*Math.sqrt(1+i-a-u);this._w=(c-l)/f,this._x=.25*f,this._y=(n+o)/f,this._z=(r+d)/f}else if(a>u){const f=2*Math.sqrt(1+a-i-u);this._w=(r-d)/f,this._x=(n+o)/f,this._y=.25*f,this._z=(l+c)/f}else{const f=2*Math.sqrt(1+u-i-a);this._w=(o-n)/f,this._x=(r+d)/f,this._y=(l+c)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(ke(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const n=Math.min(1,t/i);return this.slerp(e,n),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,n=e._y,r=e._z,o=e._w,a=t._x,l=t._y,d=t._z,c=t._w;return this._x=i*c+o*a+n*d-r*l,this._y=n*c+o*l+r*a-i*d,this._z=r*c+o*d+i*l-n*a,this._w=o*c-i*a-n*l-r*d,this._onChangeCallback(),this}slerp(e,t){let i=e._x,n=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(i=-i,n=-n,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){const d=Math.acos(a),c=Math.sin(d);l=Math.sin(l*d)/c,t=Math.sin(t*d)/c,this._x=this._x*l+i*t,this._y=this._y*l+n*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+i*t,this._y=this._y*l+n*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),n=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(n*Math.sin(e),n*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const _a=class _a{constructor(e=0,t=0,i=0){this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(ed.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(ed.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,n=this.z,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6]*n,this.y=r[1]*t+r[4]*i+r[7]*n,this.z=r[2]*t+r[5]*i+r[8]*n,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,n=this.z,r=e.elements,o=1/(r[3]*t+r[7]*i+r[11]*n+r[15]);return this.x=(r[0]*t+r[4]*i+r[8]*n+r[12])*o,this.y=(r[1]*t+r[5]*i+r[9]*n+r[13])*o,this.z=(r[2]*t+r[6]*i+r[10]*n+r[14])*o,this}applyQuaternion(e){const t=this.x,i=this.y,n=this.z,r=e.x,o=e.y,a=e.z,l=e.w,d=2*(o*n-a*i),c=2*(a*t-r*n),u=2*(r*i-o*t);return this.x=t+l*d+o*u-a*c,this.y=i+l*c+a*d-r*u,this.z=n+l*u+r*c-o*d,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,n=this.z,r=e.elements;return this.x=r[0]*t+r[4]*i+r[8]*n,this.y=r[1]*t+r[5]*i+r[9]*n,this.z=r[2]*t+r[6]*i+r[10]*n,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=ke(this.x,e.x,t.x),this.y=ke(this.y,e.y,t.y),this.z=ke(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=ke(this.x,e,t),this.y=ke(this.y,e,t),this.z=ke(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,n=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=n*l-r*a,this.y=r*o-i*l,this.z=i*a-n*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return pr.copy(this).projectOnVector(e),this.sub(pr)}reflect(e){return this.sub(pr.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(ke(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,n=this.z-e.z;return t*t+i*i+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const n=Math.sin(t)*e;return this.x=n*Math.sin(i),this.y=Math.cos(t)*e,this.z=n*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),n=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=n,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};_a.prototype.isVector3=!0;let U=_a;const pr=new U,ed=new bi,va=class va{constructor(e,t,i,n,r,o,a,l,d){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,n,r,o,a,l,d)}set(e,t,i,n,r,o,a,l,d){const c=this.elements;return c[0]=e,c[1]=n,c[2]=a,c[3]=t,c[4]=r,c[5]=l,c[6]=i,c[7]=o,c[8]=d,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,n=t.elements,r=this.elements,o=i[0],a=i[3],l=i[6],d=i[1],c=i[4],u=i[7],h=i[2],f=i[5],S=i[8],C=n[0],p=n[3],x=n[6],y=n[1],g=n[4],M=n[7],w=n[2],q=n[5],E=n[8];return r[0]=o*C+a*y+l*w,r[3]=o*p+a*g+l*q,r[6]=o*x+a*M+l*E,r[1]=d*C+c*y+u*w,r[4]=d*p+c*g+u*q,r[7]=d*x+c*M+u*E,r[2]=h*C+f*y+S*w,r[5]=h*p+f*g+S*q,r[8]=h*x+f*M+S*E,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],n=e[2],r=e[3],o=e[4],a=e[5],l=e[6],d=e[7],c=e[8];return t*o*c-t*a*d-i*r*c+i*a*l+n*r*d-n*o*l}invert(){const e=this.elements,t=e[0],i=e[1],n=e[2],r=e[3],o=e[4],a=e[5],l=e[6],d=e[7],c=e[8],u=c*o-a*d,h=a*l-c*r,f=d*r-o*l,S=t*u+i*h+n*f;if(S===0)return this.set(0,0,0,0,0,0,0,0,0);const C=1/S;return e[0]=u*C,e[1]=(n*d-c*i)*C,e[2]=(a*i-n*o)*C,e[3]=h*C,e[4]=(c*t-n*l)*C,e[5]=(n*r-a*t)*C,e[6]=f*C,e[7]=(i*l-d*t)*C,e[8]=(o*t-i*r)*C,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,n,r,o,a){const l=Math.cos(r),d=Math.sin(r);return this.set(i*l,i*d,-i*(l*o+d*a)+o+e,-n*d,n*l,-n*(-d*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Sr.makeScale(e,t)),this}rotate(e){return this.premultiply(Sr.makeRotation(-e)),this}translate(e,t){return this.premultiply(Sr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let n=0;n<9;n++)if(t[n]!==i[n])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}};va.prototype.isMatrix3=!0;let Ie=va;const Sr=new Ie,td=new Ie().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),id=new Ie().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Sc(){const s={enabled:!0,workingColorSpace:Kn,spaces:{},convert:function(n,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===$e&&(n.r=vi(n.r),n.g=vi(n.g),n.b=vi(n.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(n.applyMatrix3(this.spaces[r].toXYZ),n.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===$e&&(n.r=Es(n.r),n.g=Es(n.g),n.b=Es(n.b))),n},workingToColorSpace:function(n,r){return this.convert(n,this.workingColorSpace,r)},colorSpaceToWorking:function(n,r){return this.convert(n,r,this.workingColorSpace)},getPrimaries:function(n){return this.spaces[n].primaries},getTransfer:function(n){return n===Ui?Jn:this.spaces[n].transfer},getToneMappingMode:function(n){return this.spaces[n].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(n,r=this.workingColorSpace){return n.fromArray(this.spaces[r].luminanceCoefficients)},define:function(n){Object.assign(this.spaces,n)},_getMatrix:function(n,r,o){return n.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(n){return this.spaces[n].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(n=this.workingColorSpace){return this.spaces[n].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(n,r){return Wo("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(n,r)},toWorkingColorSpace:function(n,r){return Wo("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(n,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return s.define({[Kn]:{primaries:e,whitePoint:i,transfer:Jn,toXYZ:td,fromXYZ:id,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Xt},outputColorSpaceConfig:{drawingBufferColorSpace:Xt}},[Xt]:{primaries:e,whitePoint:i,transfer:$e,toXYZ:td,fromXYZ:id,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Xt}}}),s}const We=Sc();function vi(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function Es(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let ds;class yc{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{ds===void 0&&(ds=Qn("canvas")),ds.width=e.width,ds.height=e.height;const n=ds.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),i=ds}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Qn("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const n=i.getImageData(0,0,e.width,e.height),r=n.data;for(let o=0;o<r.length;o++)r[o]=vi(r[o]/255)*255;return i.putImageData(n,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(vi(t[i]/255)*255):t[i]=vi(t[i]);return{data:t,width:e.width,height:e.height}}else return Pe("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let mc=0;class pa{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:mc++}),this.uuid=Ps(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},n=this.data;if(n!==null){let r;if(Array.isArray(n)){r=[];for(let o=0,a=n.length;o<a;o++)n[o].isDataTexture?r.push(yr(n[o].image)):r.push(yr(n[o]))}else r=yr(n);i.url=r}return t||(e.images[this.uuid]=i),i}}function yr(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?yc.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(Pe("Texture: Unable to serialize Texture."),{})}let Cc=0;const mr=new U;class At extends Vi{constructor(e=At.DEFAULT_IMAGE,t=At.DEFAULT_MAPPING,i=_i,n=_i,r=Tt,o=Qi,a=jt,l=Ut,d=At.DEFAULT_ANISOTROPY,c=Ui){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Cc++}),this.uuid=Ps(),this.name="",this.source=new pa(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=n,this.magFilter=r,this.minFilter=o,this.anisotropy=d,this.format=a,this.internalFormat=null,this.type=l,this.offset=new _e(0,0),this.repeat=new _e(1,1),this.center=new _e(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ie,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=c,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(mr).x}get height(){return this.source.getSize(mr).y}get depth(){return this.source.getSize(mr).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){Pe(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const n=this[t];if(n===void 0){Pe(`Texture.setValues(): property '${t}' does not exist.`);continue}n&&i&&n.isVector2&&i.isVector2||n&&i&&n.isVector3&&i.isVector3||n&&i&&n.isMatrix3&&i.isMatrix3?n.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==y1)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case is:e.x=e.x-Math.floor(e.x);break;case _i:e.x=e.x<0?0:1;break;case xo:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case is:e.y=e.y-Math.floor(e.y);break;case _i:e.y=e.y<0?0:1;break;case xo:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}At.DEFAULT_IMAGE=null;At.DEFAULT_MAPPING=y1;At.DEFAULT_ANISOTROPY=1;const Ma=class Ma{constructor(e=0,t=0,i=0,n=1){this.x=e,this.y=t,this.z=i,this.w=n}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,n){return this.x=e,this.y=t,this.z=i,this.w=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,n=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*i+o[8]*n+o[12]*r,this.y=o[1]*t+o[5]*i+o[9]*n+o[13]*r,this.z=o[2]*t+o[6]*i+o[10]*n+o[14]*r,this.w=o[3]*t+o[7]*i+o[11]*n+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,n,r;const l=e.elements,d=l[0],c=l[4],u=l[8],h=l[1],f=l[5],S=l[9],C=l[2],p=l[6],x=l[10];if(Math.abs(c-h)<.01&&Math.abs(u-C)<.01&&Math.abs(S-p)<.01){if(Math.abs(c+h)<.1&&Math.abs(u+C)<.1&&Math.abs(S+p)<.1&&Math.abs(d+f+x-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const g=(d+1)/2,M=(f+1)/2,w=(x+1)/2,q=(c+h)/4,E=(u+C)/4,m=(S+p)/4;return g>M&&g>w?g<.01?(i=0,n=.707106781,r=.707106781):(i=Math.sqrt(g),n=q/i,r=E/i):M>w?M<.01?(i=.707106781,n=0,r=.707106781):(n=Math.sqrt(M),i=q/n,r=m/n):w<.01?(i=.707106781,n=.707106781,r=0):(r=Math.sqrt(w),i=E/r,n=m/r),this.set(i,n,r,t),this}let y=Math.sqrt((p-S)*(p-S)+(u-C)*(u-C)+(h-c)*(h-c));return Math.abs(y)<.001&&(y=1),this.x=(p-S)/y,this.y=(u-C)/y,this.z=(h-c)/y,this.w=Math.acos((d+f+x-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=ke(this.x,e.x,t.x),this.y=ke(this.y,e.y,t.y),this.z=ke(this.z,e.z,t.z),this.w=ke(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=ke(this.x,e,t),this.y=ke(this.y,e,t),this.z=ke(this.z,e,t),this.w=ke(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(ke(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Ma.prototype.isVector4=!0;let pt=Ma;class zc extends Vi{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Tt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new pt(0,0,e,t),this.scissorTest=!1,this.viewport=new pt(0,0,e,t),this.textures=[];const n={width:e,height:t,depth:i.depth},r=new At(n),o=i.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(e={}){const t={minFilter:Tt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let n=0,r=this.textures.length;n<r;n++)this.textures[n].image.width=e,this.textures[n].image.height=t,this.textures[n].image.depth=i,this.textures[n].isData3DTexture!==!0&&(this.textures[n].isArrayTexture=this.textures[n].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const n=Object.assign({},e.textures[t].image);this.textures[t].source=new pa(n)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this}dispose(){this.dispatchEvent({type:"dispose"})}}class xt extends zc{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class b1 extends At{constructor(e=null,t=1,i=1,n=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:n},this.magFilter=Ct,this.minFilter=Ct,this.wrapR=_i,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class gc extends At{constructor(e=null,t=1,i=1,n=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:n},this.magFilter=Ct,this.minFilter=Ct,this.wrapR=_i,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const $n=class $n{constructor(e,t,i,n,r,o,a,l,d,c,u,h,f,S,C,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,n,r,o,a,l,d,c,u,h,f,S,C,p)}set(e,t,i,n,r,o,a,l,d,c,u,h,f,S,C,p){const x=this.elements;return x[0]=e,x[4]=t,x[8]=i,x[12]=n,x[1]=r,x[5]=o,x[9]=a,x[13]=l,x[2]=d,x[6]=c,x[10]=u,x[14]=h,x[3]=f,x[7]=S,x[11]=C,x[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new $n().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),i.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();const t=this.elements,i=e.elements,n=1/ls.setFromMatrixColumn(e,0).length(),r=1/ls.setFromMatrixColumn(e,1).length(),o=1/ls.setFromMatrixColumn(e,2).length();return t[0]=i[0]*n,t[1]=i[1]*n,t[2]=i[2]*n,t[3]=0,t[4]=i[4]*r,t[5]=i[5]*r,t[6]=i[6]*r,t[7]=0,t[8]=i[8]*o,t[9]=i[9]*o,t[10]=i[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,n=e.y,r=e.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(n),d=Math.sin(n),c=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){const h=o*c,f=o*u,S=a*c,C=a*u;t[0]=l*c,t[4]=-l*u,t[8]=d,t[1]=f+S*d,t[5]=h-C*d,t[9]=-a*l,t[2]=C-h*d,t[6]=S+f*d,t[10]=o*l}else if(e.order==="YXZ"){const h=l*c,f=l*u,S=d*c,C=d*u;t[0]=h+C*a,t[4]=S*a-f,t[8]=o*d,t[1]=o*u,t[5]=o*c,t[9]=-a,t[2]=f*a-S,t[6]=C+h*a,t[10]=o*l}else if(e.order==="ZXY"){const h=l*c,f=l*u,S=d*c,C=d*u;t[0]=h-C*a,t[4]=-o*u,t[8]=S+f*a,t[1]=f+S*a,t[5]=o*c,t[9]=C-h*a,t[2]=-o*d,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const h=o*c,f=o*u,S=a*c,C=a*u;t[0]=l*c,t[4]=S*d-f,t[8]=h*d+C,t[1]=l*u,t[5]=C*d+h,t[9]=f*d-S,t[2]=-d,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const h=o*l,f=o*d,S=a*l,C=a*d;t[0]=l*c,t[4]=C-h*u,t[8]=S*u+f,t[1]=u,t[5]=o*c,t[9]=-a*c,t[2]=-d*c,t[6]=f*u+S,t[10]=h-C*u}else if(e.order==="XZY"){const h=o*l,f=o*d,S=a*l,C=a*d;t[0]=l*c,t[4]=-u,t[8]=d*c,t[1]=h*u+C,t[5]=o*c,t[9]=f*u-S,t[2]=S*u-f,t[6]=a*c,t[10]=C*u+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(qc,e,_c)}lookAt(e,t,i){const n=this.elements;return Bt.subVectors(e,t),Bt.lengthSq()===0&&(Bt.z=1),Bt.normalize(),wi.crossVectors(i,Bt),wi.lengthSq()===0&&(Math.abs(i.z)===1?Bt.x+=1e-4:Bt.z+=1e-4,Bt.normalize(),wi.crossVectors(i,Bt)),wi.normalize(),dn.crossVectors(Bt,wi),n[0]=wi.x,n[4]=dn.x,n[8]=Bt.x,n[1]=wi.y,n[5]=dn.y,n[9]=Bt.y,n[2]=wi.z,n[6]=dn.z,n[10]=Bt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,n=t.elements,r=this.elements,o=i[0],a=i[4],l=i[8],d=i[12],c=i[1],u=i[5],h=i[9],f=i[13],S=i[2],C=i[6],p=i[10],x=i[14],y=i[3],g=i[7],M=i[11],w=i[15],q=n[0],E=n[4],m=n[8],_=n[12],A=n[1],T=n[5],R=n[9],B=n[13],V=n[2],P=n[6],D=n[10],N=n[14],W=n[3],X=n[7],te=n[11],ne=n[15];return r[0]=o*q+a*A+l*V+d*W,r[4]=o*E+a*T+l*P+d*X,r[8]=o*m+a*R+l*D+d*te,r[12]=o*_+a*B+l*N+d*ne,r[1]=c*q+u*A+h*V+f*W,r[5]=c*E+u*T+h*P+f*X,r[9]=c*m+u*R+h*D+f*te,r[13]=c*_+u*B+h*N+f*ne,r[2]=S*q+C*A+p*V+x*W,r[6]=S*E+C*T+p*P+x*X,r[10]=S*m+C*R+p*D+x*te,r[14]=S*_+C*B+p*N+x*ne,r[3]=y*q+g*A+M*V+w*W,r[7]=y*E+g*T+M*P+w*X,r[11]=y*m+g*R+M*D+w*te,r[15]=y*_+g*B+M*N+w*ne,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],n=e[8],r=e[12],o=e[1],a=e[5],l=e[9],d=e[13],c=e[2],u=e[6],h=e[10],f=e[14],S=e[3],C=e[7],p=e[11],x=e[15],y=l*f-d*h,g=a*f-d*u,M=a*h-l*u,w=o*f-d*c,q=o*h-l*c,E=o*u-a*c;return t*(C*y-p*g+x*M)-i*(S*y-p*w+x*q)+n*(S*g-C*w+x*E)-r*(S*M-C*q+p*E)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const n=this.elements;return e.isVector3?(n[12]=e.x,n[13]=e.y,n[14]=e.z):(n[12]=e,n[13]=t,n[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],n=e[2],r=e[3],o=e[4],a=e[5],l=e[6],d=e[7],c=e[8],u=e[9],h=e[10],f=e[11],S=e[12],C=e[13],p=e[14],x=e[15],y=t*a-i*o,g=t*l-n*o,M=t*d-r*o,w=i*l-n*a,q=i*d-r*a,E=n*d-r*l,m=c*C-u*S,_=c*p-h*S,A=c*x-f*S,T=u*p-h*C,R=u*x-f*C,B=h*x-f*p,V=y*B-g*R+M*T+w*A-q*_+E*m;if(V===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const P=1/V;return e[0]=(a*B-l*R+d*T)*P,e[1]=(n*R-i*B-r*T)*P,e[2]=(C*E-p*q+x*w)*P,e[3]=(h*q-u*E-f*w)*P,e[4]=(l*A-o*B-d*_)*P,e[5]=(t*B-n*A+r*_)*P,e[6]=(p*M-S*E-x*g)*P,e[7]=(c*E-h*M+f*g)*P,e[8]=(o*R-a*A+d*m)*P,e[9]=(i*A-t*R-r*m)*P,e[10]=(S*q-C*M+x*y)*P,e[11]=(u*M-c*q-f*y)*P,e[12]=(a*_-o*T-l*m)*P,e[13]=(t*T-i*_+n*m)*P,e[14]=(C*g-S*w-p*y)*P,e[15]=(c*w-u*g+h*y)*P,this}scale(e){const t=this.elements,i=e.x,n=e.y,r=e.z;return t[0]*=i,t[4]*=n,t[8]*=r,t[1]*=i,t[5]*=n,t[9]*=r,t[2]*=i,t[6]*=n,t[10]*=r,t[3]*=i,t[7]*=n,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],n=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,n))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),n=Math.sin(t),r=1-i,o=e.x,a=e.y,l=e.z,d=r*o,c=r*a;return this.set(d*o+i,d*a-n*l,d*l+n*a,0,d*a+n*l,c*a+i,c*l-n*o,0,d*l-n*a,c*l+n*o,r*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,n,r,o){return this.set(1,i,r,0,e,1,o,0,t,n,1,0,0,0,0,1),this}compose(e,t,i){const n=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,d=r+r,c=o+o,u=a+a,h=r*d,f=r*c,S=r*u,C=o*c,p=o*u,x=a*u,y=l*d,g=l*c,M=l*u,w=i.x,q=i.y,E=i.z;return n[0]=(1-(C+x))*w,n[1]=(f+M)*w,n[2]=(S-g)*w,n[3]=0,n[4]=(f-M)*q,n[5]=(1-(h+x))*q,n[6]=(p+y)*q,n[7]=0,n[8]=(S+g)*E,n[9]=(p-y)*E,n[10]=(1-(h+C))*E,n[11]=0,n[12]=e.x,n[13]=e.y,n[14]=e.z,n[15]=1,this}decompose(e,t,i){const n=this.elements;e.x=n[12],e.y=n[13],e.z=n[14];const r=this.determinant();if(r===0)return i.set(1,1,1),t.identity(),this;let o=ls.set(n[0],n[1],n[2]).length();const a=ls.set(n[4],n[5],n[6]).length(),l=ls.set(n[8],n[9],n[10]).length();r<0&&(o=-o),Kt.copy(this);const d=1/o,c=1/a,u=1/l;return Kt.elements[0]*=d,Kt.elements[1]*=d,Kt.elements[2]*=d,Kt.elements[4]*=c,Kt.elements[5]*=c,Kt.elements[6]*=c,Kt.elements[8]*=u,Kt.elements[9]*=u,Kt.elements[10]*=u,t.setFromRotationMatrix(Kt),i.x=o,i.y=a,i.z=l,this}makePerspective(e,t,i,n,r,o,a=fi,l=!1){const d=this.elements,c=2*r/(t-e),u=2*r/(i-n),h=(t+e)/(t-e),f=(i+n)/(i-n);let S,C;if(l)S=r/(o-r),C=o*r/(o-r);else if(a===fi)S=-(o+r)/(o-r),C=-2*o*r/(o-r);else if(a===$s)S=-o/(o-r),C=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return d[0]=c,d[4]=0,d[8]=h,d[12]=0,d[1]=0,d[5]=u,d[9]=f,d[13]=0,d[2]=0,d[6]=0,d[10]=S,d[14]=C,d[3]=0,d[7]=0,d[11]=-1,d[15]=0,this}makeOrthographic(e,t,i,n,r,o,a=fi,l=!1){const d=this.elements,c=2/(t-e),u=2/(i-n),h=-(t+e)/(t-e),f=-(i+n)/(i-n);let S,C;if(l)S=1/(o-r),C=o/(o-r);else if(a===fi)S=-2/(o-r),C=-(o+r)/(o-r);else if(a===$s)S=-1/(o-r),C=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return d[0]=c,d[4]=0,d[8]=0,d[12]=h,d[1]=0,d[5]=u,d[9]=0,d[13]=f,d[2]=0,d[6]=0,d[10]=S,d[14]=C,d[3]=0,d[7]=0,d[11]=0,d[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let n=0;n<16;n++)if(t[n]!==i[n])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}};$n.prototype.isMatrix4=!0;let dt=$n;const ls=new U,Kt=new dt,qc=new U(0,0,0),_c=new U(1,1,1),wi=new U,dn=new U,Bt=new U,sd=new dt,nd=new bi;class Gi{constructor(e=0,t=0,i=0,n=Gi.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=n}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,n=this._order){return this._x=e,this._y=t,this._z=i,this._order=n,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const n=e.elements,r=n[0],o=n[4],a=n[8],l=n[1],d=n[5],c=n[9],u=n[2],h=n[6],f=n[10];switch(t){case"XYZ":this._y=Math.asin(ke(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-c,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(h,d),this._z=0);break;case"YXZ":this._x=Math.asin(-ke(c,-1,1)),Math.abs(c)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,d)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(ke(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,d)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-ke(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(h,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,d));break;case"YZX":this._z=Math.asin(ke(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-c,d),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-ke(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(h,d),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-c,f),this._y=0);break;default:Pe("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return sd.makeRotationFromQuaternion(e),this.setFromRotationMatrix(sd,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return nd.setFromEuler(this),this.setFromQuaternion(nd,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Gi.DEFAULT_ORDER="XYZ";class E1{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let vc=0;const rd=new U,cs=new bi,yi=new dt,ln=new U,Fs=new U,Mc=new U,bc=new bi,od=new U(1,0,0),ad=new U(0,1,0),dd=new U(0,0,1),ld={type:"added"},Ec={type:"removed"},hs={type:"childadded",child:null},Cr={type:"childremoved",child:null};class Dt extends Vi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:vc++}),this.uuid=Ps(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Dt.DEFAULT_UP.clone();const e=new U,t=new Gi,i=new bi,n=new U(1,1,1);function r(){i.setFromEuler(t,!1)}function o(){t.setFromQuaternion(i,void 0,!1)}t._onChange(r),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:n},modelViewMatrix:{value:new dt},normalMatrix:{value:new Ie}}),this.matrix=new dt,this.matrixWorld=new dt,this.matrixAutoUpdate=Dt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Dt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new E1,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return cs.setFromAxisAngle(e,t),this.quaternion.multiply(cs),this}rotateOnWorldAxis(e,t){return cs.setFromAxisAngle(e,t),this.quaternion.premultiply(cs),this}rotateX(e){return this.rotateOnAxis(od,e)}rotateY(e){return this.rotateOnAxis(ad,e)}rotateZ(e){return this.rotateOnAxis(dd,e)}translateOnAxis(e,t){return rd.copy(e).applyQuaternion(this.quaternion),this.position.add(rd.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(od,e)}translateY(e){return this.translateOnAxis(ad,e)}translateZ(e){return this.translateOnAxis(dd,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(yi.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?ln.copy(e):ln.set(e,t,i);const n=this.parent;this.updateWorldMatrix(!0,!1),Fs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?yi.lookAt(Fs,ln,this.up):yi.lookAt(ln,Fs,this.up),this.quaternion.setFromRotationMatrix(yi),n&&(yi.extractRotation(n.matrixWorld),cs.setFromRotationMatrix(yi),this.quaternion.premultiply(cs.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Ze("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(ld),hs.child=e,this.dispatchEvent(hs),hs.child=null):Ze("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Ec),Cr.child=e,this.dispatchEvent(Cr),Cr.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),yi.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),yi.multiply(e.parent.matrixWorld)),e.applyMatrix4(yi),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(ld),hs.child=e,this.dispatchEvent(hs),hs.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,n=this.children.length;i<n;i++){const o=this.children[i].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const n=this.children;for(let r=0,o=n.length;r<o;r++)n[r].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Fs,e,Mc),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Fs,bc,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,n=t.length;i<n;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,n=t.length;i<n;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,i=e.y,n=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*i-r[8]*n,r[13]+=i-r[1]*t-r[5]*i-r[9]*n,r[14]+=n-r[2]*t-r[6]*i-r[10]*n}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,n=t.length;i<n;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const n=this.children;for(let r=0,o=n.length;r<o;r++)n[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const n={};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.castShadow===!0&&(n.castShadow=!0),this.receiveShadow===!0&&(n.receiveShadow=!0),this.visible===!1&&(n.visible=!1),this.frustumCulled===!1&&(n.frustumCulled=!1),this.renderOrder!==0&&(n.renderOrder=this.renderOrder),this.static!==!1&&(n.static=this.static),Object.keys(this.userData).length>0&&(n.userData=this.userData),n.layers=this.layers.mask,n.matrix=this.matrix.toArray(),n.up=this.up.toArray(),this.pivot!==null&&(n.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(n.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(n.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(n.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(n.type="InstancedMesh",n.count=this.count,n.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(n.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(n.type="BatchedMesh",n.perObjectFrustumCulled=this.perObjectFrustumCulled,n.sortObjects=this.sortObjects,n.drawRanges=this._drawRanges,n.reservedRanges=this._reservedRanges,n.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),n.instanceInfo=this._instanceInfo.map(a=>({...a})),n.availableInstanceIds=this._availableInstanceIds.slice(),n.availableGeometryIds=this._availableGeometryIds.slice(),n.nextIndexStart=this._nextIndexStart,n.nextVertexStart=this._nextVertexStart,n.geometryCount=this._geometryCount,n.maxInstanceCount=this._maxInstanceCount,n.maxVertexCount=this._maxVertexCount,n.maxIndexCount=this._maxIndexCount,n.geometryInitialized=this._geometryInitialized,n.matricesTexture=this._matricesTexture.toJSON(e),n.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(n.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(n.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(n.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?n.background=this.background.toJSON():this.background.isTexture&&(n.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(n.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){n.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let d=0,c=l.length;d<c;d++){const u=l[d];r(e.shapes,u)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(n.bindMode=this.bindMode,n.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),n.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,d=this.material.length;l<d;l++)a.push(r(e.materials,this.material[l]));n.material=a}else n.material=r(e.materials,this.material);if(this.children.length>0){n.children=[];for(let a=0;a<this.children.length;a++)n.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){n.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];n.animations.push(r(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),d=o(e.textures),c=o(e.images),u=o(e.shapes),h=o(e.skeletons),f=o(e.animations),S=o(e.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),d.length>0&&(i.textures=d),c.length>0&&(i.images=c),u.length>0&&(i.shapes=u),h.length>0&&(i.skeletons=h),f.length>0&&(i.animations=f),S.length>0&&(i.nodes=S)}return i.object=n,i;function o(a){const l=[];for(const d in a){const c=a[d];delete c.metadata,l.push(c)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const n=e.children[i];this.add(n.clone())}return this}}Dt.DEFAULT_UP=new U(0,1,0);Dt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Dt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Xs extends Dt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Tc={type:"move"};class zr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Xs,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Xs,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new U,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new U),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Xs,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new U,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new U,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let n=null,r=null,o=null;const a=this._targetRay,l=this._grip,d=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(d&&e.hand){o=!0;for(const C of e.hand.values()){const p=t.getJointPose(C,i),x=this._getHandJoint(d,C);p!==null&&(x.matrix.fromArray(p.transform.matrix),x.matrix.decompose(x.position,x.rotation,x.scale),x.matrixWorldNeedsUpdate=!0,x.jointRadius=p.radius),x.visible=p!==null}const c=d.joints["index-finger-tip"],u=d.joints["thumb-tip"],h=c.position.distanceTo(u.position),f=.02,S=.005;d.inputState.pinching&&h>f+S?(d.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!d.inputState.pinching&&h<=f-S&&(d.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(n=t.getPose(e.targetRaySpace,i),n===null&&r!==null&&(n=r),n!==null&&(a.matrix.fromArray(n.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,n.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(n.linearVelocity)):a.hasLinearVelocity=!1,n.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(n.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Tc)))}return a!==null&&(a.visible=n!==null),l!==null&&(l.visible=r!==null),d!==null&&(d.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new Xs;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const T1={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ri={h:0,s:0,l:0},cn={h:0,s:0,l:0};function gr(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class Ge{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const n=e;n&&n.isColor?this.copy(n):typeof n=="number"?this.setHex(n):typeof n=="string"&&this.setStyle(n)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Xt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,We.colorSpaceToWorking(this,t),this}setRGB(e,t,i,n=We.workingColorSpace){return this.r=e,this.g=t,this.b=i,We.colorSpaceToWorking(this,n),this}setHSL(e,t,i,n=We.workingColorSpace){if(e=xa(e,1),t=ke(t,0,1),i=ke(i,0,1),t===0)this.r=this.g=this.b=i;else{const r=i<=.5?i*(1+t):i+t-i*t,o=2*i-r;this.r=gr(o,r,e+1/3),this.g=gr(o,r,e),this.b=gr(o,r,e-1/3)}return We.colorSpaceToWorking(this,n),this}setStyle(e,t=Xt){function i(r){r!==void 0&&parseFloat(r)<1&&Pe("Color: Alpha component of "+e+" will be ignored.")}let n;if(n=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=n[1],a=n[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Pe("Color: Unknown color model "+e)}}else if(n=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=n[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);Pe("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Xt){const i=T1[e.toLowerCase()];return i!==void 0?this.setHex(i,t):Pe("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=vi(e.r),this.g=vi(e.g),this.b=vi(e.b),this}copyLinearToSRGB(e){return this.r=Es(e.r),this.g=Es(e.g),this.b=Es(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Xt){return We.workingToColorSpace(Pt.copy(this),e),Math.round(ke(Pt.r*255,0,255))*65536+Math.round(ke(Pt.g*255,0,255))*256+Math.round(ke(Pt.b*255,0,255))}getHexString(e=Xt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=We.workingColorSpace){We.workingToColorSpace(Pt.copy(this),t);const i=Pt.r,n=Pt.g,r=Pt.b,o=Math.max(i,n,r),a=Math.min(i,n,r);let l,d;const c=(a+o)/2;if(a===o)l=0,d=0;else{const u=o-a;switch(d=c<=.5?u/(o+a):u/(2-o-a),o){case i:l=(n-r)/u+(n<r?6:0);break;case n:l=(r-i)/u+2;break;case r:l=(i-n)/u+4;break}l/=6}return e.h=l,e.s=d,e.l=c,e}getRGB(e,t=We.workingColorSpace){return We.workingToColorSpace(Pt.copy(this),t),e.r=Pt.r,e.g=Pt.g,e.b=Pt.b,e}getStyle(e=Xt){We.workingToColorSpace(Pt.copy(this),e);const t=Pt.r,i=Pt.g,n=Pt.b;return e!==Xt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${n.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(n*255)})`}offsetHSL(e,t,i){return this.getHSL(Ri),this.setHSL(Ri.h+e,Ri.s+t,Ri.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Ri),e.getHSL(cn);const i=Ks(Ri.h,cn.h,t),n=Ks(Ri.s,cn.s,t),r=Ks(Ri.l,cn.l,t);return this.setHSL(i,n,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,n=this.b,r=e.elements;return this.r=r[0]*t+r[3]*i+r[6]*n,this.g=r[1]*t+r[4]*i+r[7]*n,this.b=r[2]*t+r[5]*i+r[8]*n,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Pt=new Ge;Ge.NAMES=T1;class Ac extends Dt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Gi,this.environmentIntensity=1,this.environmentRotation=new Gi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Jt=new U,mi=new U,qr=new U,Ci=new U,us=new U,fs=new U,cd=new U,_r=new U,vr=new U,Mr=new U,br=new pt,Er=new pt,Tr=new pt;class ii{constructor(e=new U,t=new U,i=new U){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,n){n.subVectors(i,t),Jt.subVectors(e,t),n.cross(Jt);const r=n.lengthSq();return r>0?n.multiplyScalar(1/Math.sqrt(r)):n.set(0,0,0)}static getBarycoord(e,t,i,n,r){Jt.subVectors(n,t),mi.subVectors(i,t),qr.subVectors(e,t);const o=Jt.dot(Jt),a=Jt.dot(mi),l=Jt.dot(qr),d=mi.dot(mi),c=mi.dot(qr),u=o*d-a*a;if(u===0)return r.set(0,0,0),null;const h=1/u,f=(d*l-a*c)*h,S=(o*c-a*l)*h;return r.set(1-f-S,S,f)}static containsPoint(e,t,i,n){return this.getBarycoord(e,t,i,n,Ci)===null?!1:Ci.x>=0&&Ci.y>=0&&Ci.x+Ci.y<=1}static getInterpolation(e,t,i,n,r,o,a,l){return this.getBarycoord(e,t,i,n,Ci)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Ci.x),l.addScaledVector(o,Ci.y),l.addScaledVector(a,Ci.z),l)}static getInterpolatedAttribute(e,t,i,n,r,o){return br.setScalar(0),Er.setScalar(0),Tr.setScalar(0),br.fromBufferAttribute(e,t),Er.fromBufferAttribute(e,i),Tr.fromBufferAttribute(e,n),o.setScalar(0),o.addScaledVector(br,r.x),o.addScaledVector(Er,r.y),o.addScaledVector(Tr,r.z),o}static isFrontFacing(e,t,i,n){return Jt.subVectors(i,t),mi.subVectors(e,t),Jt.cross(mi).dot(n)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,n){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[n]),this}setFromAttributeAndIndices(e,t,i,n){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,n),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Jt.subVectors(this.c,this.b),mi.subVectors(this.a,this.b),Jt.cross(mi).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return ii.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return ii.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,n,r){return ii.getInterpolation(e,this.a,this.b,this.c,t,i,n,r)}containsPoint(e){return ii.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return ii.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,n=this.b,r=this.c;let o,a;us.subVectors(n,i),fs.subVectors(r,i),_r.subVectors(e,i);const l=us.dot(_r),d=fs.dot(_r);if(l<=0&&d<=0)return t.copy(i);vr.subVectors(e,n);const c=us.dot(vr),u=fs.dot(vr);if(c>=0&&u<=c)return t.copy(n);const h=l*u-c*d;if(h<=0&&l>=0&&c<=0)return o=l/(l-c),t.copy(i).addScaledVector(us,o);Mr.subVectors(e,r);const f=us.dot(Mr),S=fs.dot(Mr);if(S>=0&&f<=S)return t.copy(r);const C=f*d-l*S;if(C<=0&&d>=0&&S<=0)return a=d/(d-S),t.copy(i).addScaledVector(fs,a);const p=c*S-f*u;if(p<=0&&u-c>=0&&f-S>=0)return cd.subVectors(r,n),a=(u-c)/(u-c+(f-S)),t.copy(n).addScaledVector(cd,a);const x=1/(p+C+h);return o=C*x,a=h*x,t.copy(i).addScaledVector(us,o).addScaledVector(fs,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class tn{constructor(e=new U(1/0,1/0,1/0),t=new U(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Qt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Qt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=Qt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const r=i.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Qt):Qt.fromBufferAttribute(r,o),Qt.applyMatrix4(e.matrixWorld),this.expandByPoint(Qt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),hn.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),hn.copy(i.boundingBox)),hn.applyMatrix4(e.matrixWorld),this.union(hn)}const n=e.children;for(let r=0,o=n.length;r<o;r++)this.expandByObject(n[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Qt),Qt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Os),un.subVectors(this.max,Os),xs.subVectors(e.a,Os),ps.subVectors(e.b,Os),Ss.subVectors(e.c,Os),Pi.subVectors(ps,xs),Di.subVectors(Ss,ps),Xi.subVectors(xs,Ss);let t=[0,-Pi.z,Pi.y,0,-Di.z,Di.y,0,-Xi.z,Xi.y,Pi.z,0,-Pi.x,Di.z,0,-Di.x,Xi.z,0,-Xi.x,-Pi.y,Pi.x,0,-Di.y,Di.x,0,-Xi.y,Xi.x,0];return!Ar(t,xs,ps,Ss,un)||(t=[1,0,0,0,1,0,0,0,1],!Ar(t,xs,ps,Ss,un))?!1:(fn.crossVectors(Pi,Di),t=[fn.x,fn.y,fn.z],Ar(t,xs,ps,Ss,un))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Qt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Qt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(zi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),zi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),zi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),zi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),zi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),zi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),zi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),zi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(zi),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const zi=[new U,new U,new U,new U,new U,new U,new U,new U],Qt=new U,hn=new tn,xs=new U,ps=new U,Ss=new U,Pi=new U,Di=new U,Xi=new U,Os=new U,un=new U,fn=new U,Yi=new U;function Ar(s,e,t,i,n){for(let r=0,o=s.length-3;r<=o;r+=3){Yi.fromArray(s,r);const a=n.x*Math.abs(Yi.x)+n.y*Math.abs(Yi.y)+n.z*Math.abs(Yi.z),l=e.dot(Yi),d=t.dot(Yi),c=i.dot(Yi);if(Math.max(-Math.max(l,d,c),Math.min(l,d,c))>a)return!1}return!0}const zt=new U,xn=new _e;let wc=0;class ni extends Vi{constructor(e,t,i=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:wc++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Za,this.updateRanges=[],this.gpuType=ui,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let n=0,r=this.itemSize;n<r;n++)this.array[e+n]=t.array[i+n];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)xn.fromBufferAttribute(this,t),xn.applyMatrix3(e),this.setXY(t,xn.x,xn.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)zt.fromBufferAttribute(this,t),zt.applyMatrix3(e),this.setXYZ(t,zt.x,zt.y,zt.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)zt.fromBufferAttribute(this,t),zt.applyMatrix4(e),this.setXYZ(t,zt.x,zt.y,zt.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)zt.fromBufferAttribute(this,t),zt.applyNormalMatrix(e),this.setXYZ(t,zt.x,zt.y,zt.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)zt.fromBufferAttribute(this,t),zt.transformDirection(e),this.setXYZ(t,zt.x,zt.y,zt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=gs(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Lt(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=gs(t,this.array)),t}setX(e,t){return this.normalized&&(t=Lt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=gs(t,this.array)),t}setY(e,t){return this.normalized&&(t=Lt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=gs(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Lt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=gs(t,this.array)),t}setW(e,t){return this.normalized&&(t=Lt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=Lt(t,this.array),i=Lt(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,n){return e*=this.itemSize,this.normalized&&(t=Lt(t,this.array),i=Lt(i,this.array),n=Lt(n,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=n,this}setXYZW(e,t,i,n,r){return e*=this.itemSize,this.normalized&&(t=Lt(t,this.array),i=Lt(i,this.array),n=Lt(n,this.array),r=Lt(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=n,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Za&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class A1 extends ni{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class w1 extends ni{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class ri extends ni{constructor(e,t,i){super(new Float32Array(e),t,i)}}const Rc=new tn,Bs=new U,wr=new U;class Sa{constructor(e=new U,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):Rc.setFromPoints(e).getCenter(i);let n=0;for(let r=0,o=e.length;r<o;r++)n=Math.max(n,i.distanceToSquared(e[r]));return this.radius=Math.sqrt(n),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Bs.subVectors(e,this.center);const t=Bs.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),n=(i-this.radius)*.5;this.center.addScaledVector(Bs,n/i),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(wr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Bs.copy(e.center).add(wr)),this.expandByPoint(Bs.copy(e.center).sub(wr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Pc=0;const Wt=new dt,Rr=new Dt,ys=new U,Ht=new tn,Hs=new tn,bt=new U;class oi extends Vi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Pc++}),this.uuid=Ps(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(K2(e)?w1:A1)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const r=new Ie().getNormalMatrix(e);i.applyNormalMatrix(r),i.needsUpdate=!0}const n=this.attributes.tangent;return n!==void 0&&(n.transformDirection(e),n.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Wt.makeRotationFromQuaternion(e),this.applyMatrix4(Wt),this}rotateX(e){return Wt.makeRotationX(e),this.applyMatrix4(Wt),this}rotateY(e){return Wt.makeRotationY(e),this.applyMatrix4(Wt),this}rotateZ(e){return Wt.makeRotationZ(e),this.applyMatrix4(Wt),this}translate(e,t,i){return Wt.makeTranslation(e,t,i),this.applyMatrix4(Wt),this}scale(e,t,i){return Wt.makeScale(e,t,i),this.applyMatrix4(Wt),this}lookAt(e){return Rr.lookAt(e),Rr.updateMatrix(),this.applyMatrix4(Rr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ys).negate(),this.translate(ys.x,ys.y,ys.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let n=0,r=e.length;n<r;n++){const o=e[n];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ri(i,3))}else{const i=Math.min(e.length,t.count);for(let n=0;n<i;n++){const r=e[n];t.setXYZ(n,r.x,r.y,r.z||0)}e.length>t.count&&Pe("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new tn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ze("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new U(-1/0,-1/0,-1/0),new U(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,n=t.length;i<n;i++){const r=t[i];Ht.setFromBufferAttribute(r),this.morphTargetsRelative?(bt.addVectors(this.boundingBox.min,Ht.min),this.boundingBox.expandByPoint(bt),bt.addVectors(this.boundingBox.max,Ht.max),this.boundingBox.expandByPoint(bt)):(this.boundingBox.expandByPoint(Ht.min),this.boundingBox.expandByPoint(Ht.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Ze('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Sa);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ze("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new U,1/0);return}if(e){const i=this.boundingSphere.center;if(Ht.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];Hs.setFromBufferAttribute(a),this.morphTargetsRelative?(bt.addVectors(Ht.min,Hs.min),Ht.expandByPoint(bt),bt.addVectors(Ht.max,Hs.max),Ht.expandByPoint(bt)):(Ht.expandByPoint(Hs.min),Ht.expandByPoint(Hs.max))}Ht.getCenter(i);let n=0;for(let r=0,o=e.count;r<o;r++)bt.fromBufferAttribute(e,r),n=Math.max(n,i.distanceToSquared(bt));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],l=this.morphTargetsRelative;for(let d=0,c=a.count;d<c;d++)bt.fromBufferAttribute(a,d),l&&(ys.fromBufferAttribute(e,d),bt.add(ys)),n=Math.max(n,i.distanceToSquared(bt))}this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&Ze('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Ze("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,n=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new ni(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let m=0;m<i.count;m++)a[m]=new U,l[m]=new U;const d=new U,c=new U,u=new U,h=new _e,f=new _e,S=new _e,C=new U,p=new U;function x(m,_,A){d.fromBufferAttribute(i,m),c.fromBufferAttribute(i,_),u.fromBufferAttribute(i,A),h.fromBufferAttribute(r,m),f.fromBufferAttribute(r,_),S.fromBufferAttribute(r,A),c.sub(d),u.sub(d),f.sub(h),S.sub(h);const T=1/(f.x*S.y-S.x*f.y);isFinite(T)&&(C.copy(c).multiplyScalar(S.y).addScaledVector(u,-f.y).multiplyScalar(T),p.copy(u).multiplyScalar(f.x).addScaledVector(c,-S.x).multiplyScalar(T),a[m].add(C),a[_].add(C),a[A].add(C),l[m].add(p),l[_].add(p),l[A].add(p))}let y=this.groups;y.length===0&&(y=[{start:0,count:e.count}]);for(let m=0,_=y.length;m<_;++m){const A=y[m],T=A.start,R=A.count;for(let B=T,V=T+R;B<V;B+=3)x(e.getX(B+0),e.getX(B+1),e.getX(B+2))}const g=new U,M=new U,w=new U,q=new U;function E(m){w.fromBufferAttribute(n,m),q.copy(w);const _=a[m];g.copy(_),g.sub(w.multiplyScalar(w.dot(_))).normalize(),M.crossVectors(q,_);const T=M.dot(l[m])<0?-1:1;o.setXYZW(m,g.x,g.y,g.z,T)}for(let m=0,_=y.length;m<_;++m){const A=y[m],T=A.start,R=A.count;for(let B=T,V=T+R;B<V;B+=3)E(e.getX(B+0)),E(e.getX(B+1)),E(e.getX(B+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new ni(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let h=0,f=i.count;h<f;h++)i.setXYZ(h,0,0,0);const n=new U,r=new U,o=new U,a=new U,l=new U,d=new U,c=new U,u=new U;if(e)for(let h=0,f=e.count;h<f;h+=3){const S=e.getX(h+0),C=e.getX(h+1),p=e.getX(h+2);n.fromBufferAttribute(t,S),r.fromBufferAttribute(t,C),o.fromBufferAttribute(t,p),c.subVectors(o,r),u.subVectors(n,r),c.cross(u),a.fromBufferAttribute(i,S),l.fromBufferAttribute(i,C),d.fromBufferAttribute(i,p),a.add(c),l.add(c),d.add(c),i.setXYZ(S,a.x,a.y,a.z),i.setXYZ(C,l.x,l.y,l.z),i.setXYZ(p,d.x,d.y,d.z)}else for(let h=0,f=t.count;h<f;h+=3)n.fromBufferAttribute(t,h+0),r.fromBufferAttribute(t,h+1),o.fromBufferAttribute(t,h+2),c.subVectors(o,r),u.subVectors(n,r),c.cross(u),i.setXYZ(h+0,c.x,c.y,c.z),i.setXYZ(h+1,c.x,c.y,c.z),i.setXYZ(h+2,c.x,c.y,c.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)bt.fromBufferAttribute(e,t),bt.normalize(),e.setXYZ(t,bt.x,bt.y,bt.z)}toNonIndexed(){function e(a,l){const d=a.array,c=a.itemSize,u=a.normalized,h=new d.constructor(l.length*c);let f=0,S=0;for(let C=0,p=l.length;C<p;C++){a.isInterleavedBufferAttribute?f=l[C]*a.data.stride+a.offset:f=l[C]*c;for(let x=0;x<c;x++)h[S++]=d[f++]}return new ni(h,c,u)}if(this.index===null)return Pe("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new oi,i=this.index.array,n=this.attributes;for(const a in n){const l=n[a],d=e(l,i);t.setAttribute(a,d)}const r=this.morphAttributes;for(const a in r){const l=[],d=r[a];for(let c=0,u=d.length;c<u;c++){const h=d[c],f=e(h,i);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const d=o[a];t.addGroup(d.start,d.count,d.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const d in l)l[d]!==void 0&&(e[d]=l[d]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const d=i[l];e.data.attributes[l]=d.toJSON(e.data)}const n={};let r=!1;for(const l in this.morphAttributes){const d=this.morphAttributes[l],c=[];for(let u=0,h=d.length;u<h;u++){const f=d[u];c.push(f.toJSON(e.data))}c.length>0&&(n[l]=c,r=!0)}r&&(e.data.morphAttributes=n,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const n=e.attributes;for(const d in n){const c=n[d];this.setAttribute(d,c.clone(t))}const r=e.morphAttributes;for(const d in r){const c=[],u=r[d];for(let h=0,f=u.length;h<f;h++)c.push(u[h].clone(t));this.morphAttributes[d]=c}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let d=0,c=o.length;d<c;d++){const u=o[d];this.addGroup(u.start,u.count,u.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}let Dc=0;class Ds extends Vi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Dc++}),this.uuid=Ps(),this.name="",this.type="Material",this.blending=bs,this.side=Hi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=io,this.blendDst=so,this.blendEquation=ti,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ge(0,0,0),this.blendAlpha=0,this.depthFunc=Ts,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ja,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=as,this.stencilZFail=as,this.stencilZPass=as,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){Pe(`Material: parameter '${t}' has value of undefined.`);continue}const n=this[t];if(n===void 0){Pe(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}n&&n.isColor?n.set(i):n&&n.isVector3&&i&&i.isVector3?n.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==bs&&(i.blending=this.blending),this.side!==Hi&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==io&&(i.blendSrc=this.blendSrc),this.blendDst!==so&&(i.blendDst=this.blendDst),this.blendEquation!==ti&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==Ts&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==ja&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==as&&(i.stencilFail=this.stencilFail),this.stencilZFail!==as&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==as&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.allowOverride===!1&&(i.allowOverride=!1),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function n(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(t){const r=n(e.textures),o=n(e.images);r.length>0&&(i.textures=r),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const n=t.length;i=new Array(n);for(let r=0;r!==n;++r)i[r]=t[r].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const gi=new U,Pr=new U,pn=new U,Li=new U,Dr=new U,Sn=new U,Lr=new U;class R1{constructor(e=new U,t=new U(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,gi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=gi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(gi.copy(this.origin).addScaledVector(this.direction,t),gi.distanceToSquared(e))}distanceSqToSegment(e,t,i,n){Pr.copy(e).add(t).multiplyScalar(.5),pn.copy(t).sub(e).normalize(),Li.copy(this.origin).sub(Pr);const r=e.distanceTo(t)*.5,o=-this.direction.dot(pn),a=Li.dot(this.direction),l=-Li.dot(pn),d=Li.lengthSq(),c=Math.abs(1-o*o);let u,h,f,S;if(c>0)if(u=o*l-a,h=o*a-l,S=r*c,u>=0)if(h>=-S)if(h<=S){const C=1/c;u*=C,h*=C,f=u*(u+o*h+2*a)+h*(o*u+h+2*l)+d}else h=r,u=Math.max(0,-(o*h+a)),f=-u*u+h*(h+2*l)+d;else h=-r,u=Math.max(0,-(o*h+a)),f=-u*u+h*(h+2*l)+d;else h<=-S?(u=Math.max(0,-(-o*r+a)),h=u>0?-r:Math.min(Math.max(-r,-l),r),f=-u*u+h*(h+2*l)+d):h<=S?(u=0,h=Math.min(Math.max(-r,-l),r),f=h*(h+2*l)+d):(u=Math.max(0,-(o*r+a)),h=u>0?r:Math.min(Math.max(-r,-l),r),f=-u*u+h*(h+2*l)+d);else h=o>0?-r:r,u=Math.max(0,-(o*h+a)),f=-u*u+h*(h+2*l)+d;return i&&i.copy(this.origin).addScaledVector(this.direction,u),n&&n.copy(Pr).addScaledVector(pn,h),f}intersectSphere(e,t){gi.subVectors(e.center,this.origin);const i=gi.dot(this.direction),n=gi.dot(gi)-i*i,r=e.radius*e.radius;if(n>r)return null;const o=Math.sqrt(r-n),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,n,r,o,a,l;const d=1/this.direction.x,c=1/this.direction.y,u=1/this.direction.z,h=this.origin;return d>=0?(i=(e.min.x-h.x)*d,n=(e.max.x-h.x)*d):(i=(e.max.x-h.x)*d,n=(e.min.x-h.x)*d),c>=0?(r=(e.min.y-h.y)*c,o=(e.max.y-h.y)*c):(r=(e.max.y-h.y)*c,o=(e.min.y-h.y)*c),i>o||r>n||((r>i||isNaN(i))&&(i=r),(o<n||isNaN(n))&&(n=o),u>=0?(a=(e.min.z-h.z)*u,l=(e.max.z-h.z)*u):(a=(e.max.z-h.z)*u,l=(e.min.z-h.z)*u),i>l||a>n)||((a>i||i!==i)&&(i=a),(l<n||n!==n)&&(n=l),n<0)?null:this.at(i>=0?i:n,t)}intersectsBox(e){return this.intersectBox(e,gi)!==null}intersectTriangle(e,t,i,n,r){Dr.subVectors(t,e),Sn.subVectors(i,e),Lr.crossVectors(Dr,Sn);let o=this.direction.dot(Lr),a;if(o>0){if(n)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Li.subVectors(this.origin,e);const l=a*this.direction.dot(Sn.crossVectors(Li,Sn));if(l<0)return null;const d=a*this.direction.dot(Dr.cross(Li));if(d<0||l+d>o)return null;const c=-a*Li.dot(Lr);return c<0?null:this.at(c/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class P1 extends Ds{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ge(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Gi,this.combine=S1,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const hd=new dt,ji=new R1,yn=new Sa,ud=new U,mn=new U,Cn=new U,zn=new U,Ir=new U,gn=new U,fd=new U,qn=new U;class Zt extends Dt{constructor(e=new oi,t=new P1){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const n=t[i[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=n.length;r<o;r++){const a=n[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const i=this.geometry,n=i.attributes.position,r=i.morphAttributes.position,o=i.morphTargetsRelative;t.fromBufferAttribute(n,e);const a=this.morphTargetInfluences;if(r&&a){gn.set(0,0,0);for(let l=0,d=r.length;l<d;l++){const c=a[l],u=r[l];c!==0&&(Ir.fromBufferAttribute(u,e),o?gn.addScaledVector(Ir,c):gn.addScaledVector(Ir.sub(t),c))}t.add(gn)}return t}raycast(e,t){const i=this.geometry,n=this.material,r=this.matrixWorld;n!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),yn.copy(i.boundingSphere),yn.applyMatrix4(r),ji.copy(e.ray).recast(e.near),!(yn.containsPoint(ji.origin)===!1&&(ji.intersectSphere(yn,ud)===null||ji.origin.distanceToSquared(ud)>(e.far-e.near)**2))&&(hd.copy(r).invert(),ji.copy(e.ray).applyMatrix4(hd),!(i.boundingBox!==null&&ji.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,ji)))}_computeIntersections(e,t,i){let n;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,d=r.attributes.uv,c=r.attributes.uv1,u=r.attributes.normal,h=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let S=0,C=h.length;S<C;S++){const p=h[S],x=o[p.materialIndex],y=Math.max(p.start,f.start),g=Math.min(a.count,Math.min(p.start+p.count,f.start+f.count));for(let M=y,w=g;M<w;M+=3){const q=a.getX(M),E=a.getX(M+1),m=a.getX(M+2);n=_n(this,x,e,i,d,c,u,q,E,m),n&&(n.faceIndex=Math.floor(M/3),n.face.materialIndex=p.materialIndex,t.push(n))}}else{const S=Math.max(0,f.start),C=Math.min(a.count,f.start+f.count);for(let p=S,x=C;p<x;p+=3){const y=a.getX(p),g=a.getX(p+1),M=a.getX(p+2);n=_n(this,o,e,i,d,c,u,y,g,M),n&&(n.faceIndex=Math.floor(p/3),t.push(n))}}else if(l!==void 0)if(Array.isArray(o))for(let S=0,C=h.length;S<C;S++){const p=h[S],x=o[p.materialIndex],y=Math.max(p.start,f.start),g=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let M=y,w=g;M<w;M+=3){const q=M,E=M+1,m=M+2;n=_n(this,x,e,i,d,c,u,q,E,m),n&&(n.faceIndex=Math.floor(M/3),n.face.materialIndex=p.materialIndex,t.push(n))}}else{const S=Math.max(0,f.start),C=Math.min(l.count,f.start+f.count);for(let p=S,x=C;p<x;p+=3){const y=p,g=p+1,M=p+2;n=_n(this,o,e,i,d,c,u,y,g,M),n&&(n.faceIndex=Math.floor(p/3),t.push(n))}}}}function Lc(s,e,t,i,n,r,o,a){let l;if(e.side===Ft?l=i.intersectTriangle(o,r,n,!0,a):l=i.intersectTriangle(n,r,o,e.side===Hi,a),l===null)return null;qn.copy(a),qn.applyMatrix4(s.matrixWorld);const d=t.ray.origin.distanceTo(qn);return d<t.near||d>t.far?null:{distance:d,point:qn.clone(),object:s}}function _n(s,e,t,i,n,r,o,a,l,d){s.getVertexPosition(a,mn),s.getVertexPosition(l,Cn),s.getVertexPosition(d,zn);const c=Lc(s,e,t,i,mn,Cn,zn,fd);if(c){const u=new U;ii.getBarycoord(fd,mn,Cn,zn,u),n&&(c.uv=ii.getInterpolatedAttribute(n,a,l,d,u,new _e)),r&&(c.uv1=ii.getInterpolatedAttribute(r,a,l,d,u,new _e)),o&&(c.normal=ii.getInterpolatedAttribute(o,a,l,d,u,new U),c.normal.dot(i.direction)>0&&c.normal.multiplyScalar(-1));const h={a,b:l,c:d,normal:new U,materialIndex:0};ii.getNormal(mn,Cn,zn,h.normal),c.face=h,c.barycoord=u}return c}class ya extends At{constructor(e=null,t=1,i=1,n,r,o,a,l,d=Ct,c=Ct,u,h){super(null,o,a,l,d,c,n,r,u,h),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Nr=new U,Ic=new U,Nc=new Ie;class ei{constructor(e=new U(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,n){return this.normal.set(e,t,i),this.constant=n,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const n=Nr.subVectors(i,t).cross(Ic.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(n,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,i=!0){const n=e.delta(Nr),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const o=-(e.start.dot(this.normal)+this.constant)/r;return i===!0&&(o<0||o>1)?null:t.copy(e.start).addScaledVector(n,o)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||Nc.getNormalMatrix(e),n=this.coplanarPoint(Nr).applyMatrix4(e),r=this.normal.applyMatrix3(i).normalize();return this.constant=-n.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Zi=new Sa,Uc=new _e(.5,.5),vn=new U;class ma{constructor(e=new ei,t=new ei,i=new ei,n=new ei,r=new ei,o=new ei){this.planes=[e,t,i,n,r,o]}set(e,t,i,n,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(i),a[3].copy(n),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=fi,i=!1){const n=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],d=r[3],c=r[4],u=r[5],h=r[6],f=r[7],S=r[8],C=r[9],p=r[10],x=r[11],y=r[12],g=r[13],M=r[14],w=r[15];if(n[0].setComponents(d-o,f-c,x-S,w-y).normalize(),n[1].setComponents(d+o,f+c,x+S,w+y).normalize(),n[2].setComponents(d+a,f+u,x+C,w+g).normalize(),n[3].setComponents(d-a,f-u,x-C,w-g).normalize(),i)n[4].setComponents(l,h,p,M).normalize(),n[5].setComponents(d-l,f-h,x-p,w-M).normalize();else if(n[4].setComponents(d-l,f-h,x-p,w-M).normalize(),t===fi)n[5].setComponents(d+l,f+h,x+p,w+M).normalize();else if(t===$s)n[5].setComponents(l,h,p,M).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Zi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Zi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Zi)}intersectsSprite(e){Zi.center.set(0,0,0);const t=Uc.distanceTo(e.center);return Zi.radius=.7071067811865476+t,Zi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Zi)}intersectsSphere(e){const t=this.planes,i=e.center,n=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(i)<n)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const n=t[i];if(vn.x=n.normal.x>0?e.max.x:e.min.x,vn.y=n.normal.y>0?e.max.y:e.min.y,vn.z=n.normal.z>0?e.max.z:e.min.z,n.distanceToPoint(vn)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class D1 extends At{constructor(e=[],t=ts,i,n,r,o,a,l,d,c){super(e,t,i,n,r,o,a,l,d,c),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class ns extends At{constructor(e,t,i=pi,n,r,o,a=Ct,l=Ct,d,c=Mi,u=1){if(c!==Mi&&c!==Fi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const h={width:e,height:t,depth:u};super(h,n,r,o,a,l,c,i,d),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new pa(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Fc extends ns{constructor(e,t=pi,i=ts,n,r,o=Ct,a=Ct,l,d=Mi){const c={width:e,height:e,depth:1},u=[c,c,c,c,c,c];super(e,e,t,i,n,r,o,a,l,d),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class L1 extends At{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Ls extends oi{constructor(e=1,t=1,i=1,n=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:n,heightSegments:r,depthSegments:o};const a=this;n=Math.floor(n),r=Math.floor(r),o=Math.floor(o);const l=[],d=[],c=[],u=[];let h=0,f=0;S("z","y","x",-1,-1,i,t,e,o,r,0),S("z","y","x",1,-1,i,t,-e,o,r,1),S("x","z","y",1,1,e,i,t,n,o,2),S("x","z","y",1,-1,e,i,-t,n,o,3),S("x","y","z",1,-1,e,t,i,n,r,4),S("x","y","z",-1,-1,e,t,-i,n,r,5),this.setIndex(l),this.setAttribute("position",new ri(d,3)),this.setAttribute("normal",new ri(c,3)),this.setAttribute("uv",new ri(u,2));function S(C,p,x,y,g,M,w,q,E,m,_){const A=M/E,T=w/m,R=M/2,B=w/2,V=q/2,P=E+1,D=m+1;let N=0,W=0;const X=new U;for(let te=0;te<D;te++){const ne=te*T-B;for(let de=0;de<P;de++){const Ae=de*A-R;X[C]=Ae*y,X[p]=ne*g,X[x]=V,d.push(X.x,X.y,X.z),X[C]=0,X[p]=0,X[x]=q>0?1:-1,c.push(X.x,X.y,X.z),u.push(de/E),u.push(1-te/m),N+=1}}for(let te=0;te<m;te++)for(let ne=0;ne<E;ne++){const de=h+ne+P*te,Ae=h+ne+P*(te+1),Fe=h+(ne+1)+P*(te+1),Te=h+(ne+1)+P*te;l.push(de,Ae,Te),l.push(Ae,Fe,Te),W+=6}a.addGroup(f,W,_),f+=W,h+=N}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ls(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class tr extends oi{constructor(e=1,t=1,i=1,n=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:n};const r=e/2,o=t/2,a=Math.floor(i),l=Math.floor(n),d=a+1,c=l+1,u=e/a,h=t/l,f=[],S=[],C=[],p=[];for(let x=0;x<c;x++){const y=x*h-o;for(let g=0;g<d;g++){const M=g*u-r;S.push(M,-y,0),C.push(0,0,1),p.push(g/a),p.push(1-x/l)}}for(let x=0;x<l;x++)for(let y=0;y<a;y++){const g=y+d*x,M=y+d*(x+1),w=y+1+d*(x+1),q=y+1+d*x;f.push(g,M,q),f.push(M,w,q)}this.setIndex(f),this.setAttribute("position",new ri(S,3)),this.setAttribute("normal",new ri(C,3)),this.setAttribute("uv",new ri(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new tr(e.width,e.height,e.widthSegments,e.heightSegments)}}function Rs(s){const e={};for(const t in s){e[t]={};for(const i in s[t]){const n=s[t][i];if(xd(n))n.isRenderTargetTexture?(Pe("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=n.clone();else if(Array.isArray(n))if(xd(n[0])){const r=[];for(let o=0,a=n.length;o<a;o++)r[o]=n[o].clone();e[t][i]=r}else e[t][i]=n.slice();else e[t][i]=n}}return e}function It(s){const e={};for(let t=0;t<s.length;t++){const i=Rs(s[t]);for(const n in i)e[n]=i[n]}return e}function xd(s){return s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)}function Oc(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function I1(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:We.workingColorSpace}const Yt={clone:Rs,merge:It};var Bc=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Hc=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class lt extends Ds{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Bc,this.fragmentShader=Hc,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Rs(e.uniforms),this.uniformsGroups=Oc(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const n in this.uniforms){const o=this.uniforms[n].value;o&&o.isTexture?t.uniforms[n]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[n]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[n]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[n]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[n]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[n]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[n]={type:"m4",value:o.toArray()}:t.uniforms[n]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const n in this.extensions)this.extensions[n]===!0&&(i[n]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class N1 extends lt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class pd extends Ds{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ge(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ge(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Zn,this.normalScale=new _e(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Gi,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Gc extends Ds{constructor(e){super(),this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Zn,this.normalScale=new _e(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.flatShading=e.flatShading,this}}class U1 extends Ds{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=H2,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Vc extends Ds{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class F1 extends Dt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ge(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}const Ur=new dt,Sd=new U,yd=new U;class kc{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new _e(512,512),this.mapType=Ut,this.map=null,this.mapPass=null,this.matrix=new dt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ma,this._frameExtents=new _e(1,1),this._viewportCount=1,this._viewports=[new pt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;Sd.setFromMatrixPosition(e.matrixWorld),t.position.copy(Sd),yd.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(yd),t.updateMatrixWorld(),Ur.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ur,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===$s||t.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Ur)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Mn=new U,bn=new bi,li=new U;class O1 extends Dt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new dt,this.projectionMatrix=new dt,this.projectionMatrixInverse=new dt,this.coordinateSystem=fi,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Mn,bn,li),li.x===1&&li.y===1&&li.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Mn,bn,li.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(Mn,bn,li),li.x===1&&li.y===1&&li.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Mn,bn,li.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Ii=new U,md=new _e,Cd=new _e;class Gt extends O1{constructor(e=50,t=1,i=.1,n=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=n,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=en*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Zs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return en*2*Math.atan(Math.tan(Zs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){Ii.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ii.x,Ii.y).multiplyScalar(-e/Ii.z),Ii.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Ii.x,Ii.y).multiplyScalar(-e/Ii.z)}getViewSize(e,t){return this.getViewBounds(e,md,Cd),t.subVectors(Cd,md)}setViewOffset(e,t,i,n,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=n,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Zs*.5*this.fov)/this.zoom,i=2*t,n=this.aspect*i,r=-.5*n;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,d=o.fullHeight;r+=o.offsetX*n/l,t-=o.offsetY*i/d,n*=o.width/l,i*=o.height/d}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+n,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class ir extends O1{constructor(e=-1,t=1,i=1,n=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=n,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,n,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=n,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,n=(this.top+this.bottom)/2;let r=i-e,o=i+e,a=n+t,l=n-t;if(this.view!==null&&this.view.enabled){const d=(this.right-this.left)/this.view.fullWidth/this.zoom,c=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=d*this.view.offsetX,o=r+d*this.view.width,a-=c*this.view.offsetY,l=a-c*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Wc extends kc{constructor(){super(new ir(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class zd extends F1{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Dt.DEFAULT_UP),this.updateMatrix(),this.target=new Dt,this.shadow=new Wc}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class Xc extends F1{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const ms=-90,Cs=1;class Yc extends Dt{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const n=new Gt(ms,Cs,e,t);n.layers=this.layers,this.add(n);const r=new Gt(ms,Cs,e,t);r.layers=this.layers,this.add(r);const o=new Gt(ms,Cs,e,t);o.layers=this.layers,this.add(o);const a=new Gt(ms,Cs,e,t);a.layers=this.layers,this.add(a);const l=new Gt(ms,Cs,e,t);l.layers=this.layers,this.add(l);const d=new Gt(ms,Cs,e,t);d.layers=this.layers,this.add(d)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,n,r,o,a,l]=t;for(const d of t)this.remove(d);if(e===fi)i.up.set(0,1,0),i.lookAt(1,0,0),n.up.set(0,1,0),n.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===$s)i.up.set(0,-1,0),i.lookAt(-1,0,0),n.up.set(0,-1,0),n.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const d of t)this.add(d),d.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:n}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,d,c]=this.children,u=e.getRenderTarget(),h=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),S=e.xr.enabled;e.xr.enabled=!1;const C=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(i,0,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(i,1,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(i,2,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(i,3,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(i,4,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),i.texture.generateMipmaps=C,e.setRenderTarget(i,5,n),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(u,h,f),e.xr.enabled=S,i.texture.needsPMREMUpdate=!0}}class jc extends Gt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Zc{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=Kc.bind(this),e.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e!==void 0?e:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}}function Kc(){this._document.hidden===!1&&this.reset()}class gd{constructor(e=1,t=0,i=0){this.radius=e,this.phi=t,this.theta=i}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=ke(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(ke(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const ba=class ba{constructor(e,t,i,n){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,i,n)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let i=0;i<4;i++)this.elements[i]=e[i+t];return this}set(e,t,i,n){const r=this.elements;return r[0]=e,r[2]=t,r[1]=i,r[3]=n,this}};ba.prototype.isMatrix2=!0;let qd=ba;class Jc extends Vi{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){Pe("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function _d(s,e,t,i){const n=Qc(i);switch(t){case q1:return s*e;case v1:return s*e/n.components*n.byteLength;case la:return s*e/n.components*n.byteLength;case ss:return s*e*2/n.components*n.byteLength;case ca:return s*e*2/n.components*n.byteLength;case _1:return s*e*3/n.components*n.byteLength;case jt:return s*e*4/n.components*n.byteLength;case ha:return s*e*4/n.components*n.byteLength;case Fn:case On:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Bn:case Hn:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case So:case mo:return Math.max(s,16)*Math.max(e,8)/4;case po:case yo:return Math.max(s,8)*Math.max(e,8)/2;case Co:case zo:case qo:case _o:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case go:case Yn:case vo:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Mo:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case bo:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case Eo:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case To:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case Ao:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case wo:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case Ro:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case Po:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case Do:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case Lo:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case Io:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case No:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case Uo:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case Fo:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case Oo:case Bo:case Ho:return Math.ceil(s/4)*Math.ceil(e/4)*16;case Go:case Vo:return Math.ceil(s/4)*Math.ceil(e/4)*8;case jn:case ko:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Qc(s){switch(s){case Ut:case m1:return{byteLength:1,components:1};case Qs:case C1:case qt:return{byteLength:2,components:1};case aa:case da:return{byteLength:2,components:4};case pi:case oa:case ui:return{byteLength:4,components:1};case z1:case g1:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Qo}}));typeof window<"u"&&(window.__THREE__?Pe("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Qo);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function B1(){let s=null,e=!1,t=null,i=null;function n(r,o){t(r,o),i=s.requestAnimationFrame(n)}return{start:function(){e!==!0&&t!==null&&s!==null&&(i=s.requestAnimationFrame(n),e=!0)},stop:function(){s!==null&&s.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){s=r}}}function $c(s){const e=new WeakMap;function t(a,l){const d=a.array,c=a.usage,u=d.byteLength,h=s.createBuffer();s.bindBuffer(l,h),s.bufferData(l,d,c),a.onUploadCallback();let f;if(d instanceof Float32Array)f=s.FLOAT;else if(typeof Float16Array<"u"&&d instanceof Float16Array)f=s.HALF_FLOAT;else if(d instanceof Uint16Array)a.isFloat16BufferAttribute?f=s.HALF_FLOAT:f=s.UNSIGNED_SHORT;else if(d instanceof Int16Array)f=s.SHORT;else if(d instanceof Uint32Array)f=s.UNSIGNED_INT;else if(d instanceof Int32Array)f=s.INT;else if(d instanceof Int8Array)f=s.BYTE;else if(d instanceof Uint8Array)f=s.UNSIGNED_BYTE;else if(d instanceof Uint8ClampedArray)f=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+d);return{buffer:h,type:f,bytesPerElement:d.BYTES_PER_ELEMENT,version:a.version,size:u}}function i(a,l,d){const c=l.array,u=l.updateRanges;if(s.bindBuffer(d,a),u.length===0)s.bufferSubData(d,0,c);else{u.sort((f,S)=>f.start-S.start);let h=0;for(let f=1;f<u.length;f++){const S=u[h],C=u[f];C.start<=S.start+S.count+1?S.count=Math.max(S.count,C.start+C.count-S.start):(++h,u[h]=C)}u.length=h+1;for(let f=0,S=u.length;f<S;f++){const C=u[f];s.bufferSubData(d,C.start*c.BYTES_PER_ELEMENT,c,C.start,C.count)}l.clearUpdateRanges()}l.onUploadCallback()}function n(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(s.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const c=e.get(a);(!c||c.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const d=e.get(a);if(d===void 0)e.set(a,t(a,l));else if(d.version<a.version){if(d.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(d.buffer,a,l),d.version=a.version}}return{get:n,remove:r,update:o}}var eh=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,th=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,ih=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,sh=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,nh=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,rh=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,oh=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,ah=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,dh=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,lh=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,ch=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,hh=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,uh=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,fh=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,xh=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,ph=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Sh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,yh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,mh=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ch=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,zh=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,gh=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,qh=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,_h=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,vh=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Mh=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,bh=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Eh=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Th=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Ah=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,wh="gl_FragColor = linearToOutputTexel( gl_FragColor );",Rh=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Ph=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Dh=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Lh=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Ih=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Nh=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Uh=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Fh=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Oh=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Bh=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Hh=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Gh=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Vh=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,kh=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Wh=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,Xh=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Yh=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,jh=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Zh=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Kh=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Jh=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Qh=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,$h=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = inverseTransformDirection( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,eu=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,tu=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,iu=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,su=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,nu=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ru=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ou=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,au=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,du=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,lu=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,cu=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,hu=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,uu=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,fu=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,xu=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,pu=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Su=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,yu=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,mu=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Cu=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,zu=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,gu=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,qu=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,_u=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,vu=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Mu=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,bu=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Eu=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Tu=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Au=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,wu=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Ru=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Pu=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Du=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Lu=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Iu=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Nu=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Uu=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Fu=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Ou=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Bu=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Hu=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Gu=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Vu=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,ku=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Wu=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Xu=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Yu=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,ju=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Zu=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Ku=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ju=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Qu=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,$u=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const e3=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,t3=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,i3=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,s3=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,n3=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,r3=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,o3=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,a3=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,d3=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,l3=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,c3=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,h3=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,u3=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,f3=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,x3=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,p3=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,S3=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,y3=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,m3=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,C3=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,z3=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,g3=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,q3=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,_3=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,v3=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,M3=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,b3=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,E3=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,T3=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,A3=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,w3=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,R3=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,P3=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,D3=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Be={alphahash_fragment:eh,alphahash_pars_fragment:th,alphamap_fragment:ih,alphamap_pars_fragment:sh,alphatest_fragment:nh,alphatest_pars_fragment:rh,aomap_fragment:oh,aomap_pars_fragment:ah,batching_pars_vertex:dh,batching_vertex:lh,begin_vertex:ch,beginnormal_vertex:hh,bsdfs:uh,iridescence_fragment:fh,bumpmap_pars_fragment:xh,clipping_planes_fragment:ph,clipping_planes_pars_fragment:Sh,clipping_planes_pars_vertex:yh,clipping_planes_vertex:mh,color_fragment:Ch,color_pars_fragment:zh,color_pars_vertex:gh,color_vertex:qh,common:_h,cube_uv_reflection_fragment:vh,defaultnormal_vertex:Mh,displacementmap_pars_vertex:bh,displacementmap_vertex:Eh,emissivemap_fragment:Th,emissivemap_pars_fragment:Ah,colorspace_fragment:wh,colorspace_pars_fragment:Rh,envmap_fragment:Ph,envmap_common_pars_fragment:Dh,envmap_pars_fragment:Lh,envmap_pars_vertex:Ih,envmap_physical_pars_fragment:Xh,envmap_vertex:Nh,fog_vertex:Uh,fog_pars_vertex:Fh,fog_fragment:Oh,fog_pars_fragment:Bh,gradientmap_pars_fragment:Hh,lightmap_pars_fragment:Gh,lights_lambert_fragment:Vh,lights_lambert_pars_fragment:kh,lights_pars_begin:Wh,lights_toon_fragment:Yh,lights_toon_pars_fragment:jh,lights_phong_fragment:Zh,lights_phong_pars_fragment:Kh,lights_physical_fragment:Jh,lights_physical_pars_fragment:Qh,lights_fragment_begin:$h,lights_fragment_maps:eu,lights_fragment_end:tu,lightprobes_pars_fragment:iu,logdepthbuf_fragment:su,logdepthbuf_pars_fragment:nu,logdepthbuf_pars_vertex:ru,logdepthbuf_vertex:ou,map_fragment:au,map_pars_fragment:du,map_particle_fragment:lu,map_particle_pars_fragment:cu,metalnessmap_fragment:hu,metalnessmap_pars_fragment:uu,morphinstance_vertex:fu,morphcolor_vertex:xu,morphnormal_vertex:pu,morphtarget_pars_vertex:Su,morphtarget_vertex:yu,normal_fragment_begin:mu,normal_fragment_maps:Cu,normal_pars_fragment:zu,normal_pars_vertex:gu,normal_vertex:qu,normalmap_pars_fragment:_u,clearcoat_normal_fragment_begin:vu,clearcoat_normal_fragment_maps:Mu,clearcoat_pars_fragment:bu,iridescence_pars_fragment:Eu,opaque_fragment:Tu,packing:Au,premultiplied_alpha_fragment:wu,project_vertex:Ru,dithering_fragment:Pu,dithering_pars_fragment:Du,roughnessmap_fragment:Lu,roughnessmap_pars_fragment:Iu,shadowmap_pars_fragment:Nu,shadowmap_pars_vertex:Uu,shadowmap_vertex:Fu,shadowmask_pars_fragment:Ou,skinbase_vertex:Bu,skinning_pars_vertex:Hu,skinning_vertex:Gu,skinnormal_vertex:Vu,specularmap_fragment:ku,specularmap_pars_fragment:Wu,tonemapping_fragment:Xu,tonemapping_pars_fragment:Yu,transmission_fragment:ju,transmission_pars_fragment:Zu,uv_pars_fragment:Ku,uv_pars_vertex:Ju,uv_vertex:Qu,worldpos_vertex:$u,background_vert:e3,background_frag:t3,backgroundCube_vert:i3,backgroundCube_frag:s3,cube_vert:n3,cube_frag:r3,depth_vert:o3,depth_frag:a3,distance_vert:d3,distance_frag:l3,equirect_vert:c3,equirect_frag:h3,linedashed_vert:u3,linedashed_frag:f3,meshbasic_vert:x3,meshbasic_frag:p3,meshlambert_vert:S3,meshlambert_frag:y3,meshmatcap_vert:m3,meshmatcap_frag:C3,meshnormal_vert:z3,meshnormal_frag:g3,meshphong_vert:q3,meshphong_frag:_3,meshphysical_vert:v3,meshphysical_frag:M3,meshtoon_vert:b3,meshtoon_frag:E3,points_vert:T3,points_frag:A3,shadow_vert:w3,shadow_frag:R3,sprite_vert:P3,sprite_frag:D3},ue={common:{diffuse:{value:new Ge(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ie},alphaMap:{value:null},alphaMapTransform:{value:new Ie},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ie}},envmap:{envMap:{value:null},envMapRotation:{value:new Ie},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ie}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ie}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ie},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ie},normalScale:{value:new _e(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ie},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ie}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ie}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ie}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ge(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new U},probesMax:{value:new U},probesResolution:{value:new U}},points:{diffuse:{value:new Ge(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ie},alphaTest:{value:0},uvTransform:{value:new Ie}},sprite:{diffuse:{value:new Ge(16777215)},opacity:{value:1},center:{value:new _e(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ie},alphaMap:{value:null},alphaMapTransform:{value:new Ie},alphaTest:{value:0}}},hi={basic:{uniforms:It([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.fog]),vertexShader:Be.meshbasic_vert,fragmentShader:Be.meshbasic_frag},lambert:{uniforms:It([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new Ge(0)},envMapIntensity:{value:1}}]),vertexShader:Be.meshlambert_vert,fragmentShader:Be.meshlambert_frag},phong:{uniforms:It([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new Ge(0)},specular:{value:new Ge(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Be.meshphong_vert,fragmentShader:Be.meshphong_frag},standard:{uniforms:It([ue.common,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.roughnessmap,ue.metalnessmap,ue.fog,ue.lights,{emissive:{value:new Ge(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Be.meshphysical_vert,fragmentShader:Be.meshphysical_frag},toon:{uniforms:It([ue.common,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.gradientmap,ue.fog,ue.lights,{emissive:{value:new Ge(0)}}]),vertexShader:Be.meshtoon_vert,fragmentShader:Be.meshtoon_frag},matcap:{uniforms:It([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,{matcap:{value:null}}]),vertexShader:Be.meshmatcap_vert,fragmentShader:Be.meshmatcap_frag},points:{uniforms:It([ue.points,ue.fog]),vertexShader:Be.points_vert,fragmentShader:Be.points_frag},dashed:{uniforms:It([ue.common,ue.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Be.linedashed_vert,fragmentShader:Be.linedashed_frag},depth:{uniforms:It([ue.common,ue.displacementmap]),vertexShader:Be.depth_vert,fragmentShader:Be.depth_frag},normal:{uniforms:It([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,{opacity:{value:1}}]),vertexShader:Be.meshnormal_vert,fragmentShader:Be.meshnormal_frag},sprite:{uniforms:It([ue.sprite,ue.fog]),vertexShader:Be.sprite_vert,fragmentShader:Be.sprite_frag},background:{uniforms:{uvTransform:{value:new Ie},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Be.background_vert,fragmentShader:Be.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ie}},vertexShader:Be.backgroundCube_vert,fragmentShader:Be.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Be.cube_vert,fragmentShader:Be.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Be.equirect_vert,fragmentShader:Be.equirect_frag},distance:{uniforms:It([ue.common,ue.displacementmap,{referencePosition:{value:new U},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Be.distance_vert,fragmentShader:Be.distance_frag},shadow:{uniforms:It([ue.lights,ue.fog,{color:{value:new Ge(0)},opacity:{value:1}}]),vertexShader:Be.shadow_vert,fragmentShader:Be.shadow_frag}};hi.physical={uniforms:It([hi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ie},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ie},clearcoatNormalScale:{value:new _e(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ie},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ie},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ie},sheen:{value:0},sheenColor:{value:new Ge(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ie},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ie},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ie},transmissionSamplerSize:{value:new _e},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ie},attenuationDistance:{value:0},attenuationColor:{value:new Ge(0)},specularColor:{value:new Ge(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ie},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ie},anisotropyVector:{value:new _e},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ie}}]),vertexShader:Be.meshphysical_vert,fragmentShader:Be.meshphysical_frag};const En={r:0,b:0,g:0},L3=new dt,H1=new Ie;H1.set(-1,0,0,0,1,0,0,0,1);function I3(s,e,t,i,n,r){const o=new Ge(0);let a=n===!0?0:1,l,d,c=null,u=0,h=null;function f(y){let g=y.isScene===!0?y.background:null;if(g&&g.isTexture){const M=y.backgroundBlurriness>0;g=e.get(g,M)}return g}function S(y){let g=!1;const M=f(y);M===null?p(o,a):M&&M.isColor&&(p(M,1),g=!0);const w=s.xr.getEnvironmentBlendMode();w==="additive"?t.buffers.color.setClear(0,0,0,1,r):w==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(s.autoClear||g)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function C(y,g){const M=f(g);M&&(M.isCubeTexture||M.mapping===er)?(d===void 0&&(d=new Zt(new Ls(1,1,1),new lt({name:"BackgroundCubeMaterial",uniforms:Rs(hi.backgroundCube.uniforms),vertexShader:hi.backgroundCube.vertexShader,fragmentShader:hi.backgroundCube.fragmentShader,side:Ft,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),d.geometry.deleteAttribute("normal"),d.geometry.deleteAttribute("uv"),d.onBeforeRender=function(w,q,E){this.matrixWorld.copyPosition(E.matrixWorld)},Object.defineProperty(d.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(d)),d.material.uniforms.envMap.value=M,d.material.uniforms.backgroundBlurriness.value=g.backgroundBlurriness,d.material.uniforms.backgroundIntensity.value=g.backgroundIntensity,d.material.uniforms.backgroundRotation.value.setFromMatrix4(L3.makeRotationFromEuler(g.backgroundRotation)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&d.material.uniforms.backgroundRotation.value.premultiply(H1),d.material.toneMapped=We.getTransfer(M.colorSpace)!==$e,(c!==M||u!==M.version||h!==s.toneMapping)&&(d.material.needsUpdate=!0,c=M,u=M.version,h=s.toneMapping),d.layers.enableAll(),y.unshift(d,d.geometry,d.material,0,0,null)):M&&M.isTexture&&(l===void 0&&(l=new Zt(new tr(2,2),new lt({name:"BackgroundMaterial",uniforms:Rs(hi.background.uniforms),vertexShader:hi.background.vertexShader,fragmentShader:hi.background.fragmentShader,side:Hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=M,l.material.uniforms.backgroundIntensity.value=g.backgroundIntensity,l.material.toneMapped=We.getTransfer(M.colorSpace)!==$e,M.matrixAutoUpdate===!0&&M.updateMatrix(),l.material.uniforms.uvTransform.value.copy(M.matrix),(c!==M||u!==M.version||h!==s.toneMapping)&&(l.material.needsUpdate=!0,c=M,u=M.version,h=s.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function p(y,g){y.getRGB(En,I1(s)),t.buffers.color.setClear(En.r,En.g,En.b,g,r)}function x(){d!==void 0&&(d.geometry.dispose(),d.material.dispose(),d=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(y,g=1){o.set(y),a=g,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(y){a=y,p(o,a)},render:S,addToRenderList:C,dispose:x}}function N3(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),i={},n=h(null);let r=n,o=!1;function a(T,R,B,V,P){let D=!1;const N=u(T,V,B,R);r!==N&&(r=N,d(r.object)),D=f(T,V,B,P),D&&S(T,V,B,P),P!==null&&e.update(P,s.ELEMENT_ARRAY_BUFFER),(D||o)&&(o=!1,M(T,R,B,V),P!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(P).buffer))}function l(){return s.createVertexArray()}function d(T){return s.bindVertexArray(T)}function c(T){return s.deleteVertexArray(T)}function u(T,R,B,V){const P=V.wireframe===!0;let D=i[R.id];D===void 0&&(D={},i[R.id]=D);const N=T.isInstancedMesh===!0?T.id:0;let W=D[N];W===void 0&&(W={},D[N]=W);let X=W[B.id];X===void 0&&(X={},W[B.id]=X);let te=X[P];return te===void 0&&(te=h(l()),X[P]=te),te}function h(T){const R=[],B=[],V=[];for(let P=0;P<t;P++)R[P]=0,B[P]=0,V[P]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:R,enabledAttributes:B,attributeDivisors:V,object:T,attributes:{},index:null}}function f(T,R,B,V){const P=r.attributes,D=R.attributes;let N=0;const W=B.getAttributes();for(const X in W)if(W[X].location>=0){const ne=P[X];let de=D[X];if(de===void 0&&(X==="instanceMatrix"&&T.instanceMatrix&&(de=T.instanceMatrix),X==="instanceColor"&&T.instanceColor&&(de=T.instanceColor)),ne===void 0||ne.attribute!==de||de&&ne.data!==de.data)return!0;N++}return r.attributesNum!==N||r.index!==V}function S(T,R,B,V){const P={},D=R.attributes;let N=0;const W=B.getAttributes();for(const X in W)if(W[X].location>=0){let ne=D[X];ne===void 0&&(X==="instanceMatrix"&&T.instanceMatrix&&(ne=T.instanceMatrix),X==="instanceColor"&&T.instanceColor&&(ne=T.instanceColor));const de={};de.attribute=ne,ne&&ne.data&&(de.data=ne.data),P[X]=de,N++}r.attributes=P,r.attributesNum=N,r.index=V}function C(){const T=r.newAttributes;for(let R=0,B=T.length;R<B;R++)T[R]=0}function p(T){x(T,0)}function x(T,R){const B=r.newAttributes,V=r.enabledAttributes,P=r.attributeDivisors;B[T]=1,V[T]===0&&(s.enableVertexAttribArray(T),V[T]=1),P[T]!==R&&(s.vertexAttribDivisor(T,R),P[T]=R)}function y(){const T=r.newAttributes,R=r.enabledAttributes;for(let B=0,V=R.length;B<V;B++)R[B]!==T[B]&&(s.disableVertexAttribArray(B),R[B]=0)}function g(T,R,B,V,P,D,N){N===!0?s.vertexAttribIPointer(T,R,B,P,D):s.vertexAttribPointer(T,R,B,V,P,D)}function M(T,R,B,V){C();const P=V.attributes,D=B.getAttributes(),N=R.defaultAttributeValues;for(const W in D){const X=D[W];if(X.location>=0){let te=P[W];if(te===void 0&&(W==="instanceMatrix"&&T.instanceMatrix&&(te=T.instanceMatrix),W==="instanceColor"&&T.instanceColor&&(te=T.instanceColor)),te!==void 0){const ne=te.normalized,de=te.itemSize,Ae=e.get(te);if(Ae===void 0)continue;const Fe=Ae.buffer,Te=Ae.type,j=Ae.bytesPerElement,re=Te===s.INT||Te===s.UNSIGNED_INT||te.gpuType===oa;if(te.isInterleavedBufferAttribute){const Q=te.data,pe=Q.stride,ye=te.offset;if(Q.isInstancedInterleavedBuffer){for(let ve=0;ve<X.locationSize;ve++)x(X.location+ve,Q.meshPerAttribute);T.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let ve=0;ve<X.locationSize;ve++)p(X.location+ve);s.bindBuffer(s.ARRAY_BUFFER,Fe);for(let ve=0;ve<X.locationSize;ve++)g(X.location+ve,de/X.locationSize,Te,ne,pe*j,(ye+de/X.locationSize*ve)*j,re)}else{if(te.isInstancedBufferAttribute){for(let Q=0;Q<X.locationSize;Q++)x(X.location+Q,te.meshPerAttribute);T.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=te.meshPerAttribute*te.count)}else for(let Q=0;Q<X.locationSize;Q++)p(X.location+Q);s.bindBuffer(s.ARRAY_BUFFER,Fe);for(let Q=0;Q<X.locationSize;Q++)g(X.location+Q,de/X.locationSize,Te,ne,de*j,de/X.locationSize*Q*j,re)}}else if(N!==void 0){const ne=N[W];if(ne!==void 0)switch(ne.length){case 2:s.vertexAttrib2fv(X.location,ne);break;case 3:s.vertexAttrib3fv(X.location,ne);break;case 4:s.vertexAttrib4fv(X.location,ne);break;default:s.vertexAttrib1fv(X.location,ne)}}}}y()}function w(){_();for(const T in i){const R=i[T];for(const B in R){const V=R[B];for(const P in V){const D=V[P];for(const N in D)c(D[N].object),delete D[N];delete V[P]}}delete i[T]}}function q(T){if(i[T.id]===void 0)return;const R=i[T.id];for(const B in R){const V=R[B];for(const P in V){const D=V[P];for(const N in D)c(D[N].object),delete D[N];delete V[P]}}delete i[T.id]}function E(T){for(const R in i){const B=i[R];for(const V in B){const P=B[V];if(P[T.id]===void 0)continue;const D=P[T.id];for(const N in D)c(D[N].object),delete D[N];delete P[T.id]}}}function m(T){for(const R in i){const B=i[R],V=T.isInstancedMesh===!0?T.id:0,P=B[V];if(P!==void 0){for(const D in P){const N=P[D];for(const W in N)c(N[W].object),delete N[W];delete P[D]}delete B[V],Object.keys(B).length===0&&delete i[R]}}}function _(){A(),o=!0,r!==n&&(r=n,d(r.object))}function A(){n.geometry=null,n.program=null,n.wireframe=!1}return{setup:a,reset:_,resetDefaultState:A,dispose:w,releaseStatesOfGeometry:q,releaseStatesOfObject:m,releaseStatesOfProgram:E,initAttributes:C,enableAttribute:p,disableUnusedAttributes:y}}function U3(s,e,t){let i;function n(l){i=l}function r(l,d){s.drawArrays(i,l,d),t.update(d,i,1)}function o(l,d,c){c!==0&&(s.drawArraysInstanced(i,l,d,c),t.update(d,i,c))}function a(l,d,c){if(c===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,l,0,d,0,c);let h=0;for(let f=0;f<c;f++)h+=d[f];t.update(h,i,1)}this.setMode=n,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function F3(s,e,t,i){let n;function r(){if(n!==void 0)return n;if(e.has("EXT_texture_filter_anisotropic")===!0){const E=e.get("EXT_texture_filter_anisotropic");n=s.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function o(E){return!(E!==jt&&i.convert(E)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(E){const m=E===qt&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(E!==Ut&&i.convert(E)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==ui&&!m)}function l(E){if(E==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let d=t.precision!==void 0?t.precision:"highp";const c=l(d);c!==d&&(Pe("WebGLRenderer:",d,"not supported, using",c,"instead."),d=c);const u=t.logarithmicDepthBuffer===!0,h=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&h===!1&&Pe("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const f=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),S=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),C=s.getParameter(s.MAX_TEXTURE_SIZE),p=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),x=s.getParameter(s.MAX_VERTEX_ATTRIBS),y=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),g=s.getParameter(s.MAX_VARYING_VECTORS),M=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),w=s.getParameter(s.MAX_SAMPLES),q=s.getParameter(s.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:d,logarithmicDepthBuffer:u,reversedDepthBuffer:h,maxTextures:f,maxVertexTextures:S,maxTextureSize:C,maxCubemapSize:p,maxAttributes:x,maxVertexUniforms:y,maxVaryings:g,maxFragmentUniforms:M,maxSamples:w,samples:q}}function O3(s){const e=this;let t=null,i=0,n=!1,r=!1;const o=new ei,a=new Ie,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,h){const f=u.length!==0||h||i!==0||n;return n=h,i=u.length,f},this.beginShadows=function(){r=!0,c(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,h){t=c(u,h,0)},this.setState=function(u,h,f){const S=u.clippingPlanes,C=u.clipIntersection,p=u.clipShadows,x=s.get(u);if(!n||S===null||S.length===0||r&&!p)r?c(null):d();else{const y=r?0:i,g=y*4;let M=x.clippingState||null;l.value=M,M=c(S,h,g,f);for(let w=0;w!==g;++w)M[w]=t[w];x.clippingState=M,this.numIntersection=C?this.numPlanes:0,this.numPlanes+=y}};function d(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function c(u,h,f,S){const C=u!==null?u.length:0;let p=null;if(C!==0){if(p=l.value,S!==!0||p===null){const x=f+C*4,y=h.matrixWorldInverse;a.getNormalMatrix(y),(p===null||p.length<x)&&(p=new Float32Array(x));for(let g=0,M=f;g!==C;++g,M+=4)o.copy(u[g]).applyMatrix4(y,a),o.normal.toArray(p,M),p[M+3]=o.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=C,e.numIntersection=0,p}}const Oi=4,vd=[.125,.215,.35,.446,.526,.582],Ji=20,B3=256,Gs=new ir,Md=new Ge;let Fr=null,Or=0,Br=0,Hr=!1;const H3=new U;class bd{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,i=.1,n=100,r={}){const{size:o=256,position:a=H3}=r;Fr=this._renderer.getRenderTarget(),Or=this._renderer.getActiveCubeFace(),Br=this._renderer.getActiveMipmapLevel(),Hr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,n,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ad(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Td(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Fr,Or,Br),this._renderer.xr.enabled=Hr,e.scissorTest=!1,zs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ts||e.mapping===As?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Fr=this._renderer.getRenderTarget(),Or=this._renderer.getActiveCubeFace(),Br=this._renderer.getActiveMipmapLevel(),Hr=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Tt,minFilter:Tt,generateMipmaps:!1,type:qt,format:jt,colorSpace:Kn,depthBuffer:!1},n=Ed(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ed(e,t,i);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=G3(r)),this._blurMaterial=k3(r,e,t),this._ggxMaterial=V3(r,e,t)}return n}_compileMaterial(e){const t=new Zt(new oi,e);this._renderer.compile(t,Gs)}_sceneToCubeUV(e,t,i,n,r){const l=new Gt(90,1,t,i),d=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],u=this._renderer,h=u.autoClear,f=u.toneMapping;u.getClearColor(Md),u.toneMapping=xi,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(n),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Zt(new Ls,new P1({name:"PMREM.Background",side:Ft,depthWrite:!1,depthTest:!1})));const C=this._backgroundBox,p=C.material;let x=!1;const y=e.background;y?y.isColor&&(p.color.copy(y),e.background=null,x=!0):(p.color.copy(Md),x=!0);for(let g=0;g<6;g++){const M=g%3;M===0?(l.up.set(0,d[g],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+c[g],r.y,r.z)):M===1?(l.up.set(0,0,d[g]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+c[g],r.z)):(l.up.set(0,d[g],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+c[g]));const w=this._cubeSize;zs(n,M*w,g>2?w:0,w,w),u.setRenderTarget(n),x&&u.render(C,l),u.render(e,l)}u.toneMapping=f,u.autoClear=h,e.background=y}_textureToCubeUV(e,t){const i=this._renderer,n=e.mapping===ts||e.mapping===As;n?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ad()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Td());const r=n?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;const a=r.uniforms;a.envMap.value=e;const l=this._cubeSize;zs(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(o,Gs)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const n=this._lodMeshes.length;for(let r=1;r<n;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=i}_applyGGXFilter(e,t,i){const n=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[i];a.material=o;const l=o.uniforms,d=i/(this._lodMeshes.length-1),c=t/(this._lodMeshes.length-1),u=Math.sqrt(d*d-c*c),h=0+d*1.25,f=u*h,{_lodMax:S}=this,C=this._sizeLods[i],p=3*C*(i>S-Oi?i-S+Oi:0),x=4*(this._cubeSize-C);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=S-t,zs(r,p,x,3*C,2*C),n.setRenderTarget(r),n.render(a,Gs),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=S-i,zs(e,p,x,3*C,2*C),n.setRenderTarget(e),n.render(a,Gs)}_blur(e,t,i,n,r){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,i,n,"latitudinal",r),this._halfBlur(o,e,i,i,n,"longitudinal",r)}_halfBlur(e,t,i,n,r,o,a){const l=this._renderer,d=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&Ze("blur direction must be either latitudinal or longitudinal!");const c=3,u=this._lodMeshes[n];u.material=d;const h=d.uniforms,f=this._sizeLods[i]-1,S=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*Ji-1),C=r/S,p=isFinite(r)?1+Math.floor(c*C):Ji;p>Ji&&Pe(`sigmaRadians, ${r}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${Ji}`);const x=[];let y=0;for(let E=0;E<Ji;++E){const m=E/C,_=Math.exp(-m*m/2);x.push(_),E===0?y+=_:E<p&&(y+=2*_)}for(let E=0;E<x.length;E++)x[E]=x[E]/y;h.envMap.value=e.texture,h.samples.value=p,h.weights.value=x,h.latitudinal.value=o==="latitudinal",a&&(h.poleAxis.value=a);const{_lodMax:g}=this;h.dTheta.value=S,h.mipInt.value=g-i;const M=this._sizeLods[n],w=3*M*(n>g-Oi?n-g+Oi:0),q=4*(this._cubeSize-M);zs(t,w,q,3*M,2*M),l.setRenderTarget(t),l.render(u,Gs)}}function G3(s){const e=[],t=[],i=[];let n=s;const r=s-Oi+1+vd.length;for(let o=0;o<r;o++){const a=Math.pow(2,n);e.push(a);let l=1/a;o>s-Oi?l=vd[o-s+Oi-1]:o===0&&(l=0),t.push(l);const d=1/(a-2),c=-d,u=1+d,h=[c,c,u,c,u,u,c,c,u,u,c,u],f=6,S=6,C=3,p=2,x=1,y=new Float32Array(C*S*f),g=new Float32Array(p*S*f),M=new Float32Array(x*S*f);for(let q=0;q<f;q++){const E=q%3*2/3-1,m=q>2?0:-1,_=[E,m,0,E+2/3,m,0,E+2/3,m+1,0,E,m,0,E+2/3,m+1,0,E,m+1,0];y.set(_,C*S*q),g.set(h,p*S*q);const A=[q,q,q,q,q,q];M.set(A,x*S*q)}const w=new oi;w.setAttribute("position",new ni(y,C)),w.setAttribute("uv",new ni(g,p)),w.setAttribute("faceIndex",new ni(M,x)),i.push(new Zt(w,null)),n>Oi&&n--}return{lodMeshes:i,sizeLods:e,sigmas:t}}function Ed(s,e,t){const i=new xt(s,e,t);return i.texture.mapping=er,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function zs(s,e,t,i,n){s.viewport.set(e,t,i,n),s.scissor.set(e,t,i,n)}function V3(s,e,t){return new lt({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:B3,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:sr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:gt,depthTest:!1,depthWrite:!1})}function k3(s,e,t){const i=new Float32Array(Ji),n=new U(0,1,0);return new lt({name:"SphericalGaussianBlur",defines:{n:Ji,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:n}},vertexShader:sr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:gt,depthTest:!1,depthWrite:!1})}function Td(){return new lt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:sr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:gt,depthTest:!1,depthWrite:!1})}function Ad(){return new lt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:sr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:gt,depthTest:!1,depthWrite:!1})}function sr(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class G1 extends xt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},n=[i,i,i,i,i,i];this.texture=new D1(n),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},n=new Ls(5,5,5),r=new lt({name:"CubemapFromEquirect",uniforms:Rs(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Ft,blending:gt});r.uniforms.tEquirect.value=t;const o=new Zt(n,r),a=t.minFilter;return t.minFilter===Qi&&(t.minFilter=Tt),new Yc(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,i=!0,n=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,i,n);e.setRenderTarget(r)}}function W3(s){let e=new WeakMap,t=new WeakMap,i=null;function n(h,f=!1){return h==null?null:f?o(h):r(h)}function r(h){if(h&&h.isTexture){const f=h.mapping;if(f===ur||f===fr)if(e.has(h)){const S=e.get(h).texture;return a(S,h.mapping)}else{const S=h.image;if(S&&S.height>0){const C=new G1(S.height);return C.fromEquirectangularTexture(s,h),e.set(h,C),h.addEventListener("dispose",d),a(C.texture,h.mapping)}else return null}}return h}function o(h){if(h&&h.isTexture){const f=h.mapping,S=f===ur||f===fr,C=f===ts||f===As;if(S||C){let p=t.get(h);const x=p!==void 0?p.texture.pmremVersion:0;if(h.isRenderTargetTexture&&h.pmremVersion!==x)return i===null&&(i=new bd(s)),p=S?i.fromEquirectangular(h,p):i.fromCubemap(h,p),p.texture.pmremVersion=h.pmremVersion,t.set(h,p),p.texture;if(p!==void 0)return p.texture;{const y=h.image;return S&&y&&y.height>0||C&&y&&l(y)?(i===null&&(i=new bd(s)),p=S?i.fromEquirectangular(h):i.fromCubemap(h),p.texture.pmremVersion=h.pmremVersion,t.set(h,p),h.addEventListener("dispose",c),p.texture):null}}}return h}function a(h,f){return f===ur?h.mapping=ts:f===fr&&(h.mapping=As),h}function l(h){let f=0;const S=6;for(let C=0;C<S;C++)h[C]!==void 0&&f++;return f===S}function d(h){const f=h.target;f.removeEventListener("dispose",d);const S=e.get(f);S!==void 0&&(e.delete(f),S.dispose())}function c(h){const f=h.target;f.removeEventListener("dispose",c);const S=t.get(f);S!==void 0&&(t.delete(f),S.dispose())}function u(){e=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:n,dispose:u}}function X3(s){const e={};function t(i){if(e[i]!==void 0)return e[i];const n=s.getExtension(i);return e[i]=n,n}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const n=t(i);return n===null&&Wo("WebGLRenderer: "+i+" extension not supported."),n}}}function Y3(s,e,t,i){const n={},r=new WeakMap;function o(u){const h=u.target;h.index!==null&&e.remove(h.index);for(const S in h.attributes)e.remove(h.attributes[S]);h.removeEventListener("dispose",o),delete n[h.id];const f=r.get(h);f&&(e.remove(f),r.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function a(u,h){return n[h.id]===!0||(h.addEventListener("dispose",o),n[h.id]=!0,t.memory.geometries++),h}function l(u){const h=u.attributes;for(const f in h)e.update(h[f],s.ARRAY_BUFFER)}function d(u){const h=[],f=u.index,S=u.attributes.position;let C=0;if(S===void 0)return;if(f!==null){const y=f.array;C=f.version;for(let g=0,M=y.length;g<M;g+=3){const w=y[g+0],q=y[g+1],E=y[g+2];h.push(w,q,q,E,E,w)}}else{const y=S.array;C=S.version;for(let g=0,M=y.length/3-1;g<M;g+=3){const w=g+0,q=g+1,E=g+2;h.push(w,q,q,E,E,w)}}const p=new(S.count>=65535?w1:A1)(h,1);p.version=C;const x=r.get(u);x&&e.remove(x),r.set(u,p)}function c(u){const h=r.get(u);if(h){const f=u.index;f!==null&&h.version<f.version&&d(u)}else d(u);return r.get(u)}return{get:a,update:l,getWireframeAttribute:c}}function j3(s,e,t){let i;function n(u){i=u}let r,o;function a(u){r=u.type,o=u.bytesPerElement}function l(u,h){s.drawElements(i,h,r,u*o),t.update(h,i,1)}function d(u,h,f){f!==0&&(s.drawElementsInstanced(i,h,r,u*o,f),t.update(h,i,f))}function c(u,h,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,h,0,r,u,0,f);let C=0;for(let p=0;p<f;p++)C+=h[p];t.update(C,i,1)}this.setMode=n,this.setIndex=a,this.render=l,this.renderInstances=d,this.renderMultiDraw=c}function Z3(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,a){switch(t.calls++,o){case s.TRIANGLES:t.triangles+=a*(r/3);break;case s.LINES:t.lines+=a*(r/2);break;case s.LINE_STRIP:t.lines+=a*(r-1);break;case s.LINE_LOOP:t.lines+=a*r;break;case s.POINTS:t.points+=a*r;break;default:Ze("WebGLInfo: Unknown draw mode:",o);break}}function n(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:n,update:i}}function K3(s,e,t){const i=new WeakMap,n=new pt;function r(o,a,l){const d=o.morphTargetInfluences,c=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=c!==void 0?c.length:0;let h=i.get(a);if(h===void 0||h.count!==u){let _=function(){E.dispose(),i.delete(a),a.removeEventListener("dispose",_)};h!==void 0&&h.texture.dispose();const f=a.morphAttributes.position!==void 0,S=a.morphAttributes.normal!==void 0,C=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],x=a.morphAttributes.normal||[],y=a.morphAttributes.color||[];let g=0;f===!0&&(g=1),S===!0&&(g=2),C===!0&&(g=3);let M=a.attributes.position.count*g,w=1;M>e.maxTextureSize&&(w=Math.ceil(M/e.maxTextureSize),M=e.maxTextureSize);const q=new Float32Array(M*w*4*u),E=new b1(q,M,w,u);E.type=ui,E.needsUpdate=!0;const m=g*4;for(let A=0;A<u;A++){const T=p[A],R=x[A],B=y[A],V=M*w*4*A;for(let P=0;P<T.count;P++){const D=P*m;f===!0&&(n.fromBufferAttribute(T,P),q[V+D+0]=n.x,q[V+D+1]=n.y,q[V+D+2]=n.z,q[V+D+3]=0),S===!0&&(n.fromBufferAttribute(R,P),q[V+D+4]=n.x,q[V+D+5]=n.y,q[V+D+6]=n.z,q[V+D+7]=0),C===!0&&(n.fromBufferAttribute(B,P),q[V+D+8]=n.x,q[V+D+9]=n.y,q[V+D+10]=n.z,q[V+D+11]=B.itemSize===4?n.w:1)}}h={count:u,texture:E,size:new _e(M,w)},i.set(a,h),a.addEventListener("dispose",_)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",o.morphTexture,t);else{let f=0;for(let C=0;C<d.length;C++)f+=d[C];const S=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(s,"morphTargetBaseInfluence",S),l.getUniforms().setValue(s,"morphTargetInfluences",d)}l.getUniforms().setValue(s,"morphTargetsTexture",h.texture,t),l.getUniforms().setValue(s,"morphTargetsTextureSize",h.size)}return{update:r}}function J3(s,e,t,i,n){let r=new WeakMap;function o(d){const c=n.render.frame,u=d.geometry,h=e.get(d,u);if(r.get(h)!==c&&(e.update(h),r.set(h,c)),d.isInstancedMesh&&(d.hasEventListener("dispose",l)===!1&&d.addEventListener("dispose",l),r.get(d)!==c&&(t.update(d.instanceMatrix,s.ARRAY_BUFFER),d.instanceColor!==null&&t.update(d.instanceColor,s.ARRAY_BUFFER),r.set(d,c))),d.isSkinnedMesh){const f=d.skeleton;r.get(f)!==c&&(f.update(),r.set(f,c))}return h}function a(){r=new WeakMap}function l(d){const c=d.target;c.removeEventListener("dispose",l),i.releaseStatesOfObject(c),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:o,dispose:a}}const Q3={[$o]:"LINEAR_TONE_MAPPING",[ea]:"REINHARD_TONE_MAPPING",[ta]:"CINEON_TONE_MAPPING",[ia]:"ACES_FILMIC_TONE_MAPPING",[na]:"AGX_TONE_MAPPING",[ra]:"NEUTRAL_TONE_MAPPING",[sa]:"CUSTOM_TONE_MAPPING"};function $3(s,e,t,i,n){const r=new xt(e,t,{type:s,depthBuffer:i,stencilBuffer:n,depthTexture:i?new ns(e,t):void 0}),o=new xt(e,t,{type:qt,depthBuffer:!1,stencilBuffer:!1}),a=new oi;a.setAttribute("position",new ri([-1,3,0,-1,-1,0,3,-1,0],3)),a.setAttribute("uv",new ri([0,2,0,0,2,0],2));const l=new N1({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new Zt(a,l),c=new ir(-1,1,1,-1,0,1);let u=null,h=null,f=!1,S,C=null,p=[],x=!1;this.setSize=function(y,g){r.setSize(y,g),o.setSize(y,g);for(let M=0;M<p.length;M++){const w=p[M];w.setSize&&w.setSize(y,g)}},this.setEffects=function(y){p=y,x=p.length>0&&p[0].isRenderPass===!0;const g=r.width,M=r.height;for(let w=0;w<p.length;w++){const q=p[w];q.setSize&&q.setSize(g,M)}},this.begin=function(y,g){if(f||y.toneMapping===xi&&p.length===0)return!1;if(C=g,g!==null){const M=g.width,w=g.height;(r.width!==M||r.height!==w)&&this.setSize(M,w)}return x===!1&&y.setRenderTarget(r),S=y.toneMapping,y.toneMapping=xi,!0},this.hasRenderPass=function(){return x},this.end=function(y,g){y.toneMapping=S,f=!0;let M=r,w=o;for(let q=0;q<p.length;q++){const E=p[q];if(E.enabled!==!1&&(E.render(y,w,M,g),E.needsSwap!==!1)){const m=M;M=w,w=m}}if(u!==y.outputColorSpace||h!==y.toneMapping){u=y.outputColorSpace,h=y.toneMapping,l.defines={},We.getTransfer(u)===$e&&(l.defines.SRGB_TRANSFER="");const q=Q3[h];q&&(l.defines[q]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=M.texture,y.setRenderTarget(C),y.render(d,c),C=null,f=!1},this.isCompositing=function(){return f},this.dispose=function(){r.depthTexture&&r.depthTexture.dispose(),r.dispose(),o.dispose(),a.dispose(),l.dispose()}}const V1=new At,Xo=new ns(1,1),k1=new b1,W1=new gc,X1=new D1,wd=[],Rd=[],Pd=new Float32Array(16),Dd=new Float32Array(9),Ld=new Float32Array(4);function Is(s,e,t){const i=s[0];if(i<=0||i>0)return s;const n=e*t;let r=wd[n];if(r===void 0&&(r=new Float32Array(n),wd[n]=r),e!==0){i.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,s[o].toArray(r,a)}return r}function vt(s,e){if(s.length!==e.length)return!1;for(let t=0,i=s.length;t<i;t++)if(s[t]!==e[t])return!1;return!0}function Mt(s,e){for(let t=0,i=e.length;t<i;t++)s[t]=e[t]}function nr(s,e){let t=Rd[e];t===void 0&&(t=new Int32Array(e),Rd[e]=t);for(let i=0;i!==e;++i)t[i]=s.allocateTextureUnit();return t}function ef(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function tf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(vt(t,e))return;s.uniform2fv(this.addr,e),Mt(t,e)}}function sf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(vt(t,e))return;s.uniform3fv(this.addr,e),Mt(t,e)}}function nf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(vt(t,e))return;s.uniform4fv(this.addr,e),Mt(t,e)}}function rf(s,e){const t=this.cache,i=e.elements;if(i===void 0){if(vt(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),Mt(t,e)}else{if(vt(t,i))return;Ld.set(i),s.uniformMatrix2fv(this.addr,!1,Ld),Mt(t,i)}}function of(s,e){const t=this.cache,i=e.elements;if(i===void 0){if(vt(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),Mt(t,e)}else{if(vt(t,i))return;Dd.set(i),s.uniformMatrix3fv(this.addr,!1,Dd),Mt(t,i)}}function af(s,e){const t=this.cache,i=e.elements;if(i===void 0){if(vt(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),Mt(t,e)}else{if(vt(t,i))return;Pd.set(i),s.uniformMatrix4fv(this.addr,!1,Pd),Mt(t,i)}}function df(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function lf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(vt(t,e))return;s.uniform2iv(this.addr,e),Mt(t,e)}}function cf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(vt(t,e))return;s.uniform3iv(this.addr,e),Mt(t,e)}}function hf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(vt(t,e))return;s.uniform4iv(this.addr,e),Mt(t,e)}}function uf(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function ff(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(vt(t,e))return;s.uniform2uiv(this.addr,e),Mt(t,e)}}function xf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(vt(t,e))return;s.uniform3uiv(this.addr,e),Mt(t,e)}}function pf(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(vt(t,e))return;s.uniform4uiv(this.addr,e),Mt(t,e)}}function Sf(s,e,t){const i=this.cache,n=t.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n);let r;this.type===s.SAMPLER_2D_SHADOW?(Xo.compareFunction=t.isReversedDepthBuffer()?fa:ua,r=Xo):r=V1,t.setTexture2D(e||r,n)}function yf(s,e,t){const i=this.cache,n=t.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),t.setTexture3D(e||W1,n)}function mf(s,e,t){const i=this.cache,n=t.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),t.setTextureCube(e||X1,n)}function Cf(s,e,t){const i=this.cache,n=t.allocateTextureUnit();i[0]!==n&&(s.uniform1i(this.addr,n),i[0]=n),t.setTexture2DArray(e||k1,n)}function zf(s){switch(s){case 5126:return ef;case 35664:return tf;case 35665:return sf;case 35666:return nf;case 35674:return rf;case 35675:return of;case 35676:return af;case 5124:case 35670:return df;case 35667:case 35671:return lf;case 35668:case 35672:return cf;case 35669:case 35673:return hf;case 5125:return uf;case 36294:return ff;case 36295:return xf;case 36296:return pf;case 35678:case 36198:case 36298:case 36306:case 35682:return Sf;case 35679:case 36299:case 36307:return yf;case 35680:case 36300:case 36308:case 36293:return mf;case 36289:case 36303:case 36311:case 36292:return Cf}}function gf(s,e){s.uniform1fv(this.addr,e)}function qf(s,e){const t=Is(e,this.size,2);s.uniform2fv(this.addr,t)}function _f(s,e){const t=Is(e,this.size,3);s.uniform3fv(this.addr,t)}function vf(s,e){const t=Is(e,this.size,4);s.uniform4fv(this.addr,t)}function Mf(s,e){const t=Is(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function bf(s,e){const t=Is(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function Ef(s,e){const t=Is(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function Tf(s,e){s.uniform1iv(this.addr,e)}function Af(s,e){s.uniform2iv(this.addr,e)}function wf(s,e){s.uniform3iv(this.addr,e)}function Rf(s,e){s.uniform4iv(this.addr,e)}function Pf(s,e){s.uniform1uiv(this.addr,e)}function Df(s,e){s.uniform2uiv(this.addr,e)}function Lf(s,e){s.uniform3uiv(this.addr,e)}function If(s,e){s.uniform4uiv(this.addr,e)}function Nf(s,e,t){const i=this.cache,n=e.length,r=nr(t,n);vt(i,r)||(s.uniform1iv(this.addr,r),Mt(i,r));let o;this.type===s.SAMPLER_2D_SHADOW?o=Xo:o=V1;for(let a=0;a!==n;++a)t.setTexture2D(e[a]||o,r[a])}function Uf(s,e,t){const i=this.cache,n=e.length,r=nr(t,n);vt(i,r)||(s.uniform1iv(this.addr,r),Mt(i,r));for(let o=0;o!==n;++o)t.setTexture3D(e[o]||W1,r[o])}function Ff(s,e,t){const i=this.cache,n=e.length,r=nr(t,n);vt(i,r)||(s.uniform1iv(this.addr,r),Mt(i,r));for(let o=0;o!==n;++o)t.setTextureCube(e[o]||X1,r[o])}function Of(s,e,t){const i=this.cache,n=e.length,r=nr(t,n);vt(i,r)||(s.uniform1iv(this.addr,r),Mt(i,r));for(let o=0;o!==n;++o)t.setTexture2DArray(e[o]||k1,r[o])}function Bf(s){switch(s){case 5126:return gf;case 35664:return qf;case 35665:return _f;case 35666:return vf;case 35674:return Mf;case 35675:return bf;case 35676:return Ef;case 5124:case 35670:return Tf;case 35667:case 35671:return Af;case 35668:case 35672:return wf;case 35669:case 35673:return Rf;case 5125:return Pf;case 36294:return Df;case 36295:return Lf;case 36296:return If;case 35678:case 36198:case 36298:case 36306:case 35682:return Nf;case 35679:case 36299:case 36307:return Uf;case 35680:case 36300:case 36308:case 36293:return Ff;case 36289:case 36303:case 36311:case 36292:return Of}}class Hf{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=zf(t.type)}}class Gf{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Bf(t.type)}}class Vf{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const n=this.seq;for(let r=0,o=n.length;r!==o;++r){const a=n[r];a.setValue(e,t[a.id],i)}}}const Gr=/(\w+)(\])?(\[|\.)?/g;function Id(s,e){s.seq.push(e),s.map[e.id]=e}function kf(s,e,t){const i=s.name,n=i.length;for(Gr.lastIndex=0;;){const r=Gr.exec(i),o=Gr.lastIndex;let a=r[1];const l=r[2]==="]",d=r[3];if(l&&(a=a|0),d===void 0||d==="["&&o+2===n){Id(t,d===void 0?new Hf(a,s,e):new Gf(a,s,e));break}else{let u=t.map[a];u===void 0&&(u=new Vf(a),Id(t,u)),t=u}}}class Gn{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<i;++o){const a=e.getActiveUniform(t,o),l=e.getUniformLocation(t,a.name);kf(a,l,this)}const n=[],r=[];for(const o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?n.push(o):r.push(o);n.length>0&&(this.seq=n.concat(r))}setValue(e,t,i,n){const r=this.map[t];r!==void 0&&r.setValue(e,i,n)}setOptional(e,t,i){const n=t[i];n!==void 0&&this.setValue(e,i,n)}static upload(e,t,i,n){for(let r=0,o=t.length;r!==o;++r){const a=t[r],l=i[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,n)}}static seqWithValue(e,t){const i=[];for(let n=0,r=e.length;n!==r;++n){const o=e[n];o.id in t&&i.push(o)}return i}}function Nd(s,e,t){const i=s.createShader(e);return s.shaderSource(i,t),s.compileShader(i),i}const Wf=37297;let Xf=0;function Yf(s,e){const t=s.split(`
`),i=[],n=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=n;o<r;o++){const a=o+1;i.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return i.join(`
`)}const Ud=new Ie;function jf(s){We._getMatrix(Ud,We.workingColorSpace,s);const e=`mat3( ${Ud.elements.map(t=>t.toFixed(4))} )`;switch(We.getTransfer(s)){case Jn:return[e,"LinearTransferOETF"];case $e:return[e,"sRGBTransferOETF"];default:return Pe("WebGLProgram: Unsupported color space: ",s),[e,"LinearTransferOETF"]}}function Fd(s,e,t){const i=s.getShaderParameter(e,s.COMPILE_STATUS),r=(s.getShaderInfoLog(e)||"").trim();if(i&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+Yf(s.getShaderSource(e),a)}else return r}function Zf(s,e){const t=jf(e);return[`vec4 ${s}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const Kf={[$o]:"Linear",[ea]:"Reinhard",[ta]:"Cineon",[ia]:"ACESFilmic",[na]:"AgX",[ra]:"Neutral",[sa]:"Custom"};function Jf(s,e){const t=Kf[e];return t===void 0?(Pe("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+s+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Tn=new U;function Qf(){We.getLuminanceCoefficients(Tn);const s=Tn.x.toFixed(4),e=Tn.y.toFixed(4),t=Tn.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function $f(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ys).join(`
`)}function e0(s){const e=[];for(const t in s){const i=s[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function t0(s,e){const t={},i=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let n=0;n<i;n++){const r=s.getActiveAttrib(e,n),o=r.name;let a=1;r.type===s.FLOAT_MAT2&&(a=2),r.type===s.FLOAT_MAT3&&(a=3),r.type===s.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:s.getAttribLocation(e,o),locationSize:a}}return t}function Ys(s){return s!==""}function Od(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Bd(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const i0=/^[ \t]*#include +<([\w\d./]+)>/gm;function Yo(s){return s.replace(i0,n0)}const s0=new Map;function n0(s,e){let t=Be[e];if(t===void 0){const i=s0.get(e);if(i!==void 0)t=Be[i],Pe('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return Yo(t)}const r0=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Hd(s){return s.replace(r0,o0)}function o0(s,e,t,i){let n="";for(let r=parseInt(e);r<parseInt(t);r++)n+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return n}function Gd(s){let e=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?e+=`
#define HIGH_PRECISION`:s.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const a0={[Un]:"SHADOWMAP_TYPE_PCF",[ks]:"SHADOWMAP_TYPE_VSM"};function d0(s){return a0[s.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const l0={[ts]:"ENVMAP_TYPE_CUBE",[As]:"ENVMAP_TYPE_CUBE",[er]:"ENVMAP_TYPE_CUBE_UV"};function c0(s){return s.envMap===!1?"ENVMAP_TYPE_CUBE":l0[s.envMapMode]||"ENVMAP_TYPE_CUBE"}const h0={[As]:"ENVMAP_MODE_REFRACTION"};function u0(s){return s.envMap===!1?"ENVMAP_MODE_REFLECTION":h0[s.envMapMode]||"ENVMAP_MODE_REFLECTION"}const f0={[S1]:"ENVMAP_BLENDING_MULTIPLY",[F2]:"ENVMAP_BLENDING_MIX",[O2]:"ENVMAP_BLENDING_ADD"};function x0(s){return s.envMap===!1?"ENVMAP_BLENDING_NONE":f0[s.combine]||"ENVMAP_BLENDING_NONE"}function p0(s){const e=s.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:i,maxMip:t}}function S0(s,e,t,i){const n=s.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=d0(t),d=c0(t),c=u0(t),u=x0(t),h=p0(t),f=$f(t),S=e0(r),C=n.createProgram();let p,x,y=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S].filter(Ys).join(`
`),p.length>0&&(p+=`
`),x=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S].filter(Ys).join(`
`),x.length>0&&(x+=`
`)):(p=[Gd(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ys).join(`
`),x=[Gd(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+d:"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==xi?"#define TONE_MAPPING":"",t.toneMapping!==xi?Be.tonemapping_pars_fragment:"",t.toneMapping!==xi?Jf("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Be.colorspace_pars_fragment,Zf("linearToOutputTexel",t.outputColorSpace),Qf(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ys).join(`
`)),o=Yo(o),o=Od(o,t),o=Bd(o,t),a=Yo(a),a=Od(a,t),a=Bd(a,t),o=Hd(o),a=Hd(a),t.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,x=["#define varying in",t.glslVersion===Ka?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Ka?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+x);const g=y+p+o,M=y+x+a,w=Nd(n,n.VERTEX_SHADER,g),q=Nd(n,n.FRAGMENT_SHADER,M);n.attachShader(C,w),n.attachShader(C,q),t.index0AttributeName!==void 0?n.bindAttribLocation(C,0,t.index0AttributeName):t.morphTargets===!0&&n.bindAttribLocation(C,0,"position"),n.linkProgram(C);function E(T){if(s.debug.checkShaderErrors){const R=n.getProgramInfoLog(C)||"",B=n.getShaderInfoLog(w)||"",V=n.getShaderInfoLog(q)||"",P=R.trim(),D=B.trim(),N=V.trim();let W=!0,X=!0;if(n.getProgramParameter(C,n.LINK_STATUS)===!1)if(W=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(n,C,w,q);else{const te=Fd(n,w,"vertex"),ne=Fd(n,q,"fragment");Ze("THREE.WebGLProgram: Shader Error "+n.getError()+" - VALIDATE_STATUS "+n.getProgramParameter(C,n.VALIDATE_STATUS)+`

Material Name: `+T.name+`
Material Type: `+T.type+`

Program Info Log: `+P+`
`+te+`
`+ne)}else P!==""?Pe("WebGLProgram: Program Info Log:",P):(D===""||N==="")&&(X=!1);X&&(T.diagnostics={runnable:W,programLog:P,vertexShader:{log:D,prefix:p},fragmentShader:{log:N,prefix:x}})}n.deleteShader(w),n.deleteShader(q),m=new Gn(n,C),_=t0(n,C)}let m;this.getUniforms=function(){return m===void 0&&E(this),m};let _;this.getAttributes=function(){return _===void 0&&E(this),_};let A=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return A===!1&&(A=n.getProgramParameter(C,Wf)),A},this.destroy=function(){i.releaseStatesOfProgram(this),n.deleteProgram(C),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Xf++,this.cacheKey=e,this.usedTimes=1,this.program=C,this.vertexShader=w,this.fragmentShader=q,this}let y0=0;class m0{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,n=this._getShaderStage(t),r=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(n)===!1&&(o.add(n),n.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new C0(e),t.set(e,i)),i}}class C0{constructor(e){this.id=y0++,this.code=e,this.usedTimes=0}}function z0(s){return s===ss||s===Yn||s===jn}function g0(s,e,t,i,n,r){const o=new E1,a=new m0,l=new Set,d=[],c=new Map,u=i.logarithmicDepthBuffer;let h=i.precision;const f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function S(m){return l.add(m),m===0?"uv":`uv${m}`}function C(m,_,A,T,R,B){const V=T.fog,P=R.geometry,D=m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial?T.environment:null,N=m.isMeshStandardMaterial||m.isMeshLambertMaterial&&!m.envMap||m.isMeshPhongMaterial&&!m.envMap,W=e.get(m.envMap||D,N),X=W&&W.mapping===er?W.image.height:null,te=f[m.type];m.precision!==null&&(h=i.getMaxPrecision(m.precision),h!==m.precision&&Pe("WebGLProgram.getParameters:",m.precision,"not supported, using",h,"instead."));const ne=P.morphAttributes.position||P.morphAttributes.normal||P.morphAttributes.color,de=ne!==void 0?ne.length:0;let Ae=0;P.morphAttributes.position!==void 0&&(Ae=1),P.morphAttributes.normal!==void 0&&(Ae=2),P.morphAttributes.color!==void 0&&(Ae=3);let Fe,Te,j,re;if(te){const Ne=hi[te];Fe=Ne.vertexShader,Te=Ne.fragmentShader}else Fe=m.vertexShader,Te=m.fragmentShader,a.update(m),j=a.getVertexShaderID(m),re=a.getFragmentShaderID(m);const Q=s.getRenderTarget(),pe=s.state.buffers.depth.getReversed(),ye=R.isInstancedMesh===!0,ve=R.isBatchedMesh===!0,Je=!!m.map,Le=!!m.matcap,Xe=!!W,Ye=!!m.aoMap,we=!!m.lightMap,ct=!!m.bumpMap,st=!!m.normalMap,Et=!!m.displacementMap,I=!!m.emissiveMap,ht=!!m.metalnessMap,Oe=!!m.roughnessMap,Qe=m.anisotropy>0,he=m.clearcoat>0,ot=m.dispersion>0,b=m.iridescence>0,z=m.sheen>0,O=m.transmission>0,Z=Qe&&!!m.anisotropyMap,$=he&&!!m.clearcoatMap,ie=he&&!!m.clearcoatNormalMap,le=he&&!!m.clearcoatRoughnessMap,Y=b&&!!m.iridescenceMap,J=b&&!!m.iridescenceThicknessMap,fe=z&&!!m.sheenColorMap,Ce=z&&!!m.sheenRoughnessMap,oe=!!m.specularMap,se=!!m.specularColorMap,Re=!!m.specularIntensityMap,De=O&&!!m.transmissionMap,Ve=O&&!!m.thicknessMap,L=!!m.gradientMap,ae=!!m.alphaMap,K=m.alphaTest>0,me=!!m.alphaHash,ce=!!m.extensions;let ee=xi;m.toneMapped&&(Q===null||Q.isXRRenderTarget===!0)&&(ee=s.toneMapping);const Me={shaderID:te,shaderType:m.type,shaderName:m.name,vertexShader:Fe,fragmentShader:Te,defines:m.defines,customVertexShaderID:j,customFragmentShaderID:re,isRawShaderMaterial:m.isRawShaderMaterial===!0,glslVersion:m.glslVersion,precision:h,batching:ve,batchingColor:ve&&R._colorsTexture!==null,instancing:ye,instancingColor:ye&&R.instanceColor!==null,instancingMorph:ye&&R.morphTexture!==null,outputColorSpace:Q===null?s.outputColorSpace:Q.isXRRenderTarget===!0?Q.texture.colorSpace:We.workingColorSpace,alphaToCoverage:!!m.alphaToCoverage,map:Je,matcap:Le,envMap:Xe,envMapMode:Xe&&W.mapping,envMapCubeUVHeight:X,aoMap:Ye,lightMap:we,bumpMap:ct,normalMap:st,displacementMap:Et,emissiveMap:I,normalMapObjectSpace:st&&m.normalMapType===V2,normalMapTangentSpace:st&&m.normalMapType===Zn,packedNormalMap:st&&m.normalMapType===Zn&&z0(m.normalMap.format),metalnessMap:ht,roughnessMap:Oe,anisotropy:Qe,anisotropyMap:Z,clearcoat:he,clearcoatMap:$,clearcoatNormalMap:ie,clearcoatRoughnessMap:le,dispersion:ot,iridescence:b,iridescenceMap:Y,iridescenceThicknessMap:J,sheen:z,sheenColorMap:fe,sheenRoughnessMap:Ce,specularMap:oe,specularColorMap:se,specularIntensityMap:Re,transmission:O,transmissionMap:De,thicknessMap:Ve,gradientMap:L,opaque:m.transparent===!1&&m.blending===bs&&m.alphaToCoverage===!1,alphaMap:ae,alphaTest:K,alphaHash:me,combine:m.combine,mapUv:Je&&S(m.map.channel),aoMapUv:Ye&&S(m.aoMap.channel),lightMapUv:we&&S(m.lightMap.channel),bumpMapUv:ct&&S(m.bumpMap.channel),normalMapUv:st&&S(m.normalMap.channel),displacementMapUv:Et&&S(m.displacementMap.channel),emissiveMapUv:I&&S(m.emissiveMap.channel),metalnessMapUv:ht&&S(m.metalnessMap.channel),roughnessMapUv:Oe&&S(m.roughnessMap.channel),anisotropyMapUv:Z&&S(m.anisotropyMap.channel),clearcoatMapUv:$&&S(m.clearcoatMap.channel),clearcoatNormalMapUv:ie&&S(m.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:le&&S(m.clearcoatRoughnessMap.channel),iridescenceMapUv:Y&&S(m.iridescenceMap.channel),iridescenceThicknessMapUv:J&&S(m.iridescenceThicknessMap.channel),sheenColorMapUv:fe&&S(m.sheenColorMap.channel),sheenRoughnessMapUv:Ce&&S(m.sheenRoughnessMap.channel),specularMapUv:oe&&S(m.specularMap.channel),specularColorMapUv:se&&S(m.specularColorMap.channel),specularIntensityMapUv:Re&&S(m.specularIntensityMap.channel),transmissionMapUv:De&&S(m.transmissionMap.channel),thicknessMapUv:Ve&&S(m.thicknessMap.channel),alphaMapUv:ae&&S(m.alphaMap.channel),vertexTangents:!!P.attributes.tangent&&(st||Qe),vertexNormals:!!P.attributes.normal,vertexColors:m.vertexColors,vertexAlphas:m.vertexColors===!0&&!!P.attributes.color&&P.attributes.color.itemSize===4,pointsUvs:R.isPoints===!0&&!!P.attributes.uv&&(Je||ae),fog:!!V,useFog:m.fog===!0,fogExp2:!!V&&V.isFogExp2,flatShading:m.wireframe===!1&&(m.flatShading===!0||P.attributes.normal===void 0&&st===!1&&(m.isMeshLambertMaterial||m.isMeshPhongMaterial||m.isMeshStandardMaterial||m.isMeshPhysicalMaterial)),sizeAttenuation:m.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:pe,skinning:R.isSkinnedMesh===!0,morphTargets:P.morphAttributes.position!==void 0,morphNormals:P.morphAttributes.normal!==void 0,morphColors:P.morphAttributes.color!==void 0,morphTargetsCount:de,morphTextureStride:Ae,numDirLights:_.directional.length,numPointLights:_.point.length,numSpotLights:_.spot.length,numSpotLightMaps:_.spotLightMap.length,numRectAreaLights:_.rectArea.length,numHemiLights:_.hemi.length,numDirLightShadows:_.directionalShadowMap.length,numPointLightShadows:_.pointShadowMap.length,numSpotLightShadows:_.spotShadowMap.length,numSpotLightShadowsWithMaps:_.numSpotLightShadowsWithMaps,numLightProbes:_.numLightProbes,numLightProbeGrids:B.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:m.dithering,shadowMapEnabled:s.shadowMap.enabled&&A.length>0,shadowMapType:s.shadowMap.type,toneMapping:ee,decodeVideoTexture:Je&&m.map.isVideoTexture===!0&&We.getTransfer(m.map.colorSpace)===$e,decodeVideoTextureEmissive:I&&m.emissiveMap.isVideoTexture===!0&&We.getTransfer(m.emissiveMap.colorSpace)===$e,premultipliedAlpha:m.premultipliedAlpha,doubleSided:m.side===Vt,flipSided:m.side===Ft,useDepthPacking:m.depthPacking>=0,depthPacking:m.depthPacking||0,index0AttributeName:m.index0AttributeName,extensionClipCullDistance:ce&&m.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ce&&m.extensions.multiDraw===!0||ve)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:m.customProgramCacheKey()};return Me.vertexUv1s=l.has(1),Me.vertexUv2s=l.has(2),Me.vertexUv3s=l.has(3),l.clear(),Me}function p(m){const _=[];if(m.shaderID?_.push(m.shaderID):(_.push(m.customVertexShaderID),_.push(m.customFragmentShaderID)),m.defines!==void 0)for(const A in m.defines)_.push(A),_.push(m.defines[A]);return m.isRawShaderMaterial===!1&&(x(_,m),y(_,m),_.push(s.outputColorSpace)),_.push(m.customProgramCacheKey),_.join()}function x(m,_){m.push(_.precision),m.push(_.outputColorSpace),m.push(_.envMapMode),m.push(_.envMapCubeUVHeight),m.push(_.mapUv),m.push(_.alphaMapUv),m.push(_.lightMapUv),m.push(_.aoMapUv),m.push(_.bumpMapUv),m.push(_.normalMapUv),m.push(_.displacementMapUv),m.push(_.emissiveMapUv),m.push(_.metalnessMapUv),m.push(_.roughnessMapUv),m.push(_.anisotropyMapUv),m.push(_.clearcoatMapUv),m.push(_.clearcoatNormalMapUv),m.push(_.clearcoatRoughnessMapUv),m.push(_.iridescenceMapUv),m.push(_.iridescenceThicknessMapUv),m.push(_.sheenColorMapUv),m.push(_.sheenRoughnessMapUv),m.push(_.specularMapUv),m.push(_.specularColorMapUv),m.push(_.specularIntensityMapUv),m.push(_.transmissionMapUv),m.push(_.thicknessMapUv),m.push(_.combine),m.push(_.fogExp2),m.push(_.sizeAttenuation),m.push(_.morphTargetsCount),m.push(_.morphAttributeCount),m.push(_.numDirLights),m.push(_.numPointLights),m.push(_.numSpotLights),m.push(_.numSpotLightMaps),m.push(_.numHemiLights),m.push(_.numRectAreaLights),m.push(_.numDirLightShadows),m.push(_.numPointLightShadows),m.push(_.numSpotLightShadows),m.push(_.numSpotLightShadowsWithMaps),m.push(_.numLightProbes),m.push(_.shadowMapType),m.push(_.toneMapping),m.push(_.numClippingPlanes),m.push(_.numClipIntersection),m.push(_.depthPacking)}function y(m,_){o.disableAll(),_.instancing&&o.enable(0),_.instancingColor&&o.enable(1),_.instancingMorph&&o.enable(2),_.matcap&&o.enable(3),_.envMap&&o.enable(4),_.normalMapObjectSpace&&o.enable(5),_.normalMapTangentSpace&&o.enable(6),_.clearcoat&&o.enable(7),_.iridescence&&o.enable(8),_.alphaTest&&o.enable(9),_.vertexColors&&o.enable(10),_.vertexAlphas&&o.enable(11),_.vertexUv1s&&o.enable(12),_.vertexUv2s&&o.enable(13),_.vertexUv3s&&o.enable(14),_.vertexTangents&&o.enable(15),_.anisotropy&&o.enable(16),_.alphaHash&&o.enable(17),_.batching&&o.enable(18),_.dispersion&&o.enable(19),_.batchingColor&&o.enable(20),_.gradientMap&&o.enable(21),_.packedNormalMap&&o.enable(22),_.vertexNormals&&o.enable(23),m.push(o.mask),o.disableAll(),_.fog&&o.enable(0),_.useFog&&o.enable(1),_.flatShading&&o.enable(2),_.logarithmicDepthBuffer&&o.enable(3),_.reversedDepthBuffer&&o.enable(4),_.skinning&&o.enable(5),_.morphTargets&&o.enable(6),_.morphNormals&&o.enable(7),_.morphColors&&o.enable(8),_.premultipliedAlpha&&o.enable(9),_.shadowMapEnabled&&o.enable(10),_.doubleSided&&o.enable(11),_.flipSided&&o.enable(12),_.useDepthPacking&&o.enable(13),_.dithering&&o.enable(14),_.transmission&&o.enable(15),_.sheen&&o.enable(16),_.opaque&&o.enable(17),_.pointsUvs&&o.enable(18),_.decodeVideoTexture&&o.enable(19),_.decodeVideoTextureEmissive&&o.enable(20),_.alphaToCoverage&&o.enable(21),_.numLightProbeGrids>0&&o.enable(22),m.push(o.mask)}function g(m){const _=f[m.type];let A;if(_){const T=hi[_];A=Yt.clone(T.uniforms)}else A=m.uniforms;return A}function M(m,_){let A=c.get(_);return A!==void 0?++A.usedTimes:(A=new S0(s,_,m,n),d.push(A),c.set(_,A)),A}function w(m){if(--m.usedTimes===0){const _=d.indexOf(m);d[_]=d[d.length-1],d.pop(),c.delete(m.cacheKey),m.destroy()}}function q(m){a.remove(m)}function E(){a.dispose()}return{getParameters:C,getProgramCacheKey:p,getUniforms:g,acquireProgram:M,releaseProgram:w,releaseShaderCache:q,programs:d,dispose:E}}function q0(){let s=new WeakMap;function e(o){return s.has(o)}function t(o){let a=s.get(o);return a===void 0&&(a={},s.set(o,a)),a}function i(o){s.delete(o)}function n(o,a,l){s.get(o)[a]=l}function r(){s=new WeakMap}return{has:e,get:t,remove:i,update:n,dispose:r}}function _0(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.materialVariant!==e.materialVariant?s.materialVariant-e.materialVariant:s.z!==e.z?s.z-e.z:s.id-e.id}function Vd(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function kd(){const s=[];let e=0;const t=[],i=[],n=[];function r(){e=0,t.length=0,i.length=0,n.length=0}function o(h){let f=0;return h.isInstancedMesh&&(f+=2),h.isSkinnedMesh&&(f+=1),f}function a(h,f,S,C,p,x){let y=s[e];return y===void 0?(y={id:h.id,object:h,geometry:f,material:S,materialVariant:o(h),groupOrder:C,renderOrder:h.renderOrder,z:p,group:x},s[e]=y):(y.id=h.id,y.object=h,y.geometry=f,y.material=S,y.materialVariant=o(h),y.groupOrder=C,y.renderOrder=h.renderOrder,y.z=p,y.group=x),e++,y}function l(h,f,S,C,p,x){const y=a(h,f,S,C,p,x);S.transmission>0?i.push(y):S.transparent===!0?n.push(y):t.push(y)}function d(h,f,S,C,p,x){const y=a(h,f,S,C,p,x);S.transmission>0?i.unshift(y):S.transparent===!0?n.unshift(y):t.unshift(y)}function c(h,f){t.length>1&&t.sort(h||_0),i.length>1&&i.sort(f||Vd),n.length>1&&n.sort(f||Vd)}function u(){for(let h=e,f=s.length;h<f;h++){const S=s[h];if(S.id===null)break;S.id=null,S.object=null,S.geometry=null,S.material=null,S.group=null}}return{opaque:t,transmissive:i,transparent:n,init:r,push:l,unshift:d,finish:u,sort:c}}function v0(){let s=new WeakMap;function e(i,n){const r=s.get(i);let o;return r===void 0?(o=new kd,s.set(i,[o])):n>=r.length?(o=new kd,r.push(o)):o=r[n],o}function t(){s=new WeakMap}return{get:e,dispose:t}}function M0(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new U,color:new Ge};break;case"SpotLight":t={position:new U,direction:new U,color:new Ge,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new U,color:new Ge,distance:0,decay:0};break;case"HemisphereLight":t={direction:new U,skyColor:new Ge,groundColor:new Ge};break;case"RectAreaLight":t={color:new Ge,position:new U,halfWidth:new U,halfHeight:new U};break}return s[e.id]=t,t}}}function b0(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new _e};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new _e};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new _e,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let E0=0;function T0(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function A0(s){const e=new M0,t=b0(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let d=0;d<9;d++)i.probe.push(new U);const n=new U,r=new dt,o=new dt;function a(d){let c=0,u=0,h=0;for(let _=0;_<9;_++)i.probe[_].set(0,0,0);let f=0,S=0,C=0,p=0,x=0,y=0,g=0,M=0,w=0,q=0,E=0;d.sort(T0);for(let _=0,A=d.length;_<A;_++){const T=d[_],R=T.color,B=T.intensity,V=T.distance;let P=null;if(T.shadow&&T.shadow.map&&(T.shadow.map.texture.format===ss?P=T.shadow.map.texture:P=T.shadow.map.depthTexture||T.shadow.map.texture),T.isAmbientLight)c+=R.r*B,u+=R.g*B,h+=R.b*B;else if(T.isLightProbe){for(let D=0;D<9;D++)i.probe[D].addScaledVector(T.sh.coefficients[D],B);E++}else if(T.isDirectionalLight){const D=e.get(T);if(D.color.copy(T.color).multiplyScalar(T.intensity),T.castShadow){const N=T.shadow,W=t.get(T);W.shadowIntensity=N.intensity,W.shadowBias=N.bias,W.shadowNormalBias=N.normalBias,W.shadowRadius=N.radius,W.shadowMapSize=N.mapSize,i.directionalShadow[f]=W,i.directionalShadowMap[f]=P,i.directionalShadowMatrix[f]=T.shadow.matrix,y++}i.directional[f]=D,f++}else if(T.isSpotLight){const D=e.get(T);D.position.setFromMatrixPosition(T.matrixWorld),D.color.copy(R).multiplyScalar(B),D.distance=V,D.coneCos=Math.cos(T.angle),D.penumbraCos=Math.cos(T.angle*(1-T.penumbra)),D.decay=T.decay,i.spot[C]=D;const N=T.shadow;if(T.map&&(i.spotLightMap[w]=T.map,w++,N.updateMatrices(T),T.castShadow&&q++),i.spotLightMatrix[C]=N.matrix,T.castShadow){const W=t.get(T);W.shadowIntensity=N.intensity,W.shadowBias=N.bias,W.shadowNormalBias=N.normalBias,W.shadowRadius=N.radius,W.shadowMapSize=N.mapSize,i.spotShadow[C]=W,i.spotShadowMap[C]=P,M++}C++}else if(T.isRectAreaLight){const D=e.get(T);D.color.copy(R).multiplyScalar(B),D.halfWidth.set(T.width*.5,0,0),D.halfHeight.set(0,T.height*.5,0),i.rectArea[p]=D,p++}else if(T.isPointLight){const D=e.get(T);if(D.color.copy(T.color).multiplyScalar(T.intensity),D.distance=T.distance,D.decay=T.decay,T.castShadow){const N=T.shadow,W=t.get(T);W.shadowIntensity=N.intensity,W.shadowBias=N.bias,W.shadowNormalBias=N.normalBias,W.shadowRadius=N.radius,W.shadowMapSize=N.mapSize,W.shadowCameraNear=N.camera.near,W.shadowCameraFar=N.camera.far,i.pointShadow[S]=W,i.pointShadowMap[S]=P,i.pointShadowMatrix[S]=T.shadow.matrix,g++}i.point[S]=D,S++}else if(T.isHemisphereLight){const D=e.get(T);D.skyColor.copy(T.color).multiplyScalar(B),D.groundColor.copy(T.groundColor).multiplyScalar(B),i.hemi[x]=D,x++}}p>0&&(s.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ue.LTC_FLOAT_1,i.rectAreaLTC2=ue.LTC_FLOAT_2):(i.rectAreaLTC1=ue.LTC_HALF_1,i.rectAreaLTC2=ue.LTC_HALF_2)),i.ambient[0]=c,i.ambient[1]=u,i.ambient[2]=h;const m=i.hash;(m.directionalLength!==f||m.pointLength!==S||m.spotLength!==C||m.rectAreaLength!==p||m.hemiLength!==x||m.numDirectionalShadows!==y||m.numPointShadows!==g||m.numSpotShadows!==M||m.numSpotMaps!==w||m.numLightProbes!==E)&&(i.directional.length=f,i.spot.length=C,i.rectArea.length=p,i.point.length=S,i.hemi.length=x,i.directionalShadow.length=y,i.directionalShadowMap.length=y,i.pointShadow.length=g,i.pointShadowMap.length=g,i.spotShadow.length=M,i.spotShadowMap.length=M,i.directionalShadowMatrix.length=y,i.pointShadowMatrix.length=g,i.spotLightMatrix.length=M+w-q,i.spotLightMap.length=w,i.numSpotLightShadowsWithMaps=q,i.numLightProbes=E,m.directionalLength=f,m.pointLength=S,m.spotLength=C,m.rectAreaLength=p,m.hemiLength=x,m.numDirectionalShadows=y,m.numPointShadows=g,m.numSpotShadows=M,m.numSpotMaps=w,m.numLightProbes=E,i.version=E0++)}function l(d,c){let u=0,h=0,f=0,S=0,C=0;const p=c.matrixWorldInverse;for(let x=0,y=d.length;x<y;x++){const g=d[x];if(g.isDirectionalLight){const M=i.directional[u];M.direction.setFromMatrixPosition(g.matrixWorld),n.setFromMatrixPosition(g.target.matrixWorld),M.direction.sub(n),M.direction.transformDirection(p),u++}else if(g.isSpotLight){const M=i.spot[f];M.position.setFromMatrixPosition(g.matrixWorld),M.position.applyMatrix4(p),M.direction.setFromMatrixPosition(g.matrixWorld),n.setFromMatrixPosition(g.target.matrixWorld),M.direction.sub(n),M.direction.transformDirection(p),f++}else if(g.isRectAreaLight){const M=i.rectArea[S];M.position.setFromMatrixPosition(g.matrixWorld),M.position.applyMatrix4(p),o.identity(),r.copy(g.matrixWorld),r.premultiply(p),o.extractRotation(r),M.halfWidth.set(g.width*.5,0,0),M.halfHeight.set(0,g.height*.5,0),M.halfWidth.applyMatrix4(o),M.halfHeight.applyMatrix4(o),S++}else if(g.isPointLight){const M=i.point[h];M.position.setFromMatrixPosition(g.matrixWorld),M.position.applyMatrix4(p),h++}else if(g.isHemisphereLight){const M=i.hemi[C];M.direction.setFromMatrixPosition(g.matrixWorld),M.direction.transformDirection(p),C++}}}return{setup:a,setupView:l,state:i}}function Wd(s){const e=new A0(s),t=[],i=[],n=[];function r(h){u.camera=h,t.length=0,i.length=0,n.length=0}function o(h){t.push(h)}function a(h){i.push(h)}function l(h){n.push(h)}function d(){e.setup(t)}function c(h){e.setupView(t,h)}const u={lightsArray:t,shadowsArray:i,lightProbeGridArray:n,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:u,setupLights:d,setupLightsView:c,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function w0(s){let e=new WeakMap;function t(n,r=0){const o=e.get(n);let a;return o===void 0?(a=new Wd(s),e.set(n,[a])):r>=o.length?(a=new Wd(s),o.push(a)):a=o[r],a}function i(){e=new WeakMap}return{get:t,dispose:i}}const R0=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,P0=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,D0=[new U(1,0,0),new U(-1,0,0),new U(0,1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1)],L0=[new U(0,-1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1),new U(0,-1,0),new U(0,-1,0)],Xd=new dt,Vs=new U,Vr=new U;function I0(s,e,t){let i=new ma;const n=new _e,r=new _e,o=new pt,a=new U1,l=new Vc,d={},c=t.maxTextureSize,u={[Hi]:Ft,[Ft]:Hi,[Vt]:Vt},h=new lt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new _e},radius:{value:4}},vertexShader:R0,fragmentShader:P0}),f=h.clone();f.defines.HORIZONTAL_PASS=1;const S=new oi;S.setAttribute("position",new ni(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const C=new Zt(S,h),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Un;let x=this.type;this.render=function(q,E,m){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||q.length===0)return;this.type===_2&&(Pe("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Un);const _=s.getRenderTarget(),A=s.getActiveCubeFace(),T=s.getActiveMipmapLevel(),R=s.state;R.setBlending(gt),R.buffers.depth.getReversed()===!0?R.buffers.color.setClear(0,0,0,0):R.buffers.color.setClear(1,1,1,1),R.buffers.depth.setTest(!0),R.setScissorTest(!1);const B=x!==this.type;B&&E.traverse(function(V){V.material&&(Array.isArray(V.material)?V.material.forEach(P=>P.needsUpdate=!0):V.material.needsUpdate=!0)});for(let V=0,P=q.length;V<P;V++){const D=q[V],N=D.shadow;if(N===void 0){Pe("WebGLShadowMap:",D,"has no shadow.");continue}if(N.autoUpdate===!1&&N.needsUpdate===!1)continue;n.copy(N.mapSize);const W=N.getFrameExtents();n.multiply(W),r.copy(N.mapSize),(n.x>c||n.y>c)&&(n.x>c&&(r.x=Math.floor(c/W.x),n.x=r.x*W.x,N.mapSize.x=r.x),n.y>c&&(r.y=Math.floor(c/W.y),n.y=r.y*W.y,N.mapSize.y=r.y));const X=s.state.buffers.depth.getReversed();if(N.camera._reversedDepth=X,N.map===null||B===!0){if(N.map!==null&&(N.map.depthTexture!==null&&(N.map.depthTexture.dispose(),N.map.depthTexture=null),N.map.dispose()),this.type===ks){if(D.isPointLight){Pe("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}N.map=new xt(n.x,n.y,{format:ss,type:qt,minFilter:Tt,magFilter:Tt,generateMipmaps:!1}),N.map.texture.name=D.name+".shadowMap",N.map.depthTexture=new ns(n.x,n.y,ui),N.map.depthTexture.name=D.name+".shadowMapDepth",N.map.depthTexture.format=Mi,N.map.depthTexture.compareFunction=null,N.map.depthTexture.minFilter=Ct,N.map.depthTexture.magFilter=Ct}else D.isPointLight?(N.map=new G1(n.x),N.map.depthTexture=new Fc(n.x,pi)):(N.map=new xt(n.x,n.y),N.map.depthTexture=new ns(n.x,n.y,pi)),N.map.depthTexture.name=D.name+".shadowMap",N.map.depthTexture.format=Mi,this.type===Un?(N.map.depthTexture.compareFunction=X?fa:ua,N.map.depthTexture.minFilter=Tt,N.map.depthTexture.magFilter=Tt):(N.map.depthTexture.compareFunction=null,N.map.depthTexture.minFilter=Ct,N.map.depthTexture.magFilter=Ct);N.camera.updateProjectionMatrix()}const te=N.map.isWebGLCubeRenderTarget?6:1;for(let ne=0;ne<te;ne++){if(N.map.isWebGLCubeRenderTarget)s.setRenderTarget(N.map,ne),s.clear();else{ne===0&&(s.setRenderTarget(N.map),s.clear());const de=N.getViewport(ne);o.set(r.x*de.x,r.y*de.y,r.x*de.z,r.y*de.w),R.viewport(o)}if(D.isPointLight){const de=N.camera,Ae=N.matrix,Fe=D.distance||de.far;Fe!==de.far&&(de.far=Fe,de.updateProjectionMatrix()),Vs.setFromMatrixPosition(D.matrixWorld),de.position.copy(Vs),Vr.copy(de.position),Vr.add(D0[ne]),de.up.copy(L0[ne]),de.lookAt(Vr),de.updateMatrixWorld(),Ae.makeTranslation(-Vs.x,-Vs.y,-Vs.z),Xd.multiplyMatrices(de.projectionMatrix,de.matrixWorldInverse),N._frustum.setFromProjectionMatrix(Xd,de.coordinateSystem,de.reversedDepth)}else N.updateMatrices(D);i=N.getFrustum(),M(E,m,N.camera,D,this.type)}N.isPointLightShadow!==!0&&this.type===ks&&y(N,m),N.needsUpdate=!1}x=this.type,p.needsUpdate=!1,s.setRenderTarget(_,A,T)};function y(q,E){const m=e.update(C);h.defines.VSM_SAMPLES!==q.blurSamples&&(h.defines.VSM_SAMPLES=q.blurSamples,f.defines.VSM_SAMPLES=q.blurSamples,h.needsUpdate=!0,f.needsUpdate=!0),q.mapPass===null&&(q.mapPass=new xt(n.x,n.y,{format:ss,type:qt})),h.uniforms.shadow_pass.value=q.map.depthTexture,h.uniforms.resolution.value=q.mapSize,h.uniforms.radius.value=q.radius,s.setRenderTarget(q.mapPass),s.clear(),s.renderBufferDirect(E,null,m,h,C,null),f.uniforms.shadow_pass.value=q.mapPass.texture,f.uniforms.resolution.value=q.mapSize,f.uniforms.radius.value=q.radius,s.setRenderTarget(q.map),s.clear(),s.renderBufferDirect(E,null,m,f,C,null)}function g(q,E,m,_){let A=null;const T=m.isPointLight===!0?q.customDistanceMaterial:q.customDepthMaterial;if(T!==void 0)A=T;else if(A=m.isPointLight===!0?l:a,s.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0||E.alphaToCoverage===!0){const R=A.uuid,B=E.uuid;let V=d[R];V===void 0&&(V={},d[R]=V);let P=V[B];P===void 0&&(P=A.clone(),V[B]=P,E.addEventListener("dispose",w)),A=P}if(A.visible=E.visible,A.wireframe=E.wireframe,_===ks?A.side=E.shadowSide!==null?E.shadowSide:E.side:A.side=E.shadowSide!==null?E.shadowSide:u[E.side],A.alphaMap=E.alphaMap,A.alphaTest=E.alphaToCoverage===!0?.5:E.alphaTest,A.map=E.map,A.clipShadows=E.clipShadows,A.clippingPlanes=E.clippingPlanes,A.clipIntersection=E.clipIntersection,A.displacementMap=E.displacementMap,A.displacementScale=E.displacementScale,A.displacementBias=E.displacementBias,A.wireframeLinewidth=E.wireframeLinewidth,A.linewidth=E.linewidth,m.isPointLight===!0&&A.isMeshDistanceMaterial===!0){const R=s.properties.get(A);R.light=m}return A}function M(q,E,m,_,A){if(q.visible===!1)return;if(q.layers.test(E.layers)&&(q.isMesh||q.isLine||q.isPoints)&&(q.castShadow||q.receiveShadow&&A===ks)&&(!q.frustumCulled||i.intersectsObject(q))){q.modelViewMatrix.multiplyMatrices(m.matrixWorldInverse,q.matrixWorld);const B=e.update(q),V=q.material;if(Array.isArray(V)){const P=B.groups;for(let D=0,N=P.length;D<N;D++){const W=P[D],X=V[W.materialIndex];if(X&&X.visible){const te=g(q,X,_,A);q.onBeforeShadow(s,q,E,m,B,te,W),s.renderBufferDirect(m,null,B,te,q,W),q.onAfterShadow(s,q,E,m,B,te,W)}}}else if(V.visible){const P=g(q,V,_,A);q.onBeforeShadow(s,q,E,m,B,P,null),s.renderBufferDirect(m,null,B,P,q,null),q.onAfterShadow(s,q,E,m,B,P,null)}}const R=q.children;for(let B=0,V=R.length;B<V;B++)M(R[B],E,m,_,A)}function w(q){q.target.removeEventListener("dispose",w);for(const m in d){const _=d[m],A=q.target.uuid;A in _&&(_[A].dispose(),delete _[A])}}}function N0(s,e){function t(){let L=!1;const ae=new pt;let K=null;const me=new pt(0,0,0,0);return{setMask:function(ce){K!==ce&&!L&&(s.colorMask(ce,ce,ce,ce),K=ce)},setLocked:function(ce){L=ce},setClear:function(ce,ee,Me,Ne,St){St===!0&&(ce*=Ne,ee*=Ne,Me*=Ne),ae.set(ce,ee,Me,Ne),me.equals(ae)===!1&&(s.clearColor(ce,ee,Me,Ne),me.copy(ae))},reset:function(){L=!1,K=null,me.set(-1,0,0,0)}}}function i(){let L=!1,ae=!1,K=null,me=null,ce=null;return{setReversed:function(ee){if(ae!==ee){const Me=e.get("EXT_clip_control");ee?Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.ZERO_TO_ONE_EXT):Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.NEGATIVE_ONE_TO_ONE_EXT),ae=ee;const Ne=ce;ce=null,this.setClear(Ne)}},getReversed:function(){return ae},setTest:function(ee){ee?Q(s.DEPTH_TEST):pe(s.DEPTH_TEST)},setMask:function(ee){K!==ee&&!L&&(s.depthMask(ee),K=ee)},setFunc:function(ee){if(ae&&(ee=$2[ee]),me!==ee){switch(ee){case oo:s.depthFunc(s.NEVER);break;case ao:s.depthFunc(s.ALWAYS);break;case lo:s.depthFunc(s.LESS);break;case Ts:s.depthFunc(s.LEQUAL);break;case co:s.depthFunc(s.EQUAL);break;case ho:s.depthFunc(s.GEQUAL);break;case uo:s.depthFunc(s.GREATER);break;case fo:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}me=ee}},setLocked:function(ee){L=ee},setClear:function(ee){ce!==ee&&(ce=ee,ae&&(ee=1-ee),s.clearDepth(ee))},reset:function(){L=!1,K=null,me=null,ce=null,ae=!1}}}function n(){let L=!1,ae=null,K=null,me=null,ce=null,ee=null,Me=null,Ne=null,St=null;return{setTest:function(et){L||(et?Q(s.STENCIL_TEST):pe(s.STENCIL_TEST))},setMask:function(et){ae!==et&&!L&&(s.stencilMask(et),ae=et)},setFunc:function(et,Si,ai){(K!==et||me!==Si||ce!==ai)&&(s.stencilFunc(et,Si,ai),K=et,me=Si,ce=ai)},setOp:function(et,Si,ai){(ee!==et||Me!==Si||Ne!==ai)&&(s.stencilOp(et,Si,ai),ee=et,Me=Si,Ne=ai)},setLocked:function(et){L=et},setClear:function(et){St!==et&&(s.clearStencil(et),St=et)},reset:function(){L=!1,ae=null,K=null,me=null,ce=null,ee=null,Me=null,Ne=null,St=null}}}const r=new t,o=new i,a=new n,l=new WeakMap,d=new WeakMap;let c={},u={},h={},f=new WeakMap,S=[],C=null,p=!1,x=null,y=null,g=null,M=null,w=null,q=null,E=null,m=new Ge(0,0,0),_=0,A=!1,T=null,R=null,B=null,V=null,P=null;const D=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let N=!1,W=0;const X=s.getParameter(s.VERSION);X.indexOf("WebGL")!==-1?(W=parseFloat(/^WebGL (\d)/.exec(X)[1]),N=W>=1):X.indexOf("OpenGL ES")!==-1&&(W=parseFloat(/^OpenGL ES (\d)/.exec(X)[1]),N=W>=2);let te=null,ne={};const de=s.getParameter(s.SCISSOR_BOX),Ae=s.getParameter(s.VIEWPORT),Fe=new pt().fromArray(de),Te=new pt().fromArray(Ae);function j(L,ae,K,me){const ce=new Uint8Array(4),ee=s.createTexture();s.bindTexture(L,ee),s.texParameteri(L,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(L,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Me=0;Me<K;Me++)L===s.TEXTURE_3D||L===s.TEXTURE_2D_ARRAY?s.texImage3D(ae,0,s.RGBA,1,1,me,0,s.RGBA,s.UNSIGNED_BYTE,ce):s.texImage2D(ae+Me,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,ce);return ee}const re={};re[s.TEXTURE_2D]=j(s.TEXTURE_2D,s.TEXTURE_2D,1),re[s.TEXTURE_CUBE_MAP]=j(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),re[s.TEXTURE_2D_ARRAY]=j(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),re[s.TEXTURE_3D]=j(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),Q(s.DEPTH_TEST),o.setFunc(Ts),ct(!1),st(Wa),Q(s.CULL_FACE),Ye(gt);function Q(L){c[L]!==!0&&(s.enable(L),c[L]=!0)}function pe(L){c[L]!==!1&&(s.disable(L),c[L]=!1)}function ye(L,ae){return h[L]!==ae?(s.bindFramebuffer(L,ae),h[L]=ae,L===s.DRAW_FRAMEBUFFER&&(h[s.FRAMEBUFFER]=ae),L===s.FRAMEBUFFER&&(h[s.DRAW_FRAMEBUFFER]=ae),!0):!1}function ve(L,ae){let K=S,me=!1;if(L){K=f.get(ae),K===void 0&&(K=[],f.set(ae,K));const ce=L.textures;if(K.length!==ce.length||K[0]!==s.COLOR_ATTACHMENT0){for(let ee=0,Me=ce.length;ee<Me;ee++)K[ee]=s.COLOR_ATTACHMENT0+ee;K.length=ce.length,me=!0}}else K[0]!==s.BACK&&(K[0]=s.BACK,me=!0);me&&s.drawBuffers(K)}function Je(L){return C!==L?(s.useProgram(L),C=L,!0):!1}const Le={[ti]:s.FUNC_ADD,[v2]:s.FUNC_SUBTRACT,[M2]:s.FUNC_REVERSE_SUBTRACT};Le[b2]=s.MIN,Le[E2]=s.MAX;const Xe={[Ws]:s.ZERO,[T2]:s.ONE,[A2]:s.SRC_COLOR,[io]:s.SRC_ALPHA,[D2]:s.SRC_ALPHA_SATURATE,[ro]:s.DST_COLOR,[no]:s.DST_ALPHA,[w2]:s.ONE_MINUS_SRC_COLOR,[so]:s.ONE_MINUS_SRC_ALPHA,[P2]:s.ONE_MINUS_DST_COLOR,[R2]:s.ONE_MINUS_DST_ALPHA,[L2]:s.CONSTANT_COLOR,[I2]:s.ONE_MINUS_CONSTANT_COLOR,[N2]:s.CONSTANT_ALPHA,[U2]:s.ONE_MINUS_CONSTANT_ALPHA};function Ye(L,ae,K,me,ce,ee,Me,Ne,St,et){if(L===gt){p===!0&&(pe(s.BLEND),p=!1);return}if(p===!1&&(Q(s.BLEND),p=!0),L!==p1){if(L!==x||et!==A){if((y!==ti||w!==ti)&&(s.blendEquation(s.FUNC_ADD),y=ti,w=ti),et)switch(L){case bs:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case to:s.blendFunc(s.ONE,s.ONE);break;case Xa:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Ya:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:Ze("WebGLState: Invalid blending: ",L);break}else switch(L){case bs:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case to:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case Xa:Ze("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Ya:Ze("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Ze("WebGLState: Invalid blending: ",L);break}g=null,M=null,q=null,E=null,m.set(0,0,0),_=0,x=L,A=et}return}ce=ce||ae,ee=ee||K,Me=Me||me,(ae!==y||ce!==w)&&(s.blendEquationSeparate(Le[ae],Le[ce]),y=ae,w=ce),(K!==g||me!==M||ee!==q||Me!==E)&&(s.blendFuncSeparate(Xe[K],Xe[me],Xe[ee],Xe[Me]),g=K,M=me,q=ee,E=Me),(Ne.equals(m)===!1||St!==_)&&(s.blendColor(Ne.r,Ne.g,Ne.b,St),m.copy(Ne),_=St),x=L,A=!1}function we(L,ae){L.side===Vt?pe(s.CULL_FACE):Q(s.CULL_FACE);let K=L.side===Ft;ae&&(K=!K),ct(K),L.blending===bs&&L.transparent===!1?Ye(gt):Ye(L.blending,L.blendEquation,L.blendSrc,L.blendDst,L.blendEquationAlpha,L.blendSrcAlpha,L.blendDstAlpha,L.blendColor,L.blendAlpha,L.premultipliedAlpha),o.setFunc(L.depthFunc),o.setTest(L.depthTest),o.setMask(L.depthWrite),r.setMask(L.colorWrite);const me=L.stencilWrite;a.setTest(me),me&&(a.setMask(L.stencilWriteMask),a.setFunc(L.stencilFunc,L.stencilRef,L.stencilFuncMask),a.setOp(L.stencilFail,L.stencilZFail,L.stencilZPass)),I(L.polygonOffset,L.polygonOffsetFactor,L.polygonOffsetUnits),L.alphaToCoverage===!0?Q(s.SAMPLE_ALPHA_TO_COVERAGE):pe(s.SAMPLE_ALPHA_TO_COVERAGE)}function ct(L){T!==L&&(L?s.frontFace(s.CW):s.frontFace(s.CCW),T=L)}function st(L){L!==g2?(Q(s.CULL_FACE),L!==R&&(L===Wa?s.cullFace(s.BACK):L===q2?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):pe(s.CULL_FACE),R=L}function Et(L){L!==B&&(N&&s.lineWidth(L),B=L)}function I(L,ae,K){L?(Q(s.POLYGON_OFFSET_FILL),(V!==ae||P!==K)&&(V=ae,P=K,o.getReversed()&&(ae=-ae),s.polygonOffset(ae,K))):pe(s.POLYGON_OFFSET_FILL)}function ht(L){L?Q(s.SCISSOR_TEST):pe(s.SCISSOR_TEST)}function Oe(L){L===void 0&&(L=s.TEXTURE0+D-1),te!==L&&(s.activeTexture(L),te=L)}function Qe(L,ae,K){K===void 0&&(te===null?K=s.TEXTURE0+D-1:K=te);let me=ne[K];me===void 0&&(me={type:void 0,texture:void 0},ne[K]=me),(me.type!==L||me.texture!==ae)&&(te!==K&&(s.activeTexture(K),te=K),s.bindTexture(L,ae||re[L]),me.type=L,me.texture=ae)}function he(){const L=ne[te];L!==void 0&&L.type!==void 0&&(s.bindTexture(L.type,null),L.type=void 0,L.texture=void 0)}function ot(){try{s.compressedTexImage2D(...arguments)}catch(L){Ze("WebGLState:",L)}}function b(){try{s.compressedTexImage3D(...arguments)}catch(L){Ze("WebGLState:",L)}}function z(){try{s.texSubImage2D(...arguments)}catch(L){Ze("WebGLState:",L)}}function O(){try{s.texSubImage3D(...arguments)}catch(L){Ze("WebGLState:",L)}}function Z(){try{s.compressedTexSubImage2D(...arguments)}catch(L){Ze("WebGLState:",L)}}function $(){try{s.compressedTexSubImage3D(...arguments)}catch(L){Ze("WebGLState:",L)}}function ie(){try{s.texStorage2D(...arguments)}catch(L){Ze("WebGLState:",L)}}function le(){try{s.texStorage3D(...arguments)}catch(L){Ze("WebGLState:",L)}}function Y(){try{s.texImage2D(...arguments)}catch(L){Ze("WebGLState:",L)}}function J(){try{s.texImage3D(...arguments)}catch(L){Ze("WebGLState:",L)}}function fe(L){return u[L]!==void 0?u[L]:s.getParameter(L)}function Ce(L,ae){u[L]!==ae&&(s.pixelStorei(L,ae),u[L]=ae)}function oe(L){Fe.equals(L)===!1&&(s.scissor(L.x,L.y,L.z,L.w),Fe.copy(L))}function se(L){Te.equals(L)===!1&&(s.viewport(L.x,L.y,L.z,L.w),Te.copy(L))}function Re(L,ae){let K=d.get(ae);K===void 0&&(K=new WeakMap,d.set(ae,K));let me=K.get(L);me===void 0&&(me=s.getUniformBlockIndex(ae,L.name),K.set(L,me))}function De(L,ae){const me=d.get(ae).get(L);l.get(ae)!==me&&(s.uniformBlockBinding(ae,me,L.__bindingPointIndex),l.set(ae,me))}function Ve(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),o.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),s.pixelStorei(s.PACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,!1),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,s.BROWSER_DEFAULT_WEBGL),s.pixelStorei(s.PACK_ROW_LENGTH,0),s.pixelStorei(s.PACK_SKIP_PIXELS,0),s.pixelStorei(s.PACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_ROW_LENGTH,0),s.pixelStorei(s.UNPACK_IMAGE_HEIGHT,0),s.pixelStorei(s.UNPACK_SKIP_PIXELS,0),s.pixelStorei(s.UNPACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_SKIP_IMAGES,0),c={},u={},te=null,ne={},h={},f=new WeakMap,S=[],C=null,p=!1,x=null,y=null,g=null,M=null,w=null,q=null,E=null,m=new Ge(0,0,0),_=0,A=!1,T=null,R=null,B=null,V=null,P=null,Fe.set(0,0,s.canvas.width,s.canvas.height),Te.set(0,0,s.canvas.width,s.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:Q,disable:pe,bindFramebuffer:ye,drawBuffers:ve,useProgram:Je,setBlending:Ye,setMaterial:we,setFlipSided:ct,setCullFace:st,setLineWidth:Et,setPolygonOffset:I,setScissorTest:ht,activeTexture:Oe,bindTexture:Qe,unbindTexture:he,compressedTexImage2D:ot,compressedTexImage3D:b,texImage2D:Y,texImage3D:J,pixelStorei:Ce,getParameter:fe,updateUBOMapping:Re,uniformBlockBinding:De,texStorage2D:ie,texStorage3D:le,texSubImage2D:z,texSubImage3D:O,compressedTexSubImage2D:Z,compressedTexSubImage3D:$,scissor:oe,viewport:se,reset:Ve}}function U0(s,e,t,i,n,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),d=new _e,c=new WeakMap,u=new Set;let h;const f=new WeakMap;let S=!1;try{S=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function C(b,z){return S?new OffscreenCanvas(b,z):Qn("canvas")}function p(b,z,O){let Z=1;const $=ot(b);if(($.width>O||$.height>O)&&(Z=O/Math.max($.width,$.height)),Z<1)if(typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&b instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&b instanceof ImageBitmap||typeof VideoFrame<"u"&&b instanceof VideoFrame){const ie=Math.floor(Z*$.width),le=Math.floor(Z*$.height);h===void 0&&(h=C(ie,le));const Y=z?C(ie,le):h;return Y.width=ie,Y.height=le,Y.getContext("2d").drawImage(b,0,0,ie,le),Pe("WebGLRenderer: Texture has been resized from ("+$.width+"x"+$.height+") to ("+ie+"x"+le+")."),Y}else return"data"in b&&Pe("WebGLRenderer: Image in DataTexture is too big ("+$.width+"x"+$.height+")."),b;return b}function x(b){return b.generateMipmaps}function y(b){s.generateMipmap(b)}function g(b){return b.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:b.isWebGL3DRenderTarget?s.TEXTURE_3D:b.isWebGLArrayRenderTarget||b.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function M(b,z,O,Z,$,ie=!1){if(b!==null){if(s[b]!==void 0)return s[b];Pe("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+b+"'")}let le;Z&&(le=e.get("EXT_texture_norm16"),le||Pe("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Y=z;if(z===s.RED&&(O===s.FLOAT&&(Y=s.R32F),O===s.HALF_FLOAT&&(Y=s.R16F),O===s.UNSIGNED_BYTE&&(Y=s.R8),O===s.UNSIGNED_SHORT&&le&&(Y=le.R16_EXT),O===s.SHORT&&le&&(Y=le.R16_SNORM_EXT)),z===s.RED_INTEGER&&(O===s.UNSIGNED_BYTE&&(Y=s.R8UI),O===s.UNSIGNED_SHORT&&(Y=s.R16UI),O===s.UNSIGNED_INT&&(Y=s.R32UI),O===s.BYTE&&(Y=s.R8I),O===s.SHORT&&(Y=s.R16I),O===s.INT&&(Y=s.R32I)),z===s.RG&&(O===s.FLOAT&&(Y=s.RG32F),O===s.HALF_FLOAT&&(Y=s.RG16F),O===s.UNSIGNED_BYTE&&(Y=s.RG8),O===s.UNSIGNED_SHORT&&le&&(Y=le.RG16_EXT),O===s.SHORT&&le&&(Y=le.RG16_SNORM_EXT)),z===s.RG_INTEGER&&(O===s.UNSIGNED_BYTE&&(Y=s.RG8UI),O===s.UNSIGNED_SHORT&&(Y=s.RG16UI),O===s.UNSIGNED_INT&&(Y=s.RG32UI),O===s.BYTE&&(Y=s.RG8I),O===s.SHORT&&(Y=s.RG16I),O===s.INT&&(Y=s.RG32I)),z===s.RGB_INTEGER&&(O===s.UNSIGNED_BYTE&&(Y=s.RGB8UI),O===s.UNSIGNED_SHORT&&(Y=s.RGB16UI),O===s.UNSIGNED_INT&&(Y=s.RGB32UI),O===s.BYTE&&(Y=s.RGB8I),O===s.SHORT&&(Y=s.RGB16I),O===s.INT&&(Y=s.RGB32I)),z===s.RGBA_INTEGER&&(O===s.UNSIGNED_BYTE&&(Y=s.RGBA8UI),O===s.UNSIGNED_SHORT&&(Y=s.RGBA16UI),O===s.UNSIGNED_INT&&(Y=s.RGBA32UI),O===s.BYTE&&(Y=s.RGBA8I),O===s.SHORT&&(Y=s.RGBA16I),O===s.INT&&(Y=s.RGBA32I)),z===s.RGB&&(O===s.UNSIGNED_SHORT&&le&&(Y=le.RGB16_EXT),O===s.SHORT&&le&&(Y=le.RGB16_SNORM_EXT),O===s.UNSIGNED_INT_5_9_9_9_REV&&(Y=s.RGB9_E5),O===s.UNSIGNED_INT_10F_11F_11F_REV&&(Y=s.R11F_G11F_B10F)),z===s.RGBA){const J=ie?Jn:We.getTransfer($);O===s.FLOAT&&(Y=s.RGBA32F),O===s.HALF_FLOAT&&(Y=s.RGBA16F),O===s.UNSIGNED_BYTE&&(Y=J===$e?s.SRGB8_ALPHA8:s.RGBA8),O===s.UNSIGNED_SHORT&&le&&(Y=le.RGBA16_EXT),O===s.SHORT&&le&&(Y=le.RGBA16_SNORM_EXT),O===s.UNSIGNED_SHORT_4_4_4_4&&(Y=s.RGBA4),O===s.UNSIGNED_SHORT_5_5_5_1&&(Y=s.RGB5_A1)}return(Y===s.R16F||Y===s.R32F||Y===s.RG16F||Y===s.RG32F||Y===s.RGBA16F||Y===s.RGBA32F)&&e.get("EXT_color_buffer_float"),Y}function w(b,z){let O;return b?z===null||z===pi||z===ws?O=s.DEPTH24_STENCIL8:z===ui?O=s.DEPTH32F_STENCIL8:z===Qs&&(O=s.DEPTH24_STENCIL8,Pe("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):z===null||z===pi||z===ws?O=s.DEPTH_COMPONENT24:z===ui?O=s.DEPTH_COMPONENT32F:z===Qs&&(O=s.DEPTH_COMPONENT16),O}function q(b,z){return x(b)===!0||b.isFramebufferTexture&&b.minFilter!==Ct&&b.minFilter!==Tt?Math.log2(Math.max(z.width,z.height))+1:b.mipmaps!==void 0&&b.mipmaps.length>0?b.mipmaps.length:b.isCompressedTexture&&Array.isArray(b.image)?z.mipmaps.length:1}function E(b){const z=b.target;z.removeEventListener("dispose",E),_(z),z.isVideoTexture&&c.delete(z),z.isHTMLTexture&&u.delete(z)}function m(b){const z=b.target;z.removeEventListener("dispose",m),T(z)}function _(b){const z=i.get(b);if(z.__webglInit===void 0)return;const O=b.source,Z=f.get(O);if(Z){const $=Z[z.__cacheKey];$.usedTimes--,$.usedTimes===0&&A(b),Object.keys(Z).length===0&&f.delete(O)}i.remove(b)}function A(b){const z=i.get(b);s.deleteTexture(z.__webglTexture);const O=b.source,Z=f.get(O);delete Z[z.__cacheKey],o.memory.textures--}function T(b){const z=i.get(b);if(b.depthTexture&&(b.depthTexture.dispose(),i.remove(b.depthTexture)),b.isWebGLCubeRenderTarget)for(let Z=0;Z<6;Z++){if(Array.isArray(z.__webglFramebuffer[Z]))for(let $=0;$<z.__webglFramebuffer[Z].length;$++)s.deleteFramebuffer(z.__webglFramebuffer[Z][$]);else s.deleteFramebuffer(z.__webglFramebuffer[Z]);z.__webglDepthbuffer&&s.deleteRenderbuffer(z.__webglDepthbuffer[Z])}else{if(Array.isArray(z.__webglFramebuffer))for(let Z=0;Z<z.__webglFramebuffer.length;Z++)s.deleteFramebuffer(z.__webglFramebuffer[Z]);else s.deleteFramebuffer(z.__webglFramebuffer);if(z.__webglDepthbuffer&&s.deleteRenderbuffer(z.__webglDepthbuffer),z.__webglMultisampledFramebuffer&&s.deleteFramebuffer(z.__webglMultisampledFramebuffer),z.__webglColorRenderbuffer)for(let Z=0;Z<z.__webglColorRenderbuffer.length;Z++)z.__webglColorRenderbuffer[Z]&&s.deleteRenderbuffer(z.__webglColorRenderbuffer[Z]);z.__webglDepthRenderbuffer&&s.deleteRenderbuffer(z.__webglDepthRenderbuffer)}const O=b.textures;for(let Z=0,$=O.length;Z<$;Z++){const ie=i.get(O[Z]);ie.__webglTexture&&(s.deleteTexture(ie.__webglTexture),o.memory.textures--),i.remove(O[Z])}i.remove(b)}let R=0;function B(){R=0}function V(){return R}function P(b){R=b}function D(){const b=R;return b>=n.maxTextures&&Pe("WebGLTextures: Trying to use "+b+" texture units while this GPU supports only "+n.maxTextures),R+=1,b}function N(b){const z=[];return z.push(b.wrapS),z.push(b.wrapT),z.push(b.wrapR||0),z.push(b.magFilter),z.push(b.minFilter),z.push(b.anisotropy),z.push(b.internalFormat),z.push(b.format),z.push(b.type),z.push(b.generateMipmaps),z.push(b.premultiplyAlpha),z.push(b.flipY),z.push(b.unpackAlignment),z.push(b.colorSpace),z.join()}function W(b,z){const O=i.get(b);if(b.isVideoTexture&&Qe(b),b.isRenderTargetTexture===!1&&b.isExternalTexture!==!0&&b.version>0&&O.__version!==b.version){const Z=b.image;if(Z===null)Pe("WebGLRenderer: Texture marked for update but no image data found.");else if(Z.complete===!1)Pe("WebGLRenderer: Texture marked for update but image is incomplete");else{pe(O,b,z);return}}else b.isExternalTexture&&(O.__webglTexture=b.sourceTexture?b.sourceTexture:null);t.bindTexture(s.TEXTURE_2D,O.__webglTexture,s.TEXTURE0+z)}function X(b,z){const O=i.get(b);if(b.isRenderTargetTexture===!1&&b.version>0&&O.__version!==b.version){pe(O,b,z);return}else b.isExternalTexture&&(O.__webglTexture=b.sourceTexture?b.sourceTexture:null);t.bindTexture(s.TEXTURE_2D_ARRAY,O.__webglTexture,s.TEXTURE0+z)}function te(b,z){const O=i.get(b);if(b.isRenderTargetTexture===!1&&b.version>0&&O.__version!==b.version){pe(O,b,z);return}t.bindTexture(s.TEXTURE_3D,O.__webglTexture,s.TEXTURE0+z)}function ne(b,z){const O=i.get(b);if(b.isCubeDepthTexture!==!0&&b.version>0&&O.__version!==b.version){ye(O,b,z);return}t.bindTexture(s.TEXTURE_CUBE_MAP,O.__webglTexture,s.TEXTURE0+z)}const de={[is]:s.REPEAT,[_i]:s.CLAMP_TO_EDGE,[xo]:s.MIRRORED_REPEAT},Ae={[Ct]:s.NEAREST,[B2]:s.NEAREST_MIPMAP_NEAREST,[an]:s.NEAREST_MIPMAP_LINEAR,[Tt]:s.LINEAR,[xr]:s.LINEAR_MIPMAP_NEAREST,[Qi]:s.LINEAR_MIPMAP_LINEAR},Fe={[k2]:s.NEVER,[Z2]:s.ALWAYS,[W2]:s.LESS,[ua]:s.LEQUAL,[X2]:s.EQUAL,[fa]:s.GEQUAL,[Y2]:s.GREATER,[j2]:s.NOTEQUAL};function Te(b,z){if(z.type===ui&&e.has("OES_texture_float_linear")===!1&&(z.magFilter===Tt||z.magFilter===xr||z.magFilter===an||z.magFilter===Qi||z.minFilter===Tt||z.minFilter===xr||z.minFilter===an||z.minFilter===Qi)&&Pe("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(b,s.TEXTURE_WRAP_S,de[z.wrapS]),s.texParameteri(b,s.TEXTURE_WRAP_T,de[z.wrapT]),(b===s.TEXTURE_3D||b===s.TEXTURE_2D_ARRAY)&&s.texParameteri(b,s.TEXTURE_WRAP_R,de[z.wrapR]),s.texParameteri(b,s.TEXTURE_MAG_FILTER,Ae[z.magFilter]),s.texParameteri(b,s.TEXTURE_MIN_FILTER,Ae[z.minFilter]),z.compareFunction&&(s.texParameteri(b,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(b,s.TEXTURE_COMPARE_FUNC,Fe[z.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(z.magFilter===Ct||z.minFilter!==an&&z.minFilter!==Qi||z.type===ui&&e.has("OES_texture_float_linear")===!1)return;if(z.anisotropy>1||i.get(z).__currentAnisotropy){const O=e.get("EXT_texture_filter_anisotropic");s.texParameterf(b,O.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(z.anisotropy,n.getMaxAnisotropy())),i.get(z).__currentAnisotropy=z.anisotropy}}}function j(b,z){let O=!1;b.__webglInit===void 0&&(b.__webglInit=!0,z.addEventListener("dispose",E));const Z=z.source;let $=f.get(Z);$===void 0&&($={},f.set(Z,$));const ie=N(z);if(ie!==b.__cacheKey){$[ie]===void 0&&($[ie]={texture:s.createTexture(),usedTimes:0},o.memory.textures++,O=!0),$[ie].usedTimes++;const le=$[b.__cacheKey];le!==void 0&&($[b.__cacheKey].usedTimes--,le.usedTimes===0&&A(z)),b.__cacheKey=ie,b.__webglTexture=$[ie].texture}return O}function re(b,z,O){return Math.floor(Math.floor(b/O)/z)}function Q(b,z,O,Z){const ie=b.updateRanges;if(ie.length===0)t.texSubImage2D(s.TEXTURE_2D,0,0,0,z.width,z.height,O,Z,z.data);else{ie.sort((Ce,oe)=>Ce.start-oe.start);let le=0;for(let Ce=1;Ce<ie.length;Ce++){const oe=ie[le],se=ie[Ce],Re=oe.start+oe.count,De=re(se.start,z.width,4),Ve=re(oe.start,z.width,4);se.start<=Re+1&&De===Ve&&re(se.start+se.count-1,z.width,4)===De?oe.count=Math.max(oe.count,se.start+se.count-oe.start):(++le,ie[le]=se)}ie.length=le+1;const Y=t.getParameter(s.UNPACK_ROW_LENGTH),J=t.getParameter(s.UNPACK_SKIP_PIXELS),fe=t.getParameter(s.UNPACK_SKIP_ROWS);t.pixelStorei(s.UNPACK_ROW_LENGTH,z.width);for(let Ce=0,oe=ie.length;Ce<oe;Ce++){const se=ie[Ce],Re=Math.floor(se.start/4),De=Math.ceil(se.count/4),Ve=Re%z.width,L=Math.floor(Re/z.width),ae=De,K=1;t.pixelStorei(s.UNPACK_SKIP_PIXELS,Ve),t.pixelStorei(s.UNPACK_SKIP_ROWS,L),t.texSubImage2D(s.TEXTURE_2D,0,Ve,L,ae,K,O,Z,z.data)}b.clearUpdateRanges(),t.pixelStorei(s.UNPACK_ROW_LENGTH,Y),t.pixelStorei(s.UNPACK_SKIP_PIXELS,J),t.pixelStorei(s.UNPACK_SKIP_ROWS,fe)}}function pe(b,z,O){let Z=s.TEXTURE_2D;(z.isDataArrayTexture||z.isCompressedArrayTexture)&&(Z=s.TEXTURE_2D_ARRAY),z.isData3DTexture&&(Z=s.TEXTURE_3D);const $=j(b,z),ie=z.source;t.bindTexture(Z,b.__webglTexture,s.TEXTURE0+O);const le=i.get(ie);if(ie.version!==le.__version||$===!0){if(t.activeTexture(s.TEXTURE0+O),(typeof ImageBitmap<"u"&&z.image instanceof ImageBitmap)===!1){const K=We.getPrimaries(We.workingColorSpace),me=z.colorSpace===Ui?null:We.getPrimaries(z.colorSpace),ce=z.colorSpace===Ui||K===me?s.NONE:s.BROWSER_DEFAULT_WEBGL;t.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,z.flipY),t.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,z.premultiplyAlpha),t.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,ce)}t.pixelStorei(s.UNPACK_ALIGNMENT,z.unpackAlignment);let J=p(z.image,!1,n.maxTextureSize);J=he(z,J);const fe=r.convert(z.format,z.colorSpace),Ce=r.convert(z.type);let oe=M(z.internalFormat,fe,Ce,z.normalized,z.colorSpace,z.isVideoTexture);Te(Z,z);let se;const Re=z.mipmaps,De=z.isVideoTexture!==!0,Ve=le.__version===void 0||$===!0,L=ie.dataReady,ae=q(z,J);if(z.isDepthTexture)oe=w(z.format===Fi,z.type),Ve&&(De?t.texStorage2D(s.TEXTURE_2D,1,oe,J.width,J.height):t.texImage2D(s.TEXTURE_2D,0,oe,J.width,J.height,0,fe,Ce,null));else if(z.isDataTexture)if(Re.length>0){De&&Ve&&t.texStorage2D(s.TEXTURE_2D,ae,oe,Re[0].width,Re[0].height);for(let K=0,me=Re.length;K<me;K++)se=Re[K],De?L&&t.texSubImage2D(s.TEXTURE_2D,K,0,0,se.width,se.height,fe,Ce,se.data):t.texImage2D(s.TEXTURE_2D,K,oe,se.width,se.height,0,fe,Ce,se.data);z.generateMipmaps=!1}else De?(Ve&&t.texStorage2D(s.TEXTURE_2D,ae,oe,J.width,J.height),L&&Q(z,J,fe,Ce)):t.texImage2D(s.TEXTURE_2D,0,oe,J.width,J.height,0,fe,Ce,J.data);else if(z.isCompressedTexture)if(z.isCompressedArrayTexture){De&&Ve&&t.texStorage3D(s.TEXTURE_2D_ARRAY,ae,oe,Re[0].width,Re[0].height,J.depth);for(let K=0,me=Re.length;K<me;K++)if(se=Re[K],z.format!==jt)if(fe!==null)if(De){if(L)if(z.layerUpdates.size>0){const ce=_d(se.width,se.height,z.format,z.type);for(const ee of z.layerUpdates){const Me=se.data.subarray(ee*ce/se.data.BYTES_PER_ELEMENT,(ee+1)*ce/se.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,K,0,0,ee,se.width,se.height,1,fe,Me)}z.clearLayerUpdates()}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,K,0,0,0,se.width,se.height,J.depth,fe,se.data)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,K,oe,se.width,se.height,J.depth,0,se.data,0,0);else Pe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else De?L&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,K,0,0,0,se.width,se.height,J.depth,fe,Ce,se.data):t.texImage3D(s.TEXTURE_2D_ARRAY,K,oe,se.width,se.height,J.depth,0,fe,Ce,se.data)}else{De&&Ve&&t.texStorage2D(s.TEXTURE_2D,ae,oe,Re[0].width,Re[0].height);for(let K=0,me=Re.length;K<me;K++)se=Re[K],z.format!==jt?fe!==null?De?L&&t.compressedTexSubImage2D(s.TEXTURE_2D,K,0,0,se.width,se.height,fe,se.data):t.compressedTexImage2D(s.TEXTURE_2D,K,oe,se.width,se.height,0,se.data):Pe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):De?L&&t.texSubImage2D(s.TEXTURE_2D,K,0,0,se.width,se.height,fe,Ce,se.data):t.texImage2D(s.TEXTURE_2D,K,oe,se.width,se.height,0,fe,Ce,se.data)}else if(z.isDataArrayTexture)if(De){if(Ve&&t.texStorage3D(s.TEXTURE_2D_ARRAY,ae,oe,J.width,J.height,J.depth),L)if(z.layerUpdates.size>0){const K=_d(J.width,J.height,z.format,z.type);for(const me of z.layerUpdates){const ce=J.data.subarray(me*K/J.data.BYTES_PER_ELEMENT,(me+1)*K/J.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,me,J.width,J.height,1,fe,Ce,ce)}z.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,J.width,J.height,J.depth,fe,Ce,J.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,oe,J.width,J.height,J.depth,0,fe,Ce,J.data);else if(z.isData3DTexture)De?(Ve&&t.texStorage3D(s.TEXTURE_3D,ae,oe,J.width,J.height,J.depth),L&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,J.width,J.height,J.depth,fe,Ce,J.data)):t.texImage3D(s.TEXTURE_3D,0,oe,J.width,J.height,J.depth,0,fe,Ce,J.data);else if(z.isFramebufferTexture){if(Ve)if(De)t.texStorage2D(s.TEXTURE_2D,ae,oe,J.width,J.height);else{let K=J.width,me=J.height;for(let ce=0;ce<ae;ce++)t.texImage2D(s.TEXTURE_2D,ce,oe,K,me,0,fe,Ce,null),K>>=1,me>>=1}}else if(z.isHTMLTexture){if("texElementImage2D"in s){const K=s.canvas;if(K.hasAttribute("layoutsubtree")||K.setAttribute("layoutsubtree","true"),J.parentNode!==K){K.appendChild(J),u.add(z),K.onpaint=Ne=>{const St=Ne.changedElements;for(const et of u)St.includes(et.image)&&(et.needsUpdate=!0)},K.requestPaint();return}const me=0,ce=s.RGBA,ee=s.RGBA,Me=s.UNSIGNED_BYTE;s.texElementImage2D(s.TEXTURE_2D,me,ce,ee,Me,J),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE)}}else if(Re.length>0){if(De&&Ve){const K=ot(Re[0]);t.texStorage2D(s.TEXTURE_2D,ae,oe,K.width,K.height)}for(let K=0,me=Re.length;K<me;K++)se=Re[K],De?L&&t.texSubImage2D(s.TEXTURE_2D,K,0,0,fe,Ce,se):t.texImage2D(s.TEXTURE_2D,K,oe,fe,Ce,se);z.generateMipmaps=!1}else if(De){if(Ve){const K=ot(J);t.texStorage2D(s.TEXTURE_2D,ae,oe,K.width,K.height)}L&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,fe,Ce,J)}else t.texImage2D(s.TEXTURE_2D,0,oe,fe,Ce,J);x(z)&&y(Z),le.__version=ie.version,z.onUpdate&&z.onUpdate(z)}b.__version=z.version}function ye(b,z,O){if(z.image.length!==6)return;const Z=j(b,z),$=z.source;t.bindTexture(s.TEXTURE_CUBE_MAP,b.__webglTexture,s.TEXTURE0+O);const ie=i.get($);if($.version!==ie.__version||Z===!0){t.activeTexture(s.TEXTURE0+O);const le=We.getPrimaries(We.workingColorSpace),Y=z.colorSpace===Ui?null:We.getPrimaries(z.colorSpace),J=z.colorSpace===Ui||le===Y?s.NONE:s.BROWSER_DEFAULT_WEBGL;t.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,z.flipY),t.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,z.premultiplyAlpha),t.pixelStorei(s.UNPACK_ALIGNMENT,z.unpackAlignment),t.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,J);const fe=z.isCompressedTexture||z.image[0].isCompressedTexture,Ce=z.image[0]&&z.image[0].isDataTexture,oe=[];for(let ee=0;ee<6;ee++)!fe&&!Ce?oe[ee]=p(z.image[ee],!0,n.maxCubemapSize):oe[ee]=Ce?z.image[ee].image:z.image[ee],oe[ee]=he(z,oe[ee]);const se=oe[0],Re=r.convert(z.format,z.colorSpace),De=r.convert(z.type),Ve=M(z.internalFormat,Re,De,z.normalized,z.colorSpace),L=z.isVideoTexture!==!0,ae=ie.__version===void 0||Z===!0,K=$.dataReady;let me=q(z,se);Te(s.TEXTURE_CUBE_MAP,z);let ce;if(fe){L&&ae&&t.texStorage2D(s.TEXTURE_CUBE_MAP,me,Ve,se.width,se.height);for(let ee=0;ee<6;ee++){ce=oe[ee].mipmaps;for(let Me=0;Me<ce.length;Me++){const Ne=ce[Me];z.format!==jt?Re!==null?L?K&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,0,0,Ne.width,Ne.height,Re,Ne.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,Ve,Ne.width,Ne.height,0,Ne.data):Pe("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):L?K&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,0,0,Ne.width,Ne.height,Re,De,Ne.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,Ve,Ne.width,Ne.height,0,Re,De,Ne.data)}}}else{if(ce=z.mipmaps,L&&ae){ce.length>0&&me++;const ee=ot(oe[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,me,Ve,ee.width,ee.height)}for(let ee=0;ee<6;ee++)if(Ce){L?K&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,oe[ee].width,oe[ee].height,Re,De,oe[ee].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,Ve,oe[ee].width,oe[ee].height,0,Re,De,oe[ee].data);for(let Me=0;Me<ce.length;Me++){const St=ce[Me].image[ee].image;L?K&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,0,0,St.width,St.height,Re,De,St.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,Ve,St.width,St.height,0,Re,De,St.data)}}else{L?K&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,Re,De,oe[ee]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,Ve,Re,De,oe[ee]);for(let Me=0;Me<ce.length;Me++){const Ne=ce[Me];L?K&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,0,0,Re,De,Ne.image[ee]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,Ve,Re,De,Ne.image[ee])}}}x(z)&&y(s.TEXTURE_CUBE_MAP),ie.__version=$.version,z.onUpdate&&z.onUpdate(z)}b.__version=z.version}function ve(b,z,O,Z,$,ie){const le=r.convert(O.format,O.colorSpace),Y=r.convert(O.type),J=M(O.internalFormat,le,Y,O.normalized,O.colorSpace),fe=i.get(z),Ce=i.get(O);if(Ce.__renderTarget=z,!fe.__hasExternalTextures){const oe=Math.max(1,z.width>>ie),se=Math.max(1,z.height>>ie);$===s.TEXTURE_3D||$===s.TEXTURE_2D_ARRAY?t.texImage3D($,ie,J,oe,se,z.depth,0,le,Y,null):t.texImage2D($,ie,J,oe,se,0,le,Y,null)}t.bindFramebuffer(s.FRAMEBUFFER,b),Oe(z)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,Z,$,Ce.__webglTexture,0,ht(z)):($===s.TEXTURE_2D||$>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&$<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,Z,$,Ce.__webglTexture,ie),t.bindFramebuffer(s.FRAMEBUFFER,null)}function Je(b,z,O){if(s.bindRenderbuffer(s.RENDERBUFFER,b),z.depthBuffer){const Z=z.depthTexture,$=Z&&Z.isDepthTexture?Z.type:null,ie=w(z.stencilBuffer,$),le=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;Oe(z)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,ht(z),ie,z.width,z.height):O?s.renderbufferStorageMultisample(s.RENDERBUFFER,ht(z),ie,z.width,z.height):s.renderbufferStorage(s.RENDERBUFFER,ie,z.width,z.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,le,s.RENDERBUFFER,b)}else{const Z=z.textures;for(let $=0;$<Z.length;$++){const ie=Z[$],le=r.convert(ie.format,ie.colorSpace),Y=r.convert(ie.type),J=M(ie.internalFormat,le,Y,ie.normalized,ie.colorSpace);Oe(z)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,ht(z),J,z.width,z.height):O?s.renderbufferStorageMultisample(s.RENDERBUFFER,ht(z),J,z.width,z.height):s.renderbufferStorage(s.RENDERBUFFER,J,z.width,z.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function Le(b,z,O){const Z=z.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(s.FRAMEBUFFER,b),!(z.depthTexture&&z.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const $=i.get(z.depthTexture);if($.__renderTarget=z,(!$.__webglTexture||z.depthTexture.image.width!==z.width||z.depthTexture.image.height!==z.height)&&(z.depthTexture.image.width=z.width,z.depthTexture.image.height=z.height,z.depthTexture.needsUpdate=!0),Z){if($.__webglInit===void 0&&($.__webglInit=!0,z.depthTexture.addEventListener("dispose",E)),$.__webglTexture===void 0){$.__webglTexture=s.createTexture(),t.bindTexture(s.TEXTURE_CUBE_MAP,$.__webglTexture),Te(s.TEXTURE_CUBE_MAP,z.depthTexture);const fe=r.convert(z.depthTexture.format),Ce=r.convert(z.depthTexture.type);let oe;z.depthTexture.format===Mi?oe=s.DEPTH_COMPONENT24:z.depthTexture.format===Fi&&(oe=s.DEPTH24_STENCIL8);for(let se=0;se<6;se++)s.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+se,0,oe,z.width,z.height,0,fe,Ce,null)}}else W(z.depthTexture,0);const ie=$.__webglTexture,le=ht(z),Y=Z?s.TEXTURE_CUBE_MAP_POSITIVE_X+O:s.TEXTURE_2D,J=z.depthTexture.format===Fi?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;if(z.depthTexture.format===Mi)Oe(z)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,J,Y,ie,0,le):s.framebufferTexture2D(s.FRAMEBUFFER,J,Y,ie,0);else if(z.depthTexture.format===Fi)Oe(z)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,J,Y,ie,0,le):s.framebufferTexture2D(s.FRAMEBUFFER,J,Y,ie,0);else throw new Error("Unknown depthTexture format")}function Xe(b){const z=i.get(b),O=b.isWebGLCubeRenderTarget===!0;if(z.__boundDepthTexture!==b.depthTexture){const Z=b.depthTexture;if(z.__depthDisposeCallback&&z.__depthDisposeCallback(),Z){const $=()=>{delete z.__boundDepthTexture,delete z.__depthDisposeCallback,Z.removeEventListener("dispose",$)};Z.addEventListener("dispose",$),z.__depthDisposeCallback=$}z.__boundDepthTexture=Z}if(b.depthTexture&&!z.__autoAllocateDepthBuffer)if(O)for(let Z=0;Z<6;Z++)Le(z.__webglFramebuffer[Z],b,Z);else{const Z=b.texture.mipmaps;Z&&Z.length>0?Le(z.__webglFramebuffer[0],b,0):Le(z.__webglFramebuffer,b,0)}else if(O){z.__webglDepthbuffer=[];for(let Z=0;Z<6;Z++)if(t.bindFramebuffer(s.FRAMEBUFFER,z.__webglFramebuffer[Z]),z.__webglDepthbuffer[Z]===void 0)z.__webglDepthbuffer[Z]=s.createRenderbuffer(),Je(z.__webglDepthbuffer[Z],b,!1);else{const $=b.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ie=z.__webglDepthbuffer[Z];s.bindRenderbuffer(s.RENDERBUFFER,ie),s.framebufferRenderbuffer(s.FRAMEBUFFER,$,s.RENDERBUFFER,ie)}}else{const Z=b.texture.mipmaps;if(Z&&Z.length>0?t.bindFramebuffer(s.FRAMEBUFFER,z.__webglFramebuffer[0]):t.bindFramebuffer(s.FRAMEBUFFER,z.__webglFramebuffer),z.__webglDepthbuffer===void 0)z.__webglDepthbuffer=s.createRenderbuffer(),Je(z.__webglDepthbuffer,b,!1);else{const $=b.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ie=z.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,ie),s.framebufferRenderbuffer(s.FRAMEBUFFER,$,s.RENDERBUFFER,ie)}}t.bindFramebuffer(s.FRAMEBUFFER,null)}function Ye(b,z,O){const Z=i.get(b);z!==void 0&&ve(Z.__webglFramebuffer,b,b.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),O!==void 0&&Xe(b)}function we(b){const z=b.texture,O=i.get(b),Z=i.get(z);b.addEventListener("dispose",m);const $=b.textures,ie=b.isWebGLCubeRenderTarget===!0,le=$.length>1;if(le||(Z.__webglTexture===void 0&&(Z.__webglTexture=s.createTexture()),Z.__version=z.version,o.memory.textures++),ie){O.__webglFramebuffer=[];for(let Y=0;Y<6;Y++)if(z.mipmaps&&z.mipmaps.length>0){O.__webglFramebuffer[Y]=[];for(let J=0;J<z.mipmaps.length;J++)O.__webglFramebuffer[Y][J]=s.createFramebuffer()}else O.__webglFramebuffer[Y]=s.createFramebuffer()}else{if(z.mipmaps&&z.mipmaps.length>0){O.__webglFramebuffer=[];for(let Y=0;Y<z.mipmaps.length;Y++)O.__webglFramebuffer[Y]=s.createFramebuffer()}else O.__webglFramebuffer=s.createFramebuffer();if(le)for(let Y=0,J=$.length;Y<J;Y++){const fe=i.get($[Y]);fe.__webglTexture===void 0&&(fe.__webglTexture=s.createTexture(),o.memory.textures++)}if(b.samples>0&&Oe(b)===!1){O.__webglMultisampledFramebuffer=s.createFramebuffer(),O.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,O.__webglMultisampledFramebuffer);for(let Y=0;Y<$.length;Y++){const J=$[Y];O.__webglColorRenderbuffer[Y]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,O.__webglColorRenderbuffer[Y]);const fe=r.convert(J.format,J.colorSpace),Ce=r.convert(J.type),oe=M(J.internalFormat,fe,Ce,J.normalized,J.colorSpace,b.isXRRenderTarget===!0),se=ht(b);s.renderbufferStorageMultisample(s.RENDERBUFFER,se,oe,b.width,b.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Y,s.RENDERBUFFER,O.__webglColorRenderbuffer[Y])}s.bindRenderbuffer(s.RENDERBUFFER,null),b.depthBuffer&&(O.__webglDepthRenderbuffer=s.createRenderbuffer(),Je(O.__webglDepthRenderbuffer,b,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if(ie){t.bindTexture(s.TEXTURE_CUBE_MAP,Z.__webglTexture),Te(s.TEXTURE_CUBE_MAP,z);for(let Y=0;Y<6;Y++)if(z.mipmaps&&z.mipmaps.length>0)for(let J=0;J<z.mipmaps.length;J++)ve(O.__webglFramebuffer[Y][J],b,z,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+Y,J);else ve(O.__webglFramebuffer[Y],b,z,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0);x(z)&&y(s.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(le){for(let Y=0,J=$.length;Y<J;Y++){const fe=$[Y],Ce=i.get(fe);let oe=s.TEXTURE_2D;(b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(oe=b.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(oe,Ce.__webglTexture),Te(oe,fe),ve(O.__webglFramebuffer,b,fe,s.COLOR_ATTACHMENT0+Y,oe,0),x(fe)&&y(oe)}t.unbindTexture()}else{let Y=s.TEXTURE_2D;if((b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(Y=b.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(Y,Z.__webglTexture),Te(Y,z),z.mipmaps&&z.mipmaps.length>0)for(let J=0;J<z.mipmaps.length;J++)ve(O.__webglFramebuffer[J],b,z,s.COLOR_ATTACHMENT0,Y,J);else ve(O.__webglFramebuffer,b,z,s.COLOR_ATTACHMENT0,Y,0);x(z)&&y(Y),t.unbindTexture()}b.depthBuffer&&Xe(b)}function ct(b){const z=b.textures;for(let O=0,Z=z.length;O<Z;O++){const $=z[O];if(x($)){const ie=g(b),le=i.get($).__webglTexture;t.bindTexture(ie,le),y(ie),t.unbindTexture()}}}const st=[],Et=[];function I(b){if(b.samples>0){if(Oe(b)===!1){const z=b.textures,O=b.width,Z=b.height;let $=s.COLOR_BUFFER_BIT;const ie=b.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,le=i.get(b),Y=z.length>1;if(Y)for(let fe=0;fe<z.length;fe++)t.bindFramebuffer(s.FRAMEBUFFER,le.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+fe,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,le.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+fe,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,le.__webglMultisampledFramebuffer);const J=b.texture.mipmaps;J&&J.length>0?t.bindFramebuffer(s.DRAW_FRAMEBUFFER,le.__webglFramebuffer[0]):t.bindFramebuffer(s.DRAW_FRAMEBUFFER,le.__webglFramebuffer);for(let fe=0;fe<z.length;fe++){if(b.resolveDepthBuffer&&(b.depthBuffer&&($|=s.DEPTH_BUFFER_BIT),b.stencilBuffer&&b.resolveStencilBuffer&&($|=s.STENCIL_BUFFER_BIT)),Y){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,le.__webglColorRenderbuffer[fe]);const Ce=i.get(z[fe]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,Ce,0)}s.blitFramebuffer(0,0,O,Z,0,0,O,Z,$,s.NEAREST),l===!0&&(st.length=0,Et.length=0,st.push(s.COLOR_ATTACHMENT0+fe),b.depthBuffer&&b.resolveDepthBuffer===!1&&(st.push(ie),Et.push(ie),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,Et)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,st))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),Y)for(let fe=0;fe<z.length;fe++){t.bindFramebuffer(s.FRAMEBUFFER,le.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+fe,s.RENDERBUFFER,le.__webglColorRenderbuffer[fe]);const Ce=i.get(z[fe]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,le.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+fe,s.TEXTURE_2D,Ce,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,le.__webglMultisampledFramebuffer)}else if(b.depthBuffer&&b.resolveDepthBuffer===!1&&l){const z=b.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[z])}}}function ht(b){return Math.min(n.maxSamples,b.samples)}function Oe(b){const z=i.get(b);return b.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&z.__useRenderToTexture!==!1}function Qe(b){const z=o.render.frame;c.get(b)!==z&&(c.set(b,z),b.update())}function he(b,z){const O=b.colorSpace,Z=b.format,$=b.type;return b.isCompressedTexture===!0||b.isVideoTexture===!0||O!==Kn&&O!==Ui&&(We.getTransfer(O)===$e?(Z!==jt||$!==Ut)&&Pe("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Ze("WebGLTextures: Unsupported texture color space:",O)),z}function ot(b){return typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement?(d.width=b.naturalWidth||b.width,d.height=b.naturalHeight||b.height):typeof VideoFrame<"u"&&b instanceof VideoFrame?(d.width=b.displayWidth,d.height=b.displayHeight):(d.width=b.width,d.height=b.height),d}this.allocateTextureUnit=D,this.resetTextureUnits=B,this.getTextureUnits=V,this.setTextureUnits=P,this.setTexture2D=W,this.setTexture2DArray=X,this.setTexture3D=te,this.setTextureCube=ne,this.rebindTextures=Ye,this.setupRenderTarget=we,this.updateRenderTargetMipmap=ct,this.updateMultisampleRenderTarget=I,this.setupDepthRenderbuffer=Xe,this.setupFrameBufferTexture=ve,this.useMultisampledRTT=Oe,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function F0(s,e){function t(i,n=Ui){let r;const o=We.getTransfer(n);if(i===Ut)return s.UNSIGNED_BYTE;if(i===aa)return s.UNSIGNED_SHORT_4_4_4_4;if(i===da)return s.UNSIGNED_SHORT_5_5_5_1;if(i===z1)return s.UNSIGNED_INT_5_9_9_9_REV;if(i===g1)return s.UNSIGNED_INT_10F_11F_11F_REV;if(i===m1)return s.BYTE;if(i===C1)return s.SHORT;if(i===Qs)return s.UNSIGNED_SHORT;if(i===oa)return s.INT;if(i===pi)return s.UNSIGNED_INT;if(i===ui)return s.FLOAT;if(i===qt)return s.HALF_FLOAT;if(i===q1)return s.ALPHA;if(i===_1)return s.RGB;if(i===jt)return s.RGBA;if(i===Mi)return s.DEPTH_COMPONENT;if(i===Fi)return s.DEPTH_STENCIL;if(i===v1)return s.RED;if(i===la)return s.RED_INTEGER;if(i===ss)return s.RG;if(i===ca)return s.RG_INTEGER;if(i===ha)return s.RGBA_INTEGER;if(i===Fn||i===On||i===Bn||i===Hn)if(o===$e)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===Fn)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===On)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Bn)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Hn)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===Fn)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===On)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Bn)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Hn)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===po||i===So||i===yo||i===mo)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===po)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===So)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===yo)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===mo)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Co||i===zo||i===go||i===qo||i===_o||i===Yn||i===vo)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(i===Co||i===zo)return o===$e?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===go)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(i===qo)return r.COMPRESSED_R11_EAC;if(i===_o)return r.COMPRESSED_SIGNED_R11_EAC;if(i===Yn)return r.COMPRESSED_RG11_EAC;if(i===vo)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===Mo||i===bo||i===Eo||i===To||i===Ao||i===wo||i===Ro||i===Po||i===Do||i===Lo||i===Io||i===No||i===Uo||i===Fo)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(i===Mo)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===bo)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Eo)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===To)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Ao)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===wo)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Ro)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Po)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Do)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Lo)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Io)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===No)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Uo)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Fo)return o===$e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Oo||i===Bo||i===Ho)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(i===Oo)return o===$e?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Bo)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Ho)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Go||i===Vo||i===jn||i===ko)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(i===Go)return r.COMPRESSED_RED_RGTC1_EXT;if(i===Vo)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===jn)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===ko)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===ws?s.UNSIGNED_INT_24_8:s[i]!==void 0?s[i]:null}return{convert:t}}const O0=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,B0=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class H0{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new L1(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new lt({vertexShader:O0,fragmentShader:B0,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Zt(new tr(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class G0 extends Vi{constructor(e,t){super();const i=this;let n=null,r=1,o=null,a="local-floor",l=1,d=null,c=null,u=null,h=null,f=null,S=null;const C=typeof XRWebGLBinding<"u",p=new H0,x={},y=t.getContextAttributes();let g=null,M=null;const w=[],q=[],E=new _e;let m=null;const _=new Gt;_.viewport=new pt;const A=new Gt;A.viewport=new pt;const T=[_,A],R=new jc;let B=null,V=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(j){let re=w[j];return re===void 0&&(re=new zr,w[j]=re),re.getTargetRaySpace()},this.getControllerGrip=function(j){let re=w[j];return re===void 0&&(re=new zr,w[j]=re),re.getGripSpace()},this.getHand=function(j){let re=w[j];return re===void 0&&(re=new zr,w[j]=re),re.getHandSpace()};function P(j){const re=q.indexOf(j.inputSource);if(re===-1)return;const Q=w[re];Q!==void 0&&(Q.update(j.inputSource,j.frame,d||o),Q.dispatchEvent({type:j.type,data:j.inputSource}))}function D(){n.removeEventListener("select",P),n.removeEventListener("selectstart",P),n.removeEventListener("selectend",P),n.removeEventListener("squeeze",P),n.removeEventListener("squeezestart",P),n.removeEventListener("squeezeend",P),n.removeEventListener("end",D),n.removeEventListener("inputsourceschange",N);for(let j=0;j<w.length;j++){const re=q[j];re!==null&&(q[j]=null,w[j].disconnect(re))}B=null,V=null,p.reset();for(const j in x)delete x[j];e.setRenderTarget(g),f=null,h=null,u=null,n=null,M=null,Te.stop(),i.isPresenting=!1,e.setPixelRatio(m),e.setSize(E.width,E.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(j){r=j,i.isPresenting===!0&&Pe("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(j){a=j,i.isPresenting===!0&&Pe("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return d||o},this.setReferenceSpace=function(j){d=j},this.getBaseLayer=function(){return h!==null?h:f},this.getBinding=function(){return u===null&&C&&(u=new XRWebGLBinding(n,t)),u},this.getFrame=function(){return S},this.getSession=function(){return n},this.setSession=async function(j){if(n=j,n!==null){if(g=e.getRenderTarget(),n.addEventListener("select",P),n.addEventListener("selectstart",P),n.addEventListener("selectend",P),n.addEventListener("squeeze",P),n.addEventListener("squeezestart",P),n.addEventListener("squeezeend",P),n.addEventListener("end",D),n.addEventListener("inputsourceschange",N),y.xrCompatible!==!0&&await t.makeXRCompatible(),m=e.getPixelRatio(),e.getSize(E),C&&"createProjectionLayer"in XRWebGLBinding.prototype){let Q=null,pe=null,ye=null;y.depth&&(ye=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,Q=y.stencil?Fi:Mi,pe=y.stencil?ws:pi);const ve={colorFormat:t.RGBA8,depthFormat:ye,scaleFactor:r};u=this.getBinding(),h=u.createProjectionLayer(ve),n.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),M=new xt(h.textureWidth,h.textureHeight,{format:jt,type:Ut,depthTexture:new ns(h.textureWidth,h.textureHeight,pe,void 0,void 0,void 0,void 0,void 0,void 0,Q),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{const Q={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(n,t,Q),n.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),M=new xt(f.framebufferWidth,f.framebufferHeight,{format:jt,type:Ut,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(l),d=null,o=await n.requestReferenceSpace(a),Te.setContext(n),Te.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(n!==null)return n.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function N(j){for(let re=0;re<j.removed.length;re++){const Q=j.removed[re],pe=q.indexOf(Q);pe>=0&&(q[pe]=null,w[pe].disconnect(Q))}for(let re=0;re<j.added.length;re++){const Q=j.added[re];let pe=q.indexOf(Q);if(pe===-1){for(let ve=0;ve<w.length;ve++)if(ve>=q.length){q.push(Q),pe=ve;break}else if(q[ve]===null){q[ve]=Q,pe=ve;break}if(pe===-1)break}const ye=w[pe];ye&&ye.connect(Q)}}const W=new U,X=new U;function te(j,re,Q){W.setFromMatrixPosition(re.matrixWorld),X.setFromMatrixPosition(Q.matrixWorld);const pe=W.distanceTo(X),ye=re.projectionMatrix.elements,ve=Q.projectionMatrix.elements,Je=ye[14]/(ye[10]-1),Le=ye[14]/(ye[10]+1),Xe=(ye[9]+1)/ye[5],Ye=(ye[9]-1)/ye[5],we=(ye[8]-1)/ye[0],ct=(ve[8]+1)/ve[0],st=Je*we,Et=Je*ct,I=pe/(-we+ct),ht=I*-we;if(re.matrixWorld.decompose(j.position,j.quaternion,j.scale),j.translateX(ht),j.translateZ(I),j.matrixWorld.compose(j.position,j.quaternion,j.scale),j.matrixWorldInverse.copy(j.matrixWorld).invert(),ye[10]===-1)j.projectionMatrix.copy(re.projectionMatrix),j.projectionMatrixInverse.copy(re.projectionMatrixInverse);else{const Oe=Je+I,Qe=Le+I,he=st-ht,ot=Et+(pe-ht),b=Xe*Le/Qe*Oe,z=Ye*Le/Qe*Oe;j.projectionMatrix.makePerspective(he,ot,b,z,Oe,Qe),j.projectionMatrixInverse.copy(j.projectionMatrix).invert()}}function ne(j,re){re===null?j.matrixWorld.copy(j.matrix):j.matrixWorld.multiplyMatrices(re.matrixWorld,j.matrix),j.matrixWorldInverse.copy(j.matrixWorld).invert()}this.updateCamera=function(j){if(n===null)return;let re=j.near,Q=j.far;p.texture!==null&&(p.depthNear>0&&(re=p.depthNear),p.depthFar>0&&(Q=p.depthFar)),R.near=A.near=_.near=re,R.far=A.far=_.far=Q,(B!==R.near||V!==R.far)&&(n.updateRenderState({depthNear:R.near,depthFar:R.far}),B=R.near,V=R.far),R.layers.mask=j.layers.mask|6,_.layers.mask=R.layers.mask&-5,A.layers.mask=R.layers.mask&-3;const pe=j.parent,ye=R.cameras;ne(R,pe);for(let ve=0;ve<ye.length;ve++)ne(ye[ve],pe);ye.length===2?te(R,_,A):R.projectionMatrix.copy(_.projectionMatrix),de(j,R,pe)};function de(j,re,Q){Q===null?j.matrix.copy(re.matrixWorld):(j.matrix.copy(Q.matrixWorld),j.matrix.invert(),j.matrix.multiply(re.matrixWorld)),j.matrix.decompose(j.position,j.quaternion,j.scale),j.updateMatrixWorld(!0),j.projectionMatrix.copy(re.projectionMatrix),j.projectionMatrixInverse.copy(re.projectionMatrixInverse),j.isPerspectiveCamera&&(j.fov=en*2*Math.atan(1/j.projectionMatrix.elements[5]),j.zoom=1)}this.getCamera=function(){return R},this.getFoveation=function(){if(!(h===null&&f===null))return l},this.setFoveation=function(j){l=j,h!==null&&(h.fixedFoveation=j),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=j)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(R)},this.getCameraTexture=function(j){return x[j]};let Ae=null;function Fe(j,re){if(c=re.getViewerPose(d||o),S=re,c!==null){const Q=c.views;f!==null&&(e.setRenderTargetFramebuffer(M,f.framebuffer),e.setRenderTarget(M));let pe=!1;Q.length!==R.cameras.length&&(R.cameras.length=0,pe=!0);for(let Le=0;Le<Q.length;Le++){const Xe=Q[Le];let Ye=null;if(f!==null)Ye=f.getViewport(Xe);else{const ct=u.getViewSubImage(h,Xe);Ye=ct.viewport,Le===0&&(e.setRenderTargetTextures(M,ct.colorTexture,ct.depthStencilTexture),e.setRenderTarget(M))}let we=T[Le];we===void 0&&(we=new Gt,we.layers.enable(Le),we.viewport=new pt,T[Le]=we),we.matrix.fromArray(Xe.transform.matrix),we.matrix.decompose(we.position,we.quaternion,we.scale),we.projectionMatrix.fromArray(Xe.projectionMatrix),we.projectionMatrixInverse.copy(we.projectionMatrix).invert(),we.viewport.set(Ye.x,Ye.y,Ye.width,Ye.height),Le===0&&(R.matrix.copy(we.matrix),R.matrix.decompose(R.position,R.quaternion,R.scale)),pe===!0&&R.cameras.push(we)}const ye=n.enabledFeatures;if(ye&&ye.includes("depth-sensing")&&n.depthUsage=="gpu-optimized"&&C){u=i.getBinding();const Le=u.getDepthInformation(Q[0]);Le&&Le.isValid&&Le.texture&&p.init(Le,n.renderState)}if(ye&&ye.includes("camera-access")&&C){e.state.unbindTexture(),u=i.getBinding();for(let Le=0;Le<Q.length;Le++){const Xe=Q[Le].camera;if(Xe){let Ye=x[Xe];Ye||(Ye=new L1,x[Xe]=Ye);const we=u.getCameraImage(Xe);Ye.sourceTexture=we}}}}for(let Q=0;Q<w.length;Q++){const pe=q[Q],ye=w[Q];pe!==null&&ye!==void 0&&ye.update(pe,re,d||o)}Ae&&Ae(j,re),re.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:re}),S=null}const Te=new B1;Te.setAnimationLoop(Fe),this.setAnimationLoop=function(j){Ae=j},this.dispose=function(){}}}const V0=new dt,Y1=new Ie;Y1.set(-1,0,0,0,1,0,0,0,1);function k0(s,e){function t(p,x){p.matrixAutoUpdate===!0&&p.updateMatrix(),x.value.copy(p.matrix)}function i(p,x){x.color.getRGB(p.fogColor.value,I1(s)),x.isFog?(p.fogNear.value=x.near,p.fogFar.value=x.far):x.isFogExp2&&(p.fogDensity.value=x.density)}function n(p,x,y,g,M){x.isNodeMaterial?x.uniformsNeedUpdate=!1:x.isMeshBasicMaterial?r(p,x):x.isMeshLambertMaterial?(r(p,x),x.envMap&&(p.envMapIntensity.value=x.envMapIntensity)):x.isMeshToonMaterial?(r(p,x),u(p,x)):x.isMeshPhongMaterial?(r(p,x),c(p,x),x.envMap&&(p.envMapIntensity.value=x.envMapIntensity)):x.isMeshStandardMaterial?(r(p,x),h(p,x),x.isMeshPhysicalMaterial&&f(p,x,M)):x.isMeshMatcapMaterial?(r(p,x),S(p,x)):x.isMeshDepthMaterial?r(p,x):x.isMeshDistanceMaterial?(r(p,x),C(p,x)):x.isMeshNormalMaterial?r(p,x):x.isLineBasicMaterial?(o(p,x),x.isLineDashedMaterial&&a(p,x)):x.isPointsMaterial?l(p,x,y,g):x.isSpriteMaterial?d(p,x):x.isShadowMaterial?(p.color.value.copy(x.color),p.opacity.value=x.opacity):x.isShaderMaterial&&(x.uniformsNeedUpdate=!1)}function r(p,x){p.opacity.value=x.opacity,x.color&&p.diffuse.value.copy(x.color),x.emissive&&p.emissive.value.copy(x.emissive).multiplyScalar(x.emissiveIntensity),x.map&&(p.map.value=x.map,t(x.map,p.mapTransform)),x.alphaMap&&(p.alphaMap.value=x.alphaMap,t(x.alphaMap,p.alphaMapTransform)),x.bumpMap&&(p.bumpMap.value=x.bumpMap,t(x.bumpMap,p.bumpMapTransform),p.bumpScale.value=x.bumpScale,x.side===Ft&&(p.bumpScale.value*=-1)),x.normalMap&&(p.normalMap.value=x.normalMap,t(x.normalMap,p.normalMapTransform),p.normalScale.value.copy(x.normalScale),x.side===Ft&&p.normalScale.value.negate()),x.displacementMap&&(p.displacementMap.value=x.displacementMap,t(x.displacementMap,p.displacementMapTransform),p.displacementScale.value=x.displacementScale,p.displacementBias.value=x.displacementBias),x.emissiveMap&&(p.emissiveMap.value=x.emissiveMap,t(x.emissiveMap,p.emissiveMapTransform)),x.specularMap&&(p.specularMap.value=x.specularMap,t(x.specularMap,p.specularMapTransform)),x.alphaTest>0&&(p.alphaTest.value=x.alphaTest);const y=e.get(x),g=y.envMap,M=y.envMapRotation;g&&(p.envMap.value=g,p.envMapRotation.value.setFromMatrix4(V0.makeRotationFromEuler(M)).transpose(),g.isCubeTexture&&g.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(Y1),p.reflectivity.value=x.reflectivity,p.ior.value=x.ior,p.refractionRatio.value=x.refractionRatio),x.lightMap&&(p.lightMap.value=x.lightMap,p.lightMapIntensity.value=x.lightMapIntensity,t(x.lightMap,p.lightMapTransform)),x.aoMap&&(p.aoMap.value=x.aoMap,p.aoMapIntensity.value=x.aoMapIntensity,t(x.aoMap,p.aoMapTransform))}function o(p,x){p.diffuse.value.copy(x.color),p.opacity.value=x.opacity,x.map&&(p.map.value=x.map,t(x.map,p.mapTransform))}function a(p,x){p.dashSize.value=x.dashSize,p.totalSize.value=x.dashSize+x.gapSize,p.scale.value=x.scale}function l(p,x,y,g){p.diffuse.value.copy(x.color),p.opacity.value=x.opacity,p.size.value=x.size*y,p.scale.value=g*.5,x.map&&(p.map.value=x.map,t(x.map,p.uvTransform)),x.alphaMap&&(p.alphaMap.value=x.alphaMap,t(x.alphaMap,p.alphaMapTransform)),x.alphaTest>0&&(p.alphaTest.value=x.alphaTest)}function d(p,x){p.diffuse.value.copy(x.color),p.opacity.value=x.opacity,p.rotation.value=x.rotation,x.map&&(p.map.value=x.map,t(x.map,p.mapTransform)),x.alphaMap&&(p.alphaMap.value=x.alphaMap,t(x.alphaMap,p.alphaMapTransform)),x.alphaTest>0&&(p.alphaTest.value=x.alphaTest)}function c(p,x){p.specular.value.copy(x.specular),p.shininess.value=Math.max(x.shininess,1e-4)}function u(p,x){x.gradientMap&&(p.gradientMap.value=x.gradientMap)}function h(p,x){p.metalness.value=x.metalness,x.metalnessMap&&(p.metalnessMap.value=x.metalnessMap,t(x.metalnessMap,p.metalnessMapTransform)),p.roughness.value=x.roughness,x.roughnessMap&&(p.roughnessMap.value=x.roughnessMap,t(x.roughnessMap,p.roughnessMapTransform)),x.envMap&&(p.envMapIntensity.value=x.envMapIntensity)}function f(p,x,y){p.ior.value=x.ior,x.sheen>0&&(p.sheenColor.value.copy(x.sheenColor).multiplyScalar(x.sheen),p.sheenRoughness.value=x.sheenRoughness,x.sheenColorMap&&(p.sheenColorMap.value=x.sheenColorMap,t(x.sheenColorMap,p.sheenColorMapTransform)),x.sheenRoughnessMap&&(p.sheenRoughnessMap.value=x.sheenRoughnessMap,t(x.sheenRoughnessMap,p.sheenRoughnessMapTransform))),x.clearcoat>0&&(p.clearcoat.value=x.clearcoat,p.clearcoatRoughness.value=x.clearcoatRoughness,x.clearcoatMap&&(p.clearcoatMap.value=x.clearcoatMap,t(x.clearcoatMap,p.clearcoatMapTransform)),x.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=x.clearcoatRoughnessMap,t(x.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),x.clearcoatNormalMap&&(p.clearcoatNormalMap.value=x.clearcoatNormalMap,t(x.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(x.clearcoatNormalScale),x.side===Ft&&p.clearcoatNormalScale.value.negate())),x.dispersion>0&&(p.dispersion.value=x.dispersion),x.iridescence>0&&(p.iridescence.value=x.iridescence,p.iridescenceIOR.value=x.iridescenceIOR,p.iridescenceThicknessMinimum.value=x.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=x.iridescenceThicknessRange[1],x.iridescenceMap&&(p.iridescenceMap.value=x.iridescenceMap,t(x.iridescenceMap,p.iridescenceMapTransform)),x.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=x.iridescenceThicknessMap,t(x.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),x.transmission>0&&(p.transmission.value=x.transmission,p.transmissionSamplerMap.value=y.texture,p.transmissionSamplerSize.value.set(y.width,y.height),x.transmissionMap&&(p.transmissionMap.value=x.transmissionMap,t(x.transmissionMap,p.transmissionMapTransform)),p.thickness.value=x.thickness,x.thicknessMap&&(p.thicknessMap.value=x.thicknessMap,t(x.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=x.attenuationDistance,p.attenuationColor.value.copy(x.attenuationColor)),x.anisotropy>0&&(p.anisotropyVector.value.set(x.anisotropy*Math.cos(x.anisotropyRotation),x.anisotropy*Math.sin(x.anisotropyRotation)),x.anisotropyMap&&(p.anisotropyMap.value=x.anisotropyMap,t(x.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=x.specularIntensity,p.specularColor.value.copy(x.specularColor),x.specularColorMap&&(p.specularColorMap.value=x.specularColorMap,t(x.specularColorMap,p.specularColorMapTransform)),x.specularIntensityMap&&(p.specularIntensityMap.value=x.specularIntensityMap,t(x.specularIntensityMap,p.specularIntensityMapTransform))}function S(p,x){x.matcap&&(p.matcap.value=x.matcap)}function C(p,x){const y=e.get(x).light;p.referencePosition.value.setFromMatrixPosition(y.matrixWorld),p.nearDistance.value=y.shadow.camera.near,p.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:n}}function W0(s,e,t,i){let n={},r={},o=[];const a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,g){const M=g.program;i.uniformBlockBinding(y,M)}function d(y,g){let M=n[y.id];M===void 0&&(S(y),M=c(y),n[y.id]=M,y.addEventListener("dispose",p));const w=g.program;i.updateUBOMapping(y,w);const q=e.render.frame;r[y.id]!==q&&(h(y),r[y.id]=q)}function c(y){const g=u();y.__bindingPointIndex=g;const M=s.createBuffer(),w=y.__size,q=y.usage;return s.bindBuffer(s.UNIFORM_BUFFER,M),s.bufferData(s.UNIFORM_BUFFER,w,q),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,g,M),M}function u(){for(let y=0;y<a;y++)if(o.indexOf(y)===-1)return o.push(y),y;return Ze("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(y){const g=n[y.id],M=y.uniforms,w=y.__cache;s.bindBuffer(s.UNIFORM_BUFFER,g);for(let q=0,E=M.length;q<E;q++){const m=Array.isArray(M[q])?M[q]:[M[q]];for(let _=0,A=m.length;_<A;_++){const T=m[_];if(f(T,q,_,w)===!0){const R=T.__offset,B=Array.isArray(T.value)?T.value:[T.value];let V=0;for(let P=0;P<B.length;P++){const D=B[P],N=C(D);typeof D=="number"||typeof D=="boolean"?(T.__data[0]=D,s.bufferSubData(s.UNIFORM_BUFFER,R+V,T.__data)):D.isMatrix3?(T.__data[0]=D.elements[0],T.__data[1]=D.elements[1],T.__data[2]=D.elements[2],T.__data[3]=0,T.__data[4]=D.elements[3],T.__data[5]=D.elements[4],T.__data[6]=D.elements[5],T.__data[7]=0,T.__data[8]=D.elements[6],T.__data[9]=D.elements[7],T.__data[10]=D.elements[8],T.__data[11]=0):ArrayBuffer.isView(D)?T.__data.set(new D.constructor(D.buffer,D.byteOffset,T.__data.length)):(D.toArray(T.__data,V),V+=N.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,R,T.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function f(y,g,M,w){const q=y.value,E=g+"_"+M;if(w[E]===void 0)return typeof q=="number"||typeof q=="boolean"?w[E]=q:ArrayBuffer.isView(q)?w[E]=q.slice():w[E]=q.clone(),!0;{const m=w[E];if(typeof q=="number"||typeof q=="boolean"){if(m!==q)return w[E]=q,!0}else{if(ArrayBuffer.isView(q))return!0;if(m.equals(q)===!1)return m.copy(q),!0}}return!1}function S(y){const g=y.uniforms;let M=0;const w=16;for(let E=0,m=g.length;E<m;E++){const _=Array.isArray(g[E])?g[E]:[g[E]];for(let A=0,T=_.length;A<T;A++){const R=_[A],B=Array.isArray(R.value)?R.value:[R.value];for(let V=0,P=B.length;V<P;V++){const D=B[V],N=C(D),W=M%w,X=W%N.boundary,te=W+X;M+=X,te!==0&&w-te<N.storage&&(M+=w-te),R.__data=new Float32Array(N.storage/Float32Array.BYTES_PER_ELEMENT),R.__offset=M,M+=N.storage}}}const q=M%w;return q>0&&(M+=w-q),y.__size=M,y.__cache={},this}function C(y){const g={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(g.boundary=4,g.storage=4):y.isVector2?(g.boundary=8,g.storage=8):y.isVector3||y.isColor?(g.boundary=16,g.storage=12):y.isVector4?(g.boundary=16,g.storage=16):y.isMatrix3?(g.boundary=48,g.storage=48):y.isMatrix4?(g.boundary=64,g.storage=64):y.isTexture?Pe("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(y)?(g.boundary=16,g.storage=y.byteLength):Pe("WebGLRenderer: Unsupported uniform value type.",y),g}function p(y){const g=y.target;g.removeEventListener("dispose",p);const M=o.indexOf(g.__bindingPointIndex);o.splice(M,1),s.deleteBuffer(n[g.id]),delete n[g.id],delete r[g.id]}function x(){for(const y in n)s.deleteBuffer(n[y]);o=[],n={},r={}}return{bind:l,update:d,dispose:x}}const X0=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let ci=null;function Y0(){return ci===null&&(ci=new ya(X0,16,16,ss,qt),ci.name="DFG_LUT",ci.minFilter=Tt,ci.magFilter=Tt,ci.wrapS=_i,ci.wrapT=_i,ci.generateMipmaps=!1,ci.needsUpdate=!0),ci}class j0{constructor(e={}){const{canvas:t=J2(),context:i=null,depth:n=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:d=!1,powerPreference:c="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:h=!1,outputBufferType:f=Ut}=e;this.isWebGLRenderer=!0;let S;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");S=i.getContextAttributes().alpha}else S=o;const C=f,p=new Set([ha,ca,la]),x=new Set([Ut,pi,Qs,ws,aa,da]),y=new Uint32Array(4),g=new Int32Array(4),M=new U;let w=null,q=null;const E=[],m=[];let _=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=xi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const A=this;let T=!1,R=null;this._outputColorSpace=Xt;let B=0,V=0,P=null,D=-1,N=null;const W=new pt,X=new pt;let te=null;const ne=new Ge(0);let de=0,Ae=t.width,Fe=t.height,Te=1,j=null,re=null;const Q=new pt(0,0,Ae,Fe),pe=new pt(0,0,Ae,Fe);let ye=!1;const ve=new ma;let Je=!1,Le=!1;const Xe=new dt,Ye=new U,we=new pt,ct={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let st=!1;function Et(){return P===null?Te:1}let I=i;function ht(v,F){return t.getContext(v,F)}try{const v={alpha:!0,depth:n,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:d,powerPreference:c,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Qo}`),t.addEventListener("webglcontextlost",ee,!1),t.addEventListener("webglcontextrestored",Me,!1),t.addEventListener("webglcontextcreationerror",Ne,!1),I===null){const F="webgl2";if(I=ht(F,v),I===null)throw ht(F)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(v){throw Ze("WebGLRenderer: "+v.message),v}let Oe,Qe,he,ot,b,z,O,Z,$,ie,le,Y,J,fe,Ce,oe,se,Re,De,Ve,L,ae,K;function me(){Oe=new X3(I),Oe.init(),L=new F0(I,Oe),Qe=new F3(I,Oe,e,L),he=new N0(I,Oe),Qe.reversedDepthBuffer&&h&&he.buffers.depth.setReversed(!0),ot=new Z3(I),b=new q0,z=new U0(I,Oe,he,b,Qe,L,ot),O=new W3(A),Z=new $c(I),ae=new N3(I,Z),$=new Y3(I,Z,ot,ae),ie=new J3(I,$,Z,ae,ot),Re=new K3(I,Qe,z),Ce=new O3(b),le=new g0(A,O,Oe,Qe,ae,Ce),Y=new k0(A,b),J=new v0,fe=new w0(Oe),se=new I3(A,O,he,ie,S,l),oe=new I0(A,ie,Qe),K=new W0(I,ot,Qe,he),De=new U3(I,Oe,ot),Ve=new j3(I,Oe,ot),ot.programs=le.programs,A.capabilities=Qe,A.extensions=Oe,A.properties=b,A.renderLists=J,A.shadowMap=oe,A.state=he,A.info=ot}me(),C!==Ut&&(_=new $3(C,t.width,t.height,n,r));const ce=new G0(A,I);this.xr=ce,this.getContext=function(){return I},this.getContextAttributes=function(){return I.getContextAttributes()},this.forceContextLoss=function(){const v=Oe.get("WEBGL_lose_context");v&&v.loseContext()},this.forceContextRestore=function(){const v=Oe.get("WEBGL_lose_context");v&&v.restoreContext()},this.getPixelRatio=function(){return Te},this.setPixelRatio=function(v){v!==void 0&&(Te=v,this.setSize(Ae,Fe,!1))},this.getSize=function(v){return v.set(Ae,Fe)},this.setSize=function(v,F,k=!0){if(ce.isPresenting){Pe("WebGLRenderer: Can't change size while VR device is presenting.");return}Ae=v,Fe=F,t.width=Math.floor(v*Te),t.height=Math.floor(F*Te),k===!0&&(t.style.width=v+"px",t.style.height=F+"px"),_!==null&&_.setSize(t.width,t.height),this.setViewport(0,0,v,F)},this.getDrawingBufferSize=function(v){return v.set(Ae*Te,Fe*Te).floor()},this.setDrawingBufferSize=function(v,F,k){Ae=v,Fe=F,Te=k,t.width=Math.floor(v*k),t.height=Math.floor(F*k),this.setViewport(0,0,v,F)},this.setEffects=function(v){if(C===Ut){Ze("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(v){for(let F=0;F<v.length;F++)if(v[F].isOutputPass===!0){Pe("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}_.setEffects(v||[])},this.getCurrentViewport=function(v){return v.copy(W)},this.getViewport=function(v){return v.copy(Q)},this.setViewport=function(v,F,k,H){v.isVector4?Q.set(v.x,v.y,v.z,v.w):Q.set(v,F,k,H),he.viewport(W.copy(Q).multiplyScalar(Te).round())},this.getScissor=function(v){return v.copy(pe)},this.setScissor=function(v,F,k,H){v.isVector4?pe.set(v.x,v.y,v.z,v.w):pe.set(v,F,k,H),he.scissor(X.copy(pe).multiplyScalar(Te).round())},this.getScissorTest=function(){return ye},this.setScissorTest=function(v){he.setScissorTest(ye=v)},this.setOpaqueSort=function(v){j=v},this.setTransparentSort=function(v){re=v},this.getClearColor=function(v){return v.copy(se.getClearColor())},this.setClearColor=function(){se.setClearColor(...arguments)},this.getClearAlpha=function(){return se.getClearAlpha()},this.setClearAlpha=function(){se.setClearAlpha(...arguments)},this.clear=function(v=!0,F=!0,k=!0){let H=0;if(v){let G=!1;if(P!==null){const Se=P.texture.format;G=p.has(Se)}if(G){const Se=P.texture.type,ge=x.has(Se),xe=se.getClearColor(),qe=se.getClearAlpha(),be=xe.r,Ue=xe.g,He=xe.b;ge?(y[0]=be,y[1]=Ue,y[2]=He,y[3]=qe,I.clearBufferuiv(I.COLOR,0,y)):(g[0]=be,g[1]=Ue,g[2]=He,g[3]=qe,I.clearBufferiv(I.COLOR,0,g))}else H|=I.COLOR_BUFFER_BIT}F&&(H|=I.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),k&&(H|=I.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),H!==0&&I.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(v){v.setRenderer(this),R=v},this.dispose=function(){t.removeEventListener("webglcontextlost",ee,!1),t.removeEventListener("webglcontextrestored",Me,!1),t.removeEventListener("webglcontextcreationerror",Ne,!1),se.dispose(),J.dispose(),fe.dispose(),b.dispose(),O.dispose(),ie.dispose(),ae.dispose(),K.dispose(),le.dispose(),ce.dispose(),ce.removeEventListener("sessionstart",Ea),ce.removeEventListener("sessionend",Ta),Wi.stop()};function ee(v){v.preventDefault(),Qa("WebGLRenderer: Context Lost."),T=!0}function Me(){Qa("WebGLRenderer: Context Restored."),T=!1;const v=ot.autoReset,F=oe.enabled,k=oe.autoUpdate,H=oe.needsUpdate,G=oe.type;me(),ot.autoReset=v,oe.enabled=F,oe.autoUpdate=k,oe.needsUpdate=H,oe.type=G}function Ne(v){Ze("WebGLRenderer: A WebGL context could not be created. Reason: ",v.statusMessage)}function St(v){const F=v.target;F.removeEventListener("dispose",St),et(F)}function et(v){Si(v),b.remove(v)}function Si(v){const F=b.get(v).programs;F!==void 0&&(F.forEach(function(k){le.releaseProgram(k)}),v.isShaderMaterial&&le.releaseShaderCache(v))}this.renderBufferDirect=function(v,F,k,H,G,Se){F===null&&(F=ct);const ge=G.isMesh&&G.matrixWorld.determinant()<0,xe=Q1(v,F,k,H,G);he.setMaterial(H,ge);let qe=k.index,be=1;if(H.wireframe===!0){if(qe=$.getWireframeAttribute(k),qe===void 0)return;be=2}const Ue=k.drawRange,He=k.attributes.position;let Ee=Ue.start*be,tt=(Ue.start+Ue.count)*be;Se!==null&&(Ee=Math.max(Ee,Se.start*be),tt=Math.min(tt,(Se.start+Se.count)*be)),qe!==null?(Ee=Math.max(Ee,0),tt=Math.min(tt,qe.count)):He!=null&&(Ee=Math.max(Ee,0),tt=Math.min(tt,He.count));const yt=tt-Ee;if(yt<0||yt===1/0)return;ae.setup(G,H,xe,k,qe);let ut,nt=De;if(qe!==null&&(ut=Z.get(qe),nt=Ve,nt.setIndex(ut)),G.isMesh)H.wireframe===!0?(he.setLineWidth(H.wireframeLinewidth*Et()),nt.setMode(I.LINES)):nt.setMode(I.TRIANGLES);else if(G.isLine){let wt=H.linewidth;wt===void 0&&(wt=1),he.setLineWidth(wt*Et()),G.isLineSegments?nt.setMode(I.LINES):G.isLineLoop?nt.setMode(I.LINE_LOOP):nt.setMode(I.LINE_STRIP)}else G.isPoints?nt.setMode(I.POINTS):G.isSprite&&nt.setMode(I.TRIANGLES);if(G.isBatchedMesh)if(Oe.get("WEBGL_multi_draw"))nt.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else{const wt=G._multiDrawStarts,ze=G._multiDrawCounts,Ot=G._multiDrawCount,je=qe?Z.get(qe).bytesPerElement:1,kt=b.get(H).currentProgram.getUniforms();for(let di=0;di<Ot;di++)kt.setValue(I,"_gl_DrawID",di),nt.render(wt[di]/je,ze[di])}else if(G.isInstancedMesh)nt.renderInstances(Ee,yt,G.count);else if(k.isInstancedBufferGeometry){const wt=k._maxInstanceCount!==void 0?k._maxInstanceCount:1/0,ze=Math.min(k.instanceCount,wt);nt.renderInstances(Ee,yt,ze)}else nt.render(Ee,yt)};function ai(v,F,k){v.transparent===!0&&v.side===Vt&&v.forceSinglePass===!1?(v.side=Ft,v.needsUpdate=!0,rn(v,F,k),v.side=Hi,v.needsUpdate=!0,rn(v,F,k),v.side=Vt):rn(v,F,k)}this.compile=function(v,F,k=null){k===null&&(k=v),q=fe.get(k),q.init(F),m.push(q),k.traverseVisible(function(G){G.isLight&&G.layers.test(F.layers)&&(q.pushLight(G),G.castShadow&&q.pushShadow(G))}),v!==k&&v.traverseVisible(function(G){G.isLight&&G.layers.test(F.layers)&&(q.pushLight(G),G.castShadow&&q.pushShadow(G))}),q.setupLights();const H=new Set;return v.traverse(function(G){if(!(G.isMesh||G.isPoints||G.isLine||G.isSprite))return;const Se=G.material;if(Se)if(Array.isArray(Se))for(let ge=0;ge<Se.length;ge++){const xe=Se[ge];ai(xe,k,G),H.add(xe)}else ai(Se,k,G),H.add(Se)}),q=m.pop(),H},this.compileAsync=function(v,F,k=null){const H=this.compile(v,F,k);return new Promise(G=>{function Se(){if(H.forEach(function(ge){b.get(ge).currentProgram.isReady()&&H.delete(ge)}),H.size===0){G(v);return}setTimeout(Se,10)}Oe.get("KHR_parallel_shader_compile")!==null?Se():setTimeout(Se,10)})};let rr=null;function K1(v){rr&&rr(v)}function Ea(){Wi.stop()}function Ta(){Wi.start()}const Wi=new B1;Wi.setAnimationLoop(K1),typeof self<"u"&&Wi.setContext(self),this.setAnimationLoop=function(v){rr=v,ce.setAnimationLoop(v),v===null?Wi.stop():Wi.start()},ce.addEventListener("sessionstart",Ea),ce.addEventListener("sessionend",Ta),this.render=function(v,F){if(F!==void 0&&F.isCamera!==!0){Ze("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(T===!0)return;R!==null&&R.renderStart(v,F);const k=ce.enabled===!0&&ce.isPresenting===!0,H=_!==null&&(P===null||k)&&_.begin(A,P);if(v.matrixWorldAutoUpdate===!0&&v.updateMatrixWorld(),F.parent===null&&F.matrixWorldAutoUpdate===!0&&F.updateMatrixWorld(),ce.enabled===!0&&ce.isPresenting===!0&&(_===null||_.isCompositing()===!1)&&(ce.cameraAutoUpdate===!0&&ce.updateCamera(F),F=ce.getCamera()),v.isScene===!0&&v.onBeforeRender(A,v,F,P),q=fe.get(v,m.length),q.init(F),q.state.textureUnits=z.getTextureUnits(),m.push(q),Xe.multiplyMatrices(F.projectionMatrix,F.matrixWorldInverse),ve.setFromProjectionMatrix(Xe,fi,F.reversedDepth),Le=this.localClippingEnabled,Je=Ce.init(this.clippingPlanes,Le),w=J.get(v,E.length),w.init(),E.push(w),ce.enabled===!0&&ce.isPresenting===!0){const ge=A.xr.getDepthSensingMesh();ge!==null&&or(ge,F,-1/0,A.sortObjects)}or(v,F,0,A.sortObjects),w.finish(),A.sortObjects===!0&&w.sort(j,re),st=ce.enabled===!1||ce.isPresenting===!1||ce.hasDepthSensing()===!1,st&&se.addToRenderList(w,v),this.info.render.frame++,Je===!0&&Ce.beginShadows();const G=q.state.shadowsArray;if(oe.render(G,v,F),Je===!0&&Ce.endShadows(),this.info.autoReset===!0&&this.info.reset(),(H&&_.hasRenderPass())===!1){const ge=w.opaque,xe=w.transmissive;if(q.setupLights(),F.isArrayCamera){const qe=F.cameras;if(xe.length>0)for(let be=0,Ue=qe.length;be<Ue;be++){const He=qe[be];wa(ge,xe,v,He)}st&&se.render(v);for(let be=0,Ue=qe.length;be<Ue;be++){const He=qe[be];Aa(w,v,He,He.viewport)}}else xe.length>0&&wa(ge,xe,v,F),st&&se.render(v),Aa(w,v,F)}P!==null&&V===0&&(z.updateMultisampleRenderTarget(P),z.updateRenderTargetMipmap(P)),H&&_.end(A),v.isScene===!0&&v.onAfterRender(A,v,F),ae.resetDefaultState(),D=-1,N=null,m.pop(),m.length>0?(q=m[m.length-1],z.setTextureUnits(q.state.textureUnits),Je===!0&&Ce.setGlobalState(A.clippingPlanes,q.state.camera)):q=null,E.pop(),E.length>0?w=E[E.length-1]:w=null,R!==null&&R.renderEnd()};function or(v,F,k,H){if(v.visible===!1)return;if(v.layers.test(F.layers)){if(v.isGroup)k=v.renderOrder;else if(v.isLOD)v.autoUpdate===!0&&v.update(F);else if(v.isLightProbeGrid)q.pushLightProbeGrid(v);else if(v.isLight)q.pushLight(v),v.castShadow&&q.pushShadow(v);else if(v.isSprite){if(!v.frustumCulled||ve.intersectsSprite(v)){H&&we.setFromMatrixPosition(v.matrixWorld).applyMatrix4(Xe);const ge=ie.update(v),xe=v.material;xe.visible&&w.push(v,ge,xe,k,we.z,null)}}else if((v.isMesh||v.isLine||v.isPoints)&&(!v.frustumCulled||ve.intersectsObject(v))){const ge=ie.update(v),xe=v.material;if(H&&(v.boundingSphere!==void 0?(v.boundingSphere===null&&v.computeBoundingSphere(),we.copy(v.boundingSphere.center)):(ge.boundingSphere===null&&ge.computeBoundingSphere(),we.copy(ge.boundingSphere.center)),we.applyMatrix4(v.matrixWorld).applyMatrix4(Xe)),Array.isArray(xe)){const qe=ge.groups;for(let be=0,Ue=qe.length;be<Ue;be++){const He=qe[be],Ee=xe[He.materialIndex];Ee&&Ee.visible&&w.push(v,ge,Ee,k,we.z,He)}}else xe.visible&&w.push(v,ge,xe,k,we.z,null)}}const Se=v.children;for(let ge=0,xe=Se.length;ge<xe;ge++)or(Se[ge],F,k,H)}function Aa(v,F,k,H){const{opaque:G,transmissive:Se,transparent:ge}=v;q.setupLightsView(k),Je===!0&&Ce.setGlobalState(A.clippingPlanes,k),H&&he.viewport(W.copy(H)),G.length>0&&nn(G,F,k),Se.length>0&&nn(Se,F,k),ge.length>0&&nn(ge,F,k),he.buffers.depth.setTest(!0),he.buffers.depth.setMask(!0),he.buffers.color.setMask(!0),he.setPolygonOffset(!1)}function wa(v,F,k,H){if((k.isScene===!0?k.overrideMaterial:null)!==null)return;if(q.state.transmissionRenderTarget[H.id]===void 0){const Ee=Oe.has("EXT_color_buffer_half_float")||Oe.has("EXT_color_buffer_float");q.state.transmissionRenderTarget[H.id]=new xt(1,1,{generateMipmaps:!0,type:Ee?qt:Ut,minFilter:Qi,samples:Math.max(4,Qe.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:We.workingColorSpace})}const Se=q.state.transmissionRenderTarget[H.id],ge=H.viewport||W;Se.setSize(ge.z*A.transmissionResolutionScale,ge.w*A.transmissionResolutionScale);const xe=A.getRenderTarget(),qe=A.getActiveCubeFace(),be=A.getActiveMipmapLevel();A.setRenderTarget(Se),A.getClearColor(ne),de=A.getClearAlpha(),de<1&&A.setClearColor(16777215,.5),A.clear(),st&&se.render(k);const Ue=A.toneMapping;A.toneMapping=xi;const He=H.viewport;if(H.viewport!==void 0&&(H.viewport=void 0),q.setupLightsView(H),Je===!0&&Ce.setGlobalState(A.clippingPlanes,H),nn(v,k,H),z.updateMultisampleRenderTarget(Se),z.updateRenderTargetMipmap(Se),Oe.has("WEBGL_multisampled_render_to_texture")===!1){let Ee=!1;for(let tt=0,yt=F.length;tt<yt;tt++){const ut=F[tt],{object:nt,geometry:wt,material:ze,group:Ot}=ut;if(ze.side===Vt&&nt.layers.test(H.layers)){const je=ze.side;ze.side=Ft,ze.needsUpdate=!0,Ra(nt,k,H,wt,ze,Ot),ze.side=je,ze.needsUpdate=!0,Ee=!0}}Ee===!0&&(z.updateMultisampleRenderTarget(Se),z.updateRenderTargetMipmap(Se))}A.setRenderTarget(xe,qe,be),A.setClearColor(ne,de),He!==void 0&&(H.viewport=He),A.toneMapping=Ue}function nn(v,F,k){const H=F.isScene===!0?F.overrideMaterial:null;for(let G=0,Se=v.length;G<Se;G++){const ge=v[G],{object:xe,geometry:qe,group:be}=ge;let Ue=ge.material;Ue.allowOverride===!0&&H!==null&&(Ue=H),xe.layers.test(k.layers)&&Ra(xe,F,k,qe,Ue,be)}}function Ra(v,F,k,H,G,Se){v.onBeforeRender(A,F,k,H,G,Se),v.modelViewMatrix.multiplyMatrices(k.matrixWorldInverse,v.matrixWorld),v.normalMatrix.getNormalMatrix(v.modelViewMatrix),G.onBeforeRender(A,F,k,H,v,Se),G.transparent===!0&&G.side===Vt&&G.forceSinglePass===!1?(G.side=Ft,G.needsUpdate=!0,A.renderBufferDirect(k,F,H,G,v,Se),G.side=Hi,G.needsUpdate=!0,A.renderBufferDirect(k,F,H,G,v,Se),G.side=Vt):A.renderBufferDirect(k,F,H,G,v,Se),v.onAfterRender(A,F,k,H,G,Se)}function rn(v,F,k){F.isScene!==!0&&(F=ct);const H=b.get(v),G=q.state.lights,Se=q.state.shadowsArray,ge=G.state.version,xe=le.getParameters(v,G.state,Se,F,k,q.state.lightProbeGridArray),qe=le.getProgramCacheKey(xe);let be=H.programs;H.environment=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?F.environment:null,H.fog=F.fog;const Ue=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap;H.envMap=O.get(v.envMap||H.environment,Ue),H.envMapRotation=H.environment!==null&&v.envMap===null?F.environmentRotation:v.envMapRotation,be===void 0&&(v.addEventListener("dispose",St),be=new Map,H.programs=be);let He=be.get(qe);if(He!==void 0){if(H.currentProgram===He&&H.lightsStateVersion===ge)return Da(v,xe),He}else xe.uniforms=le.getUniforms(v),R!==null&&v.isNodeMaterial&&R.build(v,k,xe),v.onBeforeCompile(xe,A),He=le.acquireProgram(xe,qe),be.set(qe,He),H.uniforms=xe.uniforms;const Ee=H.uniforms;return(!v.isShaderMaterial&&!v.isRawShaderMaterial||v.clipping===!0)&&(Ee.clippingPlanes=Ce.uniform),Da(v,xe),H.needsLights=el(v),H.lightsStateVersion=ge,H.needsLights&&(Ee.ambientLightColor.value=G.state.ambient,Ee.lightProbe.value=G.state.probe,Ee.directionalLights.value=G.state.directional,Ee.directionalLightShadows.value=G.state.directionalShadow,Ee.spotLights.value=G.state.spot,Ee.spotLightShadows.value=G.state.spotShadow,Ee.rectAreaLights.value=G.state.rectArea,Ee.ltc_1.value=G.state.rectAreaLTC1,Ee.ltc_2.value=G.state.rectAreaLTC2,Ee.pointLights.value=G.state.point,Ee.pointLightShadows.value=G.state.pointShadow,Ee.hemisphereLights.value=G.state.hemi,Ee.directionalShadowMatrix.value=G.state.directionalShadowMatrix,Ee.spotLightMatrix.value=G.state.spotLightMatrix,Ee.spotLightMap.value=G.state.spotLightMap,Ee.pointShadowMatrix.value=G.state.pointShadowMatrix),H.lightProbeGrid=q.state.lightProbeGridArray.length>0,H.currentProgram=He,H.uniformsList=null,He}function Pa(v){if(v.uniformsList===null){const F=v.currentProgram.getUniforms();v.uniformsList=Gn.seqWithValue(F.seq,v.uniforms)}return v.uniformsList}function Da(v,F){const k=b.get(v);k.outputColorSpace=F.outputColorSpace,k.batching=F.batching,k.batchingColor=F.batchingColor,k.instancing=F.instancing,k.instancingColor=F.instancingColor,k.instancingMorph=F.instancingMorph,k.skinning=F.skinning,k.morphTargets=F.morphTargets,k.morphNormals=F.morphNormals,k.morphColors=F.morphColors,k.morphTargetsCount=F.morphTargetsCount,k.numClippingPlanes=F.numClippingPlanes,k.numIntersection=F.numClipIntersection,k.vertexAlphas=F.vertexAlphas,k.vertexTangents=F.vertexTangents,k.toneMapping=F.toneMapping}function J1(v,F){if(v.length===0)return null;if(v.length===1)return v[0].texture!==null?v[0]:null;M.setFromMatrixPosition(F.matrixWorld);for(let k=0,H=v.length;k<H;k++){const G=v[k];if(G.texture!==null&&G.boundingBox.containsPoint(M))return G}return null}function Q1(v,F,k,H,G){F.isScene!==!0&&(F=ct),z.resetTextureUnits();const Se=F.fog,ge=H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial?F.environment:null,xe=P===null?A.outputColorSpace:P.isXRRenderTarget===!0?P.texture.colorSpace:We.workingColorSpace,qe=H.isMeshStandardMaterial||H.isMeshLambertMaterial&&!H.envMap||H.isMeshPhongMaterial&&!H.envMap,be=O.get(H.envMap||ge,qe),Ue=H.vertexColors===!0&&!!k.attributes.color&&k.attributes.color.itemSize===4,He=!!k.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),Ee=!!k.morphAttributes.position,tt=!!k.morphAttributes.normal,yt=!!k.morphAttributes.color;let ut=xi;H.toneMapped&&(P===null||P.isXRRenderTarget===!0)&&(ut=A.toneMapping);const nt=k.morphAttributes.position||k.morphAttributes.normal||k.morphAttributes.color,wt=nt!==void 0?nt.length:0,ze=b.get(H),Ot=q.state.lights;if(Je===!0&&(Le===!0||v!==N)){const at=v===N&&H.id===D;Ce.setState(H,v,at)}let je=!1;H.version===ze.__version?(ze.needsLights&&ze.lightsStateVersion!==Ot.state.version||ze.outputColorSpace!==xe||G.isBatchedMesh&&ze.batching===!1||!G.isBatchedMesh&&ze.batching===!0||G.isBatchedMesh&&ze.batchingColor===!0&&G.colorTexture===null||G.isBatchedMesh&&ze.batchingColor===!1&&G.colorTexture!==null||G.isInstancedMesh&&ze.instancing===!1||!G.isInstancedMesh&&ze.instancing===!0||G.isSkinnedMesh&&ze.skinning===!1||!G.isSkinnedMesh&&ze.skinning===!0||G.isInstancedMesh&&ze.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&ze.instancingColor===!1&&G.instanceColor!==null||G.isInstancedMesh&&ze.instancingMorph===!0&&G.morphTexture===null||G.isInstancedMesh&&ze.instancingMorph===!1&&G.morphTexture!==null||ze.envMap!==be||H.fog===!0&&ze.fog!==Se||ze.numClippingPlanes!==void 0&&(ze.numClippingPlanes!==Ce.numPlanes||ze.numIntersection!==Ce.numIntersection)||ze.vertexAlphas!==Ue||ze.vertexTangents!==He||ze.morphTargets!==Ee||ze.morphNormals!==tt||ze.morphColors!==yt||ze.toneMapping!==ut||ze.morphTargetsCount!==wt||!!ze.lightProbeGrid!=q.state.lightProbeGridArray.length>0)&&(je=!0):(je=!0,ze.__version=H.version);let kt=ze.currentProgram;je===!0&&(kt=rn(H,F,G),R&&H.isNodeMaterial&&R.onUpdateProgram(H,kt,ze));let di=!1,Ei=!1,rs=!1;const rt=kt.getUniforms(),mt=ze.uniforms;if(he.useProgram(kt.program)&&(di=!0,Ei=!0,rs=!0),H.id!==D&&(D=H.id,Ei=!0),ze.needsLights){const at=J1(q.state.lightProbeGridArray,G);ze.lightProbeGrid!==at&&(ze.lightProbeGrid=at,Ei=!0)}if(di||N!==v){he.buffers.depth.getReversed()&&v.reversedDepth!==!0&&(v._reversedDepth=!0,v.updateProjectionMatrix()),rt.setValue(I,"projectionMatrix",v.projectionMatrix),rt.setValue(I,"viewMatrix",v.matrixWorldInverse);const Ai=rt.map.cameraPosition;Ai!==void 0&&Ai.setValue(I,Ye.setFromMatrixPosition(v.matrixWorld)),Qe.logarithmicDepthBuffer&&rt.setValue(I,"logDepthBufFC",2/(Math.log(v.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&rt.setValue(I,"isOrthographic",v.isOrthographicCamera===!0),N!==v&&(N=v,Ei=!0,rs=!0)}if(ze.needsLights&&(Ot.state.directionalShadowMap.length>0&&rt.setValue(I,"directionalShadowMap",Ot.state.directionalShadowMap,z),Ot.state.spotShadowMap.length>0&&rt.setValue(I,"spotShadowMap",Ot.state.spotShadowMap,z),Ot.state.pointShadowMap.length>0&&rt.setValue(I,"pointShadowMap",Ot.state.pointShadowMap,z)),G.isSkinnedMesh){rt.setOptional(I,G,"bindMatrix"),rt.setOptional(I,G,"bindMatrixInverse");const at=G.skeleton;at&&(at.boneTexture===null&&at.computeBoneTexture(),rt.setValue(I,"boneTexture",at.boneTexture,z))}G.isBatchedMesh&&(rt.setOptional(I,G,"batchingTexture"),rt.setValue(I,"batchingTexture",G._matricesTexture,z),rt.setOptional(I,G,"batchingIdTexture"),rt.setValue(I,"batchingIdTexture",G._indirectTexture,z),rt.setOptional(I,G,"batchingColorTexture"),G._colorsTexture!==null&&rt.setValue(I,"batchingColorTexture",G._colorsTexture,z));const Ti=k.morphAttributes;if((Ti.position!==void 0||Ti.normal!==void 0||Ti.color!==void 0)&&Re.update(G,k,kt),(Ei||ze.receiveShadow!==G.receiveShadow)&&(ze.receiveShadow=G.receiveShadow,rt.setValue(I,"receiveShadow",G.receiveShadow)),(H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial)&&H.envMap===null&&F.environment!==null&&(mt.envMapIntensity.value=F.environmentIntensity),mt.dfgLUT!==void 0&&(mt.dfgLUT.value=Y0()),Ei){if(rt.setValue(I,"toneMappingExposure",A.toneMappingExposure),ze.needsLights&&$1(mt,rs),Se&&H.fog===!0&&Y.refreshFogUniforms(mt,Se),Y.refreshMaterialUniforms(mt,H,Te,Fe,q.state.transmissionRenderTarget[v.id]),ze.needsLights&&ze.lightProbeGrid){const at=ze.lightProbeGrid;mt.probesSH.value=at.texture,mt.probesMin.value.copy(at.boundingBox.min),mt.probesMax.value.copy(at.boundingBox.max),mt.probesResolution.value.copy(at.resolution)}Gn.upload(I,Pa(ze),mt,z)}if(H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(Gn.upload(I,Pa(ze),mt,z),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&rt.setValue(I,"center",G.center),rt.setValue(I,"modelViewMatrix",G.modelViewMatrix),rt.setValue(I,"normalMatrix",G.normalMatrix),rt.setValue(I,"modelMatrix",G.matrixWorld),H.uniformsGroups!==void 0){const at=H.uniformsGroups;for(let Ai=0,os=at.length;Ai<os;Ai++){const La=at[Ai];K.update(La,kt),K.bind(La,kt)}}return kt}function $1(v,F){v.ambientLightColor.needsUpdate=F,v.lightProbe.needsUpdate=F,v.directionalLights.needsUpdate=F,v.directionalLightShadows.needsUpdate=F,v.pointLights.needsUpdate=F,v.pointLightShadows.needsUpdate=F,v.spotLights.needsUpdate=F,v.spotLightShadows.needsUpdate=F,v.rectAreaLights.needsUpdate=F,v.hemisphereLights.needsUpdate=F}function el(v){return v.isMeshLambertMaterial||v.isMeshToonMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isShadowMaterial||v.isShaderMaterial&&v.lights===!0}this.getActiveCubeFace=function(){return B},this.getActiveMipmapLevel=function(){return V},this.getRenderTarget=function(){return P},this.setRenderTargetTextures=function(v,F,k){const H=b.get(v);H.__autoAllocateDepthBuffer=v.resolveDepthBuffer===!1,H.__autoAllocateDepthBuffer===!1&&(H.__useRenderToTexture=!1),b.get(v.texture).__webglTexture=F,b.get(v.depthTexture).__webglTexture=H.__autoAllocateDepthBuffer?void 0:k,H.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(v,F){const k=b.get(v);k.__webglFramebuffer=F,k.__useDefaultFramebuffer=F===void 0};const tl=I.createFramebuffer();this.setRenderTarget=function(v,F=0,k=0){P=v,B=F,V=k;let H=null,G=!1,Se=!1;if(v){const xe=b.get(v);if(xe.__useDefaultFramebuffer!==void 0){he.bindFramebuffer(I.FRAMEBUFFER,xe.__webglFramebuffer),W.copy(v.viewport),X.copy(v.scissor),te=v.scissorTest,he.viewport(W),he.scissor(X),he.setScissorTest(te),D=-1;return}else if(xe.__webglFramebuffer===void 0)z.setupRenderTarget(v);else if(xe.__hasExternalTextures)z.rebindTextures(v,b.get(v.texture).__webglTexture,b.get(v.depthTexture).__webglTexture);else if(v.depthBuffer){const Ue=v.depthTexture;if(xe.__boundDepthTexture!==Ue){if(Ue!==null&&b.has(Ue)&&(v.width!==Ue.image.width||v.height!==Ue.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");z.setupDepthRenderbuffer(v)}}const qe=v.texture;(qe.isData3DTexture||qe.isDataArrayTexture||qe.isCompressedArrayTexture)&&(Se=!0);const be=b.get(v).__webglFramebuffer;v.isWebGLCubeRenderTarget?(Array.isArray(be[F])?H=be[F][k]:H=be[F],G=!0):v.samples>0&&z.useMultisampledRTT(v)===!1?H=b.get(v).__webglMultisampledFramebuffer:Array.isArray(be)?H=be[k]:H=be,W.copy(v.viewport),X.copy(v.scissor),te=v.scissorTest}else W.copy(Q).multiplyScalar(Te).floor(),X.copy(pe).multiplyScalar(Te).floor(),te=ye;if(k!==0&&(H=tl),he.bindFramebuffer(I.FRAMEBUFFER,H)&&he.drawBuffers(v,H),he.viewport(W),he.scissor(X),he.setScissorTest(te),G){const xe=b.get(v.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_CUBE_MAP_POSITIVE_X+F,xe.__webglTexture,k)}else if(Se){const xe=F;for(let qe=0;qe<v.textures.length;qe++){const be=b.get(v.textures[qe]);I.framebufferTextureLayer(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0+qe,be.__webglTexture,k,xe)}}else if(v!==null&&k!==0){const xe=b.get(v.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,xe.__webglTexture,k)}D=-1},this.readRenderTargetPixels=function(v,F,k,H,G,Se,ge,xe=0){if(!(v&&v.isWebGLRenderTarget)){Ze("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let qe=b.get(v).__webglFramebuffer;if(v.isWebGLCubeRenderTarget&&ge!==void 0&&(qe=qe[ge]),qe){he.bindFramebuffer(I.FRAMEBUFFER,qe);try{const be=v.textures[xe],Ue=be.format,He=be.type;if(v.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+xe),!Qe.textureFormatReadable(Ue)){Ze("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Qe.textureTypeReadable(He)){Ze("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}F>=0&&F<=v.width-H&&k>=0&&k<=v.height-G&&I.readPixels(F,k,H,G,L.convert(Ue),L.convert(He),Se)}finally{const be=P!==null?b.get(P).__webglFramebuffer:null;he.bindFramebuffer(I.FRAMEBUFFER,be)}}},this.readRenderTargetPixelsAsync=async function(v,F,k,H,G,Se,ge,xe=0){if(!(v&&v.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let qe=b.get(v).__webglFramebuffer;if(v.isWebGLCubeRenderTarget&&ge!==void 0&&(qe=qe[ge]),qe)if(F>=0&&F<=v.width-H&&k>=0&&k<=v.height-G){he.bindFramebuffer(I.FRAMEBUFFER,qe);const be=v.textures[xe],Ue=be.format,He=be.type;if(v.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+xe),!Qe.textureFormatReadable(Ue))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Qe.textureTypeReadable(He))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ee=I.createBuffer();I.bindBuffer(I.PIXEL_PACK_BUFFER,Ee),I.bufferData(I.PIXEL_PACK_BUFFER,Se.byteLength,I.STREAM_READ),I.readPixels(F,k,H,G,L.convert(Ue),L.convert(He),0);const tt=P!==null?b.get(P).__webglFramebuffer:null;he.bindFramebuffer(I.FRAMEBUFFER,tt);const yt=I.fenceSync(I.SYNC_GPU_COMMANDS_COMPLETE,0);return I.flush(),await Q2(I,yt,4),I.bindBuffer(I.PIXEL_PACK_BUFFER,Ee),I.getBufferSubData(I.PIXEL_PACK_BUFFER,0,Se),I.deleteBuffer(Ee),I.deleteSync(yt),Se}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(v,F=null,k=0){const H=Math.pow(2,-k),G=Math.floor(v.image.width*H),Se=Math.floor(v.image.height*H),ge=F!==null?F.x:0,xe=F!==null?F.y:0;z.setTexture2D(v,0),I.copyTexSubImage2D(I.TEXTURE_2D,k,0,0,ge,xe,G,Se),he.unbindTexture()};const il=I.createFramebuffer(),sl=I.createFramebuffer();this.copyTextureToTexture=function(v,F,k=null,H=null,G=0,Se=0){let ge,xe,qe,be,Ue,He,Ee,tt,yt;const ut=v.isCompressedTexture?v.mipmaps[Se]:v.image;if(k!==null)ge=k.max.x-k.min.x,xe=k.max.y-k.min.y,qe=k.isBox3?k.max.z-k.min.z:1,be=k.min.x,Ue=k.min.y,He=k.isBox3?k.min.z:0;else{const mt=Math.pow(2,-G);ge=Math.floor(ut.width*mt),xe=Math.floor(ut.height*mt),v.isDataArrayTexture?qe=ut.depth:v.isData3DTexture?qe=Math.floor(ut.depth*mt):qe=1,be=0,Ue=0,He=0}H!==null?(Ee=H.x,tt=H.y,yt=H.z):(Ee=0,tt=0,yt=0);const nt=L.convert(F.format),wt=L.convert(F.type);let ze;F.isData3DTexture?(z.setTexture3D(F,0),ze=I.TEXTURE_3D):F.isDataArrayTexture||F.isCompressedArrayTexture?(z.setTexture2DArray(F,0),ze=I.TEXTURE_2D_ARRAY):(z.setTexture2D(F,0),ze=I.TEXTURE_2D),he.activeTexture(I.TEXTURE0),he.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,F.flipY),he.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),he.pixelStorei(I.UNPACK_ALIGNMENT,F.unpackAlignment);const Ot=he.getParameter(I.UNPACK_ROW_LENGTH),je=he.getParameter(I.UNPACK_IMAGE_HEIGHT),kt=he.getParameter(I.UNPACK_SKIP_PIXELS),di=he.getParameter(I.UNPACK_SKIP_ROWS),Ei=he.getParameter(I.UNPACK_SKIP_IMAGES);he.pixelStorei(I.UNPACK_ROW_LENGTH,ut.width),he.pixelStorei(I.UNPACK_IMAGE_HEIGHT,ut.height),he.pixelStorei(I.UNPACK_SKIP_PIXELS,be),he.pixelStorei(I.UNPACK_SKIP_ROWS,Ue),he.pixelStorei(I.UNPACK_SKIP_IMAGES,He);const rs=v.isDataArrayTexture||v.isData3DTexture,rt=F.isDataArrayTexture||F.isData3DTexture;if(v.isDepthTexture){const mt=b.get(v),Ti=b.get(F),at=b.get(mt.__renderTarget),Ai=b.get(Ti.__renderTarget);he.bindFramebuffer(I.READ_FRAMEBUFFER,at.__webglFramebuffer),he.bindFramebuffer(I.DRAW_FRAMEBUFFER,Ai.__webglFramebuffer);for(let os=0;os<qe;os++)rs&&(I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,b.get(v).__webglTexture,G,He+os),I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,b.get(F).__webglTexture,Se,yt+os)),I.blitFramebuffer(be,Ue,ge,xe,Ee,tt,ge,xe,I.DEPTH_BUFFER_BIT,I.NEAREST);he.bindFramebuffer(I.READ_FRAMEBUFFER,null),he.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else if(G!==0||v.isRenderTargetTexture||b.has(v)){const mt=b.get(v),Ti=b.get(F);he.bindFramebuffer(I.READ_FRAMEBUFFER,il),he.bindFramebuffer(I.DRAW_FRAMEBUFFER,sl);for(let at=0;at<qe;at++)rs?I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,mt.__webglTexture,G,He+at):I.framebufferTexture2D(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,mt.__webglTexture,G),rt?I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,Ti.__webglTexture,Se,yt+at):I.framebufferTexture2D(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,Ti.__webglTexture,Se),G!==0?I.blitFramebuffer(be,Ue,ge,xe,Ee,tt,ge,xe,I.COLOR_BUFFER_BIT,I.NEAREST):rt?I.copyTexSubImage3D(ze,Se,Ee,tt,yt+at,be,Ue,ge,xe):I.copyTexSubImage2D(ze,Se,Ee,tt,be,Ue,ge,xe);he.bindFramebuffer(I.READ_FRAMEBUFFER,null),he.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else rt?v.isDataTexture||v.isData3DTexture?I.texSubImage3D(ze,Se,Ee,tt,yt,ge,xe,qe,nt,wt,ut.data):F.isCompressedArrayTexture?I.compressedTexSubImage3D(ze,Se,Ee,tt,yt,ge,xe,qe,nt,ut.data):I.texSubImage3D(ze,Se,Ee,tt,yt,ge,xe,qe,nt,wt,ut):v.isDataTexture?I.texSubImage2D(I.TEXTURE_2D,Se,Ee,tt,ge,xe,nt,wt,ut.data):v.isCompressedTexture?I.compressedTexSubImage2D(I.TEXTURE_2D,Se,Ee,tt,ut.width,ut.height,nt,ut.data):I.texSubImage2D(I.TEXTURE_2D,Se,Ee,tt,ge,xe,nt,wt,ut);he.pixelStorei(I.UNPACK_ROW_LENGTH,Ot),he.pixelStorei(I.UNPACK_IMAGE_HEIGHT,je),he.pixelStorei(I.UNPACK_SKIP_PIXELS,kt),he.pixelStorei(I.UNPACK_SKIP_ROWS,di),he.pixelStorei(I.UNPACK_SKIP_IMAGES,Ei),Se===0&&F.generateMipmaps&&I.generateMipmap(ze),he.unbindTexture()},this.initRenderTarget=function(v){b.get(v).__webglFramebuffer===void 0&&z.setupRenderTarget(v)},this.initTexture=function(v){v.isCubeTexture?z.setTextureCube(v,0):v.isData3DTexture?z.setTexture3D(v,0):v.isDataArrayTexture||v.isCompressedArrayTexture?z.setTexture2DArray(v,0):z.setTexture2D(v,0),he.unbindTexture()},this.resetState=function(){B=0,V=0,P=null,he.reset(),ae.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return fi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=We._getDrawingBufferColorSpace(e),t.unpackColorSpace=We._getUnpackColorSpace()}}const Yd={type:"change"},Ca={type:"start"},j1={type:"end"},An=new R1,jd=new ei,Z0=Math.cos(70*Ki.DEG2RAD),_t=new U,Nt=2*Math.PI,it={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},kr=1e-6;class K0 extends Jc{constructor(e,t=null){super(e,t),this.state=it.NONE,this.target=new U,this.cursor=new U,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Ms.ROTATE,MIDDLE:Ms.DOLLY,RIGHT:Ms.PAN},this.touches={ONE:qs.ROTATE,TWO:qs.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new U,this._lastQuaternion=new bi,this._lastTargetPosition=new U,this._quat=new bi().setFromUnitVectors(e.up,new U(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new gd,this._sphericalDelta=new gd,this._scale=1,this._panOffset=new U,this._rotateStart=new _e,this._rotateEnd=new _e,this._rotateDelta=new _e,this._panStart=new _e,this._panEnd=new _e,this._panDelta=new _e,this._dollyStart=new _e,this._dollyEnd=new _e,this._dollyDelta=new _e,this._dollyDirection=new U,this._mouse=new _e,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Q0.bind(this),this._onPointerDown=J0.bind(this),this._onPointerUp=$0.bind(this),this._onContextMenu=ox.bind(this),this._onMouseWheel=ix.bind(this),this._onKeyDown=sx.bind(this),this._onTouchStart=nx.bind(this),this._onTouchMove=rx.bind(this),this._onMouseDown=ex.bind(this),this._onMouseMove=tx.bind(this),this._interceptControlDown=ax.bind(this),this._interceptControlUp=dx.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Yd),this.update(),this.state=it.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;_t.copy(t).sub(this.target),_t.applyQuaternion(this._quat),this._spherical.setFromVector3(_t),this.autoRotate&&this.state===it.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,n=this.maxAzimuthAngle;isFinite(i)&&isFinite(n)&&(i<-Math.PI?i+=Nt:i>Math.PI&&(i-=Nt),n<-Math.PI?n+=Nt:n>Math.PI&&(n-=Nt),i<=n?this._spherical.theta=Math.max(i,Math.min(n,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+n)/2?Math.max(i,this._spherical.theta):Math.min(n,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(_t.setFromSpherical(this._spherical),_t.applyQuaternion(this._quatInverse),t.copy(this.target).add(_t),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){const a=_t.length();o=this._clampDistance(a*this._scale);const l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){const a=new U(this._mouse.x,this._mouse.y,0);a.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;const d=new U(this._mouse.x,this._mouse.y,0);d.unproject(this.object),this.object.position.sub(d).add(a),this.object.updateMatrixWorld(),o=_t.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(An.origin.copy(this.object.position),An.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(An.direction))<Z0?this.object.lookAt(this.target):(jd.setFromNormalAndCoplanarPoint(this.object.up,this.target),An.intersectPlane(jd,this.target))))}else if(this.object.isOrthographicCamera){const o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>kr||8*(1-this._lastQuaternion.dot(this.object.quaternion))>kr||this._lastTargetPosition.distanceToSquared(this.target)>kr?(this.dispatchEvent(Yd),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?Nt/60*this.autoRotateSpeed*e:Nt/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){_t.setFromMatrixColumn(t,0),_t.multiplyScalar(-e),this._panOffset.add(_t)}_panUp(e,t){this.screenSpacePanning===!0?_t.setFromMatrixColumn(t,1):(_t.setFromMatrixColumn(t,0),_t.crossVectors(this.object.up,_t)),_t.multiplyScalar(e),this._panOffset.add(_t)}_pan(e,t){const i=this.domElement;if(this.object.isPerspectiveCamera){const n=this.object.position;_t.copy(n).sub(this.target);let r=_t.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/i.clientHeight,this.object.matrix),this._panUp(2*t*r/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),n=e-i.left,r=t-i.top,o=i.width,a=i.height;this._mouse.x=n/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(Nt*this._rotateDelta.x/t.clientHeight),this._rotateUp(Nt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(Nt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-Nt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(Nt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-Nt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),n=.5*(e.pageY+t.y);this._rotateStart.set(i,n)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),n=.5*(e.pageY+t.y);this._panStart.set(i,n)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,n=e.pageY-t.y,r=Math.sqrt(i*i+n*n);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const i=this._getSecondPointerPosition(e),n=.5*(e.pageX+i.x),r=.5*(e.pageY+i.y);this._rotateEnd.set(n,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(Nt*this._rotateDelta.x/t.clientHeight),this._rotateUp(Nt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),n=.5*(e.pageY+t.y);this._panEnd.set(i,n)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,n=e.pageY-t.y,r=Math.sqrt(i*i+n*n);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const o=(e.pageX+t.x)*.5,a=(e.pageY+t.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new _e,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function J0(s){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(s.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(s)&&(this._addPointer(s),s.pointerType==="touch"?this._onTouchStart(s):this._onMouseDown(s),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function Q0(s){this.enabled!==!1&&(s.pointerType==="touch"?this._onTouchMove(s):this._onMouseMove(s))}function $0(s){switch(this._removePointer(s),this._pointers.length){case 0:this.domElement.releasePointerCapture(s.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(j1),this.state=it.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function ex(s){let e;switch(s.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Ms.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(s),this.state=it.DOLLY;break;case Ms.ROTATE:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=it.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=it.ROTATE}break;case Ms.PAN:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=it.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=it.PAN}break;default:this.state=it.NONE}this.state!==it.NONE&&this.dispatchEvent(Ca)}function tx(s){switch(this.state){case it.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(s);break;case it.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(s);break;case it.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(s);break}}function ix(s){this.enabled===!1||this.enableZoom===!1||this.state!==it.NONE||(s.preventDefault(),this.dispatchEvent(Ca),this._handleMouseWheel(this._customWheelEvent(s)),this.dispatchEvent(j1))}function sx(s){this.enabled!==!1&&this._handleKeyDown(s)}function nx(s){switch(this._trackPointer(s),this._pointers.length){case 1:switch(this.touches.ONE){case qs.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(s),this.state=it.TOUCH_ROTATE;break;case qs.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(s),this.state=it.TOUCH_PAN;break;default:this.state=it.NONE}break;case 2:switch(this.touches.TWO){case qs.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(s),this.state=it.TOUCH_DOLLY_PAN;break;case qs.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(s),this.state=it.TOUCH_DOLLY_ROTATE;break;default:this.state=it.NONE}break;default:this.state=it.NONE}this.state!==it.NONE&&this.dispatchEvent(Ca)}function rx(s){switch(this._trackPointer(s),this.state){case it.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(s),this.update();break;case it.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(s),this.update();break;case it.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(s),this.update();break;case it.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(s),this.update();break;default:this.state=it.NONE}}function ox(s){this.enabled!==!1&&s.preventDefault()}function ax(s){s.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function dx(s){s.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const Js={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class ki{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const lx=new ir(-1,1,1,-1,0,1);class cx extends oi{constructor(){super(),this.setAttribute("position",new ri([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ri([0,2,0,0,2,0],2))}}const hx=new cx;class sn{constructor(e){this._mesh=new Zt(hx,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,lx)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class ux extends ki{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof lt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Yt.clone(e.uniforms),this.material=new lt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new sn(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class Zd extends ki{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const n=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(n.REPLACE,n.REPLACE,n.REPLACE),r.buffers.stencil.setFunc(n.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(n.EQUAL,1,4294967295),r.buffers.stencil.setOp(n.KEEP,n.KEEP,n.KEEP),r.buffers.stencil.setLocked(!0)}}class fx extends ki{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class xx{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new _e);this._width=i.width,this._height=i.height,t=new xt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:qt}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new ux(Js),this.copyPass.material.blending=gt,this.timer=new Zc}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let n=0,r=this.passes.length;n<r;n++){const o=this.passes[n];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(n),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),o.needsSwap){if(i){const a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Zd!==void 0&&(o instanceof Zd?i=!0:o instanceof fx&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new _e);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,n=this._height*this._pixelRatio;this.renderTarget1.setSize(i,n),this.renderTarget2.setSize(i,n);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(i,n)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class px extends ki{constructor(e,t,i=null,n=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=n,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new Ge}render(e,t,i){const n=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=n}}const wn={defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,DEPTH_SWIZZLING:"x",SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new _e},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new dt},cameraProjectionMatrixInverse:{value:new dt},cameraWorldMatrix:{value:new dt},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new U(-1,-1,-1)},sceneBoxMax:{value:new U(1,1,1)}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		varying vec2 vUv;
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform mat4 cameraWorldMatrix;
		uniform float radius;
		uniform float distanceExponent;
		uniform float thickness;
		uniform float distanceFallOff;
		uniform float scale;
		#if SCENE_CLIP_BOX == 1
			uniform vec3 sceneBoxMin;
			uniform vec3 sceneBoxMax;
		#endif

		#include <common>
		#include <packing>

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
		#endif

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
			return textureLod(tDepth, uv.xy, 0.0).DEPTH_SWIZZLING;
		}

		float fetchDepth(const ivec2 uv) {
			return texelFetch(tDepth, uv.xy, 0).DEPTH_SWIZZLING;
		}

		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ? ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz : -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ? ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz : -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
			#if NORMAL_VECTOR_TYPE == 2
				return normalize(textureLod(tNormal, uv, 0.).rgb);
			#elif NORMAL_VECTOR_TYPE == 1
				return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
			#else
				return computeNormalFromDepth(uv);
			#endif
		}

		vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
			vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.);
			vec2 sampleUv = sampleClipPos.xy / sampleClipPos.w * 0.5 + 0.5;
			float sampleSceneDepth = getDepth(sampleUv);
			return vec3(sampleUv, sampleSceneDepth);
		}

		void main() {
			float depth = getDepth(vUv.xy);

			#ifdef USE_REVERSED_DEPTH_BUFFER
				if (depth <= 0.0) {
					discard;
					return;
				}
			#else
				if (depth >= 1.0) {
					discard;
					return;
				}
			#endif
			
			vec3 viewPos = getViewPosition(vUv, depth);
			vec3 viewNormal = getViewNormal(vUv);

			float radiusToUse = radius;
			float distanceFalloffToUse = thickness;
			#if SCREEN_SPACE_RADIUS == 1
				float radiusScale = getViewPosition(vec2(0.5 + float(SCREEN_SPACE_RADIUS_SCALE) / resolution.x, 0.0), depth).x;
				radiusToUse *= radiusScale;
				distanceFalloffToUse *= radiusScale;
			#endif

			#if SCENE_CLIP_BOX == 1
				vec3 worldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
				float boxDistance = length(max(vec3(0.0), max(sceneBoxMin - worldPos, worldPos - sceneBoxMax)));
				if (boxDistance > radiusToUse) {
					discard;
					return;
				}
			#endif

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
			vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;
			vec3 tangent = normalize(vec3(randomVec.xy, 0.));
			vec3 bitangent = vec3(-tangent.y, tangent.x, 0.);
			mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0., 0., 1.));

			const int DIRECTIONS = SAMPLES < 30 ? 3 : 5;
			const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;
			float ao = 0.0;
			for (int i = 0; i < DIRECTIONS; ++i) {

				float angle = float(i) / float(DIRECTIONS) * PI;
				vec4 sampleDir = vec4(cos(angle), sin(angle), 0., 0.5 + 0.5 * noiseTexel.w);
				sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);

				vec3 viewDir = normalize(-viewPos.xyz);
				vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
				vec3 sliceTangent = cross(sliceBitangent, viewDir);
				vec3 normalInSlice = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));

				vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
				vec2 cosHorizons = vec2(dot(viewDir, tangentToNormalInSlice), dot(viewDir, -tangentToNormalInSlice));

				for (int j = 0; j < STEPS; ++j) {
					vec3 sampleViewOffset = sampleDir.xyz * radiusToUse * sampleDir.w * pow(float(j + 1) / float(STEPS), distanceExponent);

					vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + sampleViewOffset);
					vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					vec3 viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.x += max(0., (sampleCosHorizon - cosHorizons.x) * mix(1., 2. / float(j + 2), distanceFallOff));
					}

					sampleSceneUvDepth = getSceneUvAndDepth(viewPos - sampleViewOffset);
					sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.y += max(0., (sampleCosHorizon - cosHorizons.y) * mix(1., 2. / float(j + 2), distanceFallOff));
					}
				}

				vec2 sinHorizons = sqrt(1. - cosHorizons * cosHorizons);
				float nx = dot(normalInSlice, sliceTangent);
				float ny = dot(normalInSlice, viewDir);
				float nxb = 1. / 2. * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
				float nyb = 1. / 2. * (2. - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
				float occlusion = nx * nxb + ny * nyb;
				ao += occlusion;
			}

			ao = clamp(ao / float(DIRECTIONS), 0., 1.);
		#if SCENE_CLIP_BOX == 1
			ao = mix(ao, 1., smoothstep(0., radiusToUse, boxDistance));
		#endif
			ao = pow(ao, scale);

			gl_FragColor = FRAGMENT_OUTPUT;
		}`},Rn={defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},Wr={uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);
		}`};function Sx(s=5){const e=Math.floor(s)%2===0?Math.floor(s)+1:Math.floor(s),t=yx(e),i=t.length,n=new Uint8Array(i*4);for(let o=0;o<i;++o){const a=t[o],l=2*Math.PI*a/i,d=new U(Math.cos(l),Math.sin(l),0).normalize();n[o*4]=(d.x*.5+.5)*255,n[o*4+1]=(d.y*.5+.5)*255,n[o*4+2]=127,n[o*4+3]=255}const r=new ya(n,e,e);return r.wrapS=is,r.wrapT=is,r.needsUpdate=!0,r}function yx(s){const e=Math.floor(s)%2===0?Math.floor(s)+1:Math.floor(s),t=e*e,i=Array(t).fill(0);let n=Math.floor(e/2),r=e-1;for(let o=1;o<=t;){if(n===-1&&r===e?(r=e-2,n=0):(r===e&&(r=0),n<0&&(n=e-1)),i[n*e+r]!==0){r-=2,n++;continue}else i[n*e+r]=o++;r++,n--}return i}const Pn={defines:{SAMPLES:16,SAMPLE_VECTORS:Z1(16,2,1),NORMAL_VECTOR_TYPE:1,DEPTH_VALUE_SOURCE:0},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new _e},cameraProjectionMatrixInverse:{value:new dt},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,fragmentShader:`

		varying vec2 vUv;

		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform float lumaPhi;
		uniform float depthPhi;
		uniform float normalPhi;
		uniform float radius;
		uniform int index;

		#include <common>
		#include <packing>

		#ifndef SAMPLE_LUMINANCE
		#define SAMPLE_LUMINANCE dot(vec3(0.2125, 0.7154, 0.0721), a)
		#endif

		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(denoised, 1.)
		#endif

		float getLuminance(const in vec3 a) {
			return SAMPLE_LUMINANCE;
		}

		const vec3 poissonDisk[SAMPLES] = SAMPLE_VECTORS;

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				vec4 clipSpacePosition = vec4( vec2( screenPosition ) * 2.0 - 1.0, depth, 1.0 );
			#else
				vec4 clipSpacePosition = vec4( vec3( screenPosition, depth ) * 2.0 - 1.0, 1.0 );
			#endif
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}

		float getDepth(const vec2 uv) {
		#if DEPTH_VALUE_SOURCE == 1
			return textureLod(tDepth, uv.xy, 0.0).a;
		#else
			return textureLod(tDepth, uv.xy, 0.0).r;
		#endif
		}

		float fetchDepth(const ivec2 uv) {
			#if DEPTH_VALUE_SOURCE == 1
				return texelFetch(tDepth, uv.xy, 0).a;
			#else
				return texelFetch(tDepth, uv.xy, 0).r;
			#endif
		}

		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ?  ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz
									: -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ?  ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz
									: -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}

		vec3 getViewNormal(const vec2 uv) {
		#if NORMAL_VECTOR_TYPE == 2
			return normalize(textureLod(tNormal, uv, 0.).rgb);
		#elif NORMAL_VECTOR_TYPE == 1
			return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
		#else
			return computeNormalFromDepth(uv);
		#endif
		}

		void denoiseSample(in vec3 center, in vec3 viewNormal, in vec3 viewPos, in vec2 sampleUv, inout vec3 denoised, inout float totalWeight) {
			vec4 sampleTexel = textureLod(tDiffuse, sampleUv, 0.0);
			float sampleDepth = getDepth(sampleUv);
			vec3 sampleNormal = getViewNormal(sampleUv);
			vec3 neighborColor = sampleTexel.rgb;
			vec3 viewPosSample = getViewPosition(sampleUv, sampleDepth);

			float normalDiff = dot(viewNormal, sampleNormal);
			float normalSimilarity = pow(max(normalDiff, 0.), normalPhi);
			float lumaDiff = abs(getLuminance(neighborColor) - getLuminance(center));
			float lumaSimilarity = max(1.0 - lumaDiff / lumaPhi, 0.0);
			float depthDiff = abs(dot(viewPos - viewPosSample, viewNormal));
			float depthSimilarity = max(1. - depthDiff / depthPhi, 0.);
			float w = lumaSimilarity * depthSimilarity * normalSimilarity;

			denoised += w * neighborColor;
			totalWeight += w;
		}

		void main() {
			float depth = getDepth(vUv.xy);
			vec3 viewNormal = getViewNormal(vUv);
			if (depth == 1. || dot(viewNormal, viewNormal) == 0.) {
				discard;
				return;
			}
			vec4 texel = textureLod(tDiffuse, vUv, 0.0);
			vec3 center = texel.rgb;
			vec3 viewPos = getViewPosition(vUv, depth);

			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
      		vec2 noiseVec = vec2(sin(noiseTexel[index % 4] * 2. * PI), cos(noiseTexel[index % 4] * 2. * PI));
    		mat2 rotationMatrix = mat2(noiseVec.x, -noiseVec.y, noiseVec.x, noiseVec.y);

			float totalWeight = 1.0;
			vec3 denoised = texel.rgb;
			for (int i = 0; i < SAMPLES; i++) {
				vec3 sampleDir = poissonDisk[i];
				vec2 offset = rotationMatrix * (sampleDir.xy * (1. + sampleDir.z * (radius - 1.)) / resolution);
				vec2 sampleUv = vUv + offset;
				denoiseSample(center, viewNormal, viewPos, sampleUv, denoised, totalWeight);
			}

			if (totalWeight > 0.) {
				denoised /= totalWeight;
			}
			gl_FragColor = FRAGMENT_OUTPUT;
		}`};function Z1(s,e,t){const i=mx(s,e,t);let n="vec3[SAMPLES](";for(let r=0;r<s;r++){const o=i[r];n+=`vec3(${o.x}, ${o.y}, ${o.z})${r<s-1?",":")"}`}return n}function mx(s,e,t){const i=[];for(let n=0;n<s;n++){const r=2*Math.PI*e*n/s,o=Math.pow(n/(s-1),t);i.push(new U(Math.cos(r),Math.sin(r),o))}return i}class Cx{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let t=0;t<512;t++)this.perm[t]=this.p[t&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let i,n,r;const o=.5*(Math.sqrt(3)-1),a=(e+t)*o,l=Math.floor(e+a),d=Math.floor(t+a),c=(3-Math.sqrt(3))/6,u=(l+d)*c,h=l-u,f=d-u,S=e-h,C=t-f;let p,x;S>C?(p=1,x=0):(p=0,x=1);const y=S-p+c,g=C-x+c,M=S-1+2*c,w=C-1+2*c,q=l&255,E=d&255,m=this.perm[q+this.perm[E]]%12,_=this.perm[q+p+this.perm[E+x]]%12,A=this.perm[q+1+this.perm[E+1]]%12;let T=.5-S*S-C*C;T<0?i=0:(T*=T,i=T*T*this._dot(this.grad3[m],S,C));let R=.5-y*y-g*g;R<0?n=0:(R*=R,n=R*R*this._dot(this.grad3[_],y,g));let B=.5-M*M-w*w;return B<0?r=0:(B*=B,r=B*B*this._dot(this.grad3[A],M,w)),70*(i+n+r)}noise3d(e,t,i){let n,r,o,a;const d=(e+t+i)*.3333333333333333,c=Math.floor(e+d),u=Math.floor(t+d),h=Math.floor(i+d),f=1/6,S=(c+u+h)*f,C=c-S,p=u-S,x=h-S,y=e-C,g=t-p,M=i-x;let w,q,E,m,_,A;y>=g?g>=M?(w=1,q=0,E=0,m=1,_=1,A=0):y>=M?(w=1,q=0,E=0,m=1,_=0,A=1):(w=0,q=0,E=1,m=1,_=0,A=1):g<M?(w=0,q=0,E=1,m=0,_=1,A=1):y<M?(w=0,q=1,E=0,m=0,_=1,A=1):(w=0,q=1,E=0,m=1,_=1,A=0);const T=y-w+f,R=g-q+f,B=M-E+f,V=y-m+2*f,P=g-_+2*f,D=M-A+2*f,N=y-1+3*f,W=g-1+3*f,X=M-1+3*f,te=c&255,ne=u&255,de=h&255,Ae=this.perm[te+this.perm[ne+this.perm[de]]]%12,Fe=this.perm[te+w+this.perm[ne+q+this.perm[de+E]]]%12,Te=this.perm[te+m+this.perm[ne+_+this.perm[de+A]]]%12,j=this.perm[te+1+this.perm[ne+1+this.perm[de+1]]]%12;let re=.6-y*y-g*g-M*M;re<0?n=0:(re*=re,n=re*re*this._dot3(this.grad3[Ae],y,g,M));let Q=.6-T*T-R*R-B*B;Q<0?r=0:(Q*=Q,r=Q*Q*this._dot3(this.grad3[Fe],T,R,B));let pe=.6-V*V-P*P-D*D;pe<0?o=0:(pe*=pe,o=pe*pe*this._dot3(this.grad3[Te],V,P,D));let ye=.6-N*N-W*W-X*X;return ye<0?a=0:(ye*=ye,a=ye*ye*this._dot3(this.grad3[j],N,W,X)),32*(n+r+o+a)}noise4d(e,t,i,n){const r=this.grad4,o=this.simplex,a=this.perm,l=(Math.sqrt(5)-1)/4,d=(5-Math.sqrt(5))/20;let c,u,h,f,S;const C=(e+t+i+n)*l,p=Math.floor(e+C),x=Math.floor(t+C),y=Math.floor(i+C),g=Math.floor(n+C),M=(p+x+y+g)*d,w=p-M,q=x-M,E=y-M,m=g-M,_=e-w,A=t-q,T=i-E,R=n-m,B=_>A?32:0,V=_>T?16:0,P=A>T?8:0,D=_>R?4:0,N=A>R?2:0,W=T>R?1:0,X=B+V+P+D+N+W,te=o[X][0]>=3?1:0,ne=o[X][1]>=3?1:0,de=o[X][2]>=3?1:0,Ae=o[X][3]>=3?1:0,Fe=o[X][0]>=2?1:0,Te=o[X][1]>=2?1:0,j=o[X][2]>=2?1:0,re=o[X][3]>=2?1:0,Q=o[X][0]>=1?1:0,pe=o[X][1]>=1?1:0,ye=o[X][2]>=1?1:0,ve=o[X][3]>=1?1:0,Je=_-te+d,Le=A-ne+d,Xe=T-de+d,Ye=R-Ae+d,we=_-Fe+2*d,ct=A-Te+2*d,st=T-j+2*d,Et=R-re+2*d,I=_-Q+3*d,ht=A-pe+3*d,Oe=T-ye+3*d,Qe=R-ve+3*d,he=_-1+4*d,ot=A-1+4*d,b=T-1+4*d,z=R-1+4*d,O=p&255,Z=x&255,$=y&255,ie=g&255,le=a[O+a[Z+a[$+a[ie]]]]%32,Y=a[O+te+a[Z+ne+a[$+de+a[ie+Ae]]]]%32,J=a[O+Fe+a[Z+Te+a[$+j+a[ie+re]]]]%32,fe=a[O+Q+a[Z+pe+a[$+ye+a[ie+ve]]]]%32,Ce=a[O+1+a[Z+1+a[$+1+a[ie+1]]]]%32;let oe=.6-_*_-A*A-T*T-R*R;oe<0?c=0:(oe*=oe,c=oe*oe*this._dot4(r[le],_,A,T,R));let se=.6-Je*Je-Le*Le-Xe*Xe-Ye*Ye;se<0?u=0:(se*=se,u=se*se*this._dot4(r[Y],Je,Le,Xe,Ye));let Re=.6-we*we-ct*ct-st*st-Et*Et;Re<0?h=0:(Re*=Re,h=Re*Re*this._dot4(r[J],we,ct,st,Et));let De=.6-I*I-ht*ht-Oe*Oe-Qe*Qe;De<0?f=0:(De*=De,f=De*De*this._dot4(r[fe],I,ht,Oe,Qe));let Ve=.6-he*he-ot*ot-b*b-z*z;return Ve<0?S=0:(Ve*=Ve,S=Ve*Ve*this._dot4(r[Ce],he,ot,b,z)),27*(c+u+h+f+S)}_dot(e,t,i){return e[0]*t+e[1]*i}_dot3(e,t,i,n){return e[0]*t+e[1]*i+e[2]*n}_dot4(e,t,i,n,r){return e[0]*t+e[1]*i+e[2]*n+e[3]*r}}class $t extends ki{constructor(e,t,i=512,n=512,r,o,a){super(),this.width=i,this.height=n,this.clear=!0,this.camera=t,this.scene=e,this.output=0,this._renderGBuffer=!0,this._visibilityCache=[],this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=Sx(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new xt(this.width,this.height,{type:qt}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new lt({defines:Object.assign({},wn.defines),uniforms:Yt.clone(wn.uniforms),vertexShader:wn.vertexShader,fragmentShader:wn.fragmentShader,blending:gt,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=this.camera.isPerspectiveCamera?1:0,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new Gc,this.normalMaterial.blending=gt,this.pdMaterial=new lt({defines:Object.assign({},Pn.defines),uniforms:Yt.clone(Pn.uniforms),vertexShader:Pn.vertexShader,fragmentShader:Pn.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new lt({defines:Object.assign({},Rn.defines),uniforms:Yt.clone(Rn.uniforms),vertexShader:Rn.vertexShader,fragmentShader:Rn.fragmentShader,blending:gt}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new lt({uniforms:Yt.clone(Js.uniforms),vertexShader:Js.vertexShader,fragmentShader:Js.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:ro,blendDst:Ws,blendEquation:ti,blendSrcAlpha:no,blendDstAlpha:Ws,blendEquationAlpha:ti}),this.blendMaterial=new lt({uniforms:Yt.clone(Wr.uniforms),vertexShader:Wr.vertexShader,fragmentShader:Wr.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:p1,blendSrc:ro,blendDst:Ws,blendEquation:ti,blendSrcAlpha:no,blendDstAlpha:Ws,blendEquationAlpha:ti}),this._fsQuad=new sn(null),this._originalClearColor=new Ge,this.setGBuffer(r?r.depthTexture:void 0,r?r.normalTexture:void 0),o!==void 0&&this.updateGtaoMaterial(o),a!==void 0&&this.updatePdMaterial(a)}setSize(e,t){this.width=e,this.height=t,this.gtaoRenderTarget.setSize(e,t),this.normalRenderTarget.setSize(e,t),this.pdRenderTarget.setSize(e,t),this.gtaoMaterial.uniforms.resolution.value.set(e,t),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(e,t),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(e,t){e!==void 0?(this.depthTexture=e,this.normalTexture=t,this._renderGBuffer=!1):(this.depthTexture=new ns,this.depthTexture.format=Fi,this.depthTexture.type=ws,this.normalRenderTarget=new xt(this.width,this.height,{minFilter:Ct,magFilter:Ct,type:qt,depthTexture:this.depthTexture}),this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0);const i=this.normalTexture?1:0,n=this.depthTexture===this.normalTexture?"w":"x";this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=i,this.gtaoMaterial.defines.DEPTH_SWIZZLING=n,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=i,this.pdMaterial.defines.DEPTH_SWIZZLING=n,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture}setSceneClipBox(e){e?(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX!==1,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(e.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(e.max)):(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX===0,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(e){e.radius!==void 0&&(this.gtaoMaterial.uniforms.radius.value=e.radius),e.distanceExponent!==void 0&&(this.gtaoMaterial.uniforms.distanceExponent.value=e.distanceExponent),e.thickness!==void 0&&(this.gtaoMaterial.uniforms.thickness.value=e.thickness),e.distanceFallOff!==void 0&&(this.gtaoMaterial.uniforms.distanceFallOff.value=e.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),e.scale!==void 0&&(this.gtaoMaterial.uniforms.scale.value=e.scale),e.samples!==void 0&&e.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=e.samples,this.gtaoMaterial.needsUpdate=!0),e.screenSpaceRadius!==void 0&&(e.screenSpaceRadius?1:0)!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=e.screenSpaceRadius?1:0,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(e){let t=!1;e.lumaPhi!==void 0&&(this.pdMaterial.uniforms.lumaPhi.value=e.lumaPhi),e.depthPhi!==void 0&&(this.pdMaterial.uniforms.depthPhi.value=e.depthPhi),e.normalPhi!==void 0&&(this.pdMaterial.uniforms.normalPhi.value=e.normalPhi),e.radius!==void 0&&e.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=e.radius),e.radiusExponent!==void 0&&e.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=e.radiusExponent,t=!0),e.rings!==void 0&&e.rings!==this.pdRings&&(this.pdRings=e.rings,t=!0),e.samples!==void 0&&e.samples!==this.pdSamples&&(this.pdSamples=e.samples,t=!0),t&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=Z1(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(e,t,i){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(e,this.gtaoMaterial,this.gtaoRenderTarget,16777215,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(e,this.pdMaterial,this.pdRenderTarget,16777215,1),this.output){case $t.OUTPUT.Off:break;case $t.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=i.texture,this.copyMaterial.blending=gt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case $t.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=gt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case $t.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=gt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case $t.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:t);break;case $t.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=gt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case $t.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=i.texture,this.copyMaterial.blending=gt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(e,this.blendMaterial,this.renderToScreen?null:t);break;default:console.warn("THREE.GTAOPass: Unknown output type.")}}_renderPass(e,t,i,n,r){e.getClearColor(this._originalClearColor);const o=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(i),e.autoClear=!1,n!=null&&(e.setClearColor(n),e.setClearAlpha(r||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(o)}_renderOverride(e,t,i,n,r){e.getClearColor(this._originalClearColor);const o=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(i),e.autoClear=!1,n=t.clearColor||n,r=t.clearAlpha||r,n!=null&&(e.setClearColor(n),e.setClearAlpha(r||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(o)}_overrideVisibility(){const e=this.scene,t=this._visibilityCache;e.traverse(function(i){(i.isPoints||i.isLine||i.isLine2)&&i.visible&&(i.visible=!1,t.push(i))})}_restoreVisibility(){const e=this._visibilityCache;for(let t=0;t<e.length;t++)e[t].visible=!0;e.length=0}_generateNoise(e=64){const t=new Cx,i=e*e*4,n=new Uint8Array(i);for(let o=0;o<e;o++)for(let a=0;a<e;a++){const l=o,d=a;n[(o*e+a)*4]=(t.noise(l,d)*.5+.5)*255,n[(o*e+a)*4+1]=(t.noise(l+e,d)*.5+.5)*255,n[(o*e+a)*4+2]=(t.noise(l,d+e)*.5+.5)*255,n[(o*e+a)*4+3]=(t.noise(l+e,d+e)*.5+.5)*255}const r=new ya(n,e,e,jt,Ut);return r.wrapS=is,r.wrapT=is,r.needsUpdate=!0,r}}$t.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5};class Bi extends ki{constructor(e,t,i,n){super(),this.renderScene=t,this.renderCamera=i,this.selectedObjects=n!==void 0?n:[],this.visibleEdgeColor=new Ge(1,1,1),this.hiddenEdgeColor=new Ge(.1,.04,.02),this.edgeGlow=0,this.usePatternTexture=!1,this.patternTexture=null,this.edgeThickness=1,this.edgeStrength=3,this.downSampleRatio=2,this.pulsePeriod=0,this._visibilityCache=new Map,this._selectionCache=new Set,this.resolution=e!==void 0?new _e(e.x,e.y):new _e(256,256);const r=Math.round(this.resolution.x/this.downSampleRatio),o=Math.round(this.resolution.y/this.downSampleRatio);this.renderTargetMaskBuffer=new xt(this.resolution.x,this.resolution.y),this.renderTargetMaskBuffer.texture.name="OutlinePass.mask",this.renderTargetMaskBuffer.texture.generateMipmaps=!1,this.depthMaterial=new U1,this.depthMaterial.side=Vt,this.depthMaterial.depthPacking=G2,this.depthMaterial.blending=gt,this.prepareMaskMaterial=this._getPrepareMaskMaterial(),this.prepareMaskMaterial.side=Vt,this.prepareMaskMaterial.fragmentShader=c(this.prepareMaskMaterial.fragmentShader,this.renderCamera),this.renderTargetDepthBuffer=new xt(this.resolution.x,this.resolution.y,{type:qt}),this.renderTargetDepthBuffer.texture.name="OutlinePass.depth",this.renderTargetDepthBuffer.texture.generateMipmaps=!1,this.renderTargetMaskDownSampleBuffer=new xt(r,o,{type:qt}),this.renderTargetMaskDownSampleBuffer.texture.name="OutlinePass.depthDownSample",this.renderTargetMaskDownSampleBuffer.texture.generateMipmaps=!1,this.renderTargetBlurBuffer1=new xt(r,o,{type:qt}),this.renderTargetBlurBuffer1.texture.name="OutlinePass.blur1",this.renderTargetBlurBuffer1.texture.generateMipmaps=!1,this.renderTargetBlurBuffer2=new xt(Math.round(r/2),Math.round(o/2),{type:qt}),this.renderTargetBlurBuffer2.texture.name="OutlinePass.blur2",this.renderTargetBlurBuffer2.texture.generateMipmaps=!1,this.edgeDetectionMaterial=this._getEdgeDetectionMaterial(),this.renderTargetEdgeBuffer1=new xt(r,o,{type:qt}),this.renderTargetEdgeBuffer1.texture.name="OutlinePass.edge1",this.renderTargetEdgeBuffer1.texture.generateMipmaps=!1,this.renderTargetEdgeBuffer2=new xt(Math.round(r/2),Math.round(o/2),{type:qt}),this.renderTargetEdgeBuffer2.texture.name="OutlinePass.edge2",this.renderTargetEdgeBuffer2.texture.generateMipmaps=!1;const a=4,l=4;this.separableBlurMaterial1=this._getSeparableBlurMaterial(a),this.separableBlurMaterial1.uniforms.texSize.value.set(r,o),this.separableBlurMaterial1.uniforms.kernelRadius.value=1,this.separableBlurMaterial2=this._getSeparableBlurMaterial(l),this.separableBlurMaterial2.uniforms.texSize.value.set(Math.round(r/2),Math.round(o/2)),this.separableBlurMaterial2.uniforms.kernelRadius.value=l,this.overlayMaterial=this._getOverlayMaterial();const d=Js;this.copyUniforms=Yt.clone(d.uniforms),this.materialCopy=new lt({uniforms:this.copyUniforms,vertexShader:d.vertexShader,fragmentShader:d.fragmentShader,blending:gt,depthTest:!1,depthWrite:!1}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Ge,this.oldClearAlpha=1,this._fsQuad=new sn(null),this.tempPulseColor1=new Ge,this.tempPulseColor2=new Ge,this.textureMatrix=new dt;function c(u,h){const f=h.isPerspectiveCamera?"perspective":"orthographic";return u.replace(/DEPTH_TO_VIEW_Z/g,f+"DepthToViewZ")}}dispose(){this.renderTargetMaskBuffer.dispose(),this.renderTargetDepthBuffer.dispose(),this.renderTargetMaskDownSampleBuffer.dispose(),this.renderTargetBlurBuffer1.dispose(),this.renderTargetBlurBuffer2.dispose(),this.renderTargetEdgeBuffer1.dispose(),this.renderTargetEdgeBuffer2.dispose(),this.depthMaterial.dispose(),this.prepareMaskMaterial.dispose(),this.edgeDetectionMaterial.dispose(),this.separableBlurMaterial1.dispose(),this.separableBlurMaterial2.dispose(),this.overlayMaterial.dispose(),this.materialCopy.dispose(),this._fsQuad.dispose()}setSize(e,t){this.renderTargetMaskBuffer.setSize(e,t),this.renderTargetDepthBuffer.setSize(e,t);let i=Math.round(e/this.downSampleRatio),n=Math.round(t/this.downSampleRatio);this.renderTargetMaskDownSampleBuffer.setSize(i,n),this.renderTargetBlurBuffer1.setSize(i,n),this.renderTargetEdgeBuffer1.setSize(i,n),this.separableBlurMaterial1.uniforms.texSize.value.set(i,n),i=Math.round(i/2),n=Math.round(n/2),this.renderTargetBlurBuffer2.setSize(i,n),this.renderTargetEdgeBuffer2.setSize(i,n),this.separableBlurMaterial2.uniforms.texSize.value.set(i,n)}render(e,t,i,n,r){if(this.selectedObjects.length>0){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,r&&e.state.buffers.stencil.setTest(!1),e.setClearColor(16777215,1),this._updateSelectionCache(),this._changeVisibilityOfSelectedObjects(!1);const a=this.renderScene.background,l=this.renderScene.overrideMaterial;if(this.renderScene.background=null,this.renderScene.overrideMaterial=this.depthMaterial,e.setRenderTarget(this.renderTargetDepthBuffer),e.clear(),e.render(this.renderScene,this.renderCamera),this._changeVisibilityOfSelectedObjects(!0),this._visibilityCache.clear(),this._updateTextureMatrix(),this._changeVisibilityOfNonSelectedObjects(!1),this.renderScene.overrideMaterial=this.prepareMaskMaterial,this.prepareMaskMaterial.uniforms.cameraNearFar.value.set(this.renderCamera.near,this.renderCamera.far),this.prepareMaskMaterial.uniforms.depthTexture.value=this.renderTargetDepthBuffer.texture,this.prepareMaskMaterial.uniforms.textureMatrix.value=this.textureMatrix,e.setRenderTarget(this.renderTargetMaskBuffer),e.clear(),e.render(this.renderScene,this.renderCamera),this._changeVisibilityOfNonSelectedObjects(!0),this._visibilityCache.clear(),this._selectionCache.clear(),this.renderScene.background=a,this.renderScene.overrideMaterial=l,this._fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=this.renderTargetMaskBuffer.texture,e.setRenderTarget(this.renderTargetMaskDownSampleBuffer),e.clear(),this._fsQuad.render(e),this.tempPulseColor1.copy(this.visibleEdgeColor),this.tempPulseColor2.copy(this.hiddenEdgeColor),this.pulsePeriod>0){const d=.625+Math.cos(performance.now()*.01/this.pulsePeriod)*.75/2;this.tempPulseColor1.multiplyScalar(d),this.tempPulseColor2.multiplyScalar(d)}this._fsQuad.material=this.edgeDetectionMaterial,this.edgeDetectionMaterial.uniforms.maskTexture.value=this.renderTargetMaskDownSampleBuffer.texture,this.edgeDetectionMaterial.uniforms.texSize.value.set(this.renderTargetMaskDownSampleBuffer.width,this.renderTargetMaskDownSampleBuffer.height),this.edgeDetectionMaterial.uniforms.visibleEdgeColor.value=this.tempPulseColor1,this.edgeDetectionMaterial.uniforms.hiddenEdgeColor.value=this.tempPulseColor2,e.setRenderTarget(this.renderTargetEdgeBuffer1),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.separableBlurMaterial1,this.separableBlurMaterial1.uniforms.colorTexture.value=this.renderTargetEdgeBuffer1.texture,this.separableBlurMaterial1.uniforms.direction.value=Bi.BlurDirectionX,this.separableBlurMaterial1.uniforms.kernelRadius.value=this.edgeThickness,e.setRenderTarget(this.renderTargetBlurBuffer1),e.clear(),this._fsQuad.render(e),this.separableBlurMaterial1.uniforms.colorTexture.value=this.renderTargetBlurBuffer1.texture,this.separableBlurMaterial1.uniforms.direction.value=Bi.BlurDirectionY,e.setRenderTarget(this.renderTargetEdgeBuffer1),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.separableBlurMaterial2,this.separableBlurMaterial2.uniforms.colorTexture.value=this.renderTargetEdgeBuffer1.texture,this.separableBlurMaterial2.uniforms.direction.value=Bi.BlurDirectionX,e.setRenderTarget(this.renderTargetBlurBuffer2),e.clear(),this._fsQuad.render(e),this.separableBlurMaterial2.uniforms.colorTexture.value=this.renderTargetBlurBuffer2.texture,this.separableBlurMaterial2.uniforms.direction.value=Bi.BlurDirectionY,e.setRenderTarget(this.renderTargetEdgeBuffer2),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.overlayMaterial,this.overlayMaterial.uniforms.maskTexture.value=this.renderTargetMaskBuffer.texture,this.overlayMaterial.uniforms.edgeTexture1.value=this.renderTargetEdgeBuffer1.texture,this.overlayMaterial.uniforms.edgeTexture2.value=this.renderTargetEdgeBuffer2.texture,this.overlayMaterial.uniforms.patternTexture.value=this.patternTexture,this.overlayMaterial.uniforms.edgeStrength.value=this.edgeStrength,this.overlayMaterial.uniforms.edgeGlow.value=this.edgeGlow,this.overlayMaterial.uniforms.usePatternTexture.value=this.usePatternTexture,r&&e.state.buffers.stencil.setTest(!0),e.setRenderTarget(i),this._fsQuad.render(e),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=o}this.renderToScreen&&(this._fsQuad.material=this.materialCopy,this.copyUniforms.tDiffuse.value=i.texture,e.setRenderTarget(null),this._fsQuad.render(e))}_updateSelectionCache(){const e=this._selectionCache;function t(i){i.isMesh&&e.add(i)}e.clear();for(let i=0;i<this.selectedObjects.length;i++)this.selectedObjects[i].traverse(t)}_changeVisibilityOfSelectedObjects(e){const t=this._visibilityCache;for(const i of this._selectionCache)e===!0?i.visible=t.get(i):(t.set(i,i.visible),i.visible=e)}_changeVisibilityOfNonSelectedObjects(e){const t=this._visibilityCache,i=this._selectionCache;function n(r){if(r.isPoints||r.isLine||r.isLine2)e===!0?r.visible=t.get(r):(t.set(r,r.visible),r.visible=e);else if((r.isMesh||r.isSprite)&&!i.has(r)){const o=r.visible;(e===!1||t.get(r)===!0)&&(r.visible=e),t.set(r,o)}}this.renderScene.traverse(n)}_updateTextureMatrix(){this.textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this.textureMatrix.multiply(this.renderCamera.projectionMatrix),this.textureMatrix.multiply(this.renderCamera.matrixWorldInverse)}_getPrepareMaskMaterial(){return new lt({uniforms:{depthTexture:{value:null},cameraNearFar:{value:new _e(.5,.5)},textureMatrix:{value:null}},vertexShader:`#include <batching_pars_vertex>
				#include <morphtarget_pars_vertex>
				#include <skinning_pars_vertex>

				varying vec4 projTexCoord;
				varying vec4 vPosition;
				uniform mat4 textureMatrix;

				void main() {

					#include <batching_vertex>
					#include <skinbase_vertex>
					#include <begin_vertex>
					#include <morphtarget_vertex>
					#include <skinning_vertex>
					#include <project_vertex>

					vPosition = mvPosition;

					vec4 worldPosition = vec4( transformed, 1.0 );

					#ifdef USE_INSTANCING

						worldPosition = instanceMatrix * worldPosition;

					#endif

					worldPosition = modelMatrix * worldPosition;

					projTexCoord = textureMatrix * worldPosition;

				}`,fragmentShader:`#include <packing>
				varying vec4 vPosition;
				varying vec4 projTexCoord;
				uniform sampler2D depthTexture;
				uniform vec2 cameraNearFar;

				void main() {

					float depth = unpackRGBAToDepth(texture2DProj( depthTexture, projTexCoord ));
					float viewZ = - DEPTH_TO_VIEW_Z( depth, cameraNearFar.x, cameraNearFar.y );
					float depthTest = (-vPosition.z > viewZ) ? 1.0 : 0.0;
					gl_FragColor = vec4(0.0, depthTest, 1.0, 1.0);

				}`})}_getEdgeDetectionMaterial(){return new lt({uniforms:{maskTexture:{value:null},texSize:{value:new _e(.5,.5)},visibleEdgeColor:{value:new U(1,1,1)},hiddenEdgeColor:{value:new U(1,1,1)}},vertexShader:`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;

				uniform sampler2D maskTexture;
				uniform vec2 texSize;
				uniform vec3 visibleEdgeColor;
				uniform vec3 hiddenEdgeColor;

				void main() {
					vec2 invSize = 1.0 / texSize;
					vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);
					vec4 c1 = texture2D( maskTexture, vUv + uvOffset.xy);
					vec4 c2 = texture2D( maskTexture, vUv - uvOffset.xy);
					vec4 c3 = texture2D( maskTexture, vUv + uvOffset.yw);
					vec4 c4 = texture2D( maskTexture, vUv - uvOffset.yw);
					float diff1 = (c1.r - c2.r)*0.5;
					float diff2 = (c3.r - c4.r)*0.5;
					float d = length( vec2(diff1, diff2) );
					float a1 = min(c1.g, c2.g);
					float a2 = min(c3.g, c4.g);
					float visibilityFactor = min(a1, a2);
					vec3 edgeColor = 1.0 - visibilityFactor > 0.001 ? visibleEdgeColor : hiddenEdgeColor;
					gl_FragColor = vec4(edgeColor, 1.0) * vec4(d);
				}`})}_getSeparableBlurMaterial(e){return new lt({defines:{MAX_RADIUS:e},uniforms:{colorTexture:{value:null},texSize:{value:new _e(.5,.5)},direction:{value:new _e(.5,.5)},kernelRadius:{value:1}},vertexShader:`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;
				uniform float kernelRadius;

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
				}

				void main() {
					vec2 invSize = 1.0 / texSize;
					float sigma = kernelRadius/2.0;
					float weightSum = gaussianPdf(0.0, sigma);
					vec4 diffuseSum = texture2D( colorTexture, vUv) * weightSum;
					vec2 delta = direction * invSize * kernelRadius/float(MAX_RADIUS);
					vec2 uvOffset = delta;
					for( int i = 1; i <= MAX_RADIUS; i ++ ) {
						float x = kernelRadius * float(i) / float(MAX_RADIUS);
						float w = gaussianPdf(x, sigma);
						vec4 sample1 = texture2D( colorTexture, vUv + uvOffset);
						vec4 sample2 = texture2D( colorTexture, vUv - uvOffset);
						diffuseSum += ((sample1 + sample2) * w);
						weightSum += (2.0 * w);
						uvOffset += delta;
					}
					gl_FragColor = diffuseSum/weightSum;
				}`})}_getOverlayMaterial(){return new lt({uniforms:{maskTexture:{value:null},edgeTexture1:{value:null},edgeTexture2:{value:null},patternTexture:{value:null},edgeStrength:{value:1},edgeGlow:{value:1},usePatternTexture:{value:0}},vertexShader:`varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;

				uniform sampler2D maskTexture;
				uniform sampler2D edgeTexture1;
				uniform sampler2D edgeTexture2;
				uniform sampler2D patternTexture;
				uniform float edgeStrength;
				uniform float edgeGlow;
				uniform bool usePatternTexture;

				void main() {
					vec4 edgeValue1 = texture2D(edgeTexture1, vUv);
					vec4 edgeValue2 = texture2D(edgeTexture2, vUv);
					vec4 maskColor = texture2D(maskTexture, vUv);
					vec4 patternColor = texture2D(patternTexture, 6.0 * vUv);
					float visibilityFactor = 1.0 - maskColor.g > 0.0 ? 1.0 : 0.5;
					vec4 edgeValue = edgeValue1 + edgeValue2 * edgeGlow;
					vec4 finalColor = edgeStrength * maskColor.r * edgeValue;
					if(usePatternTexture)
						finalColor += + visibilityFactor * (1.0 - maskColor.r) * (1.0 - patternColor.r);
					gl_FragColor = finalColor;
				}`,blending:to,depthTest:!1,depthWrite:!1,transparent:!0})}}Bi.BlurDirectionX=new _e(1,0);Bi.BlurDirectionY=new _e(0,1);const Dn={defines:{SMAA_THRESHOLD:"0.1"},uniforms:{tDiffuse:{value:null},resolution:{value:new _e(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		void SMAAEdgeDetectionVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0,  1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4(  1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 2 ] = texcoord.xyxy + resolution.xyxy * vec4( -2.0, 0.0, 0.0,  2.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAAEdgeDetectionVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		vec4 SMAAColorEdgeDetectionPS( vec2 texcoord, vec4 offset[3], sampler2D colorTex ) {
			vec2 threshold = vec2( SMAA_THRESHOLD, SMAA_THRESHOLD );

			// Calculate color deltas:
			vec4 delta;
			vec3 C = texture2D( colorTex, texcoord ).rgb;

			vec3 Cleft = texture2D( colorTex, offset[0].xy ).rgb;
			vec3 t = abs( C - Cleft );
			delta.x = max( max( t.r, t.g ), t.b );

			vec3 Ctop = texture2D( colorTex, offset[0].zw ).rgb;
			t = abs( C - Ctop );
			delta.y = max( max( t.r, t.g ), t.b );

			// We do the usual threshold:
			vec2 edges = step( threshold, delta.xy );

			// Then discard if there is no edge:
			if ( dot( edges, vec2( 1.0, 1.0 ) ) == 0.0 )
				discard;

			// Calculate right and bottom deltas:
			vec3 Cright = texture2D( colorTex, offset[1].xy ).rgb;
			t = abs( C - Cright );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Cbottom  = texture2D( colorTex, offset[1].zw ).rgb;
			t = abs( C - Cbottom );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the maximum delta in the direct neighborhood:
			float maxDelta = max( max( max( delta.x, delta.y ), delta.z ), delta.w );

			// Calculate left-left and top-top deltas:
			vec3 Cleftleft  = texture2D( colorTex, offset[2].xy ).rgb;
			t = abs( C - Cleftleft );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Ctoptop = texture2D( colorTex, offset[2].zw ).rgb;
			t = abs( C - Ctoptop );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the final maximum delta:
			maxDelta = max( max( maxDelta, delta.z ), delta.w );

			// Local contrast adaptation in action:
			edges.xy *= step( 0.5 * maxDelta, delta.xy );

			return vec4( edges, 0.0, 0.0 );
		}

		void main() {

			gl_FragColor = SMAAColorEdgeDetectionPS( vUv, vOffset, tDiffuse );

		}`},Ln={defines:{SMAA_MAX_SEARCH_STEPS:"8",SMAA_AREATEX_MAX_DISTANCE:"16",SMAA_AREATEX_PIXEL_SIZE:"( 1.0 / vec2( 160.0, 560.0 ) )",SMAA_AREATEX_SUBTEX_SIZE:"( 1.0 / 7.0 )"},uniforms:{tDiffuse:{value:null},tArea:{value:null},tSearch:{value:null},resolution:{value:new _e(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];
		varying vec2 vPixcoord;

		void SMAABlendingWeightCalculationVS( vec2 texcoord ) {
			vPixcoord = texcoord / resolution;

			// We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.25, 0.125, 1.25, 0.125 ); // WebGL port note: Changed sign in Y and W components
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.125, 0.25, -0.125, -1.25 ); // WebGL port note: Changed sign in Y and W components

			// And these for the searches, they indicate the ends of the loops:
			vOffset[ 2 ] = vec4( vOffset[ 0 ].xz, vOffset[ 1 ].yw ) + vec4( -2.0, 2.0, -2.0, 2.0 ) * resolution.xxyy * float( SMAA_MAX_SEARCH_STEPS );

		}

		void main() {

			vUv = uv;

			SMAABlendingWeightCalculationVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#define SMAASampleLevelZeroOffset( tex, coord, offset ) texture2D( tex, coord + float( offset ) * resolution, 0.0 )

		uniform sampler2D tDiffuse;
		uniform sampler2D tArea;
		uniform sampler2D tSearch;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[3];
		varying vec2 vPixcoord;

		#if __VERSION__ == 100
		vec2 round( vec2 x ) {
			return sign( x ) * floor( abs( x ) + 0.5 );
		}
		#endif

		float SMAASearchLength( sampler2D searchTex, vec2 e, float bias, float scale ) {
			// Not required if searchTex accesses are set to point:
			// float2 SEARCH_TEX_PIXEL_SIZE = 1.0 / float2(66.0, 33.0);
			// e = float2(bias, 0.0) + 0.5 * SEARCH_TEX_PIXEL_SIZE +
			//     e * float2(scale, 1.0) * float2(64.0, 32.0) * SEARCH_TEX_PIXEL_SIZE;
			e.r = bias + e.r * scale;
			return 255.0 * texture2D( searchTex, e, 0.0 ).r;
		}

		float SMAASearchXLeft( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			/**
				* @PSEUDO_GATHER4
				* This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
				* sample between edge, thus fetching four edges in a row.
				* Sampling with different offsets in each direction allows to disambiguate
				* which edges are active from the four fetched ones.
				*/
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x > end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			// We correct the previous (-0.25, -0.125) offset we applied:
			texcoord.x += 0.25 * resolution.x;

			// The searches are bias by 1, so adjust the coords accordingly:
			texcoord.x += resolution.x;

			// Disambiguate the length added by the last step:
			texcoord.x += 2.0 * resolution.x; // Undo last step
			texcoord.x -= resolution.x * SMAASearchLength(searchTex, e, 0.0, 0.5);

			return texcoord.x;
		}

		float SMAASearchXRight( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x < end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			texcoord.x -= 0.25 * resolution.x;
			texcoord.x -= resolution.x;
			texcoord.x -= 2.0 * resolution.x;
			texcoord.x += resolution.x * SMAASearchLength( searchTex, e, 0.5, 0.5 );

			return texcoord.x;
		}

		float SMAASearchYUp( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y > end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y -= 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y; // WebGL port note: Changed sign
			texcoord.y -= 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y * SMAASearchLength( searchTex, e.gr, 0.0, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		float SMAASearchYDown( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y < end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y += 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y; // WebGL port note: Changed sign
			texcoord.y += 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y * SMAASearchLength( searchTex, e.gr, 0.5, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		vec2 SMAAArea( sampler2D areaTex, vec2 dist, float e1, float e2, float offset ) {
			// Rounding prevents precision errors of bilinear filtering:
			vec2 texcoord = float( SMAA_AREATEX_MAX_DISTANCE ) * round( 4.0 * vec2( e1, e2 ) ) + dist;

			// We do a scale and bias for mapping to texel space:
			texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord + ( 0.5 * SMAA_AREATEX_PIXEL_SIZE );

			// Move to proper place, according to the subpixel offset:
			texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;

			return texture2D( areaTex, texcoord, 0.0 ).rg;
		}

		vec4 SMAABlendingWeightCalculationPS( vec2 texcoord, vec2 pixcoord, vec4 offset[ 3 ], sampler2D edgesTex, sampler2D areaTex, sampler2D searchTex, ivec4 subsampleIndices ) {
			vec4 weights = vec4( 0.0, 0.0, 0.0, 0.0 );

			vec2 e = texture2D( edgesTex, texcoord ).rg;

			if ( e.g > 0.0 ) { // Edge at north
				vec2 d;

				// Find the distance to the left:
				vec2 coords;
				coords.x = SMAASearchXLeft( edgesTex, searchTex, offset[ 0 ].xy, offset[ 2 ].x );
				coords.y = offset[ 1 ].y; // offset[1].y = texcoord.y - 0.25 * resolution.y (@CROSSING_OFFSET)
				d.x = coords.x;

				// Now fetch the left crossing edges, two at a time using bilinear
				// filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
				// discern what value each edge has:
				float e1 = texture2D( edgesTex, coords, 0.0 ).r;

				// Find the distance to the right:
				coords.x = SMAASearchXRight( edgesTex, searchTex, offset[ 0 ].zw, offset[ 2 ].y );
				d.y = coords.x;

				// We want the distances to be in pixel units (doing this here allow to
				// better interleave arithmetic and memory accesses):
				d = d / resolution.x - pixcoord.x;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the right crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 1, 0 ) ).r;

				// Ok, we know how this pattern looks like, now it is time for getting
				// the actual area:
				weights.rg = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.y ) );
			}

			if ( e.r > 0.0 ) { // Edge at west
				vec2 d;

				// Find the distance to the top:
				vec2 coords;

				coords.y = SMAASearchYUp( edgesTex, searchTex, offset[ 1 ].xy, offset[ 2 ].z );
				coords.x = offset[ 0 ].x; // offset[1].x = texcoord.x - 0.25 * resolution.x;
				d.x = coords.y;

				// Fetch the top crossing edges:
				float e1 = texture2D( edgesTex, coords, 0.0 ).g;

				// Find the distance to the bottom:
				coords.y = SMAASearchYDown( edgesTex, searchTex, offset[ 1 ].zw, offset[ 2 ].w );
				d.y = coords.y;

				// We want the distances to be in pixel units:
				d = d / resolution.y - pixcoord.y;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the bottom crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 0, 1 ) ).g;

				// Get the area for this direction:
				weights.ba = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.x ) );
			}

			return weights;
		}

		void main() {

			gl_FragColor = SMAABlendingWeightCalculationPS( vUv, vPixcoord, vOffset, tDiffuse, tArea, tSearch, ivec4( 0.0 ) );

		}`},Xr={uniforms:{tDiffuse:{value:null},tColor:{value:null},resolution:{value:new _e(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		void SMAANeighborhoodBlendingVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0, 1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( 1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAANeighborhoodBlendingVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform sampler2D tColor;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		vec4 SMAANeighborhoodBlendingPS( vec2 texcoord, vec4 offset[ 2 ], sampler2D colorTex, sampler2D blendTex ) {
			// Fetch the blending weights for current pixel:
			vec4 a;
			a.xz = texture2D( blendTex, texcoord ).xz;
			a.y = texture2D( blendTex, offset[ 1 ].zw ).g;
			a.w = texture2D( blendTex, offset[ 1 ].xy ).a;

			// Is there any blending weight with a value greater than 0.0?
			if ( dot(a, vec4( 1.0, 1.0, 1.0, 1.0 )) < 1e-5 ) {
				return texture2D( colorTex, texcoord, 0.0 );
			} else {
				// Up to 4 lines can be crossing a pixel (one through each edge). We
				// favor blending by choosing the line with the maximum weight for each
				// direction:
				vec2 offset;
				offset.x = a.a > a.b ? a.a : -a.b; // left vs. right
				offset.y = a.g > a.r ? -a.g : a.r; // top vs. bottom // WebGL port note: Changed signs

				// Then we go in the direction that has the maximum weight:
				if ( abs( offset.x ) > abs( offset.y )) { // horizontal vs. vertical
					offset.y = 0.0;
				} else {
					offset.x = 0.0;
				}

				// Fetch the opposite color and lerp by hand:
				vec4 C = texture2D( colorTex, texcoord, 0.0 );
				texcoord += sign( offset ) * resolution;
				vec4 Cop = texture2D( colorTex, texcoord, 0.0 );
				float s = abs( offset.x ) > abs( offset.y ) ? abs( offset.x ) : abs( offset.y );

				// WebGL port note: Added gamma correction
				C.xyz = pow(C.xyz, vec3(2.2));
				Cop.xyz = pow(Cop.xyz, vec3(2.2));
				vec4 mixed = mix(C, Cop, s);
				mixed.xyz = pow(mixed.xyz, vec3(1.0 / 2.2));

				return mixed;
			}
		}

		void main() {

			gl_FragColor = SMAANeighborhoodBlendingPS( vUv, vOffset, tColor, tDiffuse );

		}`};class zx extends ki{constructor(){super(),this._edgesRT=new xt(1,1,{depthBuffer:!1,type:qt}),this._edgesRT.texture.name="SMAAPass.edges",this._weightsRT=new xt(1,1,{depthBuffer:!1,type:qt}),this._weightsRT.texture.name="SMAAPass.weights";const e=this,t=new Image;t.src=this._getAreaTexture(),t.onload=function(){e._areaTexture.needsUpdate=!0},this._areaTexture=new At,this._areaTexture.name="SMAAPass.area",this._areaTexture.image=t,this._areaTexture.minFilter=Tt,this._areaTexture.generateMipmaps=!1,this._areaTexture.flipY=!1;const i=new Image;i.src=this._getSearchTexture(),i.onload=function(){e._searchTexture.needsUpdate=!0},this._searchTexture=new At,this._searchTexture.name="SMAAPass.search",this._searchTexture.image=i,this._searchTexture.magFilter=Ct,this._searchTexture.minFilter=Ct,this._searchTexture.generateMipmaps=!1,this._searchTexture.flipY=!1,this._uniformsEdges=Yt.clone(Dn.uniforms),this._materialEdges=new lt({defines:Object.assign({},Dn.defines),uniforms:this._uniformsEdges,vertexShader:Dn.vertexShader,fragmentShader:Dn.fragmentShader}),this._uniformsWeights=Yt.clone(Ln.uniforms),this._uniformsWeights.tDiffuse.value=this._edgesRT.texture,this._uniformsWeights.tArea.value=this._areaTexture,this._uniformsWeights.tSearch.value=this._searchTexture,this._materialWeights=new lt({defines:Object.assign({},Ln.defines),uniforms:this._uniformsWeights,vertexShader:Ln.vertexShader,fragmentShader:Ln.fragmentShader}),this._uniformsBlend=Yt.clone(Xr.uniforms),this._uniformsBlend.tDiffuse.value=this._weightsRT.texture,this._materialBlend=new lt({uniforms:this._uniformsBlend,vertexShader:Xr.vertexShader,fragmentShader:Xr.fragmentShader}),this._fsQuad=new sn(null)}render(e,t,i){this._uniformsEdges.tDiffuse.value=i.texture,this._fsQuad.material=this._materialEdges,e.setRenderTarget(this._edgesRT),this.clear&&e.clear(),this._fsQuad.render(e),this._fsQuad.material=this._materialWeights,e.setRenderTarget(this._weightsRT),this.clear&&e.clear(),this._fsQuad.render(e),this._uniformsBlend.tColor.value=i.texture,this._fsQuad.material=this._materialBlend,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(),this._fsQuad.render(e))}setSize(e,t){this._edgesRT.setSize(e,t),this._weightsRT.setSize(e,t),this._materialEdges.uniforms.resolution.value.set(1/e,1/t),this._materialWeights.uniforms.resolution.value.set(1/e,1/t),this._materialBlend.uniforms.resolution.value.set(1/e,1/t)}dispose(){this._edgesRT.dispose(),this._weightsRT.dispose(),this._areaTexture.dispose(),this._searchTexture.dispose(),this._materialEdges.dispose(),this._materialWeights.dispose(),this._materialBlend.dispose(),this._fsQuad.dispose()}_getAreaTexture(){return"data:image/png;base64,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"}_getSearchTexture(){return"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAhCAAAAABIXyLAAAAAOElEQVRIx2NgGAWjYBSMglEwEICREYRgFBZBqDCSLA2MGPUIVQETE9iNUAqLR5gIeoQKRgwXjwAAGn4AtaFeYLEAAAAASUVORK5CYII="}}const In={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class gx extends ki{constructor(){super(),this.isOutputPass=!0,this.uniforms=Yt.clone(In.uniforms),this.material=new N1({name:In.name,uniforms:this.uniforms,vertexShader:In.vertexShader,fragmentShader:In.fragmentShader}),this._fsQuad=new sn(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},We.getTransfer(this._outputColorSpace)===$e&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===$o?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===ea?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===ta?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ia?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===na?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===ra?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===sa&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}const Yr=Math.hypot;function qx(s,e,t,i,n,r,o=1.25){if(n<=0)return{x:s,z:e};if(n>=1)return{x:t,z:i};const a=Yr(t,i),l=Math.max(a*1.1,r*o);let d=(s+t)/2,c=(e+i)/2,u=Yr(d,c);if(u<.001){const g=t-s,M=i-e,w=Yr(g,M)||1;d=-M/w,c=g/w,u=1}const h=Math.max(l,u)/u,f=d*h,S=c*h,C=1-n,p=C*C,x=2*C*n,y=n*n;return{x:p*s+x*f+y*t,z:p*e+x*S+y*i}}function _x(s){if(s.length===0)return 1;let e=0;for(const t of s)e+=t.x*t.x+t.z*t.z;return Math.sqrt(e/s.length)||1}const vx={helix:7245238,strand:7251821,loop:8947848},Kd=.36,Mx=1.3,Jd=.3,Qd=1711908,$d=1,bx=16,e1=Math.PI/6,t1=14*Math.PI/180,Ex=2,jr=50;function qi(s,e,t){return s+(e-s)*t}function Nn(s){return s*s*(3-2*s)}class Tx{constructor(e){this.container=e,this.scene=new Ac,this.group=new Xs,this.membraneL=null,this.membraneR=null,this.clipNear=new ei(new U(0,0,-1),0),this.clipGapL=new ei(new U(-1,0,0),0),this.clipGapR=new ei(new U(1,0,0),0),this.composer=null,this.gtaoPass=null,this.outlinePass=null,this.elements=[],this.topo=null,this.t=0,this.membraneHalf=15,this.sceneRadius=60,this.ringR=12,this.flatHalfWidth=60,this.solidHalfX=20,this.solidHalfDepth=20,this.anchorAz=e1,this.anchorEl=t1,this.anchorDist=null,this.flatPxPerA=0,this.raf=0,this.disposed=!1,this.resize=()=>{var o,a;const n=this.container.clientWidth,r=this.container.clientHeight||Math.round(n*.6);if(n!==0&&(this.renderer.setSize(n,r),this.camera.aspect=n/r||1,this.camera.updateProjectionMatrix(),this.composer)){const l=this.renderer.getPixelRatio();this.composer.setPixelRatio(l),this.composer.setSize(n,r);const d=Math.max(1,Math.round(n*l)),c=Math.max(1,Math.round(r*l));(o=this.gtaoPass)==null||o.setSize(d,c),(a=this.outlinePass)==null||a.setSize(d,c)}},this.animate=()=>{if(this.disposed)return;if(this.raf=requestAnimationFrame(this.animate),this.t>=1){this.camera.fov=jr,this.camera.updateProjectionMatrix(),this.controls.enabled||(this.placeCamera(this.anchorAz,this.anchorEl,this.anchorDist??this.framedDist()),this.controls.enabled=!0),this.controls.update(),this.renderFrame();return}this.controls.enabled=!1;const n=Nn(this.t),r=qi(Ex,jr,n);this.camera.fov=r,this.camera.updateProjectionMatrix();const o=qi(this.flatDist(r),this.anchorDist??this.framedDist(),n);this.placeCamera(qi(0,this.anchorAz,n),qi(0,this.anchorEl,n),o),this.renderFrame()},this.renderer=new j0({antialias:!0}),this.renderer.setPixelRatio(window.devicePixelRatio),this.renderer.localClippingEnabled=!0,this.scene.background=new Ge(16054008),this.scene.add(this.group),this.camera=new Gt(8,1,.1,2e5),this.camera.layers.enable($d),this.controls=new K0(this.camera,this.renderer.domElement),this.controls.enableDamping=!0,this.controls.target.set(0,0,0),this.controls.enabled=!1,this.aoCamera=new Gt(8,1,.1,2e5),this.scene.add(new Xc(16777215,.7));const t=new zd(16777215,.7);t.position.set(1,1.4,1),this.scene.add(t);const i=new zd(16777215,.3);i.position.set(-1,-.5,-.8),this.scene.add(i),e.appendChild(this.renderer.domElement),this.resize(),this.buildComposer(),window.addEventListener("resize",this.resize),this.animate()}setScene(e){for(const S of this.elements)this.group.remove(S.mesh),S.geometry.dispose(),S.mesh.material.dispose();this.elements=[];for(const S of[this.membraneL,this.membraneR])S&&(this.group.remove(S),S.geometry.dispose(),S.material.dispose());this.membraneL=this.membraneR=null,this.topo=e,this.membraneHalf=e.membrane.half;let t=0,i=0,n=0,r=1/0,o=-1/0;for(const S of e.elements)for(const C of S.samples)t+=C.pos3d.x,i+=C.pos3d.y,n++,C.arc<r&&(r=C.arc),C.arc>o&&(o=C.arc);t/=n||1,i/=n||1;const a=Number.isFinite(r)?(r+o)/2:0,l=e.kind==="barrel"||e.kind==="assembly",d=(S,C)=>new U(S-a,C,0),c=S=>new U(S.x-t,S.z,S.y-i);for(const S of e.elements)this.elements.push(this.buildElement(S,e,d,c,a,l));let u=0,h=0,f=0;for(const S of this.elements){for(const C of S.flat)u=Math.max(u,Math.abs(C.x));for(const C of S.solid)h=Math.max(h,Math.abs(C.x)),f=Math.max(f,Math.abs(C.z))}this.flatHalfWidth=u,this.solidHalfX=h,this.solidHalfDepth=f,this.ringR=_x(this.elements.flatMap(S=>S.solid.map(C=>({x:C.x,z:C.z})))),this.anchorAz=e1,this.anchorEl=t1,this.anchorDist=null,this.buildMembrane(),this.refreshOutlineSelection(),this.updateMorph()}buildElement(e,t,i,n,r,o){const a=e.samples.map(q=>i(q.arc,q.z)),l=e.samples.map(q=>n(q.pos3d)),d=e.samples.map(q=>q.arc/(t.arcSpan||1));let c=null;e.type==="strand"&&o&&(c=l.map(q=>{const E=new U(q.x,0,q.z);return E.lengthSq()<1e-6?new U(0,0,1):E.normalize()}));const u=e.type==="strand"?4:bx,h=t.style.ribbonHalfWidth;let f,S,C,p;e.type==="strand"?(f=h,S=Mx,C=.35,p=t.style.ribbonThickness/2):e.type==="helix"?(f=h,S=t.style.helixRadius,C=h,p=t.style.helixRadius):(f=Kd,S=t.style.loopRadius,C=Kd,p=t.style.loopRadius);const x=new oi,y=e.samples.length-1,g=[];for(let q=0;q<y;q++)for(let E=0;E<u;E++){const m=q*u+E,_=q*u+(E+1)%u,A=(q+1)*u+E,T=(q+1)*u+(E+1)%u;g.push(m,A,_,_,A,T)}x.setIndex(g),x.setAttribute("position",new ni(new Float32Array(e.samples.length*u*3),3));const M=new pd({color:vx[e.type],roughness:.55,metalness:0,side:Vt,transparent:e.faded,opacity:e.faded?.32:1}),w=new Zt(x,M);return this.group.add(w),{type:e.type,arrow:e.type==="strand",faded:e.faded,flat:a,solid:l,solidFace:c,arcFrac:d,flatHalf:f,radius3d:S,thickFlat:C,thick3d:p,ring:u,geometry:x,mesh:w}}buildMembrane(){const e=t=>{const i=new pd({color:15395562,roughness:1,metalness:0,side:Vt,clippingPlanes:t,clipIntersection:!1}),n=new Zt(new Ls(1,1,1),i);return n.layers.set($d),n.renderOrder=-1,this.group.add(n),n};this.membraneL=e([this.clipNear,this.clipGapL]),this.membraneR=e([this.clipNear,this.clipGapR])}updateMembrane(e){if(!this.membraneL||!this.membraneR)return;const t=8,i=qi(this.flatHalfWidth+t,this.solidHalfX+t,e),n=(this.solidHalfDepth+t)*2;for(const r of[this.membraneL,this.membraneR])r.scale.set(i*2,this.membraneHalf*2,n),r.position.set(0,0,0)}updateMembraneClip(){if(!this.membraneL)return;const e=Nn(this.t),t=new U;this.camera.getWorldDirection(t),t.y=0,t.lengthSq()<1e-6&&t.set(0,0,-1),t.normalize();const i=this.group.position;this.clipNear.setFromNormalAndCoplanarPoint(t,i);const n=new U(0,1,0).cross(t);n.lengthSq()<1e-6&&n.set(1,0,0),n.normalize();const r=qi(0,this.ringR+2,e),o=new U().copy(i).addScaledVector(n,r),a=new U().copy(i).addScaledVector(n,-r);this.clipGapR.setFromNormalAndCoplanarPoint(n,o),this.clipGapL.setFromNormalAndCoplanarPoint(n.clone().negate(),a)}setT(e){const t=this.t;this.t=Math.max(0,Math.min(1,e)),t>=1&&this.t<1&&this.captureAnchor(),this.updateMorph()}get morph(){return this.t}setFlatPixelScale(e){this.flatPxPerA=e>0?e:0}captureAnchor(){const e=this.camera.position,t=e.length()||1;this.anchorAz=Math.atan2(e.x,e.z),this.anchorEl=Math.asin(Ki.clamp(e.y/t,-1,1)),this.anchorDist=t}framedDist(){return this.sceneRadius/Math.sin(Ki.degToRad(jr)/2)*1.06}flatDist(e){const t=Math.tan(Ki.degToRad(e)/2);return this.flatPxPerA>0?(this.container.clientHeight||this.renderer.domElement.clientHeight||1)/2/this.flatPxPerA/t:this.sceneRadius/Math.sin(Ki.degToRad(e)/2)*1.06}updateMorph(){const e=Nn(this.t);for(const i of this.elements){const n=[],r=[];for(let l=0;l<i.flat.length;l++){const d=Nn(Ki.clamp((this.t*(1+Jd)-i.arcFrac[l])/Jd,0,1)),c=i.flat[l],u=i.solid[l],h=qx(c.x,c.z,u.x,u.z,d,this.ringR);n.push(new U(h.x,qi(c.y,u.y,d),h.z));const f=new U(0,0,1),S=i.solidFace?i.solidFace[l]:f;r.push(new U().lerpVectors(f,S,d).normalize())}const o=qi(i.flatHalf,i.radius3d,e),a=i.type==="strand"?qi(i.thickFlat,i.thick3d,e):o;this.writeSweep(i,n,r,o,a)}this.updateMembrane(e);let t=this.membraneHalf;for(const i of this.elements){const n=i.geometry.boundingSphere;n&&(t=Math.max(t,n.center.length()+n.radius))}this.sceneRadius=t,this.camera.near=Math.max(.1,this.sceneRadius*.02),this.camera.far=this.sceneRadius*8+this.membraneHalf*4,this.camera.updateProjectionMatrix()}writeSweep(e,t,i,n,r){const o=e.geometry.getAttribute("position"),a=o.array,l=t.length,d=Ax(t),{bins:c,nors:u}=wx(t,i[0]);for(let h=0;h<l;h++){const f=c[h],S=u[h];let C=n;if(e.arrow){const x=Math.min(9,d*.4),y=(l-1-h)/(l-1)*d;C=y>x?n:n*1.7*y/x}const p=h*e.ring*3;if(e.ring===4){const x=[[C,r],[C,-r],[-C,-r],[-C,r]];for(let y=0;y<4;y++){const[g,M]=x[y];a[p+y*3]=t[h].x+f.x*g+S.x*M,a[p+y*3+1]=t[h].y+f.y*g+S.y*M,a[p+y*3+2]=t[h].z+f.z*g+S.z*M}}else for(let x=0;x<e.ring;x++){const y=x/e.ring*Math.PI*2,g=Math.cos(y)*C,M=Math.sin(y)*C;a[p+x*3]=t[h].x+f.x*g+S.x*M,a[p+x*3+1]=t[h].y+f.y*g+S.y*M,a[p+x*3+2]=t[h].z+f.z*g+S.z*M}}o.needsUpdate=!0,e.geometry.computeVertexNormals(),e.geometry.computeBoundingSphere()}renderFrame(){this.updateMembraneClip(),this.composer?(this.gtaoPass&&(this.gtaoPass.enabled=this.t>=1),this.aoCamera.copy(this.camera),this.aoCamera.layers.set(0),this.composer.render()):this.renderer.render(this.scene,this.camera)}buildComposer(){const e=this.renderer.getPixelRatio(),t=this.renderer.getSize(new _e),i=Math.max(1,t.width),n=Math.max(1,t.height),r=Math.max(1,Math.round(i*e)),o=Math.max(1,Math.round(n*e)),a=new xx(this.renderer);a.addPass(new px(this.scene,this.camera));const l=new $t(this.scene,this.aoCamera,r,o);l.output=$t.OUTPUT.Default,l.updateGtaoMaterial({radius:4,distanceExponent:1,thickness:1,scale:1,samples:8}),l.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:4,radiusExponent:1,rings:2,samples:8}),a.addPass(l),this.gtaoPass=l;const d=new Bi(new _e(r,o),this.scene,this.camera);d.edgeStrength=3,d.edgeThickness=1,d.edgeGlow=0,d.pulsePeriod=0,d.visibleEdgeColor.set(Qd),d.hiddenEdgeColor.set(Qd),a.addPass(d),this.outlinePass=d,a.addPass(new zx),a.addPass(new gx),a.setPixelRatio(e),a.setSize(i,n),this.composer=a,this.refreshOutlineSelection()}refreshOutlineSelection(){this.outlinePass&&(this.outlinePass.selectedObjects=this.elements.map(e=>e.mesh))}placeCamera(e,t,i){this.camera.position.set(i*Math.sin(e)*Math.cos(t),i*Math.sin(t),i*Math.cos(e)*Math.cos(t)),this.camera.lookAt(0,0,0)}dispose(){var e,t,i;this.disposed=!0,cancelAnimationFrame(this.raf),window.removeEventListener("resize",this.resize),this.controls.dispose(),(e=this.gtaoPass)==null||e.dispose(),(t=this.outlinePass)==null||t.dispose(),(i=this.composer)==null||i.dispose(),this.composer=null,this.gtaoPass=null,this.outlinePass=null,this.renderer.dispose(),this.renderer.domElement.parentNode===this.container&&this.container.removeChild(this.renderer.domElement)}}function Ax(s){let e=0;for(let t=1;t<s.length;t++)e+=s[t].distanceTo(s[t-1]);return e}function wx(s,e){const t=s.length,i=new Array(t);for(let d=0;d<t;d++){const c=new U;d===0?c.subVectors(s[1],s[0]):d===t-1?c.subVectors(s[d],s[d-1]):c.subVectors(s[d+1],s[d-1]);const u=c.length();i[d]=u>1e-6?c.divideScalar(u):new U(1,0,0)}let n=e.clone().addScaledVector(i[0],-e.dot(i[0]));n.lengthSq()<1e-6&&(n=new U(0,1,0).addScaledVector(i[0],-i[0].y),n.lengthSq()<1e-6&&n.set(1,0,0)),n.normalize();const r=new Array(t),o=new Array(t);r[0]=n,o[0]=new U().crossVectors(i[0],n).normalize();const a=new U,l=new bi;for(let d=1;d<t;d++){a.crossVectors(i[d-1],i[d]);const c=a.length(),u=Ki.clamp(i[d-1].dot(i[d]),-1,1);c<1e-6?r[d]=r[d-1].clone():(a.divideScalar(c),l.setFromAxisAngle(a,Math.atan2(c,u)),r[d]=r[d-1].clone().applyQuaternion(l).normalize()),o[d]=new U().crossVectors(i[d],r[d]).normalize()}return{bins:o,nors:r}}const Rx=Object.freeze(Object.defineProperty({__proto__:null,TopologyView3D:Tx},Symbol.toStringTag,{value:"Module"}));
