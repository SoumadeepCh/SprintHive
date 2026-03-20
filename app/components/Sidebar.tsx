"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
    Hexagon, LayoutDashboard, ClipboardList, ListTodo,
    Search, ScrollText, Mail
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/my-tasks", label: "My Tasks", icon: ClipboardList },
    { href: "/tasks", label: "All Tasks", icon: ListTodo },
    { href: "/search", label: "Search", icon: Search },
    { href: "/logs", label: "Logs", icon: ScrollText },
    { href: "/invitations", label: "Invitations", icon: Mail },
];

export default function Sidebar() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    return (
        <aside className="sidebar-wrap">
            {/* Logo / Brand */}
            <div className="sidebar-brand">
                <Hexagon size={22} style={{ color: "var(--accent)" }} />
                <span className="sidebar-brand-name">SprintHive</span>
            </div>

            {/* Navigation Links */}
            <nav className="sidebar-links">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`sidebar-link${isActive(href) ? " active" : ""}`}
                        title={label}
                    >
                        <Icon size={18} />
                        <span className="sidebar-link-text">{label}</span>
                    </Link>
                ))}
            </nav>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* User section at bottom */}
            <div className="sidebar-user">
                <UserButton
                    appearance={{
                        elements: { avatarBox: { width: "32px", height: "32px" } },
                    }}
                />
                <span className="sidebar-link-text sidebar-user-label">Account</span>
            </div>
        </aside>
    );
}
