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
            <div className="sidebar-brand">
              <div className="sidebar-brand-mark">KB</div>
              <div>
                <h1>Knowledge Bank</h1>
              </div>
            </div>
            <SidebarNav />
          </div>
          <div className="main-area">
            <div className="main-frame">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
