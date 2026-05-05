import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Pill,
  FileText,
  UserRound,
  Calendar,
  MapPin,
  Users,
  LogOut,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Medications", href: "/medications", icon: Pill },
  { name: "Medical Records", href: "/records", icon: FileText },
  { name: "Doctors", href: "/doctors", icon: UserRound },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Pharmacies", href: "/pharmacies", icon: MapPin },
  { name: "Family", href: "/family", icon: Users },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href} onClick={onClick}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6">
          <Link href="/dashboard">
            <div className="flex items-center gap-2 font-bold text-xl text-primary cursor-pointer">
              <Pill className="h-6 w-6" />
              My Health First
            </div>
          </Link>
        </div>
        <div className="flex-1 px-4 py-2 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate pr-2">
              <span className="text-sm font-medium truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.email}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Log out">
              <LogOut className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Link href="/dashboard">
            <div className="flex items-center gap-2 font-bold text-lg text-primary cursor-pointer">
              <Pill className="h-5 w-5" />
              My Health First
            </div>
          </Link>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 font-bold text-xl text-primary">
                  <Pill className="h-6 w-6" />
                  My Health First
                </div>
              </div>
              <div className="flex-1 px-4 py-6 overflow-y-auto">
                <NavLinks onClick={() => setMobileMenuOpen(false)} />
              </div>
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col truncate pr-2">
                    <span className="text-sm font-medium truncate">{user?.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={logout}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
