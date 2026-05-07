import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import type { WorkspaceNode } from "@/features/nodes/types";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

const addNodeSchema = z.object({
    name: z.string().trim().min(1, "Node name is required."),
    labels: z.string(),
});

type AddNodeFormValues = z.infer<typeof addNodeSchema>;

const defaultValues: AddNodeFormValues = {
    name: "",
    labels: "",
};

function getFieldError<K extends keyof AddNodeFormValues>(
    schemaKey: K,
    value: AddNodeFormValues[K]
) {
    const result = addNodeSchema.shape[schemaKey].safeParse(value);

    if (!result.success) {
        return result.error.issues[0]?.message ?? "Invalid value.";
    }

    return undefined;
}

function parseLabels(labels: string) {
    return labels
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

export function AddNodeSheet({
    open,
    onOpenChange,
    onCreateNode,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreateNode: (node: WorkspaceNode) => void;
}) {
    const form = useForm({
        defaultValues,
        validators: {
            onSubmit: addNodeSchema,
        },
        onSubmit({ value }) {
            onCreateNode({
                id: crypto.randomUUID(),
                name: value.name.trim(),
                pool: "unassigned",
                region: "unassigned",
                provider: "Bare Metal",
                gpuModel: "Not assigned",
                gpuCount: 0,
                cpuCores: 0,
                memoryGb: 0,
                status: "offline",
                utilizationPct: 0,
                lastHeartbeat: "Never",
                labels: parseLabels(value.labels),
            });

            form.reset();
            onOpenChange(false);
        },
    });

    return (
        <Sheet
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    form.reset();
                }

                onOpenChange(nextOpen);
            }}
        >
            <SheetContent
                side="right"
                className="border-border/70 bg-background w-full border-l sm:max-w-xl"
            >
                <SheetHeader className="border-border/70 bg-background gap-2 border-b pr-14">
                    <SheetTitle className="text-xl font-semibold tracking-tight">
                        Add node
                    </SheetTitle>
                    <SheetDescription className="max-w-md text-sm leading-6">
                        Add a node name and optional labels.
                    </SheetDescription>
                </SheetHeader>

                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                        <FieldGroup className="gap-5">
                            <form.Field
                                name="name"
                                validators={{
                                    onBlur: ({ value }) => getFieldError("name", value),
                                }}
                            >
                                {(field) => {
                                    const fieldError =
                                        field.state.meta.isTouched ||
                                        form.state.submissionAttempts > 0
                                            ? field.state.meta.errors[0]
                                            : undefined;

                                    return (
                                        <Field
                                            className="gap-2"
                                            data-invalid={fieldError ? true : undefined}
                                        >
                                            <FieldLabel htmlFor={field.name}>
                                                Node name
                                            </FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                placeholder="Atlas Ridge 10"
                                                className="h-11 px-4 text-sm md:text-sm"
                                                aria-invalid={
                                                    fieldError ? true : undefined
                                                }
                                                onBlur={field.handleBlur}
                                                onChange={(event) =>
                                                    field.handleChange(
                                                        event.target.value
                                                    )
                                                }
                                            />
                                            <FieldError>
                                                {fieldError ? String(fieldError) : null}
                                            </FieldError>
                                        </Field>
                                    );
                                }}
                            </form.Field>

                            <form.Field
                                name="labels"
                                validators={{
                                    onBlur: ({ value }) =>
                                        getFieldError("labels", value),
                                }}
                            >
                                {(field) => {
                                    const fieldError =
                                        field.state.meta.isTouched ||
                                        form.state.submissionAttempts > 0
                                            ? field.state.meta.errors[0]
                                            : undefined;

                                    return (
                                        <Field
                                            className="gap-2"
                                            data-invalid={fieldError ? true : undefined}
                                        >
                                            <FieldLabel htmlFor={field.name}>
                                                Labels
                                            </FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                placeholder="priority, research, canary"
                                                className="h-11 px-4 text-sm md:text-sm"
                                                aria-invalid={
                                                    fieldError ? true : undefined
                                                }
                                                onBlur={field.handleBlur}
                                                onChange={(event) =>
                                                    field.handleChange(
                                                        event.target.value
                                                    )
                                                }
                                            />
                                            <FieldDescription className="text-xs">
                                                Separate labels with commas. Empty
                                                values are ignored.
                                            </FieldDescription>
                                            <FieldError>
                                                {fieldError ? String(fieldError) : null}
                                            </FieldError>
                                        </Field>
                                    );
                                }}
                            </form.Field>
                        </FieldGroup>
                    </div>

                    <SheetFooter className="border-border/70 bg-background/95 border-t sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>

                            <form.Subscribe
                                selector={(state) => [
                                    state.canSubmit,
                                    state.isSubmitting,
                                ]}
                            >
                                {([canSubmit, isSubmitting]) => (
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={!canSubmit || isSubmitting}
                                    >
                                        {isSubmitting ? "Adding node..." : "Add node"}
                                    </Button>
                                )}
                            </form.Subscribe>
                        </div>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
