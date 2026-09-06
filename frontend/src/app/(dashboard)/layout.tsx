import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AuthProvider } from "@/context/AuthContext"
import { LawyerOnboardingGuard } from "@/components/layout/LawyerOnboardingGuard"
import { CookieAndUpdateBanner } from "@/components/layout/CookieAndUpdateBanner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LawyerOnboardingGuard>
      <SidebarProvider defaultOpen={true}>
        {/* Global Abstract Background Mesh */}
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0"></div>
        
        {/* Universal Emerald Ambient Lighting for all pages */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[25%] w-[650px] h-[650px] bg-emerald-500/10 rounded-full blur-[100px] will-change-transform" />
          <div className="absolute bottom-[5%] right-[15%] w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[100px] will-change-transform" />
        </div>
        
        <AppSidebar />
        
        <div className="flex flex-1 flex-col min-w-0 w-full min-h-[100svh] overflow-hidden relative z-10">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 md:px-8 lg:px-12 pb-12 pt-2 scroll-smooth">
            <div className="mx-auto max-w-7xl w-full">
              {children}
            </div>
          </main>
        </div>
        <CookieAndUpdateBanner />
      </SidebarProvider>
    </LawyerOnboardingGuard>
  )
}
