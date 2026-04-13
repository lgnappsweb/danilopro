"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Printer, 
  Calculator, 
  Loader2,
  AlertCircle,
  User,
  Settings2,
  Info,
  DollarSign,
  BadgePercent,
  Calendar,
  X,
  Search,
  Eye,
  Download,
  Building2,
  MapPin,
  Phone,
  Mail
} from "lucide-react"
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, orderBy, where } from "firebase/firestore"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitValue: number
  totalValue: number
}

export default function InvoicesPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const profileRef = useMemoFirebase(() => (user ? doc(db, "usuarios", user.uid) : null), [db, user?.uid])
  const { data: profile } = useDoc(profileRef)
  
  const clientsQuery = useMemoFirebase(() => query(collection(db, "clientes"), orderBy("name", "asc")), [db])
  const { data: clients } = useCollection(clientsQuery)

  const servicesQuery = useMemoFirebase(() => query(collection(db, "servicos"), orderBy("createdAt", "desc")), [db])
  const { data: services } = useCollection(servicesQuery)

  const [clientId, setClientId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [invoiceNumber, setInvoiceNumber] = useState(`NF-${Date.now().toString().slice(-6)}`)
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 1, unitValue: 0, totalValue: 0 }
  ])
  const [discount, setDiscount] = useState(0)
  const [issRate, setIssRate] = useState(5)
  const [observations, setObservations] = useState("")
  const [activeTab, setActiveTab] = useState("emitir")
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Novos estados para dados do tomador (cliente)
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientDocument, setClientDocument] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [clientEmail, setClientEmail] = useState("")

  const invoicesQuery = useMemoFirebase(() => query(collection(db, "notas_fiscais"), orderBy("createdAt", "desc")), [db])
  const { data: invoices, isLoading: loadingInvoices } = useCollection(invoicesQuery)

  const filteredInvoices = useMemo(() => {
    if (!invoices) return []
    const term = searchTerm.toLowerCase()
    return invoices.filter(inv => {
      const client = clients?.find(c => c.id === inv.clientId)
      const invNum = (inv.invoiceNumber || "").toLowerCase()
      const clientName = (client?.name || inv.clientName || "").toLowerCase()
      return invNum.includes(term) || clientName.includes(term)
    })
  }, [invoices, searchTerm, clients])

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + item.totalValue, 0)
    const issValue = (subtotal * issRate) / 100
    const finalTotal = subtotal + issValue - discount
    return { subtotal, issValue, finalTotal }
  }, [items, issRate, discount])

  const handleAddItem = () => {
    setItems([...items, { id: Math.random().toString(), description: "", quantity: 1, unitValue: 0, totalValue: 0 }])
  }

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === "quantity" || field === "unitValue") {
          updated.totalValue = Number(updated.quantity) * Number(updated.unitValue)
        }
        return updated
      }
      return item
    }))
  }

  const handleClientChange = (id: string) => {
    setClientId(id)
    const client = clients?.find(c => c.id === id)
    if (client) {
      setClientName(client.name || "")
      setClientPhone(client.phone || "")
      setClientDocument(client.documentNumber || "")
      setClientEmail(client.email || "")
      const fullAddress = [
        client.street,
        client.number,
        client.neighborhood,
        client.city
      ].filter(Boolean).join(", ")
      setClientAddress(fullAddress)
    }
  }

  const handleSaveInvoice = async () => {
    if (!clientId) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um cliente." })
      return
    }

    setLoading(true)
    try {
      const colRef = collection(db, "notas_fiscais")
      
      const payload = {
        clientId,
        clientName: clientName || "Cliente",
        clientDocument: clientDocument || "",
        clientAddress: clientAddress || "",
        clientPhone: clientPhone || "",
        clientEmail: clientEmail || "",
        serviceId,
        issueDate,
        invoiceNumber,
        items,
        subtotal: totals.subtotal,
        taxes: { iss: totals.issValue },
        totalTaxes: totals.issValue,
        discount,
        finalTotal: totals.finalTotal,
        status: "Emitida",
        observations,
        providerData: {
          name: profile?.businessName || "DaniloPro",
          document: profile?.documentNumber || "",
          address: profile?.address || "",
          phone: profile?.phone || "",
          email: profile?.email || ""
        },
        createdAt: new Date().toISOString()
      }

      await addDocumentNonBlocking(colRef, payload)
      toast({ title: "Sucesso!", description: "Nota Fiscal emitida com sucesso." })
      setClientId("")
      setClientName("")
      setClientPhone("")
      setClientDocument("")
      setClientAddress("")
      setClientEmail("")
      setItems([{ id: "1", description: "", quantity: 1, unitValue: 0, totalValue: 0 }])
      setActiveTab("historico")
    } catch (error) {
      console.error("Error saving invoice:", error)
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar nota fiscal." })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInvoice = async (id: string) => {
    try {
      await deleteDocumentNonBlocking(doc(db, "notas_fiscais", id))
      toast({ title: "Sucesso", description: "Nota removida do histórico." })
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir a nota." })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <DashboardLayout>
      <div className="space-y-10 max-w-7xl mx-auto animate-in fade-in duration-500 overflow-x-hidden px-1 sm:px-0 print:p-0">
        {/* Cabeçalho Premium Centrado (Escondido no Print) */}
        <div className="flex flex-col items-center text-center gap-6 print:hidden">
          <div className="space-y-3 w-full">
            <Badge variant="outline" className="px-4 py-1 border-purple-500/30 text-purple-500 font-black uppercase tracking-widest text-[10px] bg-purple-500/5">
              Documentos Fiscais
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black font-headline tracking-tighter text-center break-words px-4">Notas Fiscais</h1>
            <p className="text-base md:text-xl text-muted-foreground text-center max-w-2xl mx-auto px-4 leading-relaxed">
              Gere documentos profissionais e gerencie seu histórico de emissões.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full print:hidden">
          <div className="flex justify-center mb-10">
            <TabsList className="bg-muted/50 p-1 rounded-2xl h-16 border-2 border-primary/5">
              <TabsTrigger value="emitir" className="rounded-xl px-8 font-black text-sm uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                Emitir Nova
              </TabsTrigger>
              <TabsTrigger value="historico" className="rounded-xl px-8 font-black text-sm uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                Histórico
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="emitir" className="space-y-10 animate-in slide-in-from-left duration-500">
            <div className="grid gap-8 lg:grid-cols-12 items-start">
              {/* Seção Principal de Formulários (8 Colunas no Desktop) */}
              <div className="lg:col-span-8 space-y-10">
                {/* Dados do Documento */}
                <Card className="border-2 border-primary/10 bg-card shadow-sm rounded-[2.5rem] p-2 sm:p-4 transition-all">
                  <CardHeader className="p-6 sm:p-8">
                    <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-4">
                      <div className="bg-primary/10 p-2.5 sm:p-3 rounded-2xl shrink-0"><FileText className="text-primary w-5 h-5 sm:w-6 h-6" /></div>
                      <span className="truncate">Dados do Documento</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 p-6 sm:p-8 pt-0">
                    <div className="space-y-3">
                      <Label className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 truncate"><User className="w-4 h-4 shrink-0" /> Selecionar Cliente</Label>
                      <Select value={clientId} onValueChange={handleClientChange}>
                        <SelectTrigger className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{clients?.map(c => <SelectItem key={c.id} value={c.id}>{c?.name || "Cliente"}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 truncate"><Settings2 className="w-4 h-4 shrink-0" /> Serviço Vinculado</Label>
                      <Select value={serviceId} onValueChange={setServiceId}>
                        <SelectTrigger className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6"><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>{services?.map(s => <SelectItem key={s.id} value={s.id}>#{s.id.slice(-6)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 truncate"><Calendar className="w-4 h-4 shrink-0" /> Data de Emissão</Label>
                      <Input type="date" className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 truncate"># Número da Nota</Label>
                      <Input className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                    </div>
                  </CardContent>
                </Card>

                {/* Dados do Tomador (Cliente) - Novos Campos */}
                <Card className="border-2 border-primary/10 bg-card shadow-sm rounded-[2.5rem] p-2 sm:p-4 transition-all">
                  <CardHeader className="p-6 sm:p-8">
                    <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-4">
                      <div className="bg-primary/10 p-2.5 sm:p-3 rounded-2xl shrink-0"><User className="text-primary w-5 h-5 sm:w-6 h-6" /></div>
                      <span className="truncate">Dados do Tomador (Cliente)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 p-6 sm:p-8 pt-0">
                    <div className="space-y-3 md:col-span-2">
                      <Label className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground">Nome / Razão Social</Label>
                      <Input className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome completo do cliente" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground">CPF / CNPJ</Label>
                      <Input className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6" value={clientDocument} onChange={e => setClientDocument(e.target.value)} placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground">Telefone</Label>
                      <Input className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground">E-mail</Label>
                      <Input className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@email.com" />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label className="text-xs sm:text-sm font-black uppercase tracking-widest text-muted-foreground">Endereço Completo</Label>
                      <Input className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Rua, Número, Bairro, Cidade - UF" />
                    </div>
                  </CardContent>
                </Card>

                {/* Itens e Serviços */}
                <Card className="border-2 border-primary/10 shadow-sm rounded-[2.5rem] p-2 sm:p-4 overflow-hidden bg-card">
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 gap-4">
                    <CardTitle className="text-xl sm:text-2xl font-black">Itens e Serviços</CardTitle>
                    <Button variant="ghost" onClick={handleAddItem} className="w-full sm:w-auto bg-primary/10 text-primary hover:bg-primary hover:text-white gap-3 font-black rounded-2xl px-6 h-12 sm:h-10">
                      <Plus className="w-5 h-5" /> Item
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6 p-6 sm:p-8 pt-0">
                    {items.map((item) => (
                      <div key={item.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-6 sm:p-8 bg-muted/20 rounded-[2rem] border-2 border-transparent hover:border-primary/20 transition-all relative group">
                        <div className="lg:col-span-6 space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição Detalhada do Item</Label>
                          <Input className="h-12 font-bold bg-background border-2 rounded-xl" placeholder="Ex: Montagem de Painel Sob Medida" value={item.description} onChange={e => handleUpdateItem(item.id, "description", e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 lg:col-span-5 gap-4">
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Qtd</Label>
                            <Input type="number" className="h-12 font-bold bg-background border-2 rounded-xl text-center" value={item.quantity} onChange={e => handleUpdateItem(item.id, "quantity", Number(e.target.value))} />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor Unit. (R$)</Label>
                            <Input type="number" className="h-12 font-bold bg-background border-2 rounded-xl text-right" value={item.unitValue} onChange={e => handleUpdateItem(item.id, "unitValue", Number(e.target.value))} />
                          </div>
                        </div>
                        <div className="lg:col-span-1 flex items-end justify-end">
                          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shrink-0" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Observações */}
                <Card className="border-2 border-primary/10 bg-card rounded-[2.5rem] p-2 sm:p-4">
                  <CardHeader className="p-6 sm:p-8">
                    <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-4">
                      <div className="bg-primary/10 p-2.5 sm:p-3 rounded-2xl shrink-0"><Info className="text-primary w-5 h-5 sm:w-6 h-6" /></div>
                      Observações Gerais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8 pt-0">
                    <Textarea className="min-h-[160px] text-base sm:text-lg font-medium bg-muted/20 border-2 rounded-3xl p-6 sm:p-8 focus-visible:ring-primary" placeholder="Termos de garantia, prazos de pagamento ou observações técnicas relevantes..." value={observations} onChange={e => setObservations(e.target.value)} />
                  </CardContent>
                </Card>
              </div>

              {/* Seção Lateral de Cálculo (4 Colunas no Desktop) */}
              <div className="lg:col-span-4 space-y-10">
                {/* Cálculo Final - Sticky no Desktop */}
                <Card className="border-4 border-primary/30 bg-primary/5 lg:sticky lg:top-28 rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-right duration-700">
                  <CardHeader className="bg-primary/10 p-6 sm:p-8 text-center">
                    <div className="bg-primary w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl mb-4">
                      <Calculator className="w-7 h-7 sm:w-8 h-8" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-black">Fechamento do Valor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 sm:space-y-8 p-6 sm:p-10 pt-10">
                    <div className="flex justify-between font-black text-base sm:text-lg">
                      <span className="text-muted-foreground">Subtotal Itens</span>
                      <span className="tabular-nums">R$ {totals.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <Separator className="bg-primary/10" />

                    <div className="p-4 sm:p-6 bg-background/50 rounded-3xl border-2 border-primary/10 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">ISS (%)</span>
                        <Input type="number" className="w-20 sm:w-24 text-center font-black h-9 sm:h-10 border-2 rounded-xl" value={issRate} onChange={e => setIssRate(Number(e.target.value))} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-destructive">Taxas</span>
                        <span className="font-black text-destructive text-sm sm:text-base tabular-nums">+ R$ {totals.issValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <BadgePercent className="w-4 h-4 shrink-0" />
                        <span className="text-xs sm:text-sm font-black uppercase tracking-widest">Desconto</span>
                      </div>
                      <Input type="number" className="w-28 sm:w-32 text-right font-black h-10 sm:h-12 border-2 rounded-xl px-4" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                    </div>

                    <div className="border-t-4 border-primary pt-8 mt-8 text-center bg-primary/5 rounded-b-[2rem] -mx-6 sm:-mx-10 -mb-6 sm:-mb-10 p-6 sm:p-10">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Total a Receber</span>
                      <div className="text-3xl sm:text-5xl font-black text-primary mt-2 break-words tabular-nums leading-none">
                        R$ {totals.finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="p-6 bg-muted/20 rounded-3xl border-2 border-dashed text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-primary mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-relaxed">
                    Dados de <strong>{profile?.businessName || "DaniloPro"}</strong> serão gerados no documento.
                  </p>
                </div>
              </div>
            </div>

            {/* Ações Finais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full pt-10 border-t-2 border-primary/5 pb-10 sm:pb-0">
              <Button variant="outline" className="h-16 sm:h-20 px-8 sm:px-12 text-lg sm:text-xl font-black rounded-[1.5rem] gap-4 border-2 transition-all hover:bg-muted group">
                <Printer className="w-5 h-5 sm:w-6 h-6 group-hover:scale-110 transition-transform" /> 
                Imprimir Rascunho
              </Button>
              <Button className="h-16 sm:h-20 px-8 sm:px-12 text-lg sm:text-xl font-black rounded-[1.5rem] gap-4 bg-primary shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95" onClick={handleSaveInvoice} disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 sm:w-6 h-6 animate-spin" /> : <Save className="w-5 h-5 sm:w-6 h-6" />} 
                Emitir Documento
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="relative group w-full max-w-3xl mx-auto">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Buscar por número da nota ou cliente..." 
                className="pl-16 h-16 text-xl font-medium bg-card border-2 border-primary/10 focus-visible:ring-primary rounded-3xl shadow-sm transition-all" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {loadingInvoices ? (
              <div className="flex flex-col items-center justify-center py-32 gap-6">
                <Loader2 className="w-16 h-16 animate-spin text-primary opacity-50" />
                <p className="text-xl text-muted-foreground font-black uppercase tracking-[0.2em]">Carregando Histórico...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-32 border-4 border-dashed rounded-[3rem] bg-muted/10 w-full mx-auto space-y-6">
                <div className="bg-muted w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-2xl">Nenhuma nota encontrada</h3>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    {searchTerm ? "Não encontramos notas com esse filtro." : "As notas emitidas aparecerão aqui para consulta e impressão."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredInvoices.map((inv) => (
                  <Card key={inv.id} className="group hover:border-purple-500 transition-all duration-500 shadow-sm hover:shadow-2xl bg-card border-2 rounded-[2.5rem] p-0 overflow-hidden">
                    <div className="flex flex-col lg:flex-row lg:items-center">
                      <div className="p-8 lg:w-1/3 flex items-start justify-between border-b lg:border-b-0 lg:border-r border-primary/10">
                        <div className="flex items-center gap-5 min-w-0">
                          <div className="w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-lg bg-purple-500/10 text-purple-500">
                            <FileText className="w-8 h-8" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-2xl font-black leading-tight break-words pr-4">
                              {inv.invoiceNumber}
                            </h3>
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mt-1">
                              {format(new Date(inv.issueDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex items-center gap-2 font-black text-lg text-primary">
                            <User className="w-5 h-5" />
                            {inv.clientName}
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0 font-black text-[10px] uppercase tracking-widest">
                              {inv.status}
                            </Badge>
                            <span className="text-sm font-bold text-muted-foreground">
                              {inv.items.length} {inv.items.length === 1 ? 'item' : 'itens'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:border-l sm:pl-8 border-primary/10">
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Total da Nota</p>
                            <p className="text-3xl font-black text-primary leading-none">
                              R$ {inv.finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-primary hover:text-white transition-all"
                              onClick={() => {
                                setSelectedInvoice(inv)
                                setIsViewOpen(true)
                              }}
                            >
                              <Eye className="w-5 h-5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-destructive hover:text-white transition-all"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-[2.5rem]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-2xl font-black">Excluir Nota?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-base font-medium">
                                    Esta ação removerá o registro da nota fiscal permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-4">
                                  <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction className="rounded-xl font-black bg-destructive hover:bg-destructive/90" onClick={() => handleDeleteInvoice(inv.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal de Visualização e Impressão Profissional */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-4xl w-full p-0 border-0 bg-white rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="max-h-[85vh] overflow-y-auto p-8 sm:p-12 print:p-0 print:max-h-none">
              {selectedInvoice && (
                <div id="printable-invoice" className="space-y-10 text-slate-800">
                  {/* Cabeçalho da Nota */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-8 border-b-4 border-primary pb-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary p-3 rounded-2xl text-white">
                          <Building2 className="w-8 h-8" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-black tracking-tighter text-primary">{selectedInvoice.providerData?.name || "DaniloPro"}</h2>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Documento Fiscal de Serviço</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm font-medium text-slate-600">
                        <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {selectedInvoice.providerData?.address || "Endereço não informado"}</p>
                        <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {selectedInvoice.providerData?.phone || "Telefone não informado"}</p>
                        <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> {selectedInvoice.providerData?.email || "E-mail não informado"}</p>
                        <p className="font-black text-slate-800 mt-2">CNPJ/CPF: {selectedInvoice.providerData?.document || "Não informado"}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="bg-slate-100 p-6 rounded-3xl border-2 border-slate-200">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Número da Nota</p>
                        <p className="text-3xl font-black text-slate-800">{selectedInvoice.invoiceNumber}</p>
                        <Separator className="my-3" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Data de Emissão</p>
                        <p className="text-lg font-bold text-slate-700">{format(new Date(selectedInvoice.issueDate), "dd/MM/yyyy")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dados do Cliente */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary border-l-4 border-primary pl-4">Dados do Tomador</h4>
                      <div className="space-y-1 pl-5">
                        <p className="text-xl font-black text-slate-900">{selectedInvoice.clientName}</p>
                        <p className="text-sm font-bold text-slate-600">CPF/CNPJ: {selectedInvoice.clientDocument || "Não informado"}</p>
                        <p className="text-sm font-bold text-slate-600">Telefone: {selectedInvoice.clientPhone || "Não informado"}</p>
                        <p className="text-sm font-bold text-slate-600">E-mail: {selectedInvoice.clientEmail || "Não informado"}</p>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">{selectedInvoice.clientAddress || "Endereço não informado"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Itens */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary border-l-4 border-primary pl-4">Discriminação dos Serviços</h4>
                    <div className="border-2 border-slate-100 rounded-3xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b-2 border-slate-100">
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição do Serviço</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Unitário</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedInvoice.items?.map((item: any) => (
                            <tr key={item.id}>
                              <td className="p-6 font-bold text-slate-700">{item.description}</td>
                              <td className="p-6 text-center font-bold text-slate-600">{item.quantity}</td>
                              <td className="p-6 text-right font-bold text-slate-600">R$ {item.unitValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}</td>
                              <td className="p-6 text-right font-black text-slate-900">R$ {item.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totais e Observações */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary border-l-4 border-primary pl-4">Observações</h4>
                      <div className="p-6 bg-slate-50 rounded-3xl text-sm font-medium text-slate-600 leading-relaxed italic min-h-[100px]">
                        {selectedInvoice.observations || "Nenhuma observação adicional para este documento."}
                      </div>
                    </div>
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] space-y-6 shadow-xl">
                      <div className="flex justify-between text-sm font-bold opacity-60">
                        <span>Subtotal Serviços</span>
                        <span className="tabular-nums">R$ {selectedInvoice.subtotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold opacity-60">
                        <span>Impostos (ISS)</span>
                        <span className="tabular-nums">+ R$ {selectedInvoice.taxes?.iss?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-emerald-400">
                        <span>Descontos</span>
                        <span className="tabular-nums">- R$ {selectedInvoice.discount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}</span>
                      </div>
                      <Separator className="bg-white/10" />
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Valor Líquido</span>
                        <span className="text-4xl font-black tabular-nums">R$ {selectedInvoice.finalTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé do Print */}
                  <div className="pt-20 text-center space-y-6">
                    <div className="w-64 h-px bg-slate-200 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Assinatura do Prestador</p>
                    <p className="text-[9px] text-slate-300 uppercase tracking-widest pt-10">Documento gerado eletronicamente por DaniloPro</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-4 print:hidden">
              <Button variant="outline" className="flex-1 h-14 rounded-xl font-bold gap-2" onClick={() => setIsViewOpen(false)}>
                <X className="w-4 h-4" /> Fechar
              </Button>
              <Button className="flex-1 h-14 rounded-xl font-black gap-2 bg-primary shadow-lg" onClick={handlePrint}>
                <Printer className="w-5 h-5" /> Imprimir Nota
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
