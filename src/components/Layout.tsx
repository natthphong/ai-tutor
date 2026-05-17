import React from "react";
import Navbar from "./Navbar";
import NotificationCenter from "@components/notifications/NotificationCenter";
import { FloatingLanguageToggle } from "@components/common";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.1),_transparent_28%),linear-gradient(180deg,#f7fdf9_0%,#ffffff_45%,#f0fdf4_100%)]">
            <Navbar />
            <NotificationCenter />
            <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
            <FloatingLanguageToggle />
        </div>
    );
};

export default Layout;
