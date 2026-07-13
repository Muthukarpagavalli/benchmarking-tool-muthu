import "./globals.css";
import SidebarNav from "@/components/SidebarNav";

export const metadata = {
  title: "Legal tech benchmarking example project",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <div className="sidebar">
            <h1>Knowledge Bank</h1>
            <SidebarNav />
          </div>
          <div className="main-area">{children}</div>
        </div>
      </body>
    </html>
  );
}
