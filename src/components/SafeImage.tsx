import React, { useState, useEffect } from 'react';

export const FALLBACK_ANTIQUE_IMAGE = '/images/antique-fallback.webp';

const INLINE_SVG_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#1c1917"/><rect x="30" y="30" width="740" height="540" rx="14" fill="none" stroke="#d97706" stroke-opacity="0.4" stroke-width="2"/><text x="400" y="305" font-family="Georgia, serif" font-size="24" fill="#e7e5e4" text-anchor="middle" letter-spacing="3">ANTIAUC HERITAGE ARCHIVE</text></svg>`
  );

export function optimizeAntiqueImageUrl(url?: string): string {
  const clean = typeof url === 'string' ? url.trim() : '';
  if (!clean) return FALLBACK_ANTIQUE_IMAGE;

  if (clean.startsWith('https://images.unsplash.com/')) {
    try {
      const parsed = new URL(clean);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fm', 'webp');
      parsed.searchParams.set('fit', 'crop');
      if (!parsed.searchParams.has('q')) parsed.searchParams.set('q', '80');
      if (!parsed.searchParams.has('w')) parsed.searchParams.set('w', '800');
      return parsed.toString();
    } catch {
      return clean;
    }
  }

  // Block dangerous URI schemes (javascript:, vbscript:, etc.)
  const lower = clean.toLowerCase();
  if (
    lower.startsWith('https://') ||
    lower.startsWith('/') ||
    lower.startsWith('data:image/png;') ||
    lower.startsWith('data:image/jpeg;') ||
    lower.startsWith('data:image/jpg;') ||
    lower.startsWith('data:image/webp;')
  ) {
    return clean;
  }

  return FALLBACK_ANTIQUE_IMAGE;
}

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  fallbackSrc?: string;
  priority?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  fallbackSrc = FALLBACK_ANTIQUE_IMAGE,
  alt = 'Antique vault lot',
  className = '',
  priority = false,
  loading,
  decoding = 'async',
  ...rest
}) => {
  const optimizedSrc = optimizeAntiqueImageUrl(src);
  const [currentSrc, setCurrentSrc] = useState<string>(optimizedSrc);
  const [fallbackTier, setFallbackTier] = useState<0 | 1 | 2>(0);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    setCurrentSrc(optimizeAntiqueImageUrl(src));
    setFallbackTier(0);
    setLoaded(false);
  }, [src]);

  const handleError = () => {
    if (fallbackTier === 0 && fallbackSrc && currentSrc !== fallbackSrc) {
      setFallbackTier(1);
      setCurrentSrc(fallbackSrc);
    } else if (fallbackTier < 2) {
      setFallbackTier(2);
      setCurrentSrc(INLINE_SVG_FALLBACK);
    }
  };

  return (
    <img
      {...rest}
      src={currentSrc}
      alt={alt}
      loading={priority ? 'eager' : loading || 'lazy'}
      decoding={decoding}
      fetchPriority={priority ? 'high' : undefined}
      onLoad={() => setLoaded(true)}
      onError={handleError}
      className={`${className} ${loaded ? '' : 'bg-stone-200/60 dark:bg-stone-800/60'}`.trim()}
    />
  );
};
