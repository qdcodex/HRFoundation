/**
 * Original illustration for "A Future Built on Compassion":
 * an arched doorway (a threshold to the future) framing a rising sun over gentle hills,
 * with an open book and a growing sprout — education, care and growth. No people are depicted.
 */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 520" className={className} role="img" aria-labelledby="hero-illustration-title">
      <title id="hero-illustration-title">
        Illustration of an arched doorway framing a rising sun, green hills, an open book and a young sprout.
      </title>
      <defs>
        <clipPath id="hero-arch">
          <path d="M0 520V200a200 200 0 0 1 400 0v320Z" />
        </clipPath>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e2a22" />
          <stop offset="1" stopColor="#1f4c3f" />
        </linearGradient>
      </defs>

      <g clipPath="url(#hero-arch)">
        <rect width="400" height="520" fill="url(#hero-sky)" />

        {/* sun and halo rings */}
        <g fill="none" stroke="#c7a56a">
          <circle cx="200" cy="262" r="112" opacity=".22" />
          <circle cx="200" cy="262" r="150" opacity=".14" />
          <circle cx="200" cy="262" r="190" opacity=".08" />
        </g>
        <circle cx="200" cy="262" r="74" fill="#c7a56a" />
        <circle cx="200" cy="262" r="74" fill="#ead9b6" opacity=".35" />

        {/* small stars / care marks */}
        <g fill="#ead9b6">
          <path d="M318 118h4v-10h4v10h4v4h-4v10h-4v-10h-4z" opacity=".75" />
          <circle cx="84" cy="146" r="2.5" opacity=".7" />
          <circle cx="112" cy="104" r="1.6" opacity=".5" />
          <circle cx="292" cy="190" r="1.8" opacity=".55" />
        </g>

        {/* hills */}
        <path d="M-10 352c70-40 130-52 196-34s132 10 224-30v240H-10Z" fill="#238568" />
        <path d="M-10 392c88-34 170-30 238-10s118 18 182-6v160H-10Z" fill="#1c6e55" />
        <path d="M-10 430c96-22 196-20 270-6s110 8 150 0v110H-10Z" fill="#153d32" />

        {/* path leading to the horizon */}
        <path d="M188 520c4-40 6-74 10-108 1.6 34 6 68 14 108Z" fill="#c7a56a" opacity=".3" />

        {/* open book */}
        <g>
          <path d="M200 468c-34-20-86-26-150-18v52c64-8 116-2 150 18Z" fill="#f8f6f0" />
          <path d="M200 468c34-20 86-26 150-18v52c-64-8-116-2-150 18Z" fill="#efebe0" />
          <path d="M200 468v52" stroke="#c5d6c8" strokeWidth="2" />
          <g stroke="#c5d6c8" strokeWidth="2" strokeLinecap="round">
            <path d="M74 466c34-3 66 1 98 12" />
            <path d="M74 480c34-3 66 1 98 12" />
            <path d="M228 478c32-11 64-15 98-12" />
            <path d="M228 492c32-11 64-15 98-12" />
          </g>
        </g>

        {/* sprout growing from the book */}
        <g strokeLinecap="round">
          <path d="M200 466c0-30 2-54 0-82" stroke="#dde8de" strokeWidth="3" fill="none" />
          <path d="M200 412c-6-22-26-34-48-32 4 22 24 36 48 32Z" fill="#dde8de" />
          <path d="M201 396c8-24 30-36 54-32-6 24-28 38-54 32Z" fill="#c5d6c8" />
        </g>
      </g>

      {/* fine gold outline echoing the arch */}
      <path d="M12 520V204a188 188 0 0 1 376 0v316" fill="none" stroke="#c7a56a" strokeOpacity=".5" />
    </svg>
  );
}
