import * as React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Tags, 
  PieChart, 
  Wallet, 
  UploadCloud,
  ScanLine,
  LogOut,
  Menu,
  X,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: ArrowRightLeft, label: "Transactions", href: "/transactions" },
  { icon: Tags, label: "Categories", href: "/categories" },
  { icon: PieChart, label: "Analytics", href: "/analytics" },
  { icon: Wallet, label: "Assets", href: "/assets" },
  { icon: ScanLine, label: "Scan Struk", href: "/receipt" },
  { icon: UploadCloud, label: "Import", href: "/import" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-72 flex-col glass border-r-white/5 z-20">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gradient">Lumina</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 relative group overflow-hidden",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn("w-5 h-5 relative z-10", isActive ? "text-primary" : "group-hover:text-primary transition-colors")} />
                  <span className="relative z-10">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-4 px-4 py-3.5 w-full rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button className="flex items-center gap-4 px-4 py-3.5 w-full rounded-xl font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 glass z-30 flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gradient">Lumina</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground p-2 transition-colors">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-foreground p-2">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-20 glass-panel z-20 flex flex-col p-6">
          <nav className="flex-1 space-y-4">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium",
                    isActive ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground"
                  )}>
                    <item.icon className="w-6 h-6" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto lg:h-screen pt-20 lg:pt-0">
        <div className="max-w-7xl mx-auto p-6 md:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
