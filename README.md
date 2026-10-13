# Interiors by JanLee — website

A fast, static site built from the content and photos on the current interiorsbyjanlee.com.

## Folders
- `site/` — the finished website. Upload this folder to any static host (Netlify, Cloudflare Pages, Vercel, GitHub Pages, or regular web hosting).
- `build/` — the generator. `content.mjs` holds the editable text (services, FAQ, categories, project summaries). `site-data.json` holds the projects, photos and reviews pulled from the Houzz site.
- `_source/` — the original full-size photos downloaded from Houzz (backup copy, not needed on the server).

## Rebuild after editing text
```bash
node build/build.mjs
```

## Preview locally
```bash
python -m http.server 8080 --directory site
```
Then open http://localhost:8080

## Before going live
1. **Contact form:** submissions are emailed to interiorsbyjanlee@gmail.com via FormSubmit (formsubmit.co, free). The very first submission sends a one-time "Activate form" email to that inbox — click it once and every later submission is delivered. To change the address, edit `formEndpoint` in `build/content.mjs` and rebuild.
2. **Keep the URLs:** `/about/`, `/our-work/`, `/testimonials/`, `/contact/` and every `/projects/<id>-<name>/` page use the same addresses as the current Houzz site, so existing Google rankings and links carry over.
3. After launch, submit `https://interiorsbyjanlee.com/sitemap.xml` in Google Search Console, and update the website link on the Google Business Profile.
