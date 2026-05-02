import { FeatureGate } from "@/components/feedback/FeatureGate";
import { TikTokConsole } from "@/components/external/TikTokConsole";

export default function TikTokPage() {
  return (
    <FeatureGate feature="tiktok">
      <TikTokConsole />
    </FeatureGate>
  );
}
