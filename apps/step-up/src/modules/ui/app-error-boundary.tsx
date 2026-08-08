import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

function reportError(error: unknown, errorInfo?: ErrorInfo) {
  console.warn("Uncaught error", error, errorInfo?.componentStack);
  void import("@/lib/sentry")
    .then(({ Sentry }) => {
      Sentry.captureException(error, {
        contexts: errorInfo
          ? { react: { componentStack: errorInfo.componentStack } }
          : undefined,
      });
    })
    .catch(() => undefined);
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <p>Something went wrong.</p>;
    }
    return this.props.children;
  }
}

export function reportRootError(error: unknown, errorInfo: ErrorInfo) {
  reportError(error, errorInfo);
}
