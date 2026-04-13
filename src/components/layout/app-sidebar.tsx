
"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Wallet,
  Package,
  Wrench,
  Users,
  Truck,
  LogOut,
  Settings,
  Tags,
  FileText,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { doc } from "firebase/firestore"
import { cn } from "@/lib/utils"

const items = [
  {
    title: "Painel",
    url: "/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Estoque",
    url: "/stock",
    icon: Package,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    title: "Clientes",
    url: "/clients",
    icon: Users,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    title: "Serviços",
    url: "/services",
    icon: Wrench,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    title: "Financeiro",
    url: "/finance",
    icon: Wallet,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  /* {
    title: "Notas Fiscais",
    url: "/invoices",
    icon: FileText,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  }, */
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
    color: "text-slate-400",
    bgColor: "bg-slate-400/10",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const db = useFirestore()

  const profileRef = useMemoFirebase(() => (user ? doc(db, "usuarios", user.uid) : null), [db, user?.uid])
  const { data: profile } = useDoc(profileRef)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Erro ao sair:", error)
      router.push("/login")
    }
  }

  const appName = profile?.customAppName || "DaniloPro"
  const logoUrl = profile?.customAppLogoUrl

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-24 flex items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
          <div className="flex aspect-square size-12 items-center justify-center rounded-full border-2 border-primary overflow-hidden shadow-lg shadow-primary/10">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <Wrench className="size-6 text-primary" />
              </div>
            )}
          </div>
          <span className="font-headline font-black text-2xl tracking-tighter group-data-[collapsible=icon]:hidden truncate max-w-[140px]">
            {appName.endsWith("Pro") ? (
              <>
                {appName.slice(0, -3)}
                <span className="text-primary">Pro</span>
              </>
            ) : appName}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-4 mb-4">Navegação Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className={cn(
                      "h-14 px-4 transition-all rounded-2xl",
                      pathname === item.url ? "bg-muted shadow-sm ring-1 ring-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <Link href={item.url} className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-xl shrink-0 shadow-sm", item.bgColor)}>
                        <item.icon className={cn("w-6 h-6", item.color)} />
                      </div>
                      <span className={cn(
                        "font-black text-base group-data-[collapsible=icon]:hidden transition-colors tracking-tight",
                        pathname === item.url ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-14 px-4 transition-all rounded-2xl hover:bg-destructive/10 hover:text-destructive group border-2 border-transparent hover:border-destructive/20"
              onClick={handleLogout}
            >
              <div className="p-2 rounded-xl bg-destructive/10 shrink-0">
                <LogOut className="w-6 h-6 text-destructive" />
              </div>
              <span className="font-black text-base group-data-[collapsible=icon]:hidden tracking-tight">Sair do Sistema</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
