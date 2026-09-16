import { StudentBenefits } from "./benefits";
import { StudentCategories } from "./categories";
import { StudentFaq } from "./faq";
import { StudentFinalCta } from "./final-cta";
import { StudentHowItWorks } from "./how-it-works";
import { StudentLocations } from "./locations";
import { StudentNearby } from "./nearby";
import { StudentPersonalized } from "./personalized";
import { StudentPreview } from "./preview";
import { StudentTagline } from "./tagline";
import { StudentTrust } from "./trust";

/**
 * Below-fold student landing sections — lazy-loaded chunk boundary.
 */
export default function StudentLandingSections() {
  return (
    <>
      <StudentCategories />
      <StudentTagline />
      <StudentNearby />
      <StudentHowItWorks />
      <StudentPersonalized />
      <StudentLocations />
      <StudentBenefits />
      <StudentPreview />
      <StudentTrust />
      <StudentFaq />
      <StudentFinalCta />
    </>
  );
}
