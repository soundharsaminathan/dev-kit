import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useContext, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import type { AgeRange, Gender } from "@/lib/constants";
import {
  getMenuSections,
  type ShellVariant,
} from "@/modules/layout/nav-config";
import { ActiveStudentContext } from "@/modules/me/active-student-context";
import { ChildSwitcher } from "@/modules/me/child-switcher";
import { AGE_RANGES, GENDERS } from "@/modules/onboarding/options";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./profile-menu-page.module.scss";

type ProfileMenuPageProps = {
  variant?: ShellVariant;
};

export function ProfileMenuPage({ variant = "me" }: ProfileMenuPageProps) {
  const { user, signOutUser, hasPasswordProvider } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();
  const activeStudent = useContext(ActiveStudentContext);
  const familyMembers = activeStudent?.familyMembers ?? [];
  const isManagingFamily = activeStudent?.isManagingFamily ?? false;
  const setActiveAccount = activeStudent?.setActiveAccount ?? (() => {});
  const sections = getMenuSections(variant);
  const editTo = variant === "app" ? "/app/profile/edit" : "/me/profile/edit";
  const followRequestsTo =
    variant === "app"
      ? "/app/profile/follow-requests"
      : "/me/profile/follow-requests";
  const changePasswordTo =
    variant === "app"
      ? "/app/profile/change-password"
      : "/me/profile/change-password";
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<"KID" | "CO_STUDENT">("KID");
  const [newGender, setNewGender] = useState<Gender | null>(null);
  const [newAgeRange, setNewAgeRange] = useState<AgeRange | null>(null);
  const showChangePassword = hasPasswordProvider;
  const canAddMember =
    newName.trim().length > 0 && Boolean(newGender) && Boolean(newAgeRange);

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/users/me/family-members", {
        name: newName,
        kind: newKind,
        gender: newGender,
        ageRange: newAgeRange,
      }),
    onSuccess: async (created: { id: string }) => {
      await queryClient.invalidateQueries({
        queryKey: ["users", user?.id, "family-members"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["memberships"],
      });
      setActiveAccount(created.id);
      setNewName("");
      setNewGender(null);
      setNewAgeRange(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberUserId: string) =>
      api.delete(`/users/me/family-members/${memberUserId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users", user?.id, "family-members"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["memberships"],
      });
    },
  });

  return (
    <Screen title="Profile">
      <div className={styles.root}>
        {isManagingFamily ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Switch account</h2>
            <ChildSwitcher />
          </section>
        ) : null}

        <Link to={editTo} className={styles.profileCard}>
          <Avatar size="lg">
            {user?.photoUrl ? (
              <AvatarImage src={user.photoUrl} alt={user.name} />
            ) : null}
            <AvatarFallback>
              {user?.name?.slice(0, 1) || <Icon name="user" />}
            </AvatarFallback>
          </Avatar>
          <span className={styles.profileText}>
            <span className={styles.profileName}>
              {user?.name ?? "Your profile"}
            </span>
            <span className={styles.profileHint}>
              View and edit your profile
            </span>
          </span>
          <Icon name="chevron-right" className={styles.chevron} />
        </Link>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Social</h2>
          <ul className={styles.menuCard}>
            <li>
              <Link to={followRequestsTo} className={styles.menuRow}>
                <span className={styles.menuIcon}>
                  <Icon name="users" />
                </span>
                <span className={styles.menuLabel}>Follow requests</span>
                <Icon name="chevron-right" className={styles.chevron} />
              </Link>
            </li>
          </ul>
        </section>

        {sections.map((section) => (
          <section key={section.title} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <ul className={styles.menuCard}>
              {variant === "me" && section.title === "Account" ? (
                <li>
                  <button
                    type="button"
                    className={styles.menuRow}
                    onClick={() => setManageOpen(true)}
                  >
                    <span className={styles.menuIcon}>
                      <Icon name="users" />
                    </span>
                    <span className={styles.menuLabel}>Family</span>
                    <Icon name="chevron-right" className={styles.chevron} />
                  </button>
                </li>
              ) : null}
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={styles.menuRow}
                    activeOptions={{ exact: link.exact ?? false }}
                  >
                    <span className={styles.menuIcon}>
                      <Icon name={link.icon} />
                    </span>
                    <span className={styles.menuLabel}>{link.label}</span>
                    <Icon name="chevron-right" className={styles.chevron} />
                  </Link>
                </li>
              ))}
              {showChangePassword && section.title === "Account" ? (
                <li>
                  <Link to={changePasswordTo} className={styles.menuRow}>
                    <span className={styles.menuIcon}>
                      <Icon name="lock" />
                    </span>
                    <span className={styles.menuLabel}>Change password</span>
                    <Icon name="chevron-right" className={styles.chevron} />
                  </Link>
                </li>
              ) : null}
            </ul>
          </section>
        ))}

        {showChangePassword &&
        !sections.some((section) => section.title === "Account") ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Account</h2>
            <ul className={styles.menuCard}>
              <li>
                <Link to={changePasswordTo} className={styles.menuRow}>
                  <span className={styles.menuIcon}>
                    <Icon name="lock" />
                  </span>
                  <span className={styles.menuLabel}>Change password</span>
                  <Icon name="chevron-right" className={styles.chevron} />
                </Link>
              </li>
            </ul>
          </section>
        ) : null}

        <section className={styles.section}>
          <ul className={styles.menuCard}>
            <li>
              <button
                type="button"
                className={`${styles.menuRow} ${styles.signOutRow}`}
                onClick={() => {
                  void signOutUser();
                }}
              >
                <span className={`${styles.menuIcon} ${styles.signOutIcon}`}>
                  <Icon name="log-out" />
                </span>
                <span className={styles.menuLabel}>Sign out</span>
              </button>
            </li>
          </ul>
        </section>
      </div>

      <AppBottomSheet
        isOpen={manageOpen}
        onOpenChange={setManageOpen}
        title="Family"
      >
        <div className={styles.sheetBody}>
          <FormInput
            label="Name"
            value={newName}
            onChange={setNewName}
            placeholder="Enter member name"
          />
          <div className={styles.kindPicker}>
            <TouchButton
              variant={newKind === "KID" ? "primary" : "quiet"}
              size="sm"
              onClick={() => setNewKind("KID")}
            >
              Kid
            </TouchButton>
            <TouchButton
              variant={newKind === "CO_STUDENT" ? "primary" : "quiet"}
              size="sm"
              onClick={() => setNewKind("CO_STUDENT")}
            >
              Co-student
            </TouchButton>
          </div>
          <div className={styles.fieldBlock}>
            <p className={styles.fieldLabel}>Gender</p>
            <div className={styles.chipGrid}>
              {GENDERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.chip}
                  data-selected={newGender === option.id ? "true" : undefined}
                  onClick={() => setNewGender(option.id)}
                >
                  {option.title}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.fieldBlock}>
            <p className={styles.fieldLabel}>Age range</p>
            <div className={styles.chipGrid}>
              {AGE_RANGES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.chip}
                  data-selected={newAgeRange === option.id ? "true" : undefined}
                  onClick={() => setNewAgeRange(option.id)}
                >
                  {option.label} · {option.title}
                </button>
              ))}
            </div>
          </div>
          <TouchButton
            variant="primary"
            fullWidth
            isDisabled={!canAddMember}
            isPending={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Add member
          </TouchButton>

          {createMutation.isError ? (
            <ErrorState
              description={
                createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Could not add family member."
              }
            />
          ) : null}

          <div className={styles.memberList}>
            {familyMembers.map((member) => (
              <div key={member.id} className={styles.memberRow}>
                <div>
                  <p className={styles.memberName}>{member.name}</p>
                  <p className={styles.memberType}>
                    {member.kind === "KID" ? "Kid seat" : "Co-student seat"}
                  </p>
                </div>
                <TouchButton
                  variant="quiet"
                  size="sm"
                  isPending={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(member.id)}
                >
                  Remove
                </TouchButton>
              </div>
            ))}
          </div>
        </div>
      </AppBottomSheet>
    </Screen>
  );
}
