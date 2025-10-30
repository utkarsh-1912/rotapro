"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Shield, Settings, BotMessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Logo = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="28" height="28" rx="8" fill="currentColor" />
    <path
      d="M9.5 9.16667V18.8333H12.5C14.0458 18.8333 15.2917 18.0625 15.2917 16.5C15.2917 14.9375 14.0458 14.1667 12.5 14.1667H11.375V12.0833H13.25C14.7958 12.0833 16.0417 11.3125 16.0417 9.75C16.0417 8.1875 14.7958 7.41667 13.25 7.41667H9.5V9.16667ZM11.375 17.0833V15.9167H12.5C13.25 15.9167 13.7917 16.1875 13.7917 16.5C13.7917 16.8125 13.25 17.0833 12.5 17.0833H11.375ZM11.375 10.3333V9.16667H13.25C14 9.16667 14.5417 9.4375 14.5417 9.75C14.5417 10.0625 14 10.3333 13.25 10.3333H11.375Z"
      fill="white"
    />
    <path
      d="M17.125 12.0833L19.2083 9.16667H21.3125L18.5708 13.0208L21.5 18.8333H19.3333L17.125 14.9792L14.9167 18.8333H12.75L15.6792 13.0208L12.9375 9.16667H15.0417L17.125 12.0833Z"
      fill="white"
    />
  </svg>
);


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary text-primary-foreground rounded-lg p-1">
                <Logo />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-lg font-semibold">RotaPro</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/"}
                tooltip="Dashboard"
              >
                <Link href="/">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/admin")}
                tooltip="Admin Panel"
              >
                <Link href="/admin">
                  <Shield />
                  <span>Admin Panel</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border">
           <div className="flex items-center gap-2">
            <Avatar>
                <AvatarFallback>AD</AvatarFallback>
            </Avatar>
             <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium text-sidebar-foreground">Admin User</span>
                <span className="text-xs text-sidebar-foreground/70">admin@rotapro.com</span>
             </div>
           </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/50 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
            <SidebarTrigger />
            <div className="w-full flex-1">
                {/* Can add breadcrumbs or page title here */}
            </div>
            <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5"/>
                <span className="sr-only">Settings</span>
            </Button>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
