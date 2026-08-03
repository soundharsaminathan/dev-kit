import { Button } from "@dev-ui/components/button";
import {
  PanelLeftIcon,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  useSidebarContext,
} from "@dev-ui/components/sidebar";
import { Text } from "@dev-ui/components/text";
import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/modules/layout/app-header";
import { BottomToolbar } from "@/modules/layout/bottom-toolbar";
import { SidebarNavSections } from "@/modules/layout/nav";
import type { ShellVariant } from "@/modules/layout/nav-config";
import styles from "./app-shell.module.scss";

type AppShellProps = {
  variant: ShellVariant;
  children: ReactNode;
};

function SidebarToggle() {
  const { toggleSidebar } = useSidebarContext("SidebarToggle");
  return (
    <Button
      variant="quiet"
      isIconOnly
      aria-label="Toggle sidebar"
      onClick={toggleSidebar}
    >
      <PanelLeftIcon />
    </Button>
  );
}

function isMemberHome(pathname: string) {
  return pathname === "/me" || pathname === "/me/";
}

function isMemberTrainers(pathname: string) {
  return pathname === "/me/trainers" || pathname.startsWith("/me/trainers/");
}

function isMemberBook(pathname: string) {
  return pathname === "/me/book" || pathname.startsWith("/me/book/");
}

function isStaffHome(pathname: string) {
  return pathname === "/app" || pathname === "/app/";
}

function isTrainersPath(pathname: string) {
  return (
    pathname === "/app/trainers" ||
    pathname.startsWith("/app/trainers/") ||
    pathname === "/me/trainers" ||
    pathname.startsWith("/me/trainers/")
  );
}

function isProfileHubPath(pathname: string) {
  return (
    pathname === "/app/profile" ||
    pathname.startsWith("/app/profile/") ||
    pathname === "/admin/profile" ||
    pathname.startsWith("/admin/profile/")
  );
}

function isMessagesPath(pathname: string) {
  return (
    pathname === "/app/messages" ||
    pathname.startsWith("/app/messages/") ||
    pathname === "/me/messages" ||
    pathname.startsWith("/me/messages/")
  );
}

function isCertificatesPath(pathname: string) {
  return (
    pathname === "/app/certificates" ||
    pathname.startsWith("/app/certificates/")
  );
}

function needsCollapsedSidebar(pathname: string) {
  return isMessagesPath(pathname) || isCertificatesPath(pathname);
}

export function AppShell({ variant, children }: AppShellProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { user } = useAuth();
  const collapseSidebar = needsCollapsedSidebar(pathname);
  const fillHeight =
    collapseSidebar || (variant === "me" && isMemberBook(pathname));
  const [sidebarOpen, setSidebarOpen] = useState(!collapseSidebar);
  const hideHeader =
    variant === "me" ||
    user?.role === "TRAINER" ||
    isTrainersPath(pathname) ||
    isProfileHubPath(pathname);
  const edgeToEdge =
    (variant === "me" &&
      (isMemberHome(pathname) || isMemberTrainers(pathname))) ||
    (variant === "app" && user?.role === "TRAINER" && isStaffHome(pathname));

  useEffect(() => {
    setSidebarOpen(!collapseSidebar);
  }, [collapseSidebar]);

  return (
    <SidebarProvider
      isOpen={sidebarOpen}
      onOpenChange={setSidebarOpen}
      className={styles.shell}
    >
      <div className={styles.sidebarWrap}>
        <Sidebar placement="left">
          <SidebarHeader>
            <Text
              slot="label"
              data-sidebar-label=""
              className={styles.sidebarTitle}
            >
              Step Up
            </Text>
            <SidebarToggle />
          </SidebarHeader>
          <SidebarContent>
            <SidebarNavSections variant={variant} />
          </SidebarContent>
        </Sidebar>
      </div>
      <div
        className={styles.workspace}
        data-home-banner={edgeToEdge ? "true" : undefined}
      >
        {!hideHeader ? (
          <div className={styles.headerSlot}>
            <AppHeader variant={variant} />
          </div>
        ) : null}
        <main className={styles.main}>
          <div
            className={styles.content}
            data-app-scroll
            data-fill-height={fillHeight ? "true" : undefined}
          >
            {children}
          </div>
        </main>
        <BottomToolbar variant={variant} />
      </div>
    </SidebarProvider>
  );
}
