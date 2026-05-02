import { FeatureGate } from "@/components/feedback/FeatureGate";
import { YouTubeConsole } from "@/components/external/YouTubeConsole";

export default function YouTubePage() {
  return (
    <FeatureGate feature="youtube">
      <YouTubeConsole />
    </FeatureGate>
  );
}
