import { CatalogGrid } from "@/components/media/CatalogGrid";

export default function MoviesPage() {
  return (
    <CatalogGrid
      mediaType="movie"
      title="Movies"
      description="Browse films by mood, genre, and what is catching fire right now."
    />
  );
}
