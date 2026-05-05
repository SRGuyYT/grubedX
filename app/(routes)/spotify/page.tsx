import { FeatureGate } from "@/components/feedback/FeatureGate";

const SPOTIFY_EXTERNAL_URL = "https://grubx.sky0cloud.dpdns.org";

export default function SpotifyPage() {
  return (
    <FeatureGate feature="spotify">
      <section className="page-shell py-0">
        <iframe
          src={SPOTIFY_EXTERNAL_URL}
          title="GrubX Music"
          className="block w-full min-h-[100dvh] border-0"
          style={{ border: 0 }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </section>
    </FeatureGate>
  );
}
