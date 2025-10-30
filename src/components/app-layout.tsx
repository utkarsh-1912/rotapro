"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
  SidebarClose,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Settings, Moon, Sun, LogOut, ListTree, PanelLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { useAuthStore } from "@/lib/auth-store";
import { getAuth, signOut } from "firebase/auth";

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 10C17.37 10 12 15.37 12 22C12 28.63 17.37 34 24 34C30.63 34 36 28.63 36 22" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M24 34C30.63 34 36 28.63 36 22C36 15.37 30.63 10 24 10C17.37 10 12 15.37 12 22" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 8"/>
    <path d="M24 4V10" stroke="white" strokeWidth="4" strokeLinecap="round"/>
    <path d="M24 34V40" stroke="white" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

function ThemeToggle() {
    const { setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function AppHeaderContent() {
  const { state: sidebarState, isMobile } = useSidebar();

  if (isMobile) {
    return <SidebarTrigger className="md:hidden"/>;
  }

  if (sidebarState === "collapsed") {
    return (
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="flex items-center gap-2.5">
            <div className="bg-primary text-primary-foreground rounded-lg flex items-center justify-center h-8 w-8">
                <Logo />
            </div>
            <span className="text-lg font-semibold">RotaPro</span>
        </div>
      </div>
    );
  }

  return <div />;
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(getAuth());
    router.push("/");
  };
  
  if (!user) {
    return <>{children}</>;
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "AD";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
            <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden">
              <div className="bg-primary text-primary-foreground rounded-lg flex items-center justify-center h-8 w-8">
                  <Logo />
              </div>
              <div className="flex flex-col">
                  <span className="text-lg font-semibold">RotaPro</span>
              </div>
            </div>
             <div className="hidden group-data-[collapsible=icon]:flex">
               <SidebarTrigger />
            </div>
          <SidebarClose />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/dashboard"}
                tooltip="Dashboard"
              >
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/matrix")}
                tooltip="Rota Matrix"
              >
                <Link href="/matrix">
                  <ListTree />
                  <span className="group-data-[collapsible=icon]:hidden">Rota Matrix</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/admin")}
                tooltip="Config Panel"
              >
                <Link href="/admin">
                  <Settings />
                  <span className="group-data-[collapsible=icon]:hidden">Config Panel</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-sidebar-accent">
                <Avatar>
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium text-sidebar-foreground">{user.displayName || 'User'}</span>
                    <span className="text-xs text-sidebar-foreground/70">{user.email}</span>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem disabled>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background/50 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
            <AppHeaderContent />
            <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
