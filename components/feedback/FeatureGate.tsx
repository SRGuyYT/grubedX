"use client";

import type { ReactNode } from "react";

import { FeatureDisabledPanel } from "@/components/feedback/FeatureDisabledPanel";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useSettingsContext } from "@/context/SettingsContext";
import type { FeatureToggles } from "@/types/settings";

export function FeatureGate({
  feature,
  children,
}: {
  feature: keyof FeatureToggles;
  children: ReactNode;
}) {
  const { ready, settings } = useSettingsContext();

  if (!ready) {
    return <LoadingState title="Loading feature settings" description="Checking your local GrubX controls." />;
  }

  if (!settings.featureToggles[feature]) {
    return <FeatureDisabledPanel />;
  }

  return <>{children}</>;
}
