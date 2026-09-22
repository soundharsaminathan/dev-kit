import { Button } from "@dev-ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { CheckControl, TextControl } from "@/modules/ui/controls";

type Branch = {
  id: string;
  name: string;
  code: string;
  active: boolean;
};

export const Route = createFileRoute("/app/branches")({
  component: BranchesPage,
});

function BranchesPage() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", code: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", active: true });

  const branches = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["branches"] });

  const createBranch = useMutation({
    mutationFn: () =>
      api.post("/branches", {
        name: createForm.name.trim(),
        code: createForm.code.trim(),
      }),
    onSuccess: () => {
      setError(null);
      setCreateForm({ name: "", code: "" });
      invalidate();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Create failed");
    },
  });

  const updateBranch = useMutation({
    mutationFn: () => {
      if (!editId) throw new Error("No branch selected");
      return api.patch(`/branches/${editId}`, {
        name: editForm.name.trim(),
        active: editForm.active,
      });
    },
    onSuccess: () => {
      setError(null);
      setEditId(null);
      invalidate();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Update failed");
    },
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Branches</h1>
          <p>Branches within your company.</p>
        </div>
      </div>

      {error ? <p className="lm-error">{error}</p> : null}

      <div className="lm-card">
        <h2>New branch</h2>
        <form
          className="lm-form"
          onSubmit={(e) => {
            e.preventDefault();
            createBranch.mutate();
          }}
        >
          <TextControl
            label="Name"
            value={createForm.name}
            onChange={(name) => setCreateForm((f) => ({ ...f, name }))}
            isRequired
          />
          <TextControl
            label="Code"
            value={createForm.code}
            onChange={(code) => setCreateForm((f) => ({ ...f, code }))}
            isRequired
          />
          <Button
            type="submit"
            variant="primary"
            isDisabled={createBranch.isPending}
          >
            Create branch
          </Button>
        </form>
      </div>

      <div className="lm-card lm-table-wrap">
        <h2>All branches</h2>
        {branches.isLoading ? <p>Loading…</p> : null}
        {branches.data ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {branches.data.map((b) => (
                <tr key={b.id}>
                  <td>{b.code}</td>
                  <td>
                    {editId === b.id ? (
                      <TextControl
                        label="Branch name"
                        value={editForm.name}
                        onChange={(name) =>
                          setEditForm((f) => ({ ...f, name }))
                        }
                      />
                    ) : (
                      b.name
                    )}
                  </td>
                  <td>
                    {editId === b.id ? (
                      <CheckControl
                        label="Active"
                        isSelected={editForm.active}
                        onChange={(active) =>
                          setEditForm((f) => ({ ...f, active }))
                        }
                      />
                    ) : b.active ? (
                      "Yes"
                    ) : (
                      "No"
                    )}
                  </td>
                  <td>
                    {editId === b.id ? (
                      <div className="lm-actions">
                        <Button
                          type="button"
                          variant="primary"
                          isDisabled={updateBranch.isPending}
                          onClick={() => updateBranch.mutate()}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditId(b.id);
                          setEditForm({ name: b.name, active: b.active });
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}
