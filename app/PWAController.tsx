"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAController() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIsInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
      return;
    }
    if (isIOS) setShowIOSHelp(true);
  }

  if (isInstalled || (!installPrompt && !isIOS)) return null;

  return (
    <>
      <button className="install-app" type="button" onClick={install} aria-label="Install NailsBySnig app">
        <span aria-hidden="true">↓</span> Install app
      </button>
      {showIOSHelp && (
        <div className="install-dialog-backdrop" role="presentation" onClick={() => setShowIOSHelp(false)}>
          <section
            className="install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="install-close" type="button" onClick={() => setShowIOSHelp(false)} aria-label="Close">
              ×
            </button>
            <div className="install-icon">NS</div>
            <p className="eyebrow">Install NailsBySnig</p>
            <h2 id="install-title">Add it to your Home Screen.</h2>
            <ol>
              <li>Tap the <strong>Share</strong> button in Safari.</li>
              <li>Choose <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> to finish.</li>
            </ol>
          </section>
        </div>
      )}
    </>
  );
}
