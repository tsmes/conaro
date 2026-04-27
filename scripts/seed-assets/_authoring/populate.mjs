// One-shot generator: walks every convention manifest under
// scripts/seed-assets/conventions/<slug>/manifest.json and fills in
// `events[].guests[]` and `events[].programme[]` with synthetic but
// plausible data. Re-runnable: replaces the arrays each time.
//
// Run with:
//   node scripts/seed-assets/_authoring/populate.mjs

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const CONVENTIONS_DIR = path.resolve(__dirname, "..", "conventions");

const FIRST_NAMES = [
  "Sigrid", "Eirik", "Linnea", "Ingrid", "Mathias", "Astrid", "Sondre",
  "Mari", "Henrik", "Kaja", "Joakim", "Ida", "Tobias", "Frida", "Olav",
  "Ingvild", "Marius", "Saga", "Vegard", "Synne", "Espen", "Ronja",
  "Aksel", "Iselin", "Sander", "Live", "Halvard", "Jorunn", "Kristoffer",
  "Maja",
];

const LAST_NAMES = [
  "Vang", "Nordheim", "Solheim", "Halvorsen", "Bakken", "Sundby", "Lien",
  "Fjeldstad", "Aas", "Mjøen", "Holmen", "Bjørndal", "Skaar", "Rønning",
  "Sæther", "Lien", "Sandvik", "Aune", "Rinde", "Brekke", "Tveit",
  "Kalland", "Holte", "Velde",
];

const ROLES = [
  { title: "Guest of honour", role: "Cosplay judge" },
  { title: "Featured guest", role: "Workshop host: armour fabrication" },
  { title: "Featured guest", role: "Workshop host: watercolour basics" },
  { title: "Featured guest", role: "Workshop host: digital inking" },
  { title: "Featured guest", role: "Workshop host: clay sculpting" },
  { title: "Spotlight", role: "Manga artist" },
  { title: "Spotlight", role: "Comics writer" },
  { title: "Panellist", role: "Game design Q&A" },
  { title: "Panellist", role: "Voice acting Q&A" },
  { title: "Panellist", role: "Self-publishing in Norway" },
  { title: "Performer", role: "Idol stage compère" },
  { title: "MC", role: "Cosplay competition host" },
];

const BIOS = [
  "Bergen-based cosplayer specialising in armour and prop fabrication. Runs the Nordic Armour Workshop for new makers.",
  "Oslo manga artist whose serial 'Halvtimes' won the 2024 Sproing nominee shortlist.",
  "Trondheim illustrator working in ink and risograph; stories about queer joy and slow mornings.",
  "Self-published comics writer; long-running webcomic 'Fjordwalker' wraps its sixth volume this year.",
  "Stavanger watercolourist chasing folk-horror aesthetics. Zines printed in small runs.",
  "Game designer at a small Bergen indie studio; teaches a beginners' track at NTNU.",
  "Voice actor whose Norwegian dub credits include three current streaming shows.",
  "Costume judge with twelve years on the Nordic competition circuit.",
  "Embroidery artist working with mythological motifs; small-batch only.",
  "Comics editor and panel host; fluent in mid-aughts shōnen references.",
  "3D printing technician moonlighting as a prop-builder for stage productions.",
  "Idol-stage host whose own group performs across Norway and Sweden.",
  "Tabletop designer; author of 'Aldermark', a Nordic-folklore RPG.",
  "Plushie and soft-sculpture maker specialising in original characters.",
  "Pixel-art studio lead; known for the cult retro-RPG 'Ravnehjem'.",
];

const PRONOUNS = ["she/her", "he/him", "they/them", "she/they", "he/they"];

function seededInt(seedStr, max) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return h % max;
}

function pick(list, seedStr) {
  return list[seededInt(seedStr, list.length)];
}

function dateRange(start, end) {
  const out = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cur <= last) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

const PROGRAMME_TEMPLATE_FULL = [
  { startTime: "10:00", endTime: "10:30", title: "Doors open & registration", room: "Foyer" },
  { startTime: "10:45", endTime: "11:15", title: "Opening ceremony", room: "Main stage" },
  { startTime: "11:30", endTime: "12:30", title: "Cosplay competition — categories briefing", room: "Main stage", speakerSeed: "judge" },
  { startTime: "12:00", endTime: "13:00", title: "Workshop: armour fabrication basics", room: "Workshop A", speakerSeed: "armour" },
  { startTime: "12:00", endTime: "13:00", title: "Panel: self-publishing in Norway", room: "Panel room 1", speakerSeed: "panel" },
  { startTime: "13:30", endTime: "14:30", title: "Workshop: digital inking", room: "Workshop B", speakerSeed: "digital" },
  { startTime: "13:30", endTime: "14:30", title: "Q&A: voice acting", room: "Panel room 1", speakerSeed: "voice" },
  { startTime: "15:00", endTime: "16:30", title: "Cosplay competition — main show", room: "Main stage", speakerSeed: "host" },
  { startTime: "16:00", endTime: "17:00", title: "Workshop: watercolour basics", room: "Workshop A", speakerSeed: "watercolour" },
  { startTime: "16:00", endTime: "17:00", title: "Manga spotlight", room: "Panel room 1", speakerSeed: "manga" },
  { startTime: "17:30", endTime: "18:30", title: "Idol stage", room: "Main stage", speakerSeed: "idol" },
  { startTime: "19:00", endTime: "20:00", title: "Closing & afterparty announcement", room: "Main stage" },
];

const PROGRAMME_TEMPLATE_LIGHT = [
  { startTime: "10:00", endTime: "10:30", title: "Doors open & registration", room: "Foyer" },
  { startTime: "11:00", endTime: "12:00", title: "Workshop: digital inking", room: "Workshop", speakerSeed: "digital" },
  { startTime: "12:30", endTime: "13:30", title: "Panel: self-publishing in Norway", room: "Panel room", speakerSeed: "panel" },
  { startTime: "14:00", endTime: "15:30", title: "Cosplay competition", room: "Main stage", speakerSeed: "host" },
  { startTime: "16:00", endTime: "17:00", title: "Manga spotlight", room: "Panel room", speakerSeed: "manga" },
  { startTime: "17:30", endTime: "18:00", title: "Closing", room: "Main stage" },
];

function makeName(seedStr) {
  const first = pick(FIRST_NAMES, seedStr + ":first");
  const last = pick(LAST_NAMES, seedStr + ":last");
  return `${first} ${last}`;
}

function buildGuests(slug) {
  const count = 4 + (seededInt(slug, 3));
  const guests = [];
  for (let i = 0; i < count; i += 1) {
    const seed = `${slug}:guest:${i}`;
    const role = ROLES[(seededInt(seed, ROLES.length) + i) % ROLES.length];
    const name = makeName(seed);
    const photoIdx = ((seededInt(seed + ":photo", 12)) + i) % 12 + 1;
    const handle = name
      .toLowerCase()
      .replace(/ø/g, "o")
      .replace(/æ/g, "ae")
      .replace(/å/g, "a")
      .replace(/[^a-z]/g, "");
    guests.push({
      name,
      title: role.title,
      role: role.role,
      pronouns: pick(PRONOUNS, seed + ":pron"),
      bio: pick(BIOS, seed + ":bio"),
      photo: `${photoIdx}.jpg`,
      websiteUrl: `https://example.com/${handle}`,
      socialLinks: [
        { type: "instagram", url: `https://instagram.com/${handle}` },
      ],
    });
  }
  return guests;
}

function speakerForSeed(slug, seedKey, guests) {
  if (!guests || guests.length === 0) return undefined;
  const idx = seededInt(`${slug}:${seedKey}`, guests.length);
  return guests[idx].name;
}

function buildProgramme(slug, startDate, endDate, guests) {
  const days = dateRange(startDate, endDate);
  const items = [];
  const longTemplate = PROGRAMME_TEMPLATE_FULL;
  const lightTemplate = PROGRAMME_TEMPLATE_LIGHT;
  for (let i = 0; i < days.length; i += 1) {
    const date = days[i];
    // First and last day get the full template, middle days get the light one.
    const template = i === 0 || i === days.length - 1 ? longTemplate : lightTemplate;
    for (const t of template) {
      items.push({
        date,
        startTime: t.startTime,
        endTime: t.endTime,
        title: t.title,
        room: t.room,
        speaker: t.speakerSeed
          ? speakerForSeed(slug, `${date}:${t.speakerSeed}`, guests)
          : undefined,
      });
    }
  }
  return items;
}

function tidyOptional(obj) {
  // Drop undefined fields so the JSON stays clean.
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function processManifest(manifestPath) {
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(raw);
  const slug = manifest.slug;

  const guests = buildGuests(slug);

  for (const event of manifest.events ?? []) {
    event.guests = guests.map(tidyOptional);
    if (event.startDate) {
      const end = event.endDate ?? event.startDate;
      event.programme = buildProgramme(slug, event.startDate, end, guests).map(
        tidyOptional
      );
    } else {
      event.programme = [];
    }
  }

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf-8"
  );
  return {
    slug,
    guests: guests.length,
    programmeDays: manifest.events?.[0]?.programme?.length ?? 0,
  };
}

function main() {
  const slugs = fs
    .readdirSync(CONVENTIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  console.log(`Populating ${slugs.length} manifest(s)…`);
  for (const slug of slugs) {
    const manifestPath = path.join(CONVENTIONS_DIR, slug, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    const result = processManifest(manifestPath);
    console.log(
      `  ${slug.padEnd(28)} guests=${result.guests}  programme=${result.programmeDays}`
    );
  }
}

main();
