import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_root/$workspaceId/builders")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <section>
            <h1>Builders</h1>
            <p>Define how services and endpoints are assembled before deployment.</p>
        </section>
    );
}
