
"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "./app-sidebar"
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { doc } from "firebase/firestore"
import { usePathname, useRouter } from "next/navigation"
import { cn, hexToHsl } from "@/lib/utils"
import Link from "next/link"
import { signOut } from "firebase/auth"
import { 
  LayoutDashboard, 
  Wallet, 
  Wrench, 
  Plus, 
  Package, 
  Users, 
  Truck, 
  Settings,
  ChevronRight,
  Tags,
  FileText,
  ArrowLeft,
  LogOut,
  X
} from "lucide-react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

const allNavItems = [
  { label: "Painel", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { label: "Estoque", href: "/stock", icon: Package, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  { label: "Clientes", href: "/clients", icon: Users, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  { label: "Serviços", href: "/services", icon: Wrench, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { label: "Financeiro", href: "/finance", icon: Wallet, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  /* { label: "Notas Fiscais", href: "/invoices", icon: FileText, color: "text-purple-500", bgColor: "bg-purple-500/10" }, */
  { label: "Configurações", href: "/settings", icon: Settings, color: "text-slate-400", bgColor: "bg-slate-400/10" },
]

function MobileBottomNav({ profile }: { profile: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const mainNavItems = allNavItems.slice(0, 3)
  const moreNavItems = allNavItems.slice(3)

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
    <nav className="fixed bottom-6 left-4 right-4 z-50 flex h-22 items-center justify-around rounded-[2rem] border-2 border-primary/20 bg-background/95 px-2 shadow-2xl shadow-primary/10 backdrop-blur-2xl md:hidden animate-in fade-in slide-in-from-bottom-10 duration-500">
      {mainNavItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1 transition-all",
              isActive ? "scale-105" : ""
            )}
          >
            <div className={cn(
              "p-2.5 rounded-xl transition-all", 
              item.bgColor,
              "ring-1 ring-primary/20",
              isActive ? "ring-2 ring-primary shadow-xl shadow-primary/20" : ""
            )}>
              <Icon className={cn("h-6 w-6", item.color)} />
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}>{item.label}</span>
          </Link>
        )
      })}
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            className="flex flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition-all hover:text-primary active:scale-95"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 shadow-lg shadow-primary/5">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Mais</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-[3rem] px-6 pb-12 pt-4 border-t-4 border-t-primary/20 bg-background/95 backdrop-blur-2xl [&>button]:hidden">
          <SheetHeader className="mb-10 relative">
            <div className="mx-auto h-2 w-16 rounded-full bg-muted-foreground/20 mb-6" />
            
            <div className="flex flex-col items-center gap-4">
              <div className="flex aspect-square size-20 items-center justify-center rounded-full border-2 border-primary overflow-hidden shadow-2xl shadow-primary/20">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <Wrench className="size-10 text-primary" />
                  </div>
                )}
              </div>
              <SheetTitle className="text-center font-headline font-black text-3xl tracking-tighter">
                {appName.endsWith("Pro") ? (
                  <>
                    {appName.slice(0, -3)}
                    <span className="text-primary">Pro</span>
                  </>
                ) : appName}
              </SheetTitle>
            </div>
          </SheetHeader>
          <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pb-6 px-2">
            {moreNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center justify-between p-6 rounded-[2rem] transition-all border-2",
                    isActive 
                      ? "bg-primary/5 text-primary border-primary/20 shadow-xl shadow-primary/5 scale-[1.02]" 
                      : "bg-muted/30 hover:bg-muted/50 text-foreground border-transparent"
                  )}
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "p-4 rounded-2xl shadow-sm",
                      isActive ? "bg-primary/20" : item.bgColor
                    )}>
                      <Icon className={cn("h-7 w-7", item.color)} />
                    </div>
                    <span className="font-black text-xl tracking-tight">{item.label}</span>
                  </div>
                  <ChevronRight className="h-6 w-6 opacity-30" />
                </Link>
              )
            })}

            <button
              onClick={handleLogout}
              className="flex items-center justify-between p-6 rounded-[2rem] transition-all border-2 bg-destructive/5 text-destructive border-transparent hover:bg-destructive/10 mt-6"
            >
              <div className="flex items-center gap-5">
                <div className="p-4 rounded-2xl bg-destructive/10 shadow-sm">
                  <LogOut className="h-7 w-7 text-destructive" />
                </div>
                <span className="font-black text-xl tracking-tight">Sair do Sistema</span>
              </div>
              <ChevronRight className="h-6 w-6 opacity-30" />
            </button>

            <SheetClose asChild>
              <Button variant="ghost" className="w-full h-20 rounded-[2rem] mt-4 font-black uppercase tracking-widest gap-3 hover:bg-muted active:scale-95 transition-all text-muted-foreground">
                <X className="w-6 h-6" /> Fechar Menu
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}

function FixedHeader() {
  const { state, isMobile } = useSidebar()
  const pathname = usePathname()
  
  if (pathname === "/dashboard") return null

  const leftPos = isMobile ? "left-0" : (state === "expanded" ? "left-64" : "left-12")

  return (
    <div className={cn(
      "fixed top-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b-2 px-6 py-4 flex items-center gap-4 transition-all duration-200 shadow-sm",
      leftPos
    )}>
      <Button asChild variant="outline" size="lg" className="bg-card border-2 border-primary shadow-xl shadow-primary/5 gap-3 h-12 px-6 hover:bg-primary/10 transition-all rounded-2xl font-black group">
        <Link href="/dashboard" className="flex items-center gap-3">
          <ArrowLeft className="h-5 w-5 text-foreground group-hover:-translate-x-1 transition-transform" />
          <span className="font-black text-xs uppercase tracking-[0.2em] text-foreground">Voltar ao Início</span>
        </Link>
      </Button>
    </div>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const db = useFirestore()
  const pathname = usePathname()
  
  const profileRef = useMemoFirebase(() => (user ? doc(db, "usuarios", user.uid) : null), [db, user?.uid])
  const { data: profile } = useDoc(profileRef)

  useEffect(() => {
    const isDark = profile?.theme !== 'light'
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'

    if (profile?.primaryColor) {
      const primaryHsl = hexToHsl(profile.primaryColor);
      document.documentElement.style.setProperty('--primary', primaryHsl);
      document.documentElement.style.setProperty('--ring', primaryHsl);
    }
  }, [profile?.theme, profile?.primaryColor])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background pb-24 md:pb-0 overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 relative min-w-0">
          <FixedHeader />
          <main className={cn(
            "p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full overflow-x-hidden",
            pathname === "/dashboard" ? "pt-12 md:pt-20" : "pt-28 md:pt-32"
          )}>
            {children}
          </main>
        </SidebarInset>
      </div>
      <MobileBottomNav profile={profile} />
    </SidebarProvider>
  )
}
