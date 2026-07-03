import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-12 sm:py-16 max-w-4xl mx-auto w-full">
      <div className="text-sm text-text-tertiary mb-6 animate-fade-up">
        <Link href="/" className="hover:text-gold-deep">Home</Link>
        <span className="mx-2 text-text-muted">/</span>
        <span className="text-text-primary font-semibold">About</span>
      </div>

      <header className="mb-12 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/15 border border-border-gold text-gold-deep text-[10px] font-bold uppercase tracking-[0.18em] mb-4">
          ✦ Our Story
        </div>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-text-primary leading-[1.05] mb-6">
          We make keepsakes for the<br />
          <span className="shimmer-text">moments that matter.</span>
        </h1>
      </header>

      <section className="space-y-6 text-text-secondary text-lg leading-relaxed animate-fade-up">
        <p>
          TheMediaBox was born at a Black wedding in Atlanta. The grandmother of
          the bride, matriarch of three generations, had passed six months
          before the ceremony. There was an empty chair at the reception — a
          place set, a photo framed, a toast in her honor. But no video of her
          voice.
        </p>
        <p>
          That's what we set out to fix.
        </p>
        <p>
          We build personalized keepsakes for the celebrations that make up a
          Black life: the weddings where grandmothers dance, the graduations
          where the family line gets longer, the quinceañeras where a girl
          becomes a woman, the birthdays where you blow out the candles and
          wish the same wish every year. The retirements, the baby showers, the
          family reunions, the Kwanzaa gatherings. The memorials.
        </p>
        <p>
          Every product we make — from the video guest book that captures
          laughter and love in real time, to the voice magnet that keeps a
          grandmother's "I love you" on the fridge forever — is designed to do
          one thing: <em>keep the moment after the moment ends</em>.
        </p>
      </section>

      <section className="mt-16 grid sm:grid-cols-3 gap-5">
        {[
          { emoji: "✦", t: "Heritage", d: "Built for Black celebrations. Designed to last generations." },
          { emoji: "✦", t: "Craft", d: "Hand-checked, custom-made in Atlanta. Every order gets our eyes." },
          { emoji: "✦", t: "Love", d: "We treat every order like it's our own family's moment. Because it is." },
        ].map((p, i) => (
          <div key={i} className="glass-card p-6 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="text-3xl mb-3">{p.emoji}</div>
            <h3 className="font-display font-bold text-lg text-text-primary mb-2">{p.t}</h3>
            <p className="text-text-secondary text-sm leading-relaxed">{p.d}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 glass-panel p-8 sm:p-10 gold-border animate-fade-up">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-text-primary mb-4">
          Where we're from
        </h2>
        <p className="text-text-secondary leading-relaxed">
          TheMediaBox is based in Atlanta, Georgia — the cultural capital of the
          Black South and a city that knows how to throw a celebration. We ship
          anywhere in the United States. Custom orders and international
          shipping available on request.
        </p>
      </section>

      <section className="mt-16 text-center animate-fade-up">
        <h2 className="font-display font-bold text-3xl text-text-primary mb-4">
          Let's make your moment.
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/products" className="btn-primary">
            Shop Keepsakes →
          </Link>
          <a href="mailto:hello@themediabox.store" className="btn-secondary">
            Email Us
          </a>
        </div>
      </section>
    </main>
  );
}
