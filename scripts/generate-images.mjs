#!/usr/bin/env node
/**
 * TheMediaBox — Product image generation
 * Generates 3 images per product (hero, product, lifestyle) using gpt-image-1.
 */
import OpenAI from "openai";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const API_KEY_PATH = "/Users/myassistant/Documents/Workspace/Credentials/openai.json";
const OUT_DIR = "/Users/myassistant/Documents/Workspace/themediabox/public/products";
const PRODUCTS_PATH = "/Users/myassistant/Documents/Workspace/themediabox/data/products.json";

const apiKey = JSON.parse(readFileSync(API_KEY_PATH, "utf8")).api_key;
const products = JSON.parse(readFileSync(PRODUCTS_PATH, "utf8"));

const openai = new OpenAI({ apiKey });

// Brand: warm, premium, heritage. Cream + brown + gold. Black subjects. No text/logos.
const BRAND_PREFIX = "Premium product photography, warm heritage aesthetic, cream and gold tones with deep brown accents, soft natural lighting, shallow depth of field, editorial style. ";

const briefs = {
  "video-guest-book-display": {
    hero:     BRAND_PREFIX + "A stylish Black couple in their late 20s at their wedding reception. A gold-accented video message display card sits on the table between them with a small QR code on it. Warm candlelight, blurred reception background, joyful intimate moment. Photorealistic.",
    product:  BRAND_PREFIX + "A single elegant video message display card on a cream surface, with a subtle gold border, a small QR code on the front, premium cardstock feel. Minimalist product shot, soft warm lighting, no people.",
    lifestyle:BRAND_PREFIX + "Wedding reception table setting detail showing three gold-rimmed video display cards placed at each setting, candles glowing, soft bokeh. Photorealistic."
  },
  "forever-voice-magnet": {
    hero:     BRAND_PREFIX + "A warm Black grandmother smiling as she holds a small memorial photo magnet to her refrigerator door, kitchen warmly lit in the background, loving and dignified mood. Photorealistic.",
    product:  BRAND_PREFIX + "A single premium photo magnet on white marble surface, a smiling Black family photo on the front, subtle gold foil border, a small QR code visible on the back. Minimalist product shot.",
    lifestyle:BRAND_PREFIX + "A refrigerator door with several family photo magnets including a memorial one, warm kitchen light, lived-in and loving home atmosphere. Photorealistic."
  },
  "custom-photo-booth-props": {
    hero:     BRAND_PREFIX + "A joyful Black woman at her 30th birthday party holding up custom photo booth props printed with her face, laughing with friends around her. Vibrant party atmosphere. Photorealistic.",
    product:  BRAND_PREFIX + "Ten colorful custom photo booth props laid out on a dark wood table, props feature faces and party themes, vibrant and fun. Minimalist product shot, top-down angle.",
    lifestyle:BRAND_PREFIX + "Photo booth scene at a Black birthday party, two people holding up custom props and laughing, gold and warm lighting, confetti in the air. Photorealistic."
  },
  "custom-birthday-props": {
    hero:     BRAND_PREFIX + "A Black sweet 16 birthday girl wearing a tiara, holding custom birthday props printed with her face and age, friends cheering behind her. Festive, magical. Photorealistic.",
    product:  BRAND_PREFIX + "Ten birthday-themed custom props arranged in a fan, each featuring personalized face and age elements, gold confetti around them. Minimalist product shot.",
    lifestyle:BRAND_PREFIX + "Birthday party table with custom props at each setting, gold plates, warm candlelight, a Black family celebrating together. Photorealistic."
  },
  "graduation-frame-standee": {
    hero:     BRAND_PREFIX + "A proud Black male graduate in cap and gown standing next to his life-size framed standee, family surrounding him with hugs and smiles, warm celebration moment. Photorealistic.",
    product:  BRAND_PREFIX + "A life-size gold-framed graduation standee on a clean cream background, the standee shows a graduate photo with 'Class of 2026' in elegant gold foil. Minimalist product shot.",
    lifestyle:BRAND_PREFIX + "Graduation party entrance with the gold-framed standee greeting guests at the door, gold and black decor, balloons, warm light. Photorealistic."
  },
  "wedding-memory-album": {
    hero:     BRAND_PREFIX + "A Black newlywed couple sitting on a couch together, looking through a leather wedding album, intimate and loving moment, soft natural window light. Photorealistic.",
    product:  BRAND_PREFIX + "A premium leather-bound wedding album closed on a cream surface, gold foil embossed title 'Our Wedding', luxury feel. Minimalist product shot, soft lighting.",
    lifestyle:BRAND_PREFIX + "The wedding album open on a coffee table showing wedding photos, with a glass of champagne beside it, warm living room setting. Photorealistic."
  },
  "kente-keepsake-box": {
    hero:     BRAND_PREFIX + "A Black couple at their traditional wedding with a hand-wrapped kente cloth keepsake box on the gift table, kente patterns glowing in the warm light, joyful. Photorealistic.",
    product:  BRAND_PREFIX + "A medium keepsake box wrapped in authentic kente cloth with gold trim and a small gold clasp, sitting on dark wood, intricate pattern visible. Minimalist product shot.",
    lifestyle:BRAND_PREFIX + "The kente keepsake box open showing wedding rings, vows written on paper, and small photos inside, warm heritage aesthetic. Photorealistic."
  },
  "quinceanera-memory-chest": {
    hero:     BRAND_PREFIX + "A Black Latina quinceanera in her white ball gown standing next to her rose-gold memory chest, tiara on her head, proud and radiant moment. Photorealistic.",
    product:  BRAND_PREFIX + "A rose-gold finished wooden memory chest with an engraved name plaque on the front, sitting on cream surface, elegant and luxurious. Minimalist product shot.",
    lifestyle:BRAND_PREFIX + "The quincenera memory chest open with tiara, rosary, last doll, and photos visible inside, soft pink and gold lighting, magical. Photorealistic."
  }
};

async function genOne(slug, kind, prompt) {
  const out = path.join(OUT_DIR, `${slug}-${kind}.png`);
  if (existsSync(out)) {
    const stat = statSync(out);
    if (stat.size > 5000) {
      console.log(`[skip] ${slug}-${kind} already exists (${stat.size}b)`);
      return out;
    }
  }
  console.log(`[gen ] ${slug}-${kind}...`);
  const sizes = { hero: "1024x1024", product: "1024x1024", lifestyle: "1536x1024" };
  const resp = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size: sizes[kind] || "1024x1024",
    n: 1,
  });
  const b64 = resp.data[0].b64_json;
  if (!b64) throw new Error(`No image data for ${slug}-${kind}`);
  await writeFile(out, Buffer.from(b64, "base64"));
  console.log(`[done] ${slug}-${kind} -> ${out}`);
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const p of products) {
    const b = briefs[p.slug];
    if (!b) {
      console.warn(`[warn] no brief for ${p.slug}`);
      continue;
    }
    for (const kind of ["hero", "product", "lifestyle"]) {
      try {
        await genOne(p.slug, kind, b[kind]);
      } catch (e) {
        console.error(`[fail] ${p.slug}-${kind}: ${e.message}`);
      }
    }
  }
  console.log("All done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
