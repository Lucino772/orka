import {
    Link,
    Outlet,
    createFileRoute,
    notFound,
    useNavigate,
    useRouterState,
} from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ApiIcon,
    Building03Icon,
    ChevronDoubleCloseIcon,
    CloudServerIcon,
    Home01Icon,
    LayoutGridIcon,
    PlusSignIcon,
    ServerStack01Icon,
    Settings01Icon,
} from "@hugeicons/core-free-icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";

const workspaces = [
    {
        id: "acme-inc",
        name: "Acme Inc",
        image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='16' fill='%233b82f6'/><text x='50%25' y='54%25' text-anchor='middle' font-family='Arial' font-size='24' fill='white'>AI</text></svg>",
    },
    {
        id: "acme-corp",
        name: "Acme Corp.",
        image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='16' fill='%2314b8a6'/><text x='50%25' y='54%25' text-anchor='middle' font-family='Arial' font-size='24' fill='white'>AC</text></svg>",
    },
    {
        id: "evil-corp",
        name: "Evil Corp.",
        image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='16' fill='%23f97316'/><text x='50%25' y='54%25' text-anchor='middle' font-family='Arial' font-size='24' fill='white'>EC</text></svg>",
    },
] as const;

export const Route = createFileRoute("/_authenticated/_root/$workspaceId")({
    beforeLoad: ({ params }) => {
        if (!workspaces.some((workspace) => workspace.id === params.workspaceId)) {
            throw notFound();
        }
    },
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();
    const { workspaceId } = Route.useParams();
    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    });
    const activeWorkspace = workspaceId;
    const selectedWorkspace =
        workspaces.find((workspace) => workspace.id === activeWorkspace) ??
        workspaces[0];

    return (
        <SidebarProvider>
            <Sidebar variant="sidebar" collapsible="icon">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                    >
                                        <img
                                            src={selectedWorkspace.image}
                                            alt={`${selectedWorkspace.name} logo`}
                                            className="size-8 rounded-md object-cover"
                                        />

                                        <span className="grid flex-1 text-left leading-tight">
                                            <span>{selectedWorkspace.name}</span>
                                        </span>

                                        <HugeiconsIcon
                                            icon={ChevronDoubleCloseIcon}
                                            strokeWidth={2}
                                            className="rotate-90"
                                        />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                    className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                                    align="start"
                                    side="right"
                                    sideOffset={4}
                                >
                                    <DropdownMenuLabel>Workspaces</DropdownMenuLabel>

                                    <DropdownMenuRadioGroup
                                        value={activeWorkspace}
                                        onValueChange={(nextWorkspaceId) => {
                                            navigate({
                                                to: ".",
                                                params: {
                                                    workspaceId: nextWorkspaceId,
                                                },
                                            });
                                        }}
                                    >
                                        {workspaces.map((workspace) => (
                                            <DropdownMenuRadioItem
                                                key={workspace.id}
                                                value={workspace.id}
                                            >
                                                <img
                                                    src={workspace.image}
                                                    alt={`${workspace.name} logo`}
                                                    className="size-5 rounded-md object-cover"
                                                />
                                                <span>{workspace.name}</span>
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem>
                                        <HugeiconsIcon
                                            icon={PlusSignIcon}
                                            strokeWidth={2}
                                        />
                                        <span>Add workspace</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Platform</SidebarGroupLabel>

                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === `/${workspaceId}`}
                                    >
                                        <Link
                                            to="/$workspaceId"
                                            params={{ workspaceId }}
                                        >
                                            <HugeiconsIcon
                                                icon={Home01Icon}
                                                strokeWidth={2}
                                            />
                                            <span>Overview</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={
                                            pathname === `/${workspaceId}/services`
                                        }
                                    >
                                        <Link
                                            to="/$workspaceId/services"
                                            params={{ workspaceId }}
                                        >
                                            <HugeiconsIcon
                                                icon={CloudServerIcon}
                                                strokeWidth={2}
                                            />
                                            <span>Services</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={
                                            pathname === `/${workspaceId}/endpoints`
                                        }
                                    >
                                        <Link
                                            to="/$workspaceId/endpoints"
                                            params={{ workspaceId }}
                                        >
                                            <HugeiconsIcon
                                                icon={ApiIcon}
                                                strokeWidth={2}
                                            />
                                            <span>Endpoints</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === `/${workspaceId}/nodes`}
                                    >
                                        <Link
                                            to="/$workspaceId/nodes"
                                            params={{ workspaceId }}
                                        >
                                            <HugeiconsIcon
                                                icon={ServerStack01Icon}
                                                strokeWidth={2}
                                            />
                                            <span>Nodes</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarGroupLabel>Build</SidebarGroupLabel>

                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={
                                            pathname === `/${workspaceId}/templates`
                                        }
                                    >
                                        <Link
                                            to="/$workspaceId/templates"
                                            params={{ workspaceId }}
                                        >
                                            <HugeiconsIcon
                                                icon={LayoutGridIcon}
                                                strokeWidth={2}
                                            />
                                            <span>Templates</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={
                                            pathname === `/${workspaceId}/builders`
                                        }
                                    >
                                        <Link
                                            to="/$workspaceId/builders"
                                            params={{ workspaceId }}
                                        >
                                            <HugeiconsIcon
                                                icon={Building03Icon}
                                                strokeWidth={2}
                                            />
                                            <span>Builders</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarGroupLabel>Configuration</SidebarGroupLabel>

                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={
                                            pathname === `/${workspaceId}/settings`
                                        }
                                    >
                                        <Link
                                            to="/$workspaceId/settings"
                                            params={{ workspaceId }}
                                        >
                                            <HugeiconsIcon
                                                icon={Settings01Icon}
                                                strokeWidth={2}
                                            />
                                            <span>Settings</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>

            <SidebarInset>
                <main>
                    <SidebarTrigger />
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
