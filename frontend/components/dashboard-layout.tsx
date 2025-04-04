import { MainNav } from "@/components/main-nav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background px-4 sm:px-6">
        <div className="container mx-auto flex h-16 items-center">
          <MainNav />
        </div>
      </header>
      <main className="flex-1 px-4 sm:px-6">
        <div className="container mx-auto py-6">
          {children}
        </div>
      </main>
      <footer className="border-t py-6 px-4 sm:px-6">
        <div className="container mx-auto flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} TimeTracker. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}