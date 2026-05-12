import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <div className="min-h-screen pt-20 bg-[#0f0d0c]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-2xs uppercase tracking-[0.4em] text-cream/45 mb-4">Maison Akwaluzto</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-cream mb-6">The House</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center mb-20">
          <div className="relative aspect-4/5 bg-charcoal-100 overflow-hidden">
            <img 
              src="/images/about.jpeg" 
              alt="Akwaluzto atelier" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-cream/80 space-y-6">
            <p className="font-serif text-2xl text-cream">Crafted with intention. Worn with purpose.</p>
            <p className="leading-relaxed">
              Akwaluzto is an independent fashion house founded in Beirut, Lebanon. 
              We create refined, understated pieces for the modern individual who values 
              quality over quantity and silence over noise.
            </p>
            <p className="leading-relaxed">
              Each collection is designed in our atelier and produced in small batches 
              by skilled artisans. We source premium fabrics from trusted mills across 
              Europe and Japan, prioritizing sustainable practices and timeless construction 
              techniques.
            </p>
            <p className="leading-relaxed">
              Our philosophy is simple: clothing should serve the wearer, not the other way around. 
              Every piece is created to move effortlessly through seasons and settings, 
              becoming more essential with time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20">
          <div className="text-center p-8 border border-cream/10">
            <p className="font-serif text-3xl text-cream mb-3">2018</p>
            <p className="text-2xs uppercase tracking-[0.3em] text-cream/45">Founded in Beirut</p>
          </div>
          <div className="text-center p-8 border border-cream/10">
            <p className="font-serif text-3xl text-cream mb-3">Small Batch</p>
            <p className="text-2xs uppercase tracking-[0.3em] text-cream/45">Artisan Production</p>
          </div>
          <div className="text-center p-8 border border-cream/10">
            <p className="font-serif text-3xl text-cream mb-3">Global</p>
            <p className="text-2xs uppercase tracking-[0.3em] text-cream/45">Shipping Worldwide</p>
          </div>
        </div>

        <div className="text-center">
          <Link to="/shop" className="inline-flex items-center bg-cream text-charcoal text-xs font-sans tracking-[0.2em] uppercase px-10 py-4 hover:bg-cream/90 transition-colors">
            Explore Collection
          </Link>
        </div>
      </div>
    </div>
  )
}
