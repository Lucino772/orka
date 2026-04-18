import { createFileRoute, redirect } from "@tanstack/react-router";

const workspaces = [
    {
        id: "acme-inc",
        name: "Acme Inc",
    },
    {
        id: "acme-corp",
        name: "Acme Corp.",
    },
    {
        id: "evil-corp",
        name: "Evil Corp.",
    },
] as const;

export const Route = createFileRoute("/_authenticated/")({
    beforeLoad() {
        const defaultWorkspace = workspaces[0];

        if (defaultWorkspace) {
            throw redirect({
                to: "/$workspaceId",
                params: {
                    workspaceId: defaultWorkspace.id,
                },
            });
        }
    },
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <section>
            <h1>Create your first workspace</h1>
            <p>
                Start by onboarding a workspace to unlock services, endpoints, nodes,
                templates, builders, and settings.
            </p>
        </section>
    );
}
