import { FeatureGate } from "@/components/feedback/FeatureGate";
import { CatalogGrid } from "@/components/media/CatalogGrid";

export default function TvPage() {
  return (
    <FeatureGate feature="tv">
      <CatalogGrid
        mediaType="tv"
        title="TV"
        description="Find series for the next episode, the next season, or the next all-night queue."
      />
    </FeatureGate>
  );
}
