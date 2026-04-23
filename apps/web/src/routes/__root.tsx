import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { TooltipProvider } from "@/components/ui/tooltip";

const RootLayout = () => (
    <TooltipProvider>
        <Outlet />
        <TanStackRouterDevtools position="bottom-right" />
    </TooltipProvider>
);

export interface RouterContext {
    queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: RootLayout,
});
