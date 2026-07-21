import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrowserQRCodeReader } from "@zxing/browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useActiveStudentContext } from "@/modules/me/child-switcher";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { ErrorState, SuccessState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import styles from "./check-in.module.scss";

export const Route = createFileRoute("/me/check-in")({
  component: MeCheckInPage,
});

type Mode = "scan" | "manual";

function MeCheckInPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { studentId, isParent } = useActiveStudentContext();
  const [mode, setMode] = useState<Mode>("scan");
  const [token, setToken] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const scannedRef = useRef(false);

  const verifyQr = useMutation({
    mutationFn: (t: string) =>
      api.post<{ status: string }>("/attendance/qr/verify", {
        token: t,
        ...(isParent && studentId ? { studentId } : {}),
      }),
    onSuccess: () => setSucceeded(true),
  });

  const handleToken = useCallback(
    (rawToken: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      verifyQr.mutate(rawToken.trim());
    },
    [verifyQr],
  );

  useEffect(() => {
    if (mode !== "scan") return;
    if (!videoRef.current) return;

    const reader = new BrowserQRCodeReader();
    readerRef.current = reader;
    scannedRef.current = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result, error) => {
          if (result && !scannedRef.current) {
            handleToken(result.getText());
          }
          if (
            error &&
            !(error instanceof Error && error.name === "NotFoundException")
          ) {
            setCameraError("Camera unavailable. Use manual entry below.");
          }
        },
      )
      .catch(() => {
        setCameraError("Could not access camera. Use manual entry below.");
      });

    return () => {
      BrowserQRCodeReader.releaseAllStreams();
    };
  }, [mode, handleToken]);

  function resetPage() {
    scannedRef.current = false;
    setSucceeded(false);
    setToken("");
    verifyQr.reset();
  }

  if (succeeded) {
    return (
      <Screen title="Checked in" showBack backTo="/me">
        <SuccessState
          title="You're checked in"
          description="Your attendance was recorded. Have a great class."
          action={
            <div className={styles.successActions}>
              <TouchButton
                variant="primary"
                fullWidth
                onClick={() => void navigate({ to: "/me/attendance" })}
              >
                View attendance
              </TouchButton>
              <TouchButton variant="quiet" fullWidth onClick={resetPage}>
                Check in again
              </TouchButton>
            </div>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Check in"
      subtitle="Scan the studio QR code to mark attendance."
      showBack
      backTo="/me"
      paddedCta
    >
      <div className={styles.form}>
        <fieldset className={styles.modeTabs}>
          <button
            type="button"
            className={styles.modeTab}
            data-active={mode === "scan" ? "true" : undefined}
            onClick={() => {
              setMode("scan");
              verifyQr.reset();
            }}
          >
            Scan QR
          </button>
          <button
            type="button"
            className={styles.modeTab}
            data-active={mode === "manual" ? "true" : undefined}
            onClick={() => {
              setMode("manual");
              verifyQr.reset();
              BrowserQRCodeReader.releaseAllStreams();
            }}
          >
            Enter manually
          </button>
        </fieldset>

        {mode === "scan" ? (
          <div className={styles.scanArea}>
            <video
              ref={videoRef}
              className={styles.video}
              playsInline
              muted
              aria-label="Camera viewfinder"
            />
            <div className={styles.scanFrame} aria-hidden />
            {verifyQr.isPending ? (
              <p className={styles.hint}>Verifying…</p>
            ) : (
              <p className={styles.hint}>
                Hold your camera up to the QR code at the front desk.
              </p>
            )}
            {cameraError ? <ErrorState description={cameraError} /> : null}
          </div>
        ) : null}

        {mode === "manual" ? (
          <div className={styles.field}>
            <p className={styles.hint}>
              Paste the token from the studio QR code.
            </p>
            <FormInput
              label="Token"
              value={token}
              onChange={setToken}
              placeholder="qr-token"
            />
          </div>
        ) : null}

        {verifyQr.isError ? (
          <ErrorState
            title="Check-in failed"
            description={
              verifyQr.error instanceof Error
                ? verifyQr.error.message
                : "Check-in failed"
            }
          />
        ) : null}
      </div>

      {mode === "manual" ? (
        <StickyCtaBar>
          <TouchButton
            variant="primary"
            fullWidth
            isPending={verifyQr.isPending}
            isDisabled={!token.trim()}
            onClick={() => handleToken(token)}
          >
            Check in
          </TouchButton>
        </StickyCtaBar>
      ) : null}
    </Screen>
  );
}
