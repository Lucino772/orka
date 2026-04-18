import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_root/$workspaceId/endpoints")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <section>
            <h1>Endpoints</h1>
            <p>Expose serverless GPU workloads with cloud-like simplicity on-prem.</p>
        </section>
    );
}
