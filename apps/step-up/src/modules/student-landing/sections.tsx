import { StudentBrowseAreas } from "./browse-areas";
import { StudentBrowseStyles } from "./browse-styles";
import { StudentFaq } from "./faq";
import { StudentFinalCta } from "./final-cta";
import { StudentHowItWorks } from "./how-it-works";
import { StudentStudioGrid } from "./studio-grid";
import { StudentTagline } from "./tagline";

/**
 * Below-fold student landing sections — lazy-loaded chunk boundary.
 */
export default function StudentLandingSections() {
  return (
    <>
      <StudentBrowseStyles />
      <StudentBrowseAreas />
      <StudentStudioGrid />
      <StudentTagline />
      <StudentHowItWorks />
      <StudentFaq />
      <StudentFinalCta />
    </>
  );
}
