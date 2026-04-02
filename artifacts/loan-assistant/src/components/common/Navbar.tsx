import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Menu, X, LogOut, User, MessageSquare, LayoutDashboard, CreditCard } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 size={18} />
            </div>
            <div>
              <span className="font-bold text-foreground text-base leading-none block">AI Loan</span>
              <span className="text-xs text-muted-foreground leading-none">Assistant</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/loans">
              <Button variant="ghost" size="sm" className={location.startsWith("/loans") ? "bg-accent text-accent-foreground" : ""} data-testid="nav-loans">
                <CreditCard size={16} className="mr-1.5" />
                Loan Products
              </Button>
            </Link>
            {isAuthenticated && (
              <>
                <Link href="/chat">
                  <Button variant="ghost" size="sm" className={location === "/chat" ? "bg-accent text-accent-foreground" : ""} data-testid="nav-chat">
                    <MessageSquare size={16} className="mr-1.5" />
                    AI Chat
                  </Button>
                </Link>
                <Link href="/applications">
                  <Button variant="ghost" size="sm" className={location.startsWith("/applications") ? "bg-accent text-accent-foreground" : ""} data-testid="nav-applications">
                    My Applications
                  </Button>
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className={location === "/admin" ? "bg-accent text-accent-foreground" : ""} data-testid="nav-admin">
                      <LayoutDashboard size={16} className="mr-1.5" />
                      Admin
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User size={14} className="text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground text-xs block">{user?.name}</span>
                    {user?.role === "admin" && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Admin</Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
                  <LogOut size={14} className="mr-1.5" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="outline" size="sm" data-testid="nav-login">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" data-testid="nav-signup">Get Started</Button>
                </Link>
              </div>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-2">
          <Link href="/loans" onClick={() => setMobileOpen(false)}>
            <Button variant="ghost" className="w-full justify-start" size="sm">Loan Products</Button>
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/chat" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start" size="sm">AI Chat</Button>
              </Link>
              <Link href="/applications" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start" size="sm">My Applications</Button>
              </Link>
              {user?.role === "admin" && (
                <Link href="/admin" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start" size="sm">Admin Panel</Button>
                </Link>
              )}
            </>
          )}
          <div className="pt-2 border-t border-border">
            {isAuthenticated ? (
              <Button variant="outline" size="sm" className="w-full" onClick={() => { handleLogout(); setMobileOpen(false); }}>
                <LogOut size={14} className="mr-2" />
                Logout
              </Button>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">Login</Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className="flex-1">
                  <Button size="sm" className="w-full">Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
