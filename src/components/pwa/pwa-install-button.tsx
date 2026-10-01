import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Download, Smartphone, Check, Sparkles } from 'lucide-react';

interface PWAInstallButtonProps {
  onOpenHub?: () => void;
  className?: string;
  variant?: 'compact' | 'full' | 'pill';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenHub,
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
    } else if (onOpenHub) {
      onOpenHub();
    }
  };

  if (isInstalled) {
    if (variant === 'pill') {
      return (
        <button
          onClick={onOpenHub}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition ${className}`}
          title="Installed as App — View App Settings"
        >
          <Check className="w-3.5 h-3.5" />
          <span>App Installed</span>
        </button>
      );
    }
    return null;
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={handleInstallClick}
        className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer backdrop-blur-md ${className}`}
        title="Install NewLumino on your device"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Download className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
        <span className="font-semibold tracking-wide">
          {isIOS ? 'Install on iOS' : 'Install App'}
        </span>
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <button
        onClick={handleInstallClick}
        disabled={installing}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-cyan-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/40 transition cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
            <Download className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-emerald-300">
              {isIOS ? 'Install on iPhone / iPad' : 'Download Native App'}
            </div>
            <div className="text-[10px] text-emerald-400/70">
              Offline caching • Push alerts
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
          Package
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition cursor-pointer ${className}`}
    >
      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
      <span>{isIOS ? 'Install iOS' : 'Install App'}</span>
    </button>
  );
};
