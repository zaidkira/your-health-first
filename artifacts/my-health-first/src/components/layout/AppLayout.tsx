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
  UsersRound,
  Activity,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const BASE_NAV_ITEMS = [
  { name: "Dashboard",       href: "/dashboard",    icon: LayoutDashboard },
  { name: "Medications",     href: "/medications",  icon: Pill            },
  { name: "Medical Records", href: "/records",      icon: FileText        },
  { name: "Conditions",      href: "/conditions",   icon: Activity        },
  { name: "Doctors",         href: "/doctors",      icon: UserRound       },
  { name: "Appointments",    href: "/appointments", icon: Calendar        },
  { name: "Pharmacies",      href: "/pharmacies",   icon: MapPin          },
  { name: "Family",          href: "/family",       icon: UsersRound      },
];

const ADMIN_NAV_ITEM = { name: "All Users", href: "/admin/users", icon: ShieldCheck };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  let navItems = BASE_NAV_ITEMS;
  
  if (user?.role === "doctor" || user?.role === "pharmacy") {
    navItems = BASE_NAV_ITEMS.filter(item => 
      ["Dashboard", "Doctors", "Pharmacies", "Medical Records"].includes(item.name)
    );
  }

  if (user?.role === "admin") {
    navItems = [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM];
  }

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

  const UserFooter = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex items-center gap-2">
      <Link href="/profile" onClick={onClick} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors cursor-pointer min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate leading-tight">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate leading-tight capitalize">
              {user?.role ?? "patient"}
            </span>
          </div>
          <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
        </div>
      </Link>
      <Button variant="ghost" size="icon" onClick={logout} title="Log out" className="shrink-0">
        <LogOut className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
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
          <UserFooter />
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
                <UserFooter onClick={() => setMobileMenuOpen(false)} />
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
