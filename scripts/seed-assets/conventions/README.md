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
      "venueName": "Oslo Spektrum",
      "guests": [
        {
          "name": "Sigrid Vang",
          "title": "Guest of honour",
          "role": "Cosplay judge",
          "pronouns": "she/her",
          "bio": "Award-winning cosplayer based in Bergen. Specialises in armour and prop fabrication; runs the Nordic Armour Workshop.",
          "photo": "3.jpg",
          "websiteUrl": "https://example.com/sigrid",
          "socialLinks": [
            { "type": "instagram", "url": "https://instagram.com/sigridvang.cos" }
          ]
        }
      ],
      "programme": [
        { "date": "2026-04-25", "startTime": "10:00", "endTime": "10:30", "title": "Doors open & registration", "room": "Foyer" },
        { "date": "2026-04-25", "startTime": "11:00", "endTime": "11:45", "title": "Manga inking 101", "room": "Workshop A", "speaker": "Eirik Nordheim" }
      ]
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

## Guests + programme

Per-event `guests[]` and `programme[]` are optional but recommended
for demo cons. Empty arrays are fine; the seeder leaves the columns
empty so the public event page falls back to the "no guests / no
programme" placeholder.

`guests[].photo` is the filename of a portrait inside
`scripts/seed-assets/guests/` (e.g. `"3.jpg"`). The bundle ships a
small set of CC0 portraits — see `../guests/LICENSES.md` for source
URLs. The seeder uploads the file through `processImage()` and
stores the resulting key under `events/<eventId>/guests/<uuid>.webp`.

`programme[].date` must fall inside the event's start/end window.
`startTime` and `endTime` are 24-hour `HH:mm` strings. Programme items
not matching their event window are rejected by the seeder.
