import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Profile</h1>
          <p>Your staff account.</p>
        </div>
      </div>
      <div className="lm-card">
        <dl style={{ display: "grid", gap: "0.75rem", margin: 0 }}>
          <div>
            <dt className="lm-muted">Name</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{user?.name}</dd>
          </div>
          <div>
            <dt className="lm-muted">Email</dt>
            <dd style={{ margin: 0 }}>{user?.email}</dd>
          </div>
          <div>
            <dt className="lm-muted">Role</dt>
            <dd style={{ margin: 0 }}>
              <span className="lm-badge">{user?.role}</span>
            </dd>
          </div>
          <div>
            <dt className="lm-muted">Company</dt>
            <dd style={{ margin: 0 }}>
              <code>{user?.companyId ?? "—"}</code>
            </dd>
          </div>
          <div>
            <dt className="lm-muted">Branch</dt>
            <dd style={{ margin: 0 }}>
              <code>{user?.branchId ?? "—"}</code>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
