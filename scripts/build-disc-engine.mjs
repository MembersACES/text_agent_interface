#!/usr/bin/env node
/**
 * build-disc-engine.mjs — ACES-side patcher for the Prograde "Disc Engine" embed.
 *
 * Reads the PRISTINE vendor copy (vendor/disc-engine/disc-engine-embed.html — exactly
 * as Marcus ships it) and emits the ACES-hosted, wired copy at
 * public/disc-engine/disc-engine-embed.html.
 *
 * Re-run this whenever Prograde sends a new dashboard version: drop the new file into
 * vendor/disc-engine/ and run `node scripts/build-disc-engine.mjs`. Every transform below
 * ASSERTS it actually matched — if Prograde renames a path or changes the handshake, the
 * build FAILS LOUDLY instead of silently shipping an unwired page.
 *
 * Transforms applied (all ACES-side; vendor source is never mutated):
 *   1. Endpoint remap   /api/aces/*  ->  the real ACES backend (/api/climate/*, roster).
 *   2. D1  inbound aces:auth handler: pin ev.origin to the wrapper origin; also accept
 *          apiHost and re-render once token+host land (fixes the empty-first-paint race).
 *   3. D2  outbound aces:reauth postMessage: target window.location.origin, not '*'.
 *   4. D5  pdf.js: self-host from /disc-engine/ instead of cdnjs.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "vendor/disc-engine/disc-engine-embed.html");
const OUT = resolve(ROOT, "public/disc-engine/disc-engine-embed.html");

if (!existsSync(SRC)) {
  console.error(`FATAL: vendor source not found: ${SRC}`);
  process.exit(1);
}

let html = readFileSync(SRC, "utf8");
const report = [];

/** Replace `find` (string) with `to`, asserting a minimum number of hits. */
function sub(label, find, to, { min = 1 } = {}) {
  const count = html.split(find).length - 1;
  if (count < min) {
    console.error(`FATAL [${label}]: expected >=${min} match for:\n  ${JSON.stringify(find).slice(0, 160)}\n  got ${count}. Vendor file changed — review before shipping.`);
    process.exit(1);
  }
  html = html.split(find).join(to);
  report.push(`  [${label}] ${count}x  ${JSON.stringify(find).slice(0, 70)}...`);
}

// ── 1. Endpoint remap (/api/aces/* -> real ACES routes) ──────────────────────
// manifest + site share the /entities/ prefix; clients -> roster; config -> config.
sub("remap:entities", "/api/aces/entities/", "/api/climate/entities/", { min: 2 });
sub("remap:clients", "/api/aces/clients", "/api/climate/roster", { min: 1 });
sub("remap:config", "/api/aces/config", "/api/climate/config", { min: 1 });

// ── 2. D1 — inbound aces:auth: origin-pin + apiHost injection + re-render ─────
const AUTH_FIND =
  `var d=ev&&ev.data; if(d&&d.type==='aces:auth'&&d.token){ ACES_AUTH.token=d.token; /* inert: stored for the future Authorization: Bearer header, not used yet */ }`;
const AUTH_TO =
  `if(ev.origin!==window.location.origin) return; /* ACES D1: same-origin wrapper only */ ` +
  `var d=ev&&ev.data; if(d&&d.type==='aces:auth'){ if(d.token){ACES_AUTH.token=d.token;} if(d.apiHost){window.ACES_API_HOST=d.apiHost;} if(typeof _acesSeedPortFromRoster==='function'){try{_acesSeedPortFromRoster();}catch(e){}} if(typeof render==='function'){try{render();}catch(e){}} }`;
sub("D1:auth-handler", AUTH_FIND, AUTH_TO, { min: 1 });

// ── ACES P1: populate PORT/_ENTITY_OF from the live roster (vendor leaves PORT=[]; never filled,
//    so _portOf() always fails and every ?entity= hits "Client not found"). Seeds ONLY the
//    selected ACES_ENTRY.entity (not the whole roster) to avoid L1's synchronous-manifest freeze. ──
const SEED_FN =
  "function _acesSeedPortFromRoster(){try{if(typeof PORT==='undefined'||typeof _ENTITY_OF==='undefined')return;var want=(typeof ACES_ENTRY!=='undefined'&&ACES_ENTRY&&ACES_ENTRY.entity)?ACES_ENTRY.entity:null;if(!want)return;var name=want;try{var cl=(typeof getClients==='function')?(getClients((typeof _curPeriod==='function')?_curPeriod():null)||[]):[];for(var i=0;i<cl.length;i++){var c=cl[i];var s=c&&(c.reporting_entity||c.entity_id||c.entity);if(s===want){name=c.business_name||c.display_name||want;break;}}}catch(e){}PORT.length=0;for(var k in _ENTITY_OF){if(Object.prototype.hasOwnProperty.call(_ENTITY_OF,k))delete _ENTITY_OF[k];}_ENTITY_OF[want]=want;var z=function(){return{state:'none',exp_a:0,exp_y:0};};PORT.push({id:want,client:name,entity:want,sites:'',utils:{electricity:z(),gas:z(),waste:z()}});}catch(e){}}\n";
sub("ACES:port-seed-fn", "var ACES_ENTRY={entity:null,period:null};", SEED_FN + "var ACES_ENTRY={entity:null,period:null};", { min: 1 });

// ── ACES PERF (THE freeze fix): make _apiGet ASYNC + cached. The vendor's _apiGet uses a
//    SYNCHRONOUS XHR (xhr.open(...,false)), and render() re-reads getManifest/getSite live on every
//    paint — so a slow backend call blocks (freezes) the whole browser tab for its full duration.
//    We replace _apiGet with a non-blocking version: cache HIT -> return synchronously (render shows
//    data); cache MISS -> fire an ASYNC XHR and return null NOW (render falls through to the empty
//    mirror -> shows the loading shell, NOT a freeze). When the response lands we cache it and re-call
//    render(), which re-reads getManifest/getSite (live, per lines 169/226/555/700/1170) and paints
//    the real data. Faithful to the original: same _apiHost()/_apiHeaders()/_apiReauth(401). The main
//    thread NEVER blocks. (Supersedes the synchronous URL cache.) ──
const APIGET_ASYNC =
  "(function(){try{if(typeof _apiGet!=='function')return;var _ac={},_pend={},_rt=null;" +
  "function _rr(){if(_rt)return;_rt=setTimeout(function(){_rt=null;if(typeof render==='function'){try{render();}catch(e){}}},30);}" +
  "function _go(path){if(_pend[path])return;" +
  "if(typeof DATA_SOURCE!=='undefined'&&DATA_SOURCE!=='api'){_ac[path]=null;return;}" +
  "var host=(typeof _apiHost==='function')?_apiHost():'';if(!host||host==='offline-mirror'){_ac[path]=null;return;}" +
  "if(typeof XMLHttpRequest==='undefined'){_ac[path]=null;return;}_pend[path]=true;" +
  "try{var xhr=new XMLHttpRequest();xhr.open('GET',host.replace(/\\/$/,'')+path,true);" +
  "try{var H=(typeof _apiHeaders==='function')?_apiHeaders():{};for(var k in H){try{xhr.setRequestHeader(k,H[k]);}catch(e){}}}catch(e){}" +
  "xhr.onreadystatechange=function(){if(xhr.readyState!==4)return;_pend[path]=false;try{" +
  "if(xhr.status===401){var b=null;try{b=JSON.parse(xhr.responseText||'{}');}catch(e){}" +
  "if((!b||b.error==='REAUTHENTICATION_REQUIRED')&&typeof _apiReauth==='function'){_apiReauth((b&&b.error)||'REAUTHENTICATION_REQUIRED');}_ac[path]=null;}" +
  "else if(xhr.status>=200&&xhr.status<300){var r=null;try{r=JSON.parse(xhr.responseText||'null');}catch(e){r=null;}_ac[path]=r;}" +
  "else{_ac[path]=null;}}catch(e){_ac[path]=null;}_rr();};xhr.send(null);}catch(e){_pend[path]=false;_ac[path]=null;}}" +
  "_apiGet=function(path){if(Object.prototype.hasOwnProperty.call(_ac,path))return _ac[path];_go(path);return null;};" +
  "}catch(e2){}})();\n";
sub("ACES:apiget-async", "var ACES_ENTRY={entity:null,period:null};", APIGET_ASYNC + "var ACES_ENTRY={entity:null,period:null};", { min: 1 });

// ── ACES UX: show "Loading..." (not the misleading "Client not found") while PORT is seeded post-auth ──
const NF_FIND = `if(!p)return _clientNotFound(route.client);`;
const NF_TO = `if(!p)return (typeof PORT!=='undefined'&&PORT.length===0&&typeof ACES_ENTRY!=='undefined'&&ACES_ENTRY&&ACES_ENTRY.entity)?'<div class="note" style="padding:28px;text-align:center;color:#5f6f67">Loading '+((typeof _esc2==='function')?_esc2(String(ACES_ENTRY.entity)):String(ACES_ENTRY.entity))+'... <span style="opacity:.6">(fetching live data)</span></div>':_clientNotFound(route.client);`;
sub("ACES:loading-state", NF_FIND, NF_TO, { min: 1 });


// ── 3. D2 — outbound aces:reauth: pin target origin ──────────────────────────
sub(
  "D2:reauth-origin",
  `window.parent.postMessage({type:'aces:reauth', reason:reason||'REAUTHENTICATION_REQUIRED', ts:Date.now()}, '*');`,
  `window.parent.postMessage({type:'aces:reauth', reason:reason||'REAUTHENTICATION_REQUIRED', ts:Date.now()}, window.location.origin);`,
  { min: 1 }
);

// ── 4. D5 — self-host pdf.js (worker URL first; it is the more specific string) ─
sub("D5:pdf-worker", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js", "/disc-engine/pdf.worker.min.js", { min: 1 });
sub("D5:pdf-main", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", "/disc-engine/pdf.min.js", { min: 1 });

// ── Post-conditions: nothing un-remapped, nothing left on cdnjs ──────────────
const leftoverAces = html.split("/api/aces/").length - 1;
if (leftoverAces > 0) {
  console.error(`FATAL: ${leftoverAces} unremapped '/api/aces/' reference(s) remain — Prograde added an endpoint we have not mapped. Add it to the remap and re-run.`);
  process.exit(1);
}
const leftoverCdn = html.split("cdnjs.cloudflare.com").length - 1;
if (leftoverCdn > 0) {
  console.error(`FATAL: ${leftoverCdn} cdnjs reference(s) remain — a new external script slipped in. Self-host it before shipping.`);
  process.exit(1);
}

// ── Provenance banner (does not alter behaviour) ─────────────────────────────
const srcSha = createHash("sha256").update(readFileSync(SRC)).digest("hex").slice(0, 16);
html = html.replace(
  "<head>",
  `<head>\n<!-- ACES-hosted build. Generated by scripts/build-disc-engine.mjs from vendor sha256:${srcSha}. DO NOT hand-edit — edit the vendor copy or the script. -->`
);

writeFileSync(OUT, html, "utf8");
const outSha = createHash("sha256").update(readFileSync(OUT)).digest("hex").slice(0, 16);

console.log("Disc Engine embed patched OK.");
console.log(report.join("\n"));
console.log(`  vendor sha256:${srcSha}  ->  out sha256:${outSha}  (${Buffer.byteLength(html)} bytes)`);
console.log(`  wrote ${OUT}`);
