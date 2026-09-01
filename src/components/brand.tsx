import { Link } from "@tanstack/react-router";
import logo from "@/assets/plp-logo.png.asset.json";
import community from "@/assets/power-community.png.asset.json";

export function PlpLogo({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="Power Learn Project"
      className={className + " w-auto object-contain"}
      loading="eager"
    />
  );
}

export function BrandLink() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="EvalDesk home">
      <PlpLogo className="h-10 sm:h-11" />
      <span className="hidden border-l border-border pl-3 text-base font-bold tracking-tight text-foreground sm:inline">
        EvalDesk
      </span>
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
        <div className="flex flex-col items-center gap-3 lg:items-start">
          <PlpLogo className="h-10" />
          <p className="max-w-sm text-center text-sm text-muted-foreground lg:text-left">
            EvalDesk is the judging and scoring platform for Power Learn Project hackathons.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <img
            src={community.url}
            alt="#PowerCommunity"
            className="h-9 w-auto object-contain"
            loading="lazy"
          />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Power Learn Project. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
