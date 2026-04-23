import ky, { isHTTPError } from "ky";
import { z } from "zod";

export const apiProblemSchema = z
    .object({
        type: z.string(),
        title: z.string(),
        status: z.number(),
        instance: z.string(),
        details: z.string().optional(),
    })
    .catchall(z.unknown());

export class ApiClientError extends Error {
    status: number;
    title: string;
    details?: string;
    type?: string;
    instance?: string;
    extras: Record<string, unknown>;

    constructor({
        status,
        title,
        details,
        type,
        instance,
        extras,
        cause,
    }: {
        status: number;
        title: string;
        details?: string;
        type?: string;
        instance?: string;
        extras?: Record<string, unknown>;
        cause?: unknown;
    }) {
        super(details ?? title, { cause });
        this.name = "ApiClientError";
        this.status = status;
        this.title = title;
        this.details = details;
        this.type = type;
        this.instance = instance;
        this.extras = extras ?? {};

        Object.assign(this, this.extras);
    }
}

export const api = ky.create({
    headers: {
        Accept: "application/json",
    },
    hooks: {
        beforeError: [
            ({ error }) => {
                if (!isHTTPError(error)) {
                    return error;
                }

                const problem = apiProblemSchema.safeParse(error.data);
                if (problem.success) {
                    const { status, title, details, type, instance, ...extras } =
                        problem.data;

                    return new ApiClientError({
                        status,
                        title,
                        details,
                        type,
                        instance,
                        extras,
                        cause: error,
                    });
                }

                return new ApiClientError({
                    status: error.response.status,
                    title: "Request failed.",
                    cause: error,
                });
            },
        ],
    },
});
