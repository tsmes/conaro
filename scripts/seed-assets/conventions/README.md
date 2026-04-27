# Seeded Convention Assets

One folder per convention slug under this directory. The seeder
(`npm run db:seed:conventions`, issue #12) reads `manifest.json`
from each folder and uploads the named image files via the same
`processImage()` pipeline we use for live uploads, so the output
ends up as WebP in storage.

## Folder layout

```
conventions/
  <slug>/
    manifest.json
    logo.<ext>          # square mark
    banner.<ext>         # wide hero (4:1 if possible)
    banner-mobile.<ext>  # optional tall crop for the mobile strip
```

Slug is lowercased ASCII, hyphen-separated (`fredrikstad-sci-fi-festival`).
Image extensions are whatever the source served (jpg, png, webp). The
seeder normalises everything to webp on upload.

## manifest.json schema

```jsonc
{
  "slug": "magicon",
  "name": "Magicon",
  "websiteUrl": "https://magicon.no/",
  "city": "Oslo",
  "country": "NO",
  "description": "Markdown blob — 1-3 short paragraphs lifted from the convention's own about page. Keep neutral / factual; cite source URL.",
  "headerColor": "#3b256a",  // optional, hex
  "events": [
    {
      "name": "Magicon 2026",
      "startDate": "2026-04-25",
      "endDate": "2026-04-26",
      "venueCity": "Oslo",
      "venueCountry": "NO",
      "venueName": "Oslo Spektrum"
    }
  ],
  "assets": {
    "logo": { "file": "logo.png", "source": "https://magicon.no/.../logo.png" },
    "banner": { "file": "banner.jpg", "source": "https://..." },
    "bannerMobile": null
  },
  "scrapedFrom": ["https://magicon.no/", "https://magicon.no/community/"],
  "scrapedAt": "2026-04-27",
  "notes": "Anything weird (no upcoming event listed, only logo found, etc.)"
}
```

`assets.<key>.source` records the URL we pulled the image from so
the user can verify licensing later. If a field can't be determined,
write `null` and add a line in `notes`.
