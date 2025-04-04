"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Clock, LayoutDashboard, ListTodo, Settings, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="mr-4 flex">
      <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
        <Clock className="h-6 w-6" />
        <span className="font-bold">TimeTracker</span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        <Link
          href="/dashboard"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/dashboard" ? "text-foreground" : "text-foreground/60"
          )}
        >
          <div className="flex items-center gap-1">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </div>
        </Link>
        <Link
          href="/tasks"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname?.startsWith("/tasks") ? "text-foreground" : "text-foreground/60"
          )}
        >
          <div className="flex items-center gap-1">
            <ListTodo className="h-4 w-4" />
            <span>Tasks</span>
          </div>
        </Link>
        <Link
          href="/profile"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname?.startsWith("/profile") ? "text-foreground" : "text-foreground/60"
          )}
        >
          <div className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>Profile</span>
          </div>
        </Link>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-foreground/60 hover:text-foreground/80">
          <div className="flex items-center gap-1">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </div>
        </Button>
      </nav>
    </div>
  );
}