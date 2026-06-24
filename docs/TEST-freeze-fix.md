# Test plan — the Marcus-page freeze fix

Two changes, two layers:
1. **Front end:** `_apiGet` converted to **async/non-blocking** in our hosted embed (build-script patch).
   This is what stops the tab freezing.
2. **Back end:** the manifest's per-member Airtable lookups now run in **parallel**, so the data also
   arrives faster.

> Note: the sandbox couldn't regenerate the embed for you — its mount served a **truncated** copy of the
> build script. Your real disk copy is complete and correct, so the rebuild below works on your machine.

---

## 1. Embed is already rebuilt — just confirm + reload

**I already regenerated `public/disc-engine/disc-engine-embed.html` with the async fix** (the earlier
build never landed; this one is verified on disk at line ~1155 — `xhr.open(...,true)`). And the wrapper
page now **cache-busts** the iframe (`?v=20260623-async`), so a normal reload loads the fresh embed —
no more serving a stale cached copy. Confirm the markers:

```bash
cd text_agent_interface
grep -c "_go(path);return null"        public/disc-engine/disc-engine-embed.html   # expect 1
grep -c "+path,true)"                   public/disc-engine/disc-engine-embed.html   # expect 1  (async XHR)
grep -c "_orig.apply(this,arguments)"   public/disc-engine/disc-engine-embed.html   # expect 0  (old sync gone)
```

(If you ever re-run `node scripts/build-disc-engine.mjs` yourself, it reproduces the same file and bumps
nothing — and if `node` prints nothing / the file doesn't change, your build-script tail was torn on
save; re-paste from git so it ends with `writeFileSync(OUT, html, "utf8")`. But you don't need to: it's
already built.)

## 2. The freeze test (the important one)

Hard-refresh the Marcus page: **Ctrl+Shift+R** on `localhost:3000/resources/disc-engine` (must hard-refresh
so the browser drops the cached old embed). Select **Frankston**. Then — *while it's still loading* — try to:

- scroll the page,
- open/已 use DevTools (F12),
- click the entity dropdown.

**Pass:** all of those work *immediately*; you see a loading shell (not a white frozen screen), and the
data fills in when the backend responds. **Fail (old behaviour):** the whole tab is locked until data appears.

The page no longer blocks on the request — that's the fix. How *long* until data appears depends on the
backend (step 3).

## 3. Faster way to test locally (isolate the backend — no embed, no waiting on a screen)

You asked how else to test without waiting for the render. Hit the manifest endpoint directly and time it —
this measures the backend speed on its own:

```bash
TOKEN="<staff id_token from DevTools > Application > your session>"
HOST="http://localhost:8000"
time curl -s "$HOST/api/climate/entities/frankston-rsl/activity-sources/manifest?period=FY26" \
  -H "Authorization: Bearer $TOKEN" -o /tmp/manifest.json
python -c "import json;d=json.load(open('/tmp/manifest.json'));print('sites:',len(d.get('sites',[])),'contracts_available:',d.get('contracts_available'))"
```

`time` tells you exactly how long the manifest takes — before vs after the backend deploy. With the
parallel fetch, a multi-member entity should drop substantially. (If Frankston is a single member, the
parallel loop won't help its first load — the cost is then *inside* one `get_linked_utility_records` call;
tell me and I'll parallelize the per-utility fetch too.)

## 4. Backend syntax gate

```bash
cd text_agent_backend
python -m py_compile services/climate_entity_sources.py services/airtable_client.py && echo OK
```

(The sandbox mount was stale, so run this on your machine. There are now **two** parallelizations:
(1) the manifest's per-member loop, and (2) `get_linked_utility_records`'s per-record Airtable fetch —
the latter is the bigger win for a single-member entity like Frankston. Both preserve exact order/merge —
verified deterministic over 20–30 randomized runs.)

---

## Pass criteria
- [ ] `node scripts/build-disc-engine.mjs` regenerates the embed; async markers present, old sync gone.
- [ ] After hard-refresh + selecting Frankston, the **tab stays responsive** while loading (no freeze).
- [ ] `time curl …/manifest` returns in a reasonable time after the backend deploy.
- [ ] `py_compile services/climate_entity_sources.py` OK.

When the freeze is gone and the wait is acceptable → push frontend (rebuilt embed + build script) and
backend (parallelized manifest), then it's safe to hand the async note (handover §14) to Marcus.
