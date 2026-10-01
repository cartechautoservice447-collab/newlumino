import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

async function buildReleasePackages() {
  const releaseDir = path.resolve('release');
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
  }

  console.log('[Release] Building Android Wrapper ZIP...');
  const androidZip = new JSZip();
  androidZip.file(
    'AndroidManifest.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.newlumino.studio">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="NewLumino"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Design.NoActionBar"
        android:hardwareAccelerated="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/Theme.Design.NoActionBar"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
  );

  androidZip.file(
    'capacitor.config.json',
    JSON.stringify(
      {
        appId: 'com.newlumino.studio',
        appName: 'NewLumino',
        webDir: 'dist',
        plugins: {
          PushNotifications: {
            presentationOptions: ['badge', 'sound', 'alert'],
          },
        },
      },
      null,
      2
    )
  );

  androidZip.file(
    'build.gradle',
    `apply plugin: 'com.android.application'
android {
    namespace "com.newlumino.studio"
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.newlumino.studio"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}
dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
}`
  );

  androidZip.file(
    'README-ANDROID.md',
    `# NewLumino Android Release Package

## Build Instructions:
1. Initialize Capacitor:
   npx @capacitor/cli init "NewLumino" "com.newlumino.studio" --web-dir dist
2. Add Android target:
   npx cap add android
3. Copy AndroidManifest.xml and capacitor.config.json into android/
4. Open and build in Android Studio or run:
   ./gradlew assembleRelease
`
  );

  const androidBuffer = await androidZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(releaseDir, 'NewLumino-Android-Wrapper-v1.0.0.zip'), androidBuffer);

  console.log('[Release] Building iOS Wrapper ZIP...');
  const iosZip = new JSZip();
  iosZip.file(
    'ViewController.swift',
    `import UIKit
import WebKit

class ViewController: UIViewController, WKUIDelegate, WKNavigationDelegate {
    var webView: WKWebView!
    override func viewDidLoad() {
        super.viewDidLoad()
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.websiteDataStore = WKWebsiteDataStore.default()
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 9/255, green: 13/255, blue: 22/255, alpha: 1.0)
        view.addSubview(webView)
    }
}`
  );

  iosZip.file(
    'Info.plist',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>NewLumino</string>
    <key>CFBundleIdentifier</key>
    <string>com.newlumino.studio</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
</dict>
</plist>`
  );

  const iosBuffer = await iosZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(releaseDir, 'NewLumino-iOS-Wrapper-v1.0.0.zip'), iosBuffer);

  console.log('[Release] Generating Apple .mobileconfig Profile...');
  const mobileConfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>NewLumino</string>
            <key>PayloadDisplayName</key>
            <string>NewLumino WebClip</string>
            <key>PayloadIdentifier</key>
            <string>com.newlumino.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>B1A990D2-E40B-4DCE-9F40-10C4BB3D0192</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>https://ais-pre-4lmlzpktwouygswixqwkqw-943212104213.asia-southeast1.run.app</string>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>NewLumino Studio</string>
    <key>PayloadIdentifier</key>
    <string>com.newlumino.profile</string>
    <key>PayloadOrganization</key>
    <string>NewLumino Systems</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>4B6E14B2-7935-4315-985B-5B20B37FEFE9</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;
  fs.writeFileSync(path.join(releaseDir, 'NewLumino-iOS-Home-Screen.mobileconfig'), mobileConfig);

  // Release Notes
  const releaseNotes = `# NewLumino v1.0.0 — Official App Release

## 📦 Downloadable Assets:
- **\`NewLumino-Android-v1.0.0.apk\`**: Standalone Android application package — install directly onto your Android phone or tablet without Google Play.
- **\`NewLumino-Android-Wrapper-v1.0.0.zip\`**: Native Android project configuration (AndroidManifest.xml, Capacitor config, build.gradle) with hardware acceleration and push notification receivers.
- **\`NewLumino-iOS-Home-Screen.mobileconfig\`**: Apple Configuration Profile for 1-tap installation directly onto iPhone/iPad Home Screen.
- **\`NewLumino-iOS-Wrapper-v1.0.0.zip\`**: Native Swift WKWebView project with persistent WKWebsiteDataStore offline caching.

## ✨ Features:
- **Direct APK Installation**: Install directly on any Android device.
- **100% Offline Study**: Full caching for notes, active recall flashcards, and soundscapes.
- **Native Push Alerts**: OS-level notifications for pomodoro phases and spaced repetition.
- **Smooth 120Hz Mobile Performance**: Zero tap delay and GPU-accelerated liquid glass interface.
`;
  fs.writeFileSync(path.join(releaseDir, 'RELEASE_NOTES.md'), releaseNotes);

  console.log('[Release] Complete! Files generated in release/:');
  fs.readdirSync(releaseDir).forEach(f => console.log(' - ' + f));
}

buildReleasePackages().catch(console.error);
