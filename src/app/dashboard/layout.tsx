import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@radix-ui/react-separator"
import { ThemeToggleButton } from "@/components/theme-toggle-button"
import { ThemeProvider } from "@/components/theme-provider"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <div className="flex-shrink-0">
            <AppSidebar />
          </div>
          <main className="flex-1 flex flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 mb-6">
              <SidebarTrigger className="-ml-1" />
              <div className="ml-auto">
                <ThemeToggleButton />
              </div>
            </header>
            <div className="flex-1 flex flex-col w-full min-h-0">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  )
}