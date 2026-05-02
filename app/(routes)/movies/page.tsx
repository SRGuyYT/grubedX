import { FeatureGate } from "@/components/feedback/FeatureGate";
import { CatalogGrid } from "@/components/media/CatalogGrid";

export default function MoviesPage() {
  return (
    <FeatureGate feature="movies">
      <CatalogGrid
        mediaType="movie"
        title="Movies"
        description="Browse films by mood, genre, and what is catching fire right now."
      />
    </FeatureGate>
  );
}
