"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Clock, LayoutDashboard, ListTodo, Target, Settings, LogOut, Menu, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/login")
  }

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMenuOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    document.addEventListener("keydown", onEscape)
    return () => {
      document.removeEventListener("mousedown", onClickOutside)
      document.removeEventListener("keydown", onEscape)
    }
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: pathname === "/dashboard",
    },
    {
      href: "/tasks",
      label: "Tasks",
      icon: <ListTodo className="h-4 w-4" />,
      active: pathname?.startsWith("/tasks"),
    },
    {
      href: "/goals",
      label: "Goals",
      icon: <Target className="h-4 w-4" />,
      active: pathname?.startsWith("/goals"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <Settings className="h-4 w-4" />,
      active: pathname?.startsWith("/profile"),
    },
  ]

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center">
        <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
          <Clock className="h-6 w-6" />
          <span className="font-bold">TimeTracker</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                item.active ? "text-foreground" : "text-foreground/60"
              )}
            >
              <div className="flex items-center gap-1">
                {item.icon}
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="hidden md:flex text-foreground/60 hover:text-foreground/80 items-center gap-1"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>

        <ThemeToggle />

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>

      {/* Mobile backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile panel */}
      <div
        ref={menuRef}
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-[240px] bg-background shadow-lg border-l border-border p-6 transition-transform duration-200 ease-in-out md:hidden",
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <Link href="/dashboard" className="flex items-center space-x-2" onClick={() => setIsMenuOpen(false)}>
              <Clock className="h-6 w-6" />
              <span className="font-bold">TimeTracker</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex flex-col space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
                  item.active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            <Button
              variant="ghost"
              className="flex items-center justify-start gap-2 px-2 py-1.5 h-auto font-normal"
              onClick={() => {
                setIsMenuOpen(false)
                handleLogout()
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </nav>
        </div>
      </div>
    </div>
  )
}
