import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { getKeyboardNavigatedIndex, type AppScreen, type NavigationItem } from "@/lib/navigation";
import { Alert, ProgressBar } from "./design-system";

interface AppShellProps {
  navItems: NavigationItem[];
  mobileNavItems: NavigationItem[];
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  completedAngles: number;
  requiredAngles: number;
  showDevelopmentCatalogBanner: boolean;
  children: ReactNode;
}

export function AppShell({
  navItems,
  mobileNavItems,
  activeScreen,
  onNavigate,
  completedAngles,
  requiredAngles,
  showDevelopmentCatalogBanner,
  children
}: AppShellProps) {
  const desktopNavRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mobileNavRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [activeScreen]);

  function handleNavKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number, items: NavigationItem[], refs: Array<HTMLButtonElement | null>) {
    const nextIndex = getKeyboardNavigatedIndex(index, event.key, items.length);
    if (nextIndex !== index) {
      event.preventDefault();
      onNavigate(items[nextIndex].id);
      refs[nextIndex]?.focus();
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="topbar">
        <div className="brand" aria-label="GameFace Match web MVP">
          <strong>GameFace Match</strong>
          <span>Web MVP | RGB capture</span>
        </div>
        <nav className="nav desktop-nav" aria-label="Primary navigation">
          {navItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-current={item.id === activeScreen ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
              onKeyDown={(event) => handleNavKeyDown(event, index, navItems, desktopNavRefs.current)}
              ref={(element) => {
                desktopNavRefs.current[index] = element;
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="shell-progress">
          <ProgressBar value={completedAngles} max={requiredAngles} label="Capture angles" />
        </div>
      </header>
      {showDevelopmentCatalogBanner ? (
        <div className="dev-banner">
          <Alert title="Development catalog state" tone="warning">
            Verified production catalog is empty. This banner is hidden from production builds.
          </Alert>
        </div>
      ) : null}
      <main className="page" id="main-content" tabIndex={-1} ref={mainRef} aria-live="polite">
        {children}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileNavItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-current={item.id === activeScreen ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
            onKeyDown={(event) => handleNavKeyDown(event, index, mobileNavItems, mobileNavRefs.current)}
            ref={(element) => {
              mobileNavRefs.current[index] = element;
            }}
          >
            {item.shortLabel ?? item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
