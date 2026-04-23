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
import { workspacesApi, type Workspace } from "@/api/workspaces";
import { ApiClientError } from "@/api/client";

export const Route = createFileRoute("/_authenticated/_root/$workspaceId")({
    async loader({ context, params }) {
        try {
            await Promise.all([
                context.queryClient.ensureQueryData(
                    workspacesApi.detail.getFetchOptions(params.workspaceId)
                ),
                context.queryClient.ensureQueryData(
                    workspacesApi.list.getFetchOptions()
                ),
            ]);
        } catch (error) {
            if (error instanceof ApiClientError && error.status === 404) {
                throw notFound();
            }

            throw error;
        }
    },
    component: RouteComponent,
});

function getWorkspaceInitials(name: Workspace["name"]) {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");

    return initials || "WS";
}

function RouteComponent() {
    const navigate = useNavigate();
    const { workspaceId } = Route.useParams();
    const { data: selectedWorkspace } = workspacesApi.detail.useSuspenseQuery({
        variables: workspaceId,
    });
    const { data: workspaces } = workspacesApi.list.useSuspenseQuery();
    const pathname = useRouterState({
        select: (state) => state.location.pathname,
    });
    const activeWorkspace = workspaceId;

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
                                        <WorkspaceAvatar
                                            workspace={selectedWorkspace}
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
                                                <WorkspaceAvatar
                                                    workspace={workspace}
                                                    className="size-5 rounded-md text-[0.625rem]"
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

function WorkspaceAvatar({
    workspace,
    className,
}: {
    workspace: Workspace;
    className?: string;
}) {
    return (
        <div
            className={`bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md font-semibold ${className ?? ""}`}
            aria-hidden="true"
        >
            {getWorkspaceInitials(workspace.name)}
        </div>
    );
}
