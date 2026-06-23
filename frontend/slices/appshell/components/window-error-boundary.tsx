"use client";

import { Component, type ReactNode } from "react";

// One app's render-throw must not take down the whole cockpit. Each window's
// content is wrapped so a crash renders an in-window panel instead of bubbling
// to app/global-error (which replaces the entire document, killing every open
// window + the shell). Reset by remounting — the caller keys this on the app id,
// so switching/reopening the window clears the error state.
export class WindowErrorBoundary extends Component<
  { children: ReactNode; app: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`[window:${this.props.app}] render crashed`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">This app crashed.</p>
            <p className="text-xs">{this.state.error.message}</p>
            <p className="text-xs">Close and reopen the window to retry.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
