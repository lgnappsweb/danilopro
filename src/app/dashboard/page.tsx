
"use client"

import { useMemo, useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Loader2,
  Search,
  Wrench,
  Users,
  Truck,
  FileText,
  Tags,
  ChevronRight,
  X,
  Settings
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts"
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, limit, doc, orderBy } from "firebase/firestore"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const profileRef = useMemoFirebase(() => (user ? doc(db, "usuarios", user.uid) : null), [db, user?.uid])
  const { data: profile } = useDoc(profileRef)

  // Coleções para Estatísticas
  const revQuery = useMemoFirebase(() => user ? collection(db, "financeiro_entradas") : null, [db, user])
  const expQuery = useMemoFirebase(() => user ? collection(db, "financeiro_saidas") : null, [db, user])
  const stockQuery = useMemoFirebase(() => user ? collection(db, "estoque") : null, [db, user])
  const servQuery = useMemoFirebase(() => user ? query(collection(db, "servicos"), orderBy("createdAt", "desc"), limit(10)) : null, [db, user])
  const clientsQuery = useMemoFirebase(() => user ? collection(db, "clientes") : null, [db, user])
  const invoicesQuery = useMemoFirebase(() => user ? collection(db, "notas_fiscais") : null, [db, user])

  const { data: revenues, isLoading: l1 } = useCollection(revQuery)
  const { data: expenses, isLoading: l2 } = useCollection(expQuery)
  const { data: stock, isLoading: l3 } = useCollection(stockQuery)
  const { data: services, isLoading: l4 } = useCollection(servQuery)
  const { data: clients, isLoading: l5 } = useCollection(clientsQuery)
  const { data: invoices } = useCollection(invoicesQuery)

  const stats = useMemo(() => {
    const totalRev = (revenues || []).reduce((acc, r) => acc + (Number(r.value) || 0), 0)
    const totalExp = (expenses || []).reduce((acc, e) => acc + (Number(e.value) || 0), 0)
    const stockVal = (stock || []).reduce((acc, p) => acc + (Number(p.currentQuantity) * Number(p.unitCost)), 0)
    const lowStock = (stock || []).filter(p => Number(p.currentQuantity) < Number(p.minimumQuantity)).length
    const pendingServ = (services || []).filter(s => s.status !== "Concluído").length
    const clientCount = (clients || []).length
    const serviceCount = (services || []).length

    return { 
      totalRev, 
      totalExp, 
      stockVal, 
      lowStock, 
      pendingServ, 
      profit: totalRev - totalExp,
      clientCount,
      serviceCount
    }
  }, [revenues, expenses, stock, services, clients])

  // Lógica de Busca Global
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return null

    const term = searchTerm.toLowerCase()
    const results: any[] = []

    // 1. Clientes
    clients?.forEach(c => {
      if (c.name?.toLowerCase().includes(term) || c.phone?.toLowerCase().includes(term) || c.documentNumber?.toLowerCase().includes(term)) {
        results.push({ id: c.id, type: "Cliente", title: c.name, subtitle: c.phone, icon: Users, href: "/clients", color: "text-pink-500", bgColor: "bg-pink-500/10" })
      }
    })

    // 2. Serviços
    services?.forEach(s => {
      const client = clients?.find(c => c.id === s.clientId)
      if (s.observations?.toLowerCase().includes(term) || client?.name?.toLowerCase().includes(term)) {
        results.push({ id: s.id, type: "Serviço", title: client?.name || "Serviço", subtitle: s.status, icon: Wrench, href: "/services", color: "text-orange-500", bgColor: "bg-orange-500/10" })
      }
    })

    // 3. Estoque
    stock?.forEach(p => {
      if (p.name?.toLowerCase().includes(term) || p.storageLocation?.toLowerCase().includes(term)) {
        results.push({ id: p.id, type: "Estoque", title: p.name, subtitle: `${p.currentQuantity} un. em ${p.storageLocation || 'Estoque'}`, icon: Package, href: "/stock", color: "text-yellow-500", bgColor: "bg-yellow-500/10" })
      }
    })

    // 4. Financeiro
    const allFinance = [...(revenues || []).map(r => ({...r, fType: 'Receita'})), ...(expenses || []).map(e => ({...e, fType: 'Despesa'}))]
    allFinance.forEach(f => {
      if (f.observations?.toLowerCase().includes(term) || f.description?.toLowerCase().includes(term)) {
        results.push({ id: f.id, type: `Financeiro (${f.fType})`, title: f.observations || f.description, subtitle: `R$ ${Number(f.value).toLocaleString('pt-BR')}`, icon: DollarSign, href: "/finance", color: f.fType === 'Receita' ? "text-emerald-500" : "text-destructive", bgColor: f.fType === 'Receita' ? "bg-emerald-500/10" : "bg-destructive/10" })
      }
    })

    /* // 6. Notas Fiscais
    invoices?.forEach(i => {
      const client = clients?.find(c => c.id === i.clientId)
      if (i.invoiceNumber?.toLowerCase().includes(term) || client?.name?.toLowerCase().includes(term)) {
        results.push({ id: i.id, type: "Nota Fiscal", title: i.invoiceNumber, subtitle: client?.name || "Documento Fiscal", icon: FileText, href: "/invoices", color: "text-purple-500", bgColor: "bg-purple-500/10" })
      }
    }) */

    // 7. Menu e Configurações
    const menuItems = [
      { title: "Configurações", subtitle: "Aparência e Perfil", href: "/settings", icon: Settings, color: "text-slate-400", bgColor: "bg-slate-400/10" },
    ]
    menuItems.forEach(m => {
      if (m.title.toLowerCase().includes(term) || m.subtitle.toLowerCase().includes(term)) {
        results.push({ ...m, type: "Configurações", id: m.href })
      }
    })

    return results
  }, [searchTerm, clients, services, stock, revenues, expenses, invoices])

  if (l1 || l2 || l3 || l4 || l5) {
    return <DashboardLayout><div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div></DashboardLayout>
  }

  const appName = profile?.customAppName || "DaniloPro"
  const logoUrl = profile?.customAppLogoUrl

  return (
    <DashboardLayout>
      <div className="space-y-12 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center gap-8 py-4">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className={`rounded-full border-2 border-primary/30 aspect-square flex items-center justify-center w-32 h-32 overflow-hidden shadow-2xl shadow-primary/10 ${logoUrl ? 'p-0' : 'p-6 bg-primary/10'}`}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Wrench className="h-12 w-12 text-primary" />
                )}
              </div>
            </div>
            <h1 className="text-6xl md:text-8xl font-black font-headline tracking-tight leading-none">
              {appName.endsWith("Pro") ? (
                <>
                  {appName.slice(0, -3)}
                  <span className="text-primary">Pro</span>
                </>
              ) : appName}
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground font-medium max-w-3xl mx-auto leading-relaxed px-4">
              Bem-vindo ao seu centro de controle empresarial de alto desempenho.
            </p>
          </div>

          <div className="relative group w-full max-w-3xl mx-auto z-50 px-4">
            <div className="relative">
              <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 h-5 md:h-6 w-5 md:w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Busca global inteligente..." 
                className="pl-12 md:pl-16 h-16 text-sm sm:text-base md:text-xl bg-muted/30 border-2 border-primary/10 focus-visible:ring-primary rounded-[1.5rem] shadow-sm pr-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Painel de Resultados */}
            {isSearchFocused && searchTerm.length >= 2 && (
              <Card className="absolute top-20 left-4 right-4 md:left-0 md:right-0 max-h-[60vh] overflow-y-auto shadow-2xl rounded-[2rem] border-2 border-primary/20 bg-background/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <CardHeader className="border-b bg-muted/30 py-4 px-8">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex justify-between items-center">
                    Resultados encontrados
                    <Badge variant="outline" className="font-black">{searchResults?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  {!searchResults || searchResults.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground italic font-medium">
                      Nenhum resultado para &quot;{searchTerm}&quot; em nenhuma categoria.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1">
                      {searchResults.map((res) => {
                        const Icon = res.icon
                        return (
                          <Link 
                            key={`${res.type}-${res.id}`} 
                            href={res.href}
                            onClick={() => {
                              setSearchTerm("")
                              setIsSearchFocused(false)
                            }}
                            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/5 transition-all group border-2 border-transparent hover:border-primary/10"
                          >
                            <div className={cn("p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110", res.bgColor)}>
                              <Icon className={cn("w-5 h-5", res.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black truncate">{res.title}</p>
                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", res.bgColor, res.color, "border-current/20")}>
                                  {res.type}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-muted-foreground truncate">{res.subtitle}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-8 px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/finance" className="block transition-transform hover:scale-[1.03] active:scale-[0.97]">
              <Card className="bg-card/50 border-2 border-primary/10 hover:bg-primary/5 transition-colors cursor-pointer h-full rounded-[2rem] p-2">
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Faturamento</CardTitle>
                  <div className="p-2 bg-primary/10 rounded-xl"><DollarSign className="w-5 h-5 text-primary" /></div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tabular-nums">R$ {stats.totalRev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <p className="text-[10px] font-black uppercase text-primary mt-2 flex items-center gap-1">Ver financeiro <ArrowUpRight className="w-3 h-3" /></p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/finance" className="block transition-transform hover:scale-[1.03] active:scale-[0.97]">
              <Card className="bg-card/50 border-2 border-destructive/10 hover:bg-destructive/5 transition-colors cursor-pointer h-full rounded-[2rem] p-2">
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Despesas</CardTitle>
                  <div className="p-2 bg-destructive/10 rounded-xl"><TrendingDown className="w-5 h-5 text-destructive" /></div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tabular-nums">R$ {stats.totalExp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <p className="text-[10px] font-black uppercase text-destructive mt-2 flex items-center gap-1">Ver detalhes <ArrowUpRight className="w-3 h-3" /></p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/finance" className="block transition-transform hover:scale-[1.03] active:scale-[0.97]">
              <Card className="bg-card/50 border-2 border-emerald-500/10 hover:bg-emerald-500/5 transition-colors cursor-pointer h-full rounded-[2rem] p-2">
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lucro Líquido</CardTitle>
                  <div className="p-2 bg-emerald-500/10 rounded-xl"><TrendingUp className="w-5 h-5 text-emerald-500" /></div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tabular-nums">R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <p className="text-[10px] font-black uppercase text-emerald-500 mt-2 flex items-center gap-1">Ver balanço <ArrowUpRight className="w-3 h-3" /></p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/stock" className="block transition-transform hover:scale-[1.03] active:scale-[0.97]">
              <Card className="bg-card/50 border-2 border-yellow-500/20 hover:bg-yellow-500/5 transition-colors cursor-pointer h-full rounded-[2rem] p-2">
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Alertas Estoque</CardTitle>
                  <div className="p-2 bg-yellow-500/10 rounded-xl"><AlertTriangle className="w-5 h-5 text-yellow-500" /></div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tabular-nums">{stats.lowStock} Itens</div>
                  <p className="text-[10px] font-black uppercase text-yellow-500 mt-2 flex items-center gap-1">Ver estoque <ArrowUpRight className="w-3 h-3" /></p>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Link href="/clients" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <Card className="bg-card/50 border-2 border-pink-500/20 hover:bg-pink-500/5 transition-colors cursor-pointer h-full rounded-[2.5rem] p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">Gestão de Clientes</CardTitle>
                    <p className="text-sm text-muted-foreground">Base de contatos cadastrada</p>
                  </div>
                  <div className="p-4 bg-pink-500/10 rounded-[1.5rem] shadow-lg shadow-pink-500/10">
                    <Users className="w-8 h-8 text-pink-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-black tabular-nums leading-none mb-2">{stats.clientCount}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-pink-500/10 text-pink-500 px-3 py-1 rounded-full">Clientes Ativos</span>
                    <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">Acessar base completa <ArrowUpRight className="w-3 h-3" /></p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/services" className="block transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <Card className="bg-card/50 border-2 border-orange-500/20 hover:bg-orange-500/5 transition-colors cursor-pointer h-full rounded-[2.5rem] p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Fluxo de Serviços</CardTitle>
                    <p className="text-sm text-muted-foreground">Ordens de serviço processadas</p>
                  </div>
                  <div className="p-4 bg-orange-500/10 rounded-[1.5rem] shadow-lg shadow-orange-500/10">
                    <Wrench className="w-8 h-8 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-black tabular-nums leading-none mb-2">{stats.serviceCount}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full">Trabalhos Realizados</span>
                    <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">Ver cronograma <ArrowUpRight className="w-3 h-3" /></p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 px-4">
          <Card className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/10 p-8"><CardTitle className="text-xl font-black uppercase tracking-widest">Fluxo de Caixa Acumulado</CardTitle></CardHeader>
            <CardContent className="h-[350px] p-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "Receitas", value: stats.totalRev, fill: "hsl(var(--primary))" },
                  { name: "Despesas", value: stats.totalExp, fill: "hsl(var(--destructive))" }
                ]}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontWeight: 'bold'}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/10 p-8"><CardTitle className="text-xl font-black uppercase tracking-widest">Próximos Agendamentos</CardTitle></CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4">
                {(services || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic">
                    <Clock className="w-12 h-12 opacity-20 mb-4" />
                    <p>Sem serviços agendados no momento.</p>
                  </div>
                ) : (
                  (services || []).slice(0, 5).map(s => {
                    const client = clients?.find(c => c.id === s.clientId)
                    return (
                      <div key={s.id} className="flex items-center gap-5 p-5 rounded-3xl bg-muted/30 border-2 border-transparent hover:border-primary/10 transition-all group">
                        <div className="p-3 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform">
                          <Clock className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black truncate">{client?.name || `Serviço #${s.id.slice(-4)}`}</p>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{s.status}</p>
                        </div>
                        <div className="text-right font-black text-xl tabular-nums">R$ {Number(s.chargedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
