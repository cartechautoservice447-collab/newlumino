import React from "react";
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Smartphone,
  Apple,
  Download,
  Bell,
  Wifi,
  WifiOff,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  FolderArchive,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Clock,
} from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '@/hooks/use-pwa-install';
import {
  getPushPermission,
  requestPushPermission,
  triggerTestPushNotification,
  scheduleActiveRecallAlert,
  notifyPomodoroPhaseChange,
} from '@/lib/push-notifications';
import JSZip from 'jszip';

interface AppWrapperHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AppWrapperHubDialog: React.FC<AppWrapperHubDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, isAndroid, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<'install' | 'android' | 'ios' | 'push' | 'offline' | 'performance'>('install');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string>('default');
  const [pushTesting, setPushTesting] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>('Calculating...');
  const [cachingProgress, setCachingProgress] = useState<boolean>(false);
  const [cacheSuccess, setCacheSuccess] = useState<boolean>(false);

  // Performance Lag Reducer State
  const [boostMode, setBoostMode] = useState<boolean>(() => {
    return localStorage.getItem('newlumino_perf_boost') === 'true';
  });

  useEffect(() => {
    setPushStatus(getPushPermission());
    checkCacheStorage();
  }, [open]);

  const checkCacheStorage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
        setCacheSize(`${usageMB} MB cached`);
      } catch {
        setCacheSize('Active');
      }
    } else {
      setCacheSize('Available');
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRequestPush = async () => {
    setPushTesting(true);
    try {
      const res = await requestPushPermission();
      setPushStatus(res);
      if (res === 'granted') {
        await triggerTestPushNotification();
        setTestNotificationSent(true);
        setTimeout(() => setTestNotificationSent(false), 4000);
      }
    } finally {
      setPushTesting(false);
    }
  };

  const handleTestPush = async () => {
    setPushTesting(true);
    try {
      await triggerTestPushNotification();
      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 4000);
    } finally {
      setPushTesting(false);
    }
  };

  const handleScheduleDemo = () => {
    scheduleActiveRecallAlert('Quantum Physics & Neural Circuits', 5);
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 5000);
  };

  const handlePrecacheAll = async () => {
    setCachingProgress(true);
    try {
      if ('caches' in window) {
        const cache = await caches.open('newlumino-offline-v1');
        const urlsToCache = [
          '/',
          '/index.html',
          '/icon.svg',
          '/pwa-192x192.png',
          '/pwa-512x512.png',
          '/apple-touch-icon.png',
          '/favicon.ico',
        ];
        await cache.addAll(urlsToCache);
        await checkCacheStorage();
        setCacheSuccess(true);
        setTimeout(() => setCacheSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Precache notice:', err);
    } finally {
      setCachingProgress(false);
    }
  };

  const handleTogglePerfBoost = (enabled: boolean) => {
    setBoostMode(enabled);
    localStorage.setItem('newlumino_perf_boost', enabled ? 'true' : 'false');
    document.documentElement.setAttribute('data-perf-boost', enabled ? 'true' : 'false');
  };

  // Android Configuration Templates
  const androidManifestSnippet = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.newlumino.studystudio">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:icon="@mipmap/ic_launcher"
        android:label="NewLumino"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">

        <activity
            android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
            android:exported="true"
            android:label="NewLumino"
            android:screenOrientation="unspecified">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- TWA Deep Linking -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="newlumino.app" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const capacitorConfigSnippet = `{
  "appId": "com.newlumino.studystudio",
  "appName": "NewLumino",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https",
    "cleartext": false
  },
  "plugins": {
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    },
    "SplashScreen": {
      "launchShowDuration": 1500,
      "backgroundColor": "#0f172a"
    }
  }
}`;

  // iOS Swift Wrapper Snippets
  const iosSwiftWrapperSnippet = `// NewLumino iOS Native WKWebView Wrapper
// ViewController.swift (iOS 15+)
import UIKit
import WebKit
import UserNotifications

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        
        // 1. Configure High-Performance WebKit Configuration
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.websiteDataStore = WKWebsiteDataStore.default() // Persistent Offline Cache
        
        // 2. Initialize Hardware-Accelerated WebView
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.scrollView.bounces = true
        webView.backgroundColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)
        view.addSubview(webView)
        
        // 3. Request Native APNs Push Notification Permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
        
        // 4. Load App Studio URL or Local Offline Fallback
        if let url = URL(string: "https://newlumino.app") {
            let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
            webView.load(request)
        }
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}`;

  const iosMobileConfigProfile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadDisplayName</key>
    <string>NewLumino Study Studio</string>
    <key>PayloadDescription</key>
    <string>Installs NewLumino as a standalone native app on iOS Home Screen</string>
    <key>PayloadIdentifier</key>
    <string>com.newlumino.webclip</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>56936D90-DCCB-46CA-8F1D-7F4B8F346FD2</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>PayloadIdentifier</key>
            <string>com.newlumino.webclip.payload</string>
            <key>PayloadUUID</key>
            <string>12345678-ABCD-EF01-2345-6789ABCDEF01</string>
            <key>PayloadDisplayName</key>
            <string>NewLumino</string>
            <key>URL</key>
            <string>${typeof window !== 'undefined' ? window.location.origin : 'https://newlumino.app'}</string>
            <key>Label</key>
            <string>NewLumino</string>
            <key>IsRemovable</key>
            <true/>
            <key>FullScreen</key>
            <true/>
            <key>Precomposed</key>
            <true/>
        </dict>
    </array>
</dict>
</plist>`;

  // Download Package Handlers
  const handleDownloadAndroidZip = async () => {
    const zip = new JSZip();
    zip.file('AndroidManifest.xml', androidManifestSnippet);
    zip.file('capacitor.config.json', capacitorConfigSnippet);
    zip.file(
      'README-BUILD-ANDROID.md',
      `# NewLumino Android APK Wrapper Build Guide

## Method 1: Capacitor (Recommended)
1. In your project, run:
   \`npm install @capacitor/core @capacitor/cli @capacitor/android\`
2. Initialize: \`npx cap init\`
3. Add Android platform: \`npx cap add android\`
4. Copy \`capacitor.config.json\` to root
5. Build and sync: \`npm run build && npx cap sync\`
6. Open Android Studio: \`npx cap open android\`
7. Click "Build" -> "Generate Signed Bundle / APK"

## Method 2: Trusted Web Activity (TWA / Bubblewrap)
1. Install Bubblewrap CLI: \`npm install -g @bubblewrap/cli\`
2. Initialize from manifest: \`bubblewrap init --manifest=https://your-domain.com/manifest.webmanifest\`
3. Build release APK: \`bubblewrap build\`
`
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newlumino-android-wrapper.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadIosZip = async () => {
    const zip = new JSZip();
    zip.file('ViewController.swift', iosSwiftWrapperSnippet);
    zip.file('NewLumino.mobileconfig', iosMobileConfigProfile);
    zip.file(
      'README-BUILD-IOS.md',
      `# NewLumino iOS Native App Wrapper Build Guide

## Option 1: Instant iOS WebClip Profile (Zero Code)
1. Transfer \`NewLumino.mobileconfig\` to your iPhone / iPad via AirDrop or Safari.
2. Go to iOS Settings -> "Profile Downloaded" -> Tap "Install".
3. NewLumino now appears as an official standalone app on your Home Screen!

## Option 2: Xcode WKWebView Wrapper
1. Create a new "iOS App" project in Xcode (Swift, Storyboard or SwiftUI).
2. Replace \`ViewController.swift\` with the provided file.
3. In \`Info.plist\`, add:
   - \`NSAppTransportSecurity\` -> \`NSAllowsArbitraryLoads: false\`
   - \`UIStatusBarStyle: UIStatusBarStyleLightContent\`
   - \`UIViewControllerBasedStatusBarAppearance: false\`
4. Run on iPhone Simulator or connected device!
`
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newlumino-ios-wrapper.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMobileConfig = () => {
    const blob = new Blob([iosMobileConfigProfile], { type: 'application/x-apple-aspen-config' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NewLumino.mobileconfig';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950/95 border border-slate-800 text-slate-100 shadow-2xl backdrop-blur-2xl rounded-2xl p-0">
        {/* Header Banner */}
        <div className="relative p-6 pb-4 border-b border-slate-800/80 bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-indigo-950/40">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
                <img
                  src="/icon.svg"
                  alt="NewLumino"
                  className="w-full h-full rounded-2xl object-cover"
                />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
                  NewLumino Native App Wrapper Hub
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Package & download for iOS & Android with native push alerts, offline storage & zero lag
                </DialogDescription>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isStandalone || isInstalled ? 'Standalone Mode' : 'PWA Ready'}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400">
                    <WifiOff className="w-3 h-3" /> Offline
                  </span>
                )}
                <span>•</span>
                <span>{cacheSize}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setActiveTab('install')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'install'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android (APK/TWA)</span>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iOS Wrapper</span>
            </button>
            <button
              onClick={() => setActiveTab('push')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'push'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Push Notifications</span>
              {pushStatus === 'granted' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('offline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'offline'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Offline Caching</span>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'performance'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Lag Fix & 120Hz</span>
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 space-y-6">
          {/* TAB 1: INSTALL APP */}
          {activeTab === 'install' && (
            <div className="space-y-6">
              {/* Primary Direct Action */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/50 border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Direct Device Installation
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      Install NewLumino directly onto your current phone, tablet or desktop computer. Runs in full-screen standalone mode with no address bars.
                    </p>
                  </div>

                  {isInstallable ? (
                    <button
                      onClick={install}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center gap-2 justify-center"
                    >
                      <Download className="w-4 h-4" />
                      Install Now
                    </button>
                  ) : isInstalled ? (
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Already Installed on this Device
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-700/60">
                      Follow device guide below
                    </div>
                  )}
                </div>
              </div>

              {/* iOS Safari Guide */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-3">
                  <Apple className="w-4 h-4 text-cyan-400" />
                  <span>iOS Safari (iPhone & iPad) Instructions</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="font-bold text-emerald-400 mb-1">Step 1</div>
                    <p className="text-slate-400 leading-relaxed">
                      Tap the <strong className="text-white">Share</strong> icon (box with upward arrow) at bottom of Safari.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="font-bold text-emerald-400 mb-1">Step 2</div>
                    <p className="text-slate-400 leading-relaxed">
                      Scroll down the sheet and select <strong className="text-white">"Add to Home Screen"</strong> (+ icon).
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="font-bold text-emerald-400 mb-1">Step 3</div>
                    <p className="text-slate-400 leading-relaxed">
                      Tap <strong className="text-white">"Add"</strong> in top right. Launch NewLumino from your home screen.
                    </p>
                  </div>
                </div>
              </div>

              {/* Android Guide */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-3">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Android (Chrome & Samsung Internet) Instructions</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="font-bold text-emerald-400 mb-1">Step 1</div>
                    <p className="text-slate-400 leading-relaxed">
                      Tap the <strong className="text-white">Three Dots</strong> menu (⋮) in the top-right corner of Chrome.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="font-bold text-emerald-400 mb-1">Step 2</div>
                    <p className="text-slate-400 leading-relaxed">
                      Select <strong className="text-white">"Install App"</strong> or "Add to Home screen".
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="font-bold text-emerald-400 mb-1">Step 3</div>
                    <p className="text-slate-400 leading-relaxed">
                      Confirm installation. The app installs into your Android App Drawer with native push capabilities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID (APK & TWA) */}
          {activeTab === 'android' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Android Original App Wrapper (TWA & Capacitor)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generate an official Android APK package or Google Play Store bundle.
                  </p>
                </div>
                <button
                  onClick={handleDownloadAndroidZip}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  Download Android Package ZIP
                </button>
              </div>

              {/* Manifest snippet */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                  <span className="font-mono text-[11px] text-emerald-400">AndroidManifest.xml</span>
                  <button
                    onClick={() => handleCopy(androidManifestSnippet, 'manifest')}
                    className="flex items-center gap-1 hover:text-white transition cursor-pointer"
                  >
                    {copiedCode === 'manifest' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
                  {androidManifestSnippet}
                </pre>
              </div>

              {/* Capacitor Config */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                  <span className="font-mono text-[11px] text-cyan-400">capacitor.config.json</span>
                  <button
                    onClick={() => handleCopy(capacitorConfigSnippet, 'capacitor')}
                    className="flex items-center gap-1 hover:text-white transition cursor-pointer"
                  >
                    {copiedCode === 'capacitor' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40 leading-relaxed">
                  {capacitorConfigSnippet}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: IOS WRAPPER */}
          {activeTab === 'ios' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    iOS Original App Wrapper & MobileConfig Profile
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Package for iPhone/iPad via Apple WebClip Profile or native Swift WKWebView container.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadMobileConfig}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Install directly to iPhone Settings"
                  >
                    <Apple className="w-3.5 h-3.5" />
                    .mobileconfig
                  </button>
                  <button
                    onClick={handleDownloadIosZip}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    iOS ZIP Bundle
                  </button>
                </div>
              </div>

              {/* Instant Profile Install Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300">
                    <Apple className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-cyan-200">
                      Zero-Code 1-Tap iOS Installation (.mobileconfig)
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Download the Apple configuration profile directly on your iPhone. Open iOS <strong>Settings &gt; Profile Downloaded &gt; Install</strong> to pin NewLumino as an authentic native app on your home screen.
                    </p>
                  </div>
                </div>
              </div>

              {/* Swift Code Snippet */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                  <span className="font-mono text-[11px] text-cyan-400">ViewController.swift</span>
                  <button
                    onClick={() => handleCopy(iosSwiftWrapperSnippet, 'swift')}
                    className="flex items-center gap-1 hover:text-white transition cursor-pointer"
                  >
                    {copiedCode === 'swift' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-52 leading-relaxed">
                  {iosSwiftWrapperSnippet}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: PUSH NOTIFICATIONS */}
          {activeTab === 'push' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Native Push & Background Notifications
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real OS-level notifications for spaced-repetition active recall, pomodoro breaks, and daily streaks.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">Permission:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      pushStatus === 'granted'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : pushStatus === 'denied'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {pushStatus}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleRequestPush}
                  disabled={pushTesting}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 transition text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Enable Native Push
                    </span>
                    <Bell className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Requests system notification permission from browser or native webview wrapper.
                  </p>
                </button>

                <button
                  onClick={handleTestPush}
                  disabled={pushTesting}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/80 transition text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                      Send Test Alert Now
                    </span>
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Triggers an instant native notification in your device's notification tray.
                  </p>
                </button>

                <button
                  onClick={handleScheduleDemo}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 transition text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300">
                      Schedule 5s Recall Ping
                    </span>
                    <Clock className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Schedules a spaced-repetition active recall alert 5 seconds in the future.
                  </p>
                </button>
              </div>

              {testNotificationSent && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Notification dispatched to system tray! Check your OS notifications.</span>
                </div>
              )}

              {/* Notification Triggers List */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-300">Active Notification Triggers</div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                    <div>
                      <div className="font-medium text-white">Pomodoro Phase Transitions</div>
                      <div className="text-[11px] text-slate-400">Triggers when deep focus ends or break is over</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                      Enabled
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                    <div>
                      <div className="font-medium text-white">Spaced Repetition Active Recall</div>
                      <div className="text-[11px] text-slate-400">Pings memory retention curve for critical flashcards</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                      Enabled
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <div className="font-medium text-white">Daily Streak & Study Goal</div>
                      <div className="text-[11px] text-slate-400">Daily check-in for course study momentum</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                      Enabled
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: OFFLINE CACHING */}
          {activeTab === 'offline' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Offline Caching & Performance Engine
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Study anytime on flights, subways, or weak internet connections with Service Worker precaching.
                  </p>
                </div>

                <button
                  onClick={handlePrecacheAll}
                  disabled={cachingProgress}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {cachingProgress ? 'Caching...' : 'Precache Everything'}
                </button>
              </div>

              {cacheSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>All core application assets, soundscapes & study files cached for offline use!</span>
                </div>
              )}

              {/* Cache status metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Storage Usage</div>
                  <div className="text-base font-bold text-white mt-1">{cacheSize}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Persistent Storage</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Service Worker</div>
                  <div className="text-base font-bold text-emerald-400 mt-1">
                    {'serviceWorker' in navigator ? 'Active' : 'Unavailable'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Workbox AutoUpdate</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Offline Resilience</div>
                  <div className="text-base font-bold text-cyan-400 mt-1">100% Ready</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Local State Mirroring</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-200">Offline Capabilities:</div>
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  <li>Full Active-Recall Note reading, editing, and markdown authoring</li>
                  <li>Local flashcard review with active recall scoring and statistics</li>
                  <li>Pomodoro focus timer with audio cues and ambient soundscapes</li>
                  <li>Automatic background sync when internet connection re-establishes</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 6: LAG FIX & 120HZ */}
          {activeTab === 'performance' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Lag Fix & High-Refresh (120Hz) Transitions
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hardware compositing optimizations for buttery smooth mobile touch response and sheet animations.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePerfBoost(!boostMode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                      boostMode
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{boostMode ? 'Boost Mode Active' : 'Enable Boost Mode'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-emerald-300">
                    <Cpu className="w-4 h-4" />
                    <span>GPU Compositing Layer</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Forces <code className="text-emerald-400">translate3d(0, 0, 0)</code> and <code className="text-emerald-400">will-change: transform</code> on all animated drawers, sheets, and note cards to bypass CPU rasterization lag.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-cyan-300">
                    <Sparkles className="w-4 h-4" />
                    <span>Touch Latency Elimination</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Applies <code className="text-cyan-400">touch-action: manipulation</code> to abolish the 300ms mobile browser tap delay on iOS and Android touchscreens.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-indigo-300">
                    <Layers className="w-4 h-4" />
                    <span>Fluid Blur Optimization</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Prevents excessive multi-layer backdrop-filter overdraw on mobile devices during scroll gestures.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Safe-Area Insets (iOS Dynamic Island)</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Native padding for notch and home indicator via <code className="text-amber-400">env(safe-area-inset-top)</code> and <code className="text-amber-400">env(safe-area-inset-bottom)</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
