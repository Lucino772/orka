import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { TooltipProvider } from "@/components/ui/tooltip";

const RootLayout = () => (
    <TooltipProvider>
        <Outlet />
        <TanStackRouterDevtools position="bottom-right" />
    </TooltipProvider>
);

export const Route = createRootRoute({ component: RootLayout });
