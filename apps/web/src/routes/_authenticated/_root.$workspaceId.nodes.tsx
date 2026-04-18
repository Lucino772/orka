import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_root/$workspaceId/nodes")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <section>
            <h1>Nodes</h1>
            <p>Track connected capacity across your nodes and compute pools.</p>
        </section>
    );
}
