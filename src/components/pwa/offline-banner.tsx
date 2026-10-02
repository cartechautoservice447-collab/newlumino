import React from "react";
import React from 'react';
import { useOnlineStatus } from '@/hooks/use-pwa-install';
import { WifiOff, Sparkles, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-amber-500/50 shadow-2xl backdrop-blur-xl text-amber-200 text-xs font-medium animate-in fade-in slide-in-from-top-3 duration-300">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Offline Mode — All notes, soundscapes & study cards are cached locally.</span>
      <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full text-amber-300 font-mono">
        Active PWA
      </span>
    </div>
  );
};
