import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_root/$workspaceId/settings")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <section>
            <h1>Settings</h1>
            <p>Configure platform defaults, tenancy, and operational preferences.</p>
        </section>
    );
}
