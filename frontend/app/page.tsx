import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link";
import { Clock, BarChart3, User } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-4 sm:px-6">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Clock className="h-5 w-5" />
            <span>TimeTracker</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 sm:px-6">
        <section className="py-20">
          <div className="container mx-auto">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Track Your Time, Maximize Your Earnings
                </h1>
                <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  A simple, efficient way to track your work hours and calculate your earnings.
                  Perfect for freelancers and professionals who bill by the hour.
                </p>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/register">
                    <Button size="lg" className="w-full min-[400px]:w-auto">
                      Get Started
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="w-full min-[400px]:w-auto">
                      Login
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex flex-col items-center gap-2 rounded-lg border p-6">
                    <Clock className="h-12 w-12 text-gray-500" />
                    <h3 className="text-xl font-bold">Time Tracking</h3>
                    <p className="text-center text-gray-500">
                      Log your hours easily and keep track of your work time
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-lg border p-6">
                    <BarChart3 className="h-12 w-12 text-gray-500" />
                    <h3 className="text-xl font-bold">Metrics</h3>
                    <p className="text-center text-gray-500">
                      View daily, weekly, and monthly statistics of your work
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-lg border p-6">
                    <User className="h-12 w-12 text-gray-500" />
                    <h3 className="text-xl font-bold">Profile</h3>
                    <p className="text-center text-gray-500">
                      Set your hourly rate and manage your account details
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
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