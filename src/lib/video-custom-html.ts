export type CustomVideoSlide = {
  title: string;
  narration: string;
  bullets: string[];
};

export function buildCustomVideoReviewHtml(
  projectTitle: string,
  slug: string,
  slides: CustomVideoSlide[]
): string {
  const slideBlocks = slides
    .map(
      (s, i) => `
    <section class="slide" data-index="${i}" style="display:${i === 0 ? "flex" : "none"}">
      <div class="slide-inner">
        <p class="eyebrow">Slide ${i + 1} of ${slides.length}</p>
        <h2>${escapeHtml(s.title)}</h2>
        <ul>${(s.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
        <div class="narration">
          <strong>Narration</strong>
          <p>${escapeHtml(s.narration)}</p>
        </div>
      </div>
    </section>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(projectTitle)} — slide review</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: #0f0f14; color: #f5f5f7; }
    header { padding: 16px 24px; border-bottom: 1px solid #2a2a35; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    header h1 { margin: 0; font-size: 18px; font-weight: 700; }
    header .meta { font-size: 12px; color: #a1a1aa; font-family: ui-monospace, monospace; }
    main { max-width: 960px; margin: 0 auto; padding: 24px; }
    .slide { min-height: 420px; align-items: center; justify-content: center; }
    .slide-inner { width: 100%; background: linear-gradient(145deg, #1a1a24, #12121a); border: 1px solid #2f2f3a; border-radius: 16px; padding: 32px; }
    .eyebrow { text-transform: uppercase; letter-spacing: .08em; font-size: 11px; color: #5750F1; font-weight: 700; margin: 0 0 8px; }
    h2 { margin: 0 0 16px; font-size: 28px; line-height: 1.2; }
    ul { margin: 0 0 20px; padding-left: 20px; color: #d4d4d8; line-height: 1.6; }
    .narration { border-top: 1px solid #333; padding-top: 16px; }
    .narration strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #a1a1aa; margin-bottom: 8px; }
    .narration p { margin: 0; color: #e4e4e7; line-height: 1.6; }
    nav { display: flex; gap: 8px; justify-content: center; padding: 16px; }
    button { background: #5750F1; color: white; border: 0; border-radius: 8px; padding: 10px 16px; font-weight: 600; cursor: pointer; }
    button.secondary { background: #27272a; color: #e4e4e7; }
    button:disabled { opacity: .4; cursor: not-allowed; }
    footer { text-align: center; font-size: 11px; color: #71717a; padding: 12px 24px 24px; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(projectTitle)}</h1>
    <span class="meta">${escapeHtml(slug)}</span>
  </header>
  <main id="deck">${slideBlocks}</main>
  <nav>
    <button type="button" class="secondary" id="prev">Previous</button>
    <button type="button" id="next">Next</button>
  </nav>
  <footer>Carbon Zero Australasia · custom video slide review · edit narrations before render</footer>
  <script>
    (function () {
      var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
      var idx = 0;
      function show(i) {
        idx = Math.max(0, Math.min(slides.length - 1, i));
        slides.forEach(function (el, n) { el.style.display = n === idx ? 'flex' : 'none'; });
        document.getElementById('prev').disabled = idx === 0;
        document.getElementById('next').disabled = idx === slides.length - 1;
      }
      document.getElementById('prev').addEventListener('click', function () { show(idx - 1); });
      document.getElementById('next').addEventListener('click', function () { show(idx + 1); });
      show(0);
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseSlidesJson(raw: string): CustomVideoSlide[] {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : trimmed) as { slides?: CustomVideoSlide[] };
  const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
  return slides
    .filter((s) => s && typeof s.title === "string")
    .map((s) => ({
      title: s.title.trim(),
      narration: (s.narration || "").trim(),
      bullets: Array.isArray(s.bullets) ? s.bullets.map(String).filter(Boolean) : [],
    }));
}
