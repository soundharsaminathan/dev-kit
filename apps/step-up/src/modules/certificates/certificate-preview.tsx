import styles from "./certificate-preview.module.scss";
import { ensureCertificateDocument } from "./migrate-layout";
import { CertificatePage } from "./render/element-renderer";
import { sampleVariableBindings, type VariableBindings } from "./variables";

type CertificatePreviewProps = {
  layout: unknown;
  bindings?: VariableBindings;
  recipientName?: string;
  contextLabel?: string;
  danceCategories?: string[];
  trainers?: string[];
  showLabel?: boolean;
  footer?: string;
  certificateNumber?: string;
};

export function CertificatePreview({
  layout,
  bindings,
  recipientName,
  contextLabel,
  danceCategories,
  trainers,
  showLabel = true,
  certificateNumber,
}: CertificatePreviewProps) {
  const document = ensureCertificateDocument(layout);
  const resolved = sampleVariableBindings({
    ...(recipientName ? { student_name: recipientName } : {}),
    ...(contextLabel ? { course_name: contextLabel } : {}),
    ...(danceCategories?.length
      ? { dance_categories: danceCategories.join(", ") }
      : {}),
    ...(trainers?.length ? { trainers: trainers.join(", ") } : {}),
    ...(certificateNumber ? { certificate_id: certificateNumber } : {}),
    ...bindings,
  });

  const scale = Math.min(1, 360 / document.page.width);

  return (
    <div className={styles.root}>
      {showLabel ? <p className={styles.previewLabel}>Preview</p> : null}
      <div
        className={styles.frame}
        style={{
          width: document.page.width * scale,
          height: document.page.height * scale,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: document.page.width,
            height: document.page.height,
          }}
        >
          <CertificatePage
            document={document}
            bindings={resolved}
            certificateNumberValue={resolved.certificate_id}
          />
        </div>
      </div>
    </div>
  );
}
