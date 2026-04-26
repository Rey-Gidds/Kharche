"use client";

import { usePWAInstall } from "@/hooks/usePWAInstall";
import Link from "next/link";
import { useEffect, useState } from "react";


export default function DownloadPage() {
  const { isInstallable, isStandalone, installApp } = usePWAInstall();
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "unknown">("unknown");

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] selection:bg-[var(--accent)] selection:text-[var(--background)] md:pt-6">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <main className="relative max-w-2xl mx-auto px-6 pt-12 pb-24 flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-16">
          <Link 
            href="/"
            className="w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface)] transition-all active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Kharche" className="w-6 h-6 object-contain" />
            <span className="font-playfair font-bold text-lg">Kharche</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {isStandalone ? "Native App Experience" : "Progressive Web App"}
          </div>
          <h1 className="text-4xl md:text-5xl font-playfair font-bold text-[var(--foreground)] mb-4 tracking-tight leading-tight">
            {isStandalone ? "You're all set!" : "Take Kharche"} <br /><span className="text-emerald-500">{isStandalone ? "App Installed" : "Everywhere"}</span>
          </h1>
          <p className="text-[var(--muted)] text-sm md:text-base max-w-md mx-auto leading-relaxed">
            {isStandalone 
              ? "Kharche is already installed and running as a standalone application on your device." 
              : "Install Kharche on your home screen for a seamless, app-like experience. No App Store required."}
          </p>
        </div>

        {/* Action / CTA */}
        {isStandalone ? (
          <div className="w-full max-w-sm p-1 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-[26px] mb-16">
            <div className="bg-[var(--surface)] border border-emerald-500/10 rounded-3xl p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                  <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-1">Running Standalone</h3>
              <p className="text-xs text-[var(--muted)]">Enjoy the full Kharche experience with offline support and native performance.</p>
            </div>
          </div>
        ) : isInstallable ? (
          <button
            onClick={installApp}
            className="w-full max-w-sm py-4 bg-[var(--accent)] text-[var(--background)] rounded-2xl font-bold text-base shadow-xl shadow-black/10 hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-3 mb-16"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Install Kharche Now
          </button>
        ) : (
          <div className="w-full max-w-sm p-1 bg-gradient-to-br from-[var(--border)] to-transparent rounded-[26px] mb-16">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-1">Already Installed?</h3>
              <p className="text-xs text-[var(--muted)]">Check your app drawer or home screen for the Kharche icon.</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="w-full space-y-12">
          <div>
            <h2 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-[0.2em] mb-8 text-center">Installation Guide</h2>
            
            <div className="grid grid-cols-1 gap-6">
              {/* iOS */}
              <div className={`p-6 rounded-3xl border ${platform === "ios" ? "border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-500/5" : "border-[var(--border)] bg-[var(--surface)]"} transition-all`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
                      <path d="M12 18h.01"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-base">iOS (Safari)</h3>
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">iPhone & iPad</p>
                  </div>
                </div>
                <ol className="space-y-3 text-sm text-[var(--muted)]">
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Tap the <span className="text-[var(--foreground)] font-bold">Share</span> button in Safari.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Scroll down and tap <span className="text-[var(--foreground)] font-bold">Add to Home Screen</span>.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    <span>Tap <span className="text-[var(--foreground)] font-bold">Add</span> in the top right corner.</span>
                  </li>
                </ol>
              </div>

              {/* Android */}
              <div className={`p-6 rounded-3xl border ${platform === "android" ? "border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-500/5" : "border-[var(--border)] bg-[var(--surface)]"} transition-all`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                      <path d="M12 3a9 9 0 0 0-9 9"/>
                      <path d="M12 3a9 9 0 0 1 9 9"/>
                      <path d="M12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/>
                      <path d="M21 12a9 9 0 0 1-9 9"/>
                      <path d="M3 12a9 9 0 0 0 9 9"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Android (Chrome)</h3>
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Samsung, Pixel, etc.</p>
                  </div>
                </div>
                <ol className="space-y-3 text-sm text-[var(--muted)]">
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Tap the <span className="text-[var(--foreground)] font-bold">Three Dots</span> menu icon.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Select <span className="text-[var(--foreground)] font-bold">Install App</span> or <span className="text-[var(--foreground)] font-bold">Add to Home screen</span>.</span>
                  </li>
                </ol>
              </div>

              {/* Desktop */}
              <div className={`p-6 rounded-3xl border ${platform === "desktop" ? "border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-500/5" : "border-[var(--border)] bg-[var(--surface)]"} transition-all`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                      <rect width="20" height="14" x="2" y="3" rx="2"/>
                      <line x1="8" x2="16" y1="21" y2="21"/>
                      <line x1="12" x2="12" y1="17" y2="21"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Desktop</h3>
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Chrome, Edge, Brave</p>
                  </div>
                </div>
                <ol className="space-y-3 text-sm text-[var(--muted)]">
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Look for the <span className="text-[var(--foreground)] font-bold">Install</span> icon in your address bar.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Or click the <span className="text-[var(--foreground)] font-bold">Three Dots</span> menu and select <span className="text-[var(--foreground)] font-bold">Save and Share</span> → <span className="text-[var(--foreground)] font-bold">Install Kharche</span>.</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-20 text-center">
          <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest leading-loose">
            Kharche PWA • Version 1.0.0 <br />
            Secure • Fast • Offline Capable
          </p>
        </div>
      </main>
    </div>
  );
}
