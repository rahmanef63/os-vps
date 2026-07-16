"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsBlock } from "@/features/shell-settings";
import { CustomProviderForm } from "./custom-provider-form";
import { OAuthConnect } from "./oauth-connect";
import { ProviderList, type ConnectedProvider } from "./provider-list";

// The provider-management block below the active-provider config: OAuth sign-in,
// add-a-custom-endpoint, and the connected-provider list with delete. `reload`
// re-fetches /api/config in the parent after any change.
export function ProviderManage({
  providers,
  selected,
  reload,
}: {
  providers: ConnectedProvider[];
  selected: string;
  reload: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <>
      <SettingsBlock>
        <OAuthConnect onConnected={reload} />
      </SettingsBlock>

      <SettingsBlock>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowAdd((s) => !s)}>
          <Plus className="size-3.5" /> Add custom provider
        </Button>
        {showAdd && (
          <div className="mt-2">
            <CustomProviderForm
              onAdded={() => {
                setShowAdd(false);
                reload();
              }}
            />
          </div>
        )}
      </SettingsBlock>

      {providers.length > 0 && (
        <SettingsBlock>
          <ProviderList providers={providers} selected={selected} onChanged={reload} />
        </SettingsBlock>
      )}
    </>
  );
}
