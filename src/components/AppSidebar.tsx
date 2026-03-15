import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  BookOpen,
  Upload,
  SpellCheck,
  Palette,
  Globe,
  Settings,
  ChevronLeft,
  ChevronRight,
  PenTool,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/mis-libros", icon: BookOpen, label: "Mis libros" },
  { to: "/subir-manuscrito", icon: Upload, label: "Subir manuscrito" },
  { to: "/correccion", icon: SpellCheck, label: "Corrección" },
  { to: "/maquetacion", icon: Palette, label: "Maquetación" },
  { to: "/publicar", icon: Globe, label: "Publicar" },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 bg-ink-gradient flex flex-col transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center shrink-0">
          <PenTool className="w-4 h-4 text-accent-foreground" />
        </div>
        {!collapsed && (
          <span className="font-display text-lg font-semibold text-sidebar-accent-foreground truncate animate-slide-in-left">
            Author Suite
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-sidebar-primary")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
        <NavLink
          to="/ajustes"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200",
            location.pathname === "/ajustes" && "bg-sidebar-accent text-sidebar-primary"
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Ajustes</span>}
        </NavLink>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200 w-full"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}
