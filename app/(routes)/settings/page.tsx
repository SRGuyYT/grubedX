import { FeedbackPanel } from "@/components/feedback/FeedbackPanel";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="page-shell space-y-8 py-8 md:py-12">
      <SettingsPanel />
      <FeedbackPanel />
    </div>
  );
}
