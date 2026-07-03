export type Product = {
  slug: string;
  title: string;
  price: number;
  category: string;
  shortDescription: string;
  longDescription: string;
  image: string;
  images?: {
    hero: string;
    product: string;
    lifestyle: string;
  };
  emoji: string;
  tag: string;
  paypalBase: string;
  variants: Record<string, string[]>;
  occasions: string[];
};

export type Collection = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  products: string[];
};

export type Occasion = {
  slug: string;
  title: string;
  emoji: string;
};

export type Testimonial = {
  name: string;
  location: string;
  occasion: string;
  quote: string;
};

export const OCCASION_GRADIENTS: Record<string, string> = {
  weddings: "from-amber-200/40 via-rose-200/30 to-amber-100/40",
  graduations: "from-emerald-200/40 via-amber-200/30 to-emerald-100/40",
  birthdays: "from-rose-200/40 via-amber-200/30 to-rose-100/40",
  quinceaneras: "from-fuchsia-200/40 via-rose-200/30 to-amber-100/40",
  "baby-showers": "from-sky-200/40 via-amber-200/30 to-sky-100/40",
  retirements: "from-amber-200/40 via-stone-200/30 to-amber-100/40",
  "family-reunions": "from-orange-200/40 via-amber-200/30 to-orange-100/40",
  kwanzaa: "from-red-200/40 via-emerald-200/30 to-amber-200/40",
};

export const CATEGORY_LABELS: Record<string, string> = {
  "video-displays": "Video Displays",
  "voice-magnets": "Voice Magnets",
  "photo-booth": "Photo Booth Props",
  standees: "Standees",
  albums: "Albums",
  keepsakes: "Keepsakes",
};
