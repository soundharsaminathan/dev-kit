import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/modules/layout/legal-page";
import { LEGAL } from "@/modules/marketing/content";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title={LEGAL.privacyTitle}>
      <p>
        classa is a dance studio workspace. This page explains what we collect
        when you create an account, run a studio, or join as a student or
        parent.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details such as name, email, and password hash</li>
        <li>
          Studio data you enter: students, batches, attendance, invoices, and
          messages
        </li>
        <li>
          Payment status and, when you use Razorpay, references needed to match
          a payment
        </li>
      </ul>
      <h2>How we use it</h2>
      <p>
        We use this data to run the product you signed up for: class operations,
        billing, the member app, and support. We do not sell studio or member
        data.
      </p>
      <h2>Who can see it</h2>
      <p>
        People in your studio see what their role allows. Platform admins can
        access a studio when needed to keep the service running. Chat and
        profile fields that are treated as private are stored encrypted at rest.
      </p>
      <h2>How long we keep it</h2>
      <p>
        We keep account and studio data while the studio is active. If you close
        the studio, we delete or anonymize data after a short retention window
        needed for invoices and legal records.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about this policy can go to the studio owner who invited you,
        or to classa support from the product.
      </p>
    </LegalPage>
  );
}
