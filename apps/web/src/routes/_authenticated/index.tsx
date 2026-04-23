import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { ApiClientError } from "@/api/client";
import {
    slugifyWorkspaceName,
    workspaceNameSchema,
    workspacesApi,
} from "@/api/workspaces";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const workspaceNameSuggestions = [
    "Production",
    "Development",
    "Staging",
    "Sandbox",
] as const;

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
        <section className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f7f7f4_100%)] px-6 py-8 sm:px-8 sm:py-10">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center sm:min-h-[calc(100vh-5rem)]">
                <form
                    className="w-full max-w-xl"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <Card
                        className="bg-background/95 ring-border/80 shadow-[0_12px_32px_rgba(15,23,42,0.05)]"
                        size="sm"
                    >
                        <CardHeader className="gap-2 px-6 pt-2 sm:px-7">
                            <CardTitle className="text-foreground text-2xl font-semibold tracking-tight sm:text-[2rem]">
                                Create your first workspace
                            </CardTitle>
                            <CardDescription className="text-muted-foreground max-w-md text-sm leading-6">
                                Start by naming the workspace. You can rename it later.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="border-border/70 border-t px-6 py-1 pt-6 sm:px-7">
                            <FieldGroup className="gap-5">
                                <form.Field
                                    name="name"
                                    validators={{
                                        onBlur: ({ value }) => getNameError(value),
                                        onChange: ({ value }) => getNameError(value),
                                    }}
                                >
                                    {(field) => {
                                        const slug = slugifyWorkspaceName(
                                            field.state.value
                                        );
                                        const fieldError =
                                            field.state.meta.isTouched ||
                                            form.state.submissionAttempts > 0
                                                ? field.state.meta.errors[0]
                                                : undefined;

                                        return (
                                            <Field
                                                className="gap-2"
                                                data-invalid={
                                                    fieldError ? true : undefined
                                                }
                                            >
                                                <FieldLabel htmlFor={field.name}>
                                                    Workspace name
                                                </FieldLabel>

                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    value={field.state.value}
                                                    placeholder="Acme"
                                                    className="h-11 px-4 text-sm md:text-sm"
                                                    aria-invalid={
                                                        fieldError ? true : undefined
                                                    }
                                                    onBlur={field.handleBlur}
                                                    onChange={(event) => {
                                                        setSubmitError(null);
                                                        field.handleChange(
                                                            event.target.value
                                                        );
                                                    }}
                                                />

                                                <div className="space-y-2 pt-1 pb-2">
                                                    <FieldDescription className="text-xs">
                                                        Or choose from predefined
                                                        options
                                                    </FieldDescription>

                                                    <div className="flex flex-wrap gap-2">
                                                        {workspaceNameSuggestions.map(
                                                            (suggestion) => (
                                                                <Button
                                                                    key={suggestion}
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="xs"
                                                                    onClick={() => {
                                                                        setSubmitError(
                                                                            null
                                                                        );
                                                                        field.handleChange(
                                                                            suggestion
                                                                        );
                                                                    }}
                                                                >
                                                                    {suggestion}
                                                                </Button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                <FieldDescription className="text-xs">
                                                    Slug{" "}
                                                    <span className="text-muted-foreground/70 px-1">
                                                        ·
                                                    </span>
                                                    <span className="text-foreground/75">
                                                        {slug || "acme"}
                                                    </span>
                                                </FieldDescription>

                                                <FieldError>
                                                    {fieldError
                                                        ? String(fieldError)
                                                        : null}
                                                </FieldError>
                                            </Field>
                                        );
                                    }}
                                </form.Field>
                            </FieldGroup>

                            {submitError ? (
                                <div className="border-destructive/20 bg-destructive/8 text-destructive mt-5 rounded-md border px-4 py-3 text-sm">
                                    {submitError}
                                </div>
                            ) : null}
                        </CardContent>

                        <CardFooter className="border-border/70 justify-between gap-3 border-t px-6 pb-2 sm:px-7">
                            <p className="text-muted-foreground text-xs leading-5">
                                {`You'll enter the workspace immediately after creation.`}
                            </p>

                            <form.Subscribe
                                selector={(state) => [
                                    state.values.name.trim().length > 0,
                                    state.canSubmit,
                                    state.isSubmitting,
                                ]}
                            >
                                {([hasName, canSubmit, isSubmitting]) => (
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="h-11 px-5"
                                        disabled={
                                            !hasName || !canSubmit || isSubmitting
                                        }
                                    >
                                        {isSubmitting
                                            ? "Creating workspace..."
                                            : "Create workspace"}
                                    </Button>
                                )}
                            </form.Subscribe>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </section>
    );
}
