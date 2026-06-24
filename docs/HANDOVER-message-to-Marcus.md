**Subject:** Disc Engine — live on our dev + a few things now in your payload

Hi Marcus,

We've brought Disc Engine into the ACES app and it's running on our dev environment. Quick summary of
where it's at and what's on your side — full detail with the exact field shapes is in the attached
integration doc (*disc-engine-INTEGRATION-for-prograde.md*).

**What we did on our end**

- **Hosted your dashboard natively** inside our app (not the cross-origin iframe + token model). Your
  file is served as-is and we remap `/api/aces/*` → our live `/api/climate/*` routes automatically. When
  you ship a new build we drop it in and re-run our transform — a file-swap, not a re-port. (Doc §1–2.)

- **Fixed a hard tab-freeze.** Selecting an entity used to lock the whole browser tab for ~2 minutes,
  because `_apiGet` uses a *synchronous* XHR and our manifest was slow to respond. We made `_apiGet`
  async in our hosted copy (and parallelised our backend so the data arrives faster). **Please fold the
  async into your source** so we stop re-applying it each build — it's the real fix; a synchronous XHR
  will always freeze the tab on any slow call. (Doc §14.)

- **Enriched the payloads you already pull** with two things, each a one-line render on your side:
  - a `contract` block per site (file id + status + Drive link), so your "no contract on file" badge can
    go green — bind it to `site.contract`. (Doc §13.1.)
  - `waste_invoice_documents` on waste `getSite` — the invoice PDF Drive links + a missing-invoice flag.
    (Doc §13.2.)
  - `getConfig` is live now too.

**Small to-do on your side** (all summarised in §15):

1. Bind your contract badge to `site.contract`.
2. Render `waste_invoice_documents.documents[]` as a PDF list (link = `webview_link`, flag `missing`).
3. Make `_apiGet` async in your source.
4. *(Optional)* in-flyout PDF render — the Drive links already open fine; a document-bytes endpoint is
   only needed if you want to render the PDF *inside* your own flyout (your G1 item).
5. Confirm a couple of open items: P1 roster fields, `getSite` member-ID spelling, and the >50-rows/meter
   limit. (Doc §6.)

**One deliberate non-change:** we did *not* pre-populate your `footed_ym` coverage bars from invoice
presence. Your model treats footed = reconciled-to-the-cent (green) vs staged = present-but-unreconciled
(amber), and auto-greening invoices we haven't reconciled would overstate verified coverage in an
assurance view — so we left footing to your reconciliation, as designed.

Doc's attached. Happy to jump on a quick call to walk the contract fields if useful, and if you need
anything extended on our side (roster fields, row limits) just say the word.

Cheers,
Morgan
