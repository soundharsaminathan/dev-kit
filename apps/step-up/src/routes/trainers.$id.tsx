import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/trainers/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/users/$id",
      params: { id: params.id },
    });
  },
});
