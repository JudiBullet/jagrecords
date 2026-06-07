# JAG Records — Proje Devir Notu (HANDOFF)

> Bunu yeni bir Claude Code konuşmasına yapıştır. Tüm bağlam burada.

## Proje nedir
JAG Records — bağımsız plak şirketi + müzik **magazin** sitesi. Kimlik: **siyah + asit-sarısı (#e6f00a) "rave"** estetiği (Kerrang/Rolling Stone ilhamı). Site **İngilizce**. Statik çok-sayfalı HTML/CSS/JS + 1 Vercel serverless fonksiyon. Build adımı YOK.

## Konum & yayın
- **Çalışma klasörü:** `C:\Users\Win11\Desktop\JAG MAIN`  (git repo burada)
- **GitHub:** `https://github.com/JudiBullet/jagrecords`  (remote: origin/main)
- **Vercel:** otomatik deploy → **https://jagrecords.org** (+ jagrecords.vercel.app)
- **Yayınlama:** `cd "C:\Users\Win11\Desktop\JAG MAIN"; git add . ; git commit -m "..." ; git push`  → Vercel ~20 sn'de günceller.

## Yapı
- Sayfalar: `index.html` (hero + News + Events), `news.html`, `hakkimizda.html` (About), `merch.html`, `albumler.html` (Albums), `sanatcilar.html` (Artists), `iletisim.html` (Contact), `sanatci-*.html` (20 sanatçı alt sayfası).
- `assets/styles.css` — tüm stiller (tema değişkenleri `:root` + `html[data-theme="light"]`).
- `assets/app.js` — tüm JS: WebGL blob (hero arka plan), 3D carousel motoru `createCarousel` (albümler 20 + merch 10), dinamik **radyo** (Radio Browser API + fallback küratör liste), **canlı haber** (önce `/api/news`, fallback allorigins), **events** (`assets/events.json`), gece/gündüz toggle, mobil hamburger drawer, özel imleç.
- `api/news.js` — Vercel serverless: RSS toplayıcı (Loudwire/NME/Pitchfork/Stereogum/Metal Injection/Consequence/Brooklyn Vegan), görsel+özet, edge-cache.
- `assets/albums/01..20` (kapaklar; 10.png gerçek, diğerleri SVG placeholder), `assets/merch/*.svg`, `assets/artists/01..20.svg` (portre placeholder), `assets/events.json`, `assets/favicon.svg`.
- `sitemap.xml`, `robots.txt`, `vercel.json` (asset cache).
- Görsel ekleme: `assets/_inbox/` klasörüne bırak + kök dizindeki `add-image.ps1`; veya panodan `save-clip.ps1`.

## KRİTİK kurallar (yeni asistan oku!)
1. **PowerShell 5.1 + BOM'suz .ps1 = ANSI okur, Türkçe/özel karakteri BOZAR.** Üretilen `.ps1` dosyaları **ASCII** olmalı. Türkçe/özel karakter gerekiyorsa: HTML'de **entity** (`&#231;`), JS'te **`String.fromCharCode()`** veya `\u`. Her script'i çalıştırmadan önce byte>127 taraması yap.
2. **Edit/Write araçları UTF-8'i doğru yazar** → HTML içeriğindeki Türkçe/İngilizce metinleri bunlarla düzenle (sorun yok).
3. **Yol:** klasör adı artık `JAG MAIN` (eski `JAG SİTE MAIN`'deki İ harfi ANSI'de sorun çıkarıyordu — artık temiz).
4. Kullanıcı **her adımda ekran görüntüsü/preview istemiyor** — doğrulamayı HTTP/WebFetch ile sessiz yap. Preview MCP bu oturumlarda sık takılıyor.
5. Tema: accent = `var(--purple)` (dark'ta sarı, light'ta siyah). Başlıklar `var(--white)`. "Accent üzeri yazı" = `var(--on-accent)`.

## Açık işler (öncelik sırası — denetimden)
- **P0:** Görsel optimizasyonu (`10.png` 623 KB! hepsini ~800px/WebP'e indir) · gerçek **OG paylaşım görseli** (1200×630 PNG; şu an favicon.svg → sosyalde önizleme basmıyor) · **iletişim formunu gerçek kutuya** bağla (şu an mailto; Formspree öner).
- **P1:** WebGL blob'u **sadece hero**'da/mobilde kapat (pil/CPU) · **sarı (light) modu yumuşat**, en azından News sayfası light'ta koyu kalsın (okuma yorgunluğu) · **radyo "now playing"** şarkı ismi (`api/nowplaying` ile ICY metadata proxy) · radyo dedupe (aynı istasyon tekrarı).
- **P2:** JAG logosu her sayfada 22 KB gömülü (×27) → tek dosya/CSS mask · CSS/JS minify · erişilebilirlik (`:focus` halkaları, skip-link) · özel imleç (`cursor:none`) gözden geçir.

## Domain durumu
`jagrecords.org` Vercel'den alındı. Kod tarafı entegre (URL/canonical/sitemap/robots/vercel.json). Vercel panelinde: Project → Settings → Domains → `jagrecords.org` + `www.jagrecords.org` ekle, apex'i primary yap (www→apex redirect). Domain Vercel'den alındığı için DNS+SSL otomatik.
