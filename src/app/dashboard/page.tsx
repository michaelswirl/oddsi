import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { OddsTable } from "@/components/odds-table"

export default function Page() {
  return (
    <div className="w-full h-full min-h-screen p-6">
      <OddsTable />
    </div>
  )
}
