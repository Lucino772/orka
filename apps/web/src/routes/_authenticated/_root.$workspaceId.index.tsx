import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_root/$workspaceId/")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <section>
            <h1>Overview</h1>
            <p>
                Orka gives teams a self-hosted GPU platform with cloud-like workflows
                for serverless endpoints and long-running services.
            </p>
        </section>
    );
}
