import { useState } from "react";

import type { NodeDetail } from "@/api/nodes";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function NodeSettingsPanel({
    node,
    generatedToken,
    isGeneratingToken,
    onDismissToken,
    onGenerateToken,
}: {
    node: NodeDetail;
    generatedToken: string | null;
    isGeneratingToken: boolean;
    onDismissToken: () => void;
    onGenerateToken: () => Promise<void>;
}) {
    const buttonLabel = node.has_secret ? "Regenerate token" : "Generate token";
    const statusText = node.has_secret
        ? "A bootstrap token already exists for this node."
        : "No bootstrap token has been generated yet.";
    const [copied, setCopied] = useState(false);

    return (
        <>
            <div className="border-y">
                <section>
                    <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
                        <div className="max-w-3xl space-y-1">
                            <h2 className="text-foreground text-sm font-semibold">
                                Bootstrap token
                            </h2>
                            <p className="text-muted-foreground text-sm leading-6">
                                {statusText} Regenerating replaces the previous secret
                                and invalidates older tokens.
                            </p>
                        </div>

                        <Button
                            type="button"
                            className="shrink-0"
                            onClick={() => {
                                setCopied(false);
                                void onGenerateToken();
                            }}
                            disabled={isGeneratingToken}
                        >
                            {isGeneratingToken ? `${buttonLabel}...` : buttonLabel}
                        </Button>
                    </div>
                </section>
            </div>

            <Dialog
                open={generatedToken !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setCopied(false);
                        onDismissToken();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="pr-10">
                        <DialogTitle>Bootstrap token</DialogTitle>
                        <DialogDescription>
                            Copy this token now. It is shown only immediately after
                            generation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="overflow-hidden rounded-lg bg-slate-50/80 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">
                        <pre className="text-foreground px-4 py-4 text-sm break-all whitespace-pre-wrap">
                            {generatedToken ?? ""}
                        </pre>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                                if (!generatedToken) {
                                    return;
                                }
                                await navigator.clipboard.writeText(generatedToken);
                                setCopied(true);
                            }}
                        >
                            {copied ? "Copied" : "Copy token"}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setCopied(false);
                                onDismissToken();
                            }}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
