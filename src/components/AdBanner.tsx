import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot?: string;
  className?: string;
  compact?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({
  slot = '1234567890',
  className = '',
  compact = false,
}) => {
  const clientId =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_ADSENSE_CLIENT ||
    'ca-pub-1767015728435965';
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!clientId || pushedRef.current) return;
    pushedRef.current = true;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-adsense-script="true"], script[src*="adsbygoogle.js"]'
    );
    if (!existing) {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      s.crossOrigin = 'anonymous';
      s.dataset.adsenseScript = 'true';
      document.head.appendChild(s);
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blocker or preview mode
    }
  }, [clientId]);

  if (!clientId) {
    return (
      <div
        className={`rounded-xl border border-slate-700/80 bg-slate-900/85 px-4 ${
          compact ? 'py-2' : 'py-2.5'
        } flex items-center justify-between gap-3 text-xs text-slate-400 ${className}`}
      >
        <div className="flex items-center gap-2">
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-amber-300 border border-amber-400/30">
            SPONSORED
          </span>
          <span className="font-semibold text-slate-300">
            BLOCK WAR Partner Slot — Google AdSense Ready
          </span>
        </div>
        <span className="hidden sm:inline text-[11px] text-slate-500 font-mono">
          728×90 Responsive
        </span>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/90 p-1 ${className}`}
    >
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: compact ? '56px' : '76px' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};
