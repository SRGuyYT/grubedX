import { FeatureGate } from "@/components/feedback/FeatureGate";
import { SpotifyConsole } from "@/components/external/SpotifyConsole";

export default function SpotifyPage() {
  return (
    <FeatureGate feature="spotify">
      <SpotifyConsole />
    </FeatureGate>
  );
}
