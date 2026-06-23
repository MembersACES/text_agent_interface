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
//    so _portOf() always fails and every ?entity= hits "Client not found"). Ours, not Marcus's. ──
const SEED_FN =
  "function _acesSeedPortFromRoster(){try{if(typeof getClients!=='function'||typeof PORT==='undefined'||typeof _ENTITY_OF==='undefined')return;var cl=getClients((typeof _curPeriod==='function')?_curPeriod():null)||[];if(!cl.length)return;PORT.length=0;for(var k in _ENTITY_OF){if(Object.prototype.hasOwnProperty.call(_ENTITY_OF,k))delete _ENTITY_OF[k];}cl.forEach(function(c){if(!c)return;var slug=c.reporting_entity||c.entity_id||c.entity;if(!slug)return;_ENTITY_OF[slug]=slug;var z=function(){return{state:'none',exp_a:0,exp_y:0};};PORT.push({id:slug,client:(c.business_name||c.display_name||slug),entity:slug,sites:(c.member_count!=null?c.member_count:(c.activity_record_count!=null?c.activity_record_count:'')),utils:{electricity:z(),gas:z(),waste:z()}});});}catch(e){}}\n";
sub("ACES:port-seed-fn", "var ACES_ENTRY={entity:null,period:null};", SEED_FN + "var ACES_ENTRY={entity:null,period:null};", { min: 1 });


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
