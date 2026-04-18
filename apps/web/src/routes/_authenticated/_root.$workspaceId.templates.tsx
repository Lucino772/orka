import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_root/$workspaceId/templates")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <section>
            <h1>Templates</h1>
            <p>Prepare reusable runtime templates for your teams and workloads.</p>
        </section>
    );
}
