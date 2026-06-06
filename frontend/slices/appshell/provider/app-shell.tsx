"use client";

import type { ComponentType, ReactNode } from "react";
import { OsDesktop } from "../components/desktop";
import { BrandProvider } from "../registry/brand";
import { FeatureRegistryProvider } from "../registry/feature-registry";
import { ShellConfigProvider } from "../registry/shell-config";
import { CapabilitiesProvider } from "../registry/capabilities";
import { UrlSync } from "../runtime/use-url-sync";
import type { ShellManifest } from "../registry/types";

function withProviders(
  providers: ComponentType<{ children: ReactNode }>[],
  node: ReactNode,
): ReactNode {
  return providers.reduceRight((acc, P) => <P>{acc}</P>, node);
}

/**
 * THE wrapper provider. A project hands it one manifest (brand + apps +
 * features) and gets the whole desktop+mobile shell. appshell core stays
 * brand- and feature-agnostic: everything specific is injected here. Lifts to
 * rr as the single entry point.
 */
export function AppShell({ manifest }: { manifest: ShellManifest }) {
  const features = manifest.features ?? [];
  const providers = features
    .map((f) => f.provider)
    .filter((p): p is ComponentType<{ children: ReactNode }> => Boolean(p));

  return (
    <CapabilitiesProvider value={manifest.capabilities}>
      <BrandProvider brand={manifest.brand}>
        <ShellConfigProvider value={{ persistKey: manifest.persistKey ?? "appshell:layout" }}>
          <FeatureRegistryProvider features={features}>
            {manifest.routing !== false && <UrlSync apps={manifest.apps} />}
            {withProviders(providers, <OsDesktop apps={manifest.apps} />)}
          </FeatureRegistryProvider>
        </ShellConfigProvider>
      </BrandProvider>
    </CapabilitiesProvider>
  );
}
