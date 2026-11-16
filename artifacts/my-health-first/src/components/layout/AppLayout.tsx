import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Pill,
  FileText,
  UserRound,
  Calendar,
  MapPin,
  UsersRound,
  Activity,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { format } from "date-fns";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const CARE_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Medications", href: "/medications", icon: Pill },
  { name: "Health Bracelet", href: "/dashboard/bracelet", icon: Activity, badge: "IoT" },
  { name: "Conditions", href: "/conditions", icon: HeartPulse },
];

const NETWORK_NAV: NavItem[] = [
  { name: "Doctors", href: "/doctors", icon: UserRound },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Pharmacies", href: "/pharmacies", icon: MapPin },
  { name: "Medical Records", href: "/records", icon: FileText },
];

const CIRCLE_NAV: NavItem[] = [
  { name: "Family Members", href: "/family", icon: UsersRound },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/medications": "Medications",
  "/dashboard/bracelet": "Health Bracelet",
  "/appointments": "Appointments",
  "/records": "Medical Records",
  "/doctors": "Find Doctors",
  "/pharmacies": "Pharmacies",
  "/family": "Family Circle",
  "/conditions": "Health Conditions",
  "/profile": "My Profile",
  "/pharmacy/stock": "Stock Management",
  "/admin/users": "User Directory",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter based on role
  let careItems = CARE_NAV;
  let networkItems = NETWORK_NAV;
  let circleItems = CIRCLE_NAV;
  let adminItems: NavItem[] = [];

  if (user?.role === "doctor") {
    careItems = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Health Bracelet", href: "/dashboard/bracelet", icon: Activity, badge: "Live" },
    ];
    networkItems = [
      { name: "Patients & Doctors", href: "/doctors", icon: UserRound },
      { name: "Medical Records", href: "/records", icon: FileText },
      { name: "Pharmacies", href: "/pharmacies", icon: MapPin },
    ];
    circleItems = [];
  } else if (user?.role === "pharmacy") {
    careItems = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Stock Management", href: "/pharmacy/stock", icon: Pill, badge: "Store" },
    ];
    networkItems = [
      { name: "Pharmacies Network", href: "/pharmacies", icon: MapPin },
      { name: "Doctors Directory", href: "/doctors", icon: UserRound },
    ];
    circleItems = [];
  }

  if (user?.role === "admin") {
    adminItems = [{ name: "User Directory", href: "/admin/users", icon: ShieldCheck, badge: "Admin" }];
  }

  // Mobile bottom bar tabs tailored for role ergonomics
  let bottomNav: { name: string; href: string; icon: any; label: string }[] = [];

  if (user?.role === "doctor") {
    bottomNav = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Home" },
      { name: "Patients", href: "/doctors", icon: UserRound, label: "Patients" },
      { name: "Records", href: "/records", icon: FileText, label: "Records" },
      { name: "Bracelet", href: "/dashboard/bracelet", icon: Activity, label: "Vitals" },
      { name: "Profile", href: "/profile", icon: Settings, label: "Profile" },
    ];
  } else if (user?.role === "pharmacy") {
    bottomNav = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Home" },
      { name: "Stock", href: "/pharmacy/stock", icon: Pill, label: "Stock" },
      { name: "Pharmacies", href: "/pharmacies", icon: MapPin, label: "Network" },
      { name: "Doctors", href: "/doctors", icon: UserRound, label: "Doctors" },
      { name: "Profile", href: "/profile", icon: Settings, label: "Profile" },
    ];
  } else if (user?.role === "admin") {
    bottomNav = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Home" },
      { name: "Users", href: "/admin/users", icon: ShieldCheck, label: "Users" },
      { name: "Doctors", href: "/doctors", icon: UserRound, label: "Doctors" },
      { name: "Pharmacies", href: "/pharmacies", icon: MapPin, label: "Pharmacies" },
      { name: "Profile", href: "/profile", icon: Settings, label: "Profile" },
    ];
  } else {
    // Default patient navigation
    bottomNav = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Home" },
      { name: "Medications", href: "/medications", icon: Pill, label: "Meds" },
      { name: "Bracelet", href: "/dashboard/bracelet", icon: Activity, label: "Vitals" },
      { name: "Appointments", href: "/appointments", icon: Calendar, label: "Visits" },
      { name: "Profile", href: "/profile", icon: Settings, label: "Profile" },
    ];
  }

  const pageTitle = PAGE_TITLES[location] || "Healthcare";

  const renderSection = (title: string, items: NavItem[], onLinkClick?: () => void) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase select-none">
          {title}
        </div>
        <div className="space-y-1">
          {items.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href} onClick={onLinkClick}>
                <div
                  className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer text-sm font-medium select-none ${
                    isActive
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_4px_16px_rgba(14,165,233,0.38)] border border-white/25"
                      : "text-foreground/80 hover:bg-white/60 dark:hover:bg-white/5 hover:text-foreground active:scale-[0.98]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4.5 w-4.5 transition-transform duration-150 ${
                        isActive ? "text-white" : "text-muted-foreground group-hover:text-primary"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const UserFooter = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex items-center gap-2 pt-2">
      <Link href="/profile" onClick={onClick} className="flex-1 min-w-0">
        <div className="flex items-center gap-3 rounded-2xl p-2 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 transition-all cursor-pointer min-w-0 shadow-2xs">
          <div className="relative shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || "User"}
                className="h-9 w-9 rounded-xl object-cover border border-white/60 dark:border-white/10 shadow-[0_2px_8px_rgba(14,165,233,0.25)]"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shrink-0 text-sm font-bold shadow-[0_2px_8px_rgba(14,165,233,0.3)]">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate leading-tight text-foreground">{user?.name}</span>
            <span className="text-[10px] text-muted-foreground truncate leading-tight capitalize mt-0.5">
              {user?.role ?? "Patient"} • {user?.wilaya || "Algiers"}
            </span>
          </div>
          <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto opacity-70 group-hover:opacity-100" />
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={logout}
        title="Log out"
        className="shrink-0 h-9 w-9 rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-600"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="relative flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* iOS Liquid Glass Ambient Background Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-sky-400/25 to-blue-500/10 dark:from-sky-500/15 dark:to-transparent blur-[110px] animate-drift-slow" />
        <div className="absolute top-1/4 -right-32 w-[32rem] h-[32rem] rounded-full bg-gradient-to-bl from-emerald-400/20 to-teal-500/10 dark:from-emerald-500/10 dark:to-transparent blur-[120px] animate-drift-reverse" />
        <div className="absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-indigo-400/20 to-sky-400/10 dark:from-indigo-500/10 dark:to-transparent blur-[130px] animate-drift-slow" />
      </div>

      {/* Desktop Floating Liquid Glass Sidebar */}
      <aside className="relative z-10 hidden md:flex my-3 ml-3 w-64 flex-col rounded-3xl border border-white/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] p-4 shrink-0">
        {/* Brand Header */}
        <div className="px-2 py-3 mb-3 border-b border-black/5 dark:border-white/10">
          <Link href="/dashboard">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-[0_4px_16px_rgba(14,165,233,0.4)] transition-transform duration-200 group-hover:scale-105">
                <Pill className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                  My Health First
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Health Platform DZ
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-1">
          {renderSection("Daily Care", careItems)}
          {renderSection("Health Network", networkItems)}
          {renderSection("Circle", circleItems)}
          {renderSection("Administration", adminItems)}
        </div>

        {/* User Footer */}
        <div className="mt-auto border-t border-black/5 dark:border-white/10 pt-2">
          <UserFooter />
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Top Glass Context Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 border-b border-white/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-white/10 text-xs font-medium text-foreground/80 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              Live Health Sync
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-white/10 text-xs text-muted-foreground flex items-center gap-1.5 shadow-2xs">
              <MapPin className="h-3.5 w-3.5 text-sky-500" />
              <span className="font-medium text-foreground">{user?.wilaya || "Algiers"}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Algeria</span>
            </div>
          </div>
        </header>

        {/* Mobile Modern Top App Bar (Safe Area Compliant) */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/60 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link href="/dashboard">
            <div className="flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-sm">
                <Pill className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-foreground leading-none">
                  My Health First
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                  {pageTitle}
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Quick Profile Avatar Shortcut */}
            <Link href="/profile">
              <div className="cursor-pointer active:scale-95 transition-transform">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "User"}
                    className="h-8 w-8 rounded-xl object-cover border border-white/80 dark:border-white/10 shadow-xs"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {user?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
              </div>
            </Link>

            {/* Menu Drawer Sheet */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-white/50">
                {/* User Profile Card in Drawer Header */}
                <div className="p-5 border-b border-black/5 dark:border-white/10 bg-gradient-to-br from-sky-500/10 via-transparent to-transparent pt-[max(1.25rem,env(safe-area-inset-top))]">
                  <div className="flex items-center gap-3">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || "User"}
                        className="h-12 w-12 rounded-2xl object-cover border border-white/80 dark:border-white/10 shadow-md"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center text-base font-bold shadow-md">
                        {user?.name?.[0]?.toUpperCase() ?? "U"}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-foreground truncate">{user?.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 capitalize">
                          {user?.role || "Patient"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {user?.wilaya || "Algiers"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drawer Links */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {renderSection("Daily Care", careItems, () => setMobileMenuOpen(false))}
                  {renderSection("Health Network", networkItems, () => setMobileMenuOpen(false))}
                  {renderSection("Circle", circleItems, () => setMobileMenuOpen(false))}
                  {renderSection("Administration", adminItems, () => setMobileMenuOpen(false))}
                </div>

                {/* Drawer Sign Out Button */}
                <div className="p-4 border-t border-black/5 dark:border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <Button
                    variant="outline"
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                    className="w-full rounded-xl justify-center text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-500/20 text-xs font-semibold"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Main Content Area (With bottom padding for Floating Navigation Bar) */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-4 md:p-8 pb-28 md:pb-8 scroll-smooth">
          <div className="mx-auto max-w-6xl space-y-5 md:space-y-6">
            {children}
          </div>
        </main>

        {/* Mobile Floating Liquid Glass Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 select-none pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex items-center justify-around p-1.5 rounded-2xl border border-white/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl shadow-[0_12px_40px_rgba(14,165,233,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            {bottomNav.map((tab) => {
              const isActive = location === tab.href;
              const Icon = tab.icon;
              return (
                <Link key={tab.name} href={tab.href}>
                  <button
                    type="button"
                    className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_4px_14px_rgba(14,165,233,0.4)] scale-105"
                        : "text-muted-foreground hover:text-foreground active:scale-95"
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 transition-transform ${isActive ? "text-white" : ""}`} />
                    <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? "font-bold text-white" : "font-medium"}`}>
                      {tab.label}
                    </span>
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
