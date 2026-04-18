import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_root/$workspaceId/services")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <section>
            <h1>Services</h1>
            <p>Manage long-running workloads running on your own GPU infrastructure.</p>
        </section>
    );
}
