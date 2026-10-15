import { createFileRoute, redirect, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/hackathon" });
  },
  component: () => <Navigate to="/hackathon" replace />,
});
