# Media optimization — exact commands

You're carrying ~50 MB of video per index.html load and ~10 MB of JPGs on the
Hall of Fame page. This file lists the exact `ffmpeg` / `cwebp` commands to
shrink them. Run from the repo root (`d:/PO/afterbeatsmusic`).

Originals will be moved to `_backup/` so nothing is lost.

## Prerequisites

- ffmpeg (https://ffmpeg.org/download.html) on PATH
- cwebp from libwebp (https://developers.google.com/speed/webp/download) on PATH
- About 5 minutes of CPU time for all encodes

```powershell
# Verify both are installed
ffmpeg -version
cwebp -version
```

## 0. Back up originals

```powershell
mkdir _backup
mkdir _backup\assets-videos
mkdir _backup\images
mkdir _backup\assets-5Pics
Copy-Item assets\videos\*.mp4 _backup\assets-videos\
Copy-Item images\*.mp4 _backup\images\
Copy-Item "images\*Million*.jpg" _backup\images\
Copy-Item "images\*million*.jpg" _backup\images\
Copy-Item "images\*Views*.jpg" _backup\images\
Copy-Item assets\5Pics\*.jpg _backup\assets-5Pics\
```

---

## 1. Videos — H.264 MP4 + WebM/VP9 fallback

Targets — visually identical at the size they render, 5–6× smaller:

| File | Current | Target MP4 | Render size |
|---|---|---|---|
| `assets/videos/hero.mp4` | 11 MB / 1080p | ~2 MB / 720p CRF 28 | hero background, viewport |
| `assets/videos/cont.mp4` | 8 MB | ~1.5 MB / 720p CRF 28 | contact hero + showcase card |
| `assets/videos/13yo.mp4` | 34 MB | ~3 MB / 720p CRF 30 | story zoom (starts at 15%, grows to viewport) |
| `images/9757086-uhd_3840_2160_24fps.mp4` | 12 MB / 4K | ~2 MB / 1080p CRF 28 | showcase card + final-CTA bg — neither needs 4K |

### Hero (highest visibility, keep quality higher — CRF 26)

```powershell
ffmpeg -i _backup\assets-videos\hero.mp4 `
  -vf "scale=1280:-2,fps=24" `
  -c:v libx264 -profile:v high -preset slow -crf 26 -pix_fmt yuv420p `
  -movflags +faststart -an `
  assets\videos\hero.mp4

ffmpeg -i _backup\assets-videos\hero.mp4 `
  -vf "scale=1280:-2,fps=24" `
  -c:v libvpx-vp9 -b:v 0 -crf 33 -row-mt 1 -an `
  assets\videos\hero.webm
```

### Contact / showcase clip (`cont.mp4`)

```powershell
ffmpeg -i _backup\assets-videos\cont.mp4 `
  -vf "scale=1280:-2,fps=24" `
  -c:v libx264 -profile:v high -preset slow -crf 28 -pix_fmt yuv420p `
  -movflags +faststart -an `
  assets\videos\cont.mp4

ffmpeg -i _backup\assets-videos\cont.mp4 `
  -vf "scale=1280:-2,fps=24" `
  -c:v libvpx-vp9 -b:v 0 -crf 35 -row-mt 1 -an `
  assets\videos\cont.webm
```

### Story video (`13yo.mp4` — 34 MB → ~3 MB)

This is the worst offender. It's a 4K source that scales from 15% → fullscreen
during scrub; 720p H.264 CRF 30 is plenty.

```powershell
ffmpeg -i _backup\assets-videos\13yo.mp4 `
  -vf "scale=1280:-2,fps=24" `
  -c:v libx264 -profile:v high -preset slow -crf 30 -pix_fmt yuv420p `
  -movflags +faststart -an `
  assets\videos\13yo.mp4

ffmpeg -i _backup\assets-videos\13yo.mp4 `
  -vf "scale=1280:-2,fps=24" `
  -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -an `
  assets\videos\13yo.webm
```

### 4K stock clip (`9757086-uhd_3840_2160_24fps.mp4` — downscale to 1080p)

```powershell
ffmpeg -i "_backup\images\9757086-uhd_3840_2160_24fps.mp4" `
  -vf "scale=1920:-2,fps=24" `
  -c:v libx264 -profile:v high -preset slow -crf 28 -pix_fmt yuv420p `
  -movflags +faststart -an `
  "images\9757086-uhd_3840_2160_24fps.mp4"

ffmpeg -i "_backup\images\9757086-uhd_3840_2160_24fps.mp4" `
  -vf "scale=1920:-2,fps=24" `
  -c:v libvpx-vp9 -b:v 0 -crf 35 -row-mt 1 -an `
  "images\9757086-uhd_3840_2160_24fps.webm"
```

---

## 2. Poster frames (frame-1 stills, ~30 KB each)

Each `<video>` should reference one of these so the placeholder image renders
before the video starts streaming. Extract from the optimized MP4s:

```powershell
ffmpeg -i assets\videos\hero.mp4 -vframes 1 -q:v 4 assets\videos\hero-poster.jpg
ffmpeg -i assets\videos\cont.mp4 -vframes 1 -q:v 4 assets\videos\cont-poster.jpg
ffmpeg -i assets\videos\13yo.mp4 -vframes 1 -q:v 4 assets\videos\13yo-poster.jpg
ffmpeg -i "images\9757086-uhd_3840_2160_24fps.mp4" -vframes 1 -q:v 4 "images\9757086-poster.jpg"
```

Then add the `poster=` attribute to each `<video>` tag and a `<source>` for the
WebM. Patches:

**`index.html` — hero**

```html
<video id="heroVideo" autoplay muted loop playsinline preload="metadata"
       poster="assets/videos/hero-poster.jpg">
  <source src="assets/videos/hero.webm" type="video/webm">
  <source src="assets/videos/hero.mp4"  type="video/mp4">
</video>
```

**`index.html` — showcase (both occurrences)**

```html
<video muted loop playsinline preload="metadata" data-offset="2"
       poster="images/9757086-poster.jpg">
  <source src="images/9757086-uhd_3840_2160_24fps.webm" type="video/webm">
  <source src="images/9757086-uhd_3840_2160_24fps.mp4"  type="video/mp4">
</video>

<video muted loop playsinline preload="metadata" data-offset="14"
       poster="assets/videos/cont-poster.jpg">
  <source src="assets/videos/cont.webm" type="video/webm">
  <source src="assets/videos/cont.mp4"  type="video/mp4">
</video>
```

**`index.html` — story**

```html
<video id="storyVideo" muted loop playsinline preload="metadata" data-offset="6"
       poster="assets/videos/13yo-poster.jpg">
  <source src="assets/videos/13yo.webm" type="video/webm">
  <source src="assets/videos/13yo.mp4"  type="video/mp4">
</video>
```

**`index.html` — final CTA**

```html
<video id="finalCtaVideo" muted loop playsinline preload="metadata" autoplay
       poster="images/9757086-poster.jpg">
  <source src="images/9757086-uhd_3840_2160_24fps.webm" type="video/webm">
  <source src="images/9757086-uhd_3840_2160_24fps.mp4"  type="video/mp4">
</video>
```

**`contact.html` — contact hero**

```html
<video class="contact-hero-video" data-autoplay-bg-video muted loop playsinline
       preload="metadata" autoplay poster="assets/videos/cont-poster.jpg">
  <source src="assets/videos/cont.webm" type="video/webm">
  <source src="assets/videos/cont.mp4"  type="video/mp4">
</video>
```

Also update the `<link rel="preload">` for the hero in `index.html` to match
whichever encoding browsers prefer first (MP4 is the safe default for the
preload hint — VP9 will be used by Chrome/Firefox once the video element
selects it):

```html
<link rel="preload" as="video" href="assets/videos/hero.mp4" type="video/mp4">
```

---

## 3. JPGs → WebP

9 oversized JPGs eat ~16 MB combined. Target 1280px wide, WebP quality 78.

### Showcase strip (`assets/5Pics/`) — the 3 multi-MB cards

```powershell
cwebp -q 78 -resize 1280 0 "_backup\assets-5Pics\1 (9).jpg"  -o "assets\5Pics\1 (9).webp"
cwebp -q 78 -resize 1280 0 "_backup\assets-5Pics\1 (10).jpg" -o "assets\5Pics\1 (10).webp"
cwebp -q 78 -resize 1280 0 "_backup\assets-5Pics\1 (11).jpg" -o "assets\5Pics\1 (11).webp"
```

Also write smaller-quality JPGs as fallback (you don't have to — browsers without WebP support are <2% of traffic — but it's two more lines):

```powershell
ffmpeg -i "_backup\assets-5Pics\1 (9).jpg"  -vf "scale=1280:-1" -q:v 4 "assets\5Pics\1 (9).jpg"
ffmpeg -i "_backup\assets-5Pics\1 (10).jpg" -vf "scale=1280:-1" -q:v 4 "assets\5Pics\1 (10).jpg"
ffmpeg -i "_backup\assets-5Pics\1 (11).jpg" -vf "scale=1280:-1" -q:v 4 "assets\5Pics\1 (11).jpg"
```

Then in `index.html`, swap each showcase strip `<img>` for a `<picture>`:

```html
<picture>
  <source srcset="assets/5Pics/1 (5).webp" type="image/webp">
  <img src="assets/5Pics/1 (5).jpg" alt="Katy Perry — Wide Awake" loading="lazy" decoding="async" width="1280" height="800">
</picture>
```

### Sphere JPGs (6 multi-MB files in `images/`)

```powershell
$bigs = @(
  "brr brr patapim funk - 3.9 Million Views.jpg",
  "cappuccino assassino funk - 1.5 million Views.jpg",
  "gozalo- 2.5 Million Views.jpg",
  "manda bala slowed - 2.5 Million Views.jpg",
  "montagem rebola - 1.1 Million Views.jpg",
  "sem nada - 1 Million Views.jpg"
)
foreach ($f in $bigs) {
  $base = [System.IO.Path]::GetFileNameWithoutExtension($f)
  cwebp -q 78 -resize 1280 0 "_backup\images\$f" -o "images\$base.webp"
  ffmpeg -y -i "_backup\images\$f" -vf "scale=1280:-1" -q:v 5 "images\$f"
}
```

For the sphere, cards use `background-image: url(...)` inline, so we can't
easily use `<picture>`. Two options:

**Option A — Just replace the JPG in place** (already done by the ffmpeg
re-encode above). Sphere cards keep working, file weights drop from 1–2.4 MB
to ~150 KB each. **Recommended — zero code change.**

**Option B — Use WebP via inline `<img>` overlay.** More work, only worth
it if Option A doesn't get the page light enough.

### Logos — optional, small gain

The 5 PNGs in `images/logos/` are 17–54 KB each. Already filtered to white via
CSS, so the original colour data is wasted. Re-export as **white-on-transparent
PNGs at 2× the rendered height (76px)** and remove the `filter: brightness(0)
invert(1)` from `.hp-logo`. Saves the per-frame filter pass on the marquee. If
you don't have a white-source asset library, leave them alone — the win is
small.

---

## 3a. Team faces (`assets/team/1.jpg` … `9.jpg`)

The 9 face photos total ~14 MB but render in circles between 28 px and 56 px.
Each is decoding a 2–3 MP source for a tiny slot. Crop + downscale to a square
400 × 400 (covers 3× retina on the largest 56 px slot with headroom) and the
total drops to ~400 KB.

```powershell
mkdir _backup\team-original
Copy-Item assets\team\*.* _backup\team-original\

# Re-encode each .jpg / .avif source to a centered 400x400 JPG at q4 (~50 KB).
# force_original_aspect_ratio=increase + crop=400:400 = "scale to cover, then
# center-crop to exact 400x400" — same crop behaviour as background-size:cover.
for ($i = 1; $i -le 9; $i++) {
  $src = Get-ChildItem "assets\team" -Filter "$i.*" | Select-Object -First 1
  if (-not $src) { continue }
  ffmpeg -y -i $src.FullName `
    -vf "scale=400:400:force_original_aspect_ratio=increase,crop=400:400" `
    -q:v 4 "assets\team\$i-tmp.jpg"
  Remove-Item $src.FullName
  Rename-Item "assets\team\$i-tmp.jpg" "$i.jpg"
}
```

Then in `css/style.css` change the one .avif reference back to .jpg:

```css
.ta-4 { background-image: url('../assets/team/4.jpg'); background-color: #1a0d00; }
```

---

## 4. Optional: AVIF for sphere images

If you want to push further, the 6 sphere JPGs encode brilliantly to AVIF
(~60 KB each instead of ~150 KB WebP). Requires `ffmpeg` built with
libavif/libsvtav1 OR `cavif`. Add as an additional `<source type="image/avif">`
above the WebP source.

---

## 5. Verify

```powershell
# Total assets weight before/after
Get-ChildItem -Recurse assets, images -Include *.mp4, *.webm, *.jpg, *.jpeg, *.png, *.webp |
  Measure-Object -Property Length -Sum |
  ForEach-Object { "{0:N1} MB" -f ($_.Sum / 1MB) }
```

Expected after all of section 1, 3, and 3a:
- `assets/videos/` 53 MB → ~7 MB
- `images/` (4K mp4 + 6 multi-MB JPGs) 22 MB → ~3 MB
- `assets/5Pics/` 4 MB → ~600 KB
- `assets/team/` 14 MB → ~400 KB

Total: ~99 MB → ~12 MB across all encodable media.

---

## 6. Don't forget — when the encodes look good, delete `_backup/`

Once you've verified the site visually on all 4 pages with the new media,
you can delete `_backup/` (or move it out of the repo to free disk).
Don't commit `_backup/` to git — add a line to `.gitignore`:

```
_backup/
```
