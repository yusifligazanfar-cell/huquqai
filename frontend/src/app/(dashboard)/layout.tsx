import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AuthProvider } from "@/context/AuthContext"
import { LawyerOnboardingGuard } from "@/components/layout/LawyerOnboardingGuard"

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
        
        <div className="flex flex-1 flex-col min-w-0 w-full min-h-dvh overflow-x-clip relative z-10">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-clip p-2 sm:p-3 md:px-8 lg:px-12 pb-3 sm:pb-6 md:pb-8 pt-1.5 sm:pt-2 scroll-smooth">
            <div className="mx-auto max-w-7xl w-full min-w-0">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </LawyerOnboardingGuard>
  )
}
