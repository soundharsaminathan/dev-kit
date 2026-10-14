import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/modules/layout/legal-page";
import { LEGAL } from "@/modules/marketing/content";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title={LEGAL.termsTitle}>
      <p>
        These terms cover use of classa by studio owners, staff, trainers,
        students, and parents. By creating an account you agree to them.
      </p>
      <h2>The service</h2>
      <p>
        classa is software for running a dance studio: batches, attendance,
        invoices, bookings, and a member app. We work to keep it available. We
        do not promise uninterrupted uptime.
      </p>
      <h2>Your studio</h2>
      <p>
        You own the data you put in classa. You are responsible for how your
        team uses it, including who you invite and what you tell families. Do
        not use the product for anything unlawful.
      </p>
      <h2>Accounts</h2>
      <p>
        Keep credentials private. You can start without a credit card. Paid
        plans, when you choose them, bill according to the prices shown in the
        product. You can cancel anytime.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not probe, scrape, or disrupt the service. Do not upload malware or
        content you do not have the right to share.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms. Continued use after an update means you
        accept the new terms. The date at the top of this page is the latest
        version.
      </p>
    </LegalPage>
  );
}
