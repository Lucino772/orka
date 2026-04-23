import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import {
    slugifyWorkspaceName,
    workspacesApi,
    workspaceNameSchema,
} from "@/api/workspaces";
import { ApiClientError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/")({
    async loader({ context }) {
        const workspaces = await context.queryClient.ensureQueryData(
            workspacesApi.list.getFetchOptions()
        );
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

function getNameError(value: string) {
    const result = workspaceNameSchema.safeParse(value);

    if (!result.success) {
        return result.error.issues[0]?.message ?? "Invalid workspace name.";
    }

    return undefined;
}

function RouteComponent() {
    const navigate = Route.useNavigate();
    const queryClient = useQueryClient();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const createWorkspaceMutation = workspacesApi.create.useMutation({
        async onSuccess(workspace) {
            await queryClient.invalidateQueries({
                queryKey: workspacesApi.getKey(),
            });

            await navigate({
                to: "/$workspaceId",
                params: {
                    workspaceId: workspace.id,
                },
            });
        },
        async onError(error) {
            setSubmitError(
                error instanceof ApiClientError
                    ? (error.details ?? error.title)
                    : "Unable to complete the workspace request."
            );
        },
    });
    const form = useForm({
        defaultValues: {
            name: "",
        },
        validators: {
            onSubmit: z.object({
                name: workspaceNameSchema,
            }),
        },
        async onSubmit({ value }) {
            setSubmitError(null);
            await createWorkspaceMutation.mutateAsync({
                name: value.name,
                slug: slugifyWorkspaceName(value.name),
            });
        },
    });

    return (
        <section className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,1))] px-6 py-16">
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div className="space-y-5">
                    <div className="inline-flex rounded-full border border-border bg-background/80 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur">
                        Workspace Setup
                    </div>

                    <div className="space-y-3">
                        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                            Create the first workspace for your platform.
                        </h1>
                        <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                            Start with a name your team recognizes. We&apos;ll use it to
                            create the first workspace and route you straight into the
                            dashboard.
                        </p>
                    </div>
                </div>

                <div className="rounded-3xl border border-border/70 bg-background/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
                    <form
                        className="space-y-6"
                        onSubmit={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void form.handleSubmit();
                        }}
                    >
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold text-foreground">
                                Name your workspace
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                This can be changed later if needed.
                            </p>
                        </div>

                        <form.Field
                            name="name"
                            validators={{
                                onBlur: ({ value }) => getNameError(value),
                                onChange: ({ value }) => getNameError(value),
                            }}
                        >
                            {(field) => {
                                const slug = slugifyWorkspaceName(field.state.value);
                                const fieldError =
                                    field.state.meta.isTouched ||
                                    form.state.submissionAttempts > 0
                                        ? field.state.meta.errors[0]
                                        : undefined;

                                return (
                                    <div className="space-y-3">
                                        <label
                                            htmlFor={field.name}
                                            className="block text-sm font-medium text-foreground"
                                        >
                                            Workspace name
                                        </label>

                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            placeholder="Acme"
                                            aria-invalid={fieldError ? true : undefined}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => {
                                                setSubmitError(null);
                                                field.handleChange(event.target.value);
                                            }}
                                        />

                                        <div className="rounded-2xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                            URL slug preview:{" "}
                                            <span className="font-medium text-foreground">
                                                {slug}
                                            </span>
                                        </div>

                                        {fieldError ? (
                                            <p className="text-sm text-destructive">
                                                {String(fieldError)}
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            }}
                        </form.Field>

                        {submitError ? (
                            <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                                {submitError}
                            </div>
                        ) : null}

                        <form.Subscribe
                            selector={(state) => [state.canSubmit, state.isSubmitting]}
                        >
                            {([canSubmit, isSubmitting]) => (
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full"
                                    disabled={!canSubmit || isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Creating workspace..."
                                        : "Create workspace"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </form>
                </div>
            </div>
        </section>
    );
}
