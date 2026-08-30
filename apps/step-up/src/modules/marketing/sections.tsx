import { Comparison } from "./comparison";
import { Faq } from "./faq";
import { Features } from "./features";
import { FinalCta } from "./final-cta";
import { HowItWorks } from "./how-it-works";
import { Pricing } from "./pricing";
import { Problem } from "./problem";
import { Testimonials } from "./testimonials";

/**
 * Below-fold landing sections — lazy-loaded chunk boundary.
 * Keep motion and below-fold UI out of the hero critical path.
 */
export default function LandingSections() {
  return (
    <>
      <Problem />
      <Features />
      <HowItWorks />
      <Comparison />
      <Testimonials />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
