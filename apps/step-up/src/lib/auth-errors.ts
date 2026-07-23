function firebaseAuthCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

export function mapAuthError(
  error: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  const code = firebaseAuthCode(error);
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-not-found":
      return "No account found for that email.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Current password is incorrect.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/requires-recent-login":
      return "For security, enter your current password and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/missing-email":
      return "Enter your email address.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/operation-not-allowed":
      return "Email changes aren’t enabled for this project yet.";
    case "auth/invalid-continue-uri":
      return "Unable to start email change. Try again later.";
    default:
      break;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
