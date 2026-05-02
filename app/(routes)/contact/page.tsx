import { FeatureGate } from "@/components/feedback/FeatureGate";
import { ContactPanel } from "@/components/legal/ContactPanel";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

export default function ContactPage() {
  return (
    <FeatureGate feature="feedbackContact">
      <LegalPageShell
        eyebrow="Contact"
        title="Contact GrubX Team"
        intro="Send safety concerns, provider reports, bugs, feature requests, or other feedback through the server-side feedback route."
      >
        <ContactPanel />
        <LegalSection title="Before you send">
          <p>
            Do not include passwords, private account information, or secrets. Provider reports should describe what
            happened and which page or server was involved.
          </p>
        </LegalSection>
      </LegalPageShell>
    </FeatureGate>
  );
}
