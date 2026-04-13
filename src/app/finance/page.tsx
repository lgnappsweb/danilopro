"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Loader2,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Info,
  X,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Truck,
  CreditCard,
  Tag
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const entrySchema = z.object({
  type: z.enum(["revenue", "expense"]),
  date: z.string().min(1, "Data é obrigatória"),
  value: z.string().min(1, "Valor é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  paymentMethod: z.string().min(1, "Método de pagamento é obrigatório"),
  clientId: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.string().optional(),
})

type EntryFormValues = z.infer<typeof entrySchema>

const maskCurrency = (value: string) => {
  let v = value.replace(/\D/g, "");
  if (!v) return "";
  v = (Number(v) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });
  return v;
};

const parseCurrencyToNumber = (value: string) => {
  if (!value) return 0;
  return Number(value.replace(/\./g, "").replace(",", "."));
};

export default function FinancePage() {
  const db = useFirestore()
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false)
  const [isServiceTypeDialogOpen, setIsServiceTypeDialogOpen] = useState(false)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)

  const entriesQuery = useMemoFirebase(() => user ? query(collection(db, "financeiro_entradas"), orderBy("date", "desc")) : null, [db, user])
  const exitsQuery = useMemoFirebase(() => user ? query(collection(db, "financeiro_saidas"), orderBy("date", "desc")) : null, [db, user])
  const expenseCatsQuery = useMemoFirebase(() => user ? query(collection(db, "expense_categories"), orderBy("name", "asc")) : null, [db, user])
  const paymentMethodsQuery = useMemoFirebase(() => user ? query(collection(db, "payment_methods"), orderBy("name", "asc")) : null, [db, user])
  const serviceTypesQuery = useMemoFirebase(() => user ? query(collection(db, "service_types"), orderBy("name", "asc")) : null, [db, user])
  const clientsQuery = useMemoFirebase(() => user ? query(collection(db, "clientes"), orderBy("name", "asc")) : null, [db, user])
  const suppliersQuery = useMemoFirebase(() => user ? query(collection(db, "fornecedores"), orderBy("name", "asc")) : null, [db, user])

  const { data: revenues, isLoading: loadingRev } = useCollection(entriesQuery)
  const { data: expenses, isLoading: loadingExp } = useCollection(exitsQuery)
  const { data: expenseCats } = useCollection(expenseCatsQuery)
  const { data: paymentMethods } = useCollection(paymentMethodsQuery)
  const { data: serviceTypes } = useCollection(serviceTypesQuery)
  const { data: clients } = useCollection(clientsQuery)
  const { data: suppliers } = useCollection(suppliersQuery)

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      type: "revenue",
      date: format(new Date(), "yyyy-MM-dd"),
      status: "Pago",
      value: "",
      category: "",
      description: "",
      paymentMethod: "",
      clientId: "",
      supplierId: "",
    },
  })

  const entryType = form.watch("type")

  const allEntries = useMemo(() => {
    const revs = (revenues || []).map(r => ({ ...r, type: "revenue" as const }))
    const exps = (expenses || []).map(e => ({ ...e, type: "expense" as const }))
    
    let combined = [...revs, ...exps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (activeTab === "revenue") combined = combined.filter(e => e.type === "revenue")
    if (activeTab === "expense") combined = combined.filter(e => e.type === "expense")

    if (searchTerm) {
      combined = combined.filter(e => 
        (e.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.observations?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.category?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    return combined
  }, [revenues, expenses, activeTab, searchTerm])

  const totals = useMemo(() => {
    const totalRevenue = (revenues || []).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
    const totalExpense = (expenses || []).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
    return {
      revenue: totalRevenue,
      expense: totalExpense,
      balance: totalRevenue - totalExpense
    }
  }, [revenues, expenses])

  const onSubmit = (values: EntryFormValues) => {
    const collectionName = values.type === "revenue" ? "financeiro_entradas" : "financeiro_saidas"
    const colRef = collection(db, collectionName)
    const numericValue = parseCurrencyToNumber(values.value)
    
    const payload = {
      date: values.date,
      value: numericValue,
      paymentMethodId: values.paymentMethod,
      observations: values.description,
      status: values.status || "Pago",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(values.type === "expense" 
        ? { expenseCategoryId: values.category, description: values.description, supplierId: values.supplierId } 
        : { serviceTypeId: values.category, clientId: values.clientId }
      )
    }

    addDocumentNonBlocking(colRef, payload)
    setIsDialogOpen(false)
    form.reset()
  }

  const handleDelete = (id: string, type: "revenue" | "expense") => {
    const collectionName = type === "revenue" ? "financeiro_entradas" : "financeiro_saidas"
    const docRef = doc(db, collectionName, id)
    deleteDocumentNonBlocking(docRef)
  }

  const isLoading = loadingRev || loadingExp

  return (
    <DashboardLayout>
      <div className="space-y-10 animate-in fade-in duration-500 overflow-x-hidden w-full max-w-full">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="space-y-3 w-full">
            <Badge variant="outline" className="px-4 py-1 border-emerald-500/30 text-emerald-500 font-black uppercase tracking-widest text-[10px] bg-emerald-500/5">
              Gestão de Caixa
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black font-headline tracking-tighter text-center break-words px-4">Financeiro</h1>
            <p className="text-base md:text-xl text-muted-foreground text-center max-w-2xl mx-auto px-4 leading-relaxed">
              Controle absoluto de entradas e saídas para uma visão clara da saúde do seu negócio.
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) form.reset()
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto gap-3 bg-primary shadow-2xl shadow-primary/20 text-xl py-8 px-12 h-auto font-black rounded-[2rem] transition-all hover:scale-105 active:scale-95">
                <Plus className="w-7 h-7" /> Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className={cn(
                "p-8 pb-12 transition-colors duration-500",
                entryType === "revenue" ? "bg-emerald-500/10" : "bg-destructive/10"
              )}>
                <DialogHeader className="text-center">
                  <div className={cn(
                    "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl border-4 border-white/20 transition-all",
                    entryType === "revenue" ? "bg-emerald-500/20" : "bg-destructive/20"
                  )}>
                    {entryType === "revenue" ? <TrendingUp className="w-10 h-10 text-emerald-500" /> : <TrendingDown className="w-10 h-10 text-destructive" />}
                  </div>
                  <DialogTitle className="text-3xl font-black text-center w-full">
                    {entryType === "revenue" ? "Nova Receita" : "Nova Despesa"}
                  </DialogTitle>
                  <DialogDescription className="text-center text-base font-medium opacity-70">
                    {entryType === "revenue" 
                      ? "Registre o faturamento proveniente de seus serviços." 
                      : "Registre os custos e gastos operacionais do seu negócio."}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-8 -mt-8 bg-background rounded-t-[3rem] relative">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-6">
                      <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Natureza do Lançamento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-16 text-xl font-bold bg-muted/20 border-2 rounded-2xl px-6">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="revenue" className="py-3 font-bold text-emerald-500">Entrada (Faturamento)</SelectItem>
                              <SelectItem value="expense" className="py-3 font-bold text-destructive">Saída (Gasto)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <Separator className="opacity-50" />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {entryType === "revenue" ? (
                          <>
                            <FormField control={form.control} name="clientId" render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <div className="flex items-center justify-between">
                                  <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <User className="w-4 h-4" /> Cliente Beneficiário
                                  </FormLabel>
                                  <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black hover:bg-primary/10 hover:text-primary gap-1">
                                        <Plus className="w-3 h-3" /> NOVO
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[400px] rounded-[2rem]">
                                      <DialogHeader>
                                        <DialogTitle>Novo Cliente</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <FormLabel>Nome do Cliente</FormLabel>
                                          <Input id="new-client-fin" placeholder="Ex: João Silva" />
                                        </div>
                                        <Button 
                                          className="w-full" 
                                          onClick={async () => {
                                            const name = (document.getElementById('new-client-fin') as HTMLInputElement).value;
                                            if (name) {
                                              const docRef = await addDocumentNonBlocking(collection(db, "clientes"), { 
                                                name, 
                                                createdAt: new Date().toISOString() 
                                              });
                                              if (docRef) {
                                                form.setValue("clientId", docRef.id);
                                                setIsClientDialogOpen(false);
                                              }
                                              (document.getElementById('new-client-fin') as HTMLInputElement).value = "";
                                            }
                                          }}
                                        >
                                          Cadastrar
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6">
                                      <SelectValue placeholder="Selecione o cliente..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="category" render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                  <div className="flex items-center gap-2"><Tag className="w-4 h-4" /> Tipo de Serviço</div>
                                  <Dialog open={isServiceTypeDialogOpen} onOpenChange={setIsServiceTypeDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black hover:bg-primary/10 hover:text-primary gap-1">
                                        <Plus className="w-3 h-3" /> NOVO
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[400px] rounded-[2rem]">
                                      <DialogHeader>
                                        <DialogTitle>Novo Tipo de Serviço</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="flex gap-2">
                                          <Input id="new-service-type-fin" placeholder="Nome do serviço" />
                                          <Button 
                                            onClick={async () => {
                                              const name = (document.getElementById('new-service-type-fin') as HTMLInputElement).value;
                                              if (name) {
                                                const docRef = await addDocumentNonBlocking(collection(db, "service_types"), { name, createdAt: new Date().toISOString() });
                                                if (docRef) {
                                                  form.setValue("category", docRef.id);
                                                  setIsServiceTypeDialogOpen(false);
                                                }
                                                (document.getElementById('new-service-type-fin') as HTMLInputElement).value = "";
                                              }
                                            }}
                                          >
                                            Cadastrar
                                          </Button>
                                        </div>

                                        <Separator />

                                        <div className="space-y-2">
                                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Serviços Existentes</Label>
                                          <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                                            {serviceTypes?.map(type => (
                                              <div key={type.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg group">
                                                <span className="text-sm font-medium">{type.name}</span>
                                                <Button 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                  onClick={() => deleteDocumentNonBlocking(doc(db, "service_types", type.id))}
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            ))}
                                            {(!serviceTypes || serviceTypes.length === 0) && (
                                              <p className="text-xs text-center py-4 text-muted-foreground italic">Nenhum serviço cadastrado.</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6">
                                      <SelectValue placeholder="Qual serviço gerou a receita?" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {serviceTypes?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </>
                        ) : (
                          <>
                            <FormField control={form.control} name="category" render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                  <div className="flex items-center gap-2"><Tag className="w-4 h-4" /> Categoria de Despesa</div>
                                  <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black hover:bg-primary/10 hover:text-primary gap-1">
                                        <Plus className="w-3 h-3" /> NOVA
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[400px] rounded-[2rem]">
                                      <DialogHeader>
                                        <DialogTitle>Nova Categoria de Despesa</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="flex gap-2">
                                          <Input id="new-expense-cat-fin" placeholder="Nome da categoria" />
                                          <Button 
                                            onClick={async () => {
                                              const name = (document.getElementById('new-expense-cat-fin') as HTMLInputElement).value;
                                              if (name) {
                                                const docRef = await addDocumentNonBlocking(collection(db, "expense_categories"), { name, createdAt: new Date().toISOString() });
                                                if (docRef) {
                                                  form.setValue("category", docRef.id);
                                                  setIsCategoryDialogOpen(false);
                                                }
                                                (document.getElementById('new-expense-cat-fin') as HTMLInputElement).value = "";
                                              }
                                            }}
                                          >
                                            Cadastrar
                                          </Button>
                                        </div>

                                        <Separator />

                                        <div className="space-y-2">
                                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Categorias Existentes</Label>
                                          <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                                            {expenseCats?.map(cat => (
                                              <div key={cat.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg group">
                                                <span className="text-sm font-medium">{cat.name}</span>
                                                <Button 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                  onClick={() => deleteDocumentNonBlocking(doc(db, "expense_categories", cat.id))}
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            ))}
                                            {(!expenseCats || expenseCats.length === 0) && (
                                              <p className="text-xs text-center py-4 text-muted-foreground italic">Nenhuma categoria cadastrada.</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6">
                                      <SelectValue placeholder="Onde o dinheiro foi gasto?" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {expenseCats?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="supplierId" render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <div className="flex items-center justify-between">
                                  <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Truck className="w-4 h-4" /> Fornecedor Vinculado
                                  </FormLabel>
                                  <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black hover:bg-primary/10 hover:text-primary gap-1">
                                        <Plus className="w-3 h-3" /> NOVO
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[400px] rounded-[2rem]">
                                      <DialogHeader>
                                        <DialogTitle>Novo Fornecedor</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                          <FormLabel>Nome do Fornecedor</FormLabel>
                                          <Input id="new-supplier-fin" placeholder="Ex: Elétrica Central" />
                                        </div>
                                        <div className="space-y-2">
                                          <FormLabel>Ramo / Categoria</FormLabel>
                                          <Input id="new-supplier-cat-fin" placeholder="Ex: Elétrica, Hidráulica" />
                                        </div>
                                        <Button 
                                          className="w-full" 
                                          onClick={async () => {
                                            const name = (document.getElementById('new-supplier-fin') as HTMLInputElement).value;
                                            const category = (document.getElementById('new-supplier-cat-fin') as HTMLInputElement).value;
                                            if (name) {
                                              const docRef = await addDocumentNonBlocking(collection(db, "fornecedores"), { 
                                                name, 
                                                category,
                                                createdAt: new Date().toISOString() 
                                              });
                                              if (docRef) {
                                                form.setValue("supplierId", docRef.id);
                                                setIsSupplierDialogOpen(false);
                                              }
                                              (document.getElementById('new-supplier-fin') as HTMLInputElement).value = "";
                                              (document.getElementById('new-supplier-cat-fin') as HTMLInputElement).value = "";
                                            }
                                          }}
                                        >
                                          Cadastrar
                                        </Button>

                                        <Separator />

                                        <div className="space-y-2">
                                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fornecedores Existentes</Label>
                                          <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                                            {suppliers?.map(sup => (
                                              <div key={sup.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg group">
                                                <div className="flex flex-col">
                                                  <span className="text-sm font-medium">{sup.name}</span>
                                                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{sup.category}</span>
                                                </div>
                                                <Button 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                  onClick={() => deleteDocumentNonBlocking(doc(db, "fornecedores", sup.id))}
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            ))}
                                            {(!suppliers || suppliers.length === 0) && (
                                              <p className="text-xs text-center py-4 text-muted-foreground italic">Nenhum fornecedor cadastrado.</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6">
                                      <SelectValue placeholder="Selecione o fornecedor (opcional)" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </>
                        )}

                        <FormField control={form.control} name="date" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Data do Fluxo</FormLabel>
                            <FormControl><Input className="h-14 bg-muted/20 border-2 rounded-xl px-6" type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="value" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Valor Bruto (R$)</FormLabel>
                            <FormControl><Input className={cn("h-14 bg-muted/20 border-2 rounded-xl text-right font-black px-6 text-xl", entryType === "revenue" ? "text-emerald-500" : "text-destructive")} placeholder="0,00" {...field} onChange={(e) => field.onChange(maskCurrency(e.target.value))} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                              <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Meio de Pagamento</div>
                              <Dialog open={isPaymentMethodDialogOpen} onOpenChange={setIsPaymentMethodDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black hover:bg-primary/10 hover:text-primary gap-1">
                                    <Plus className="w-3 h-3" /> NOVO
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[400px] rounded-[2rem]">
                                  <DialogHeader>
                                    <DialogTitle>Novo Meio de Pagamento</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="flex gap-2">
                                      <Input id="new-payment-method-fin" placeholder="Ex: Pix, Cartão..." />
                                      <Button 
                                        onClick={async () => {
                                          const name = (document.getElementById('new-payment-method-fin') as HTMLInputElement).value;
                                          if (name) {
                                            const docRef = await addDocumentNonBlocking(collection(db, "payment_methods"), { name, createdAt: new Date().toISOString() });
                                            if (docRef) {
                                              form.setValue("paymentMethod", docRef.id);
                                              setIsPaymentMethodDialogOpen(false);
                                            }
                                            (document.getElementById('new-payment-method-fin') as HTMLInputElement).value = "";
                                          }
                                        }}
                                      >
                                        Cadastrar
                                      </Button>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Métodos Existentes</Label>
                                      <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                                        {paymentMethods?.map(method => (
                                          <div key={method.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg group">
                                            <span className="text-sm font-medium">{method.name}</span>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={() => deleteDocumentNonBlocking(doc(db, "payment_methods", method.id))}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        ))}
                                        {(!paymentMethods || paymentMethods.length === 0) && (
                                          <p className="text-xs text-center py-4 text-muted-foreground italic">Nenhum método cadastrado.</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-14 font-bold bg-muted/20 border-2 rounded-2xl px-6">
                                  <SelectValue placeholder="Como foi/será pago?" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {paymentMethods?.map(method => <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="description" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Observações / Detalhamento</FormLabel>
                            <FormControl><Input className="h-14 bg-muted/20 border-2 rounded-2xl px-6" placeholder="Ex: Pagamento referente ao projeto X..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <Button 
                        type="submit" 
                        className={cn(
                          "w-full h-20 text-2xl font-black shadow-2xl rounded-[1.5rem] transition-all",
                          entryType === "revenue" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-destructive hover:bg-destructive/90"
                        )}
                      >
                        Confirmar Lançamento
                      </Button>
                      <DialogClose asChild>
                        <Button variant="ghost" className="w-full h-14 font-bold text-muted-foreground hover:bg-muted rounded-2xl gap-2">
                          <X className="w-4 h-4" /> Cancelar e Sair
                        </Button>
                      </DialogClose>
                    </div>
                  </form>
                </Form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3 px-2 sm:px-0">
          <Card className="bg-emerald-500/5 border-emerald-500/20 p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden group transition-all hover:scale-[1.02]">
            <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 text-emerald-500 transition-transform group-hover:scale-110" />
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">Total de Receitas</p>
            <div className="text-2xl md:text-4xl font-black break-words">R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20 p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden group transition-all hover:scale-[1.02]">
            <TrendingDown className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 text-destructive transition-transform group-hover:scale-110" />
            <p className="text-[10px] font-black text-destructive uppercase tracking-[0.3em] mb-2">Total de Despesas</p>
            <div className="text-2xl md:text-4xl font-black break-words">R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </Card>
          <Card className={cn("p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden group border-2 transition-all hover:scale-[1.02]", totals.balance >= 0 ? "bg-primary/5 border-primary/20" : "bg-orange-500/5 border-orange-500/30")}>
            <DollarSign className={cn("absolute -right-4 -bottom-4 w-32 h-32 opacity-5 transition-transform group-hover:scale-110", totals.balance >= 0 ? "text-primary" : "text-orange-500")} />
            <p className={cn("text-[10px] font-black uppercase tracking-[0.3em] mb-2", totals.balance >= 0 ? "text-primary" : "text-orange-500")}>Saldo Disponível</p>
            <div className={cn("text-2xl md:text-4xl font-black break-words", totals.balance >= 0 ? "text-primary" : "text-orange-500")}>
              R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </Card>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full px-2 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <TabsList className="grid grid-cols-3 h-auto p-1.5 rounded-[2rem] bg-muted/50 w-full md:w-[500px] border-2 border-primary/10 gap-1.5">
              <TabsTrigger value="all" className="rounded-2xl py-4 text-sm font-black data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm min-w-0 truncate">Todos</TabsTrigger>
              <TabsTrigger value="revenue" className="rounded-2xl py-4 text-sm font-black data-[state=active]:bg-emerald-500 data-[state=active]:text-white shadow-sm min-w-0 truncate">Receitas</TabsTrigger>
              <TabsTrigger value="expense" className="rounded-2xl py-4 text-sm font-black data-[state=active]:bg-destructive data-[state=active]:text-white shadow-sm min-w-0 truncate">Despesas</TabsTrigger>
            </TabsList>
            <div className="relative group w-full md:max-w-md">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Buscar movimentação..." 
                className="pl-16 h-16 text-lg md:text-xl font-medium bg-card border-2 border-primary/10 focus-visible:ring-primary rounded-3xl shadow-sm transition-all w-full" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <Card className="hidden md:block overflow-hidden border-4 rounded-[3rem] p-4 bg-card w-full shadow-lg">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-muted-foreground py-6 px-6 w-[120px]">Data</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-muted-foreground py-6 w-[100px]">Tipo</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-muted-foreground py-6 w-[180px]">Categoria</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-muted-foreground py-6">Descrição</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] text-muted-foreground py-6 text-right w-[200px]">Valor</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <Loader2 className="h-16 w-16 animate-spin text-primary opacity-50" />
                          <span className="text-xl font-black uppercase tracking-widest text-muted-foreground">Sincronizando...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : allEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center text-muted-foreground text-xl font-medium">
                        Nenhuma movimentação registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allEntries.map((item) => (
                      <TableRow key={item.id} className="group border-b last:border-0 hover:bg-muted/30 transition-colors h-24">
                        <TableCell className="font-black text-lg px-6">
                          {format(new Date(item.date), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {item.type === "revenue" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-0 font-black text-[9px] uppercase tracking-widest px-3 py-1">Receita</Badge>
                          ) : (
                            <Badge className="bg-destructive/10 text-destructive border-0 font-black text-[9px] uppercase tracking-widest px-3 py-1">Despesa</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-muted-foreground text-sm truncate block max-w-[160px]">
                            {item.type === "revenue" 
                              ? serviceTypes?.find(s => s.id === item.serviceTypeId)?.name || "Serviço"
                              : expenseCats?.find(e => e.id === item.expenseCategoryId)?.name || "Geral"
                            }
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="block font-black text-lg truncate max-w-[300px] lg:max-w-[500px]">
                              {item.observations || item.description || "Sem descrição"}
                            </span>
                            {item.clientId && (
                              <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1 mt-1">
                                <User className="w-3 h-3" /> {clients?.find(c => c.id === item.clientId)?.name || "Cliente"}
                              </span>
                            )}
                            {item.supplierId && (
                              <span className="text-xs font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                                <Truck className="w-3 h-3" /> {suppliers?.find(s => s.id === item.supplierId)?.name || "Fornecedor"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-right font-black text-xl md:text-2xl tabular-nums", item.type === "revenue" ? "text-emerald-500" : "text-destructive")}>
                          {item.type === "revenue" ? "+" : "-"} R$ {Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 transition-all text-destructive hover:bg-destructive hover:text-white h-12 w-12 rounded-2xl"
                            onClick={() => handleDelete(item.id, item.type)}
                          >
                            <Trash2 className="w-6 h-6" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="md:hidden space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                  <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">Sincronizando...</span>
                </div>
              ) : allEntries.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground font-medium border-2 border-dashed rounded-[2rem]">
                  Nenhuma movimentação.
                </div>
              ) : (
                allEntries.map((item) => (
                  <Card key={item.id} className="p-6 rounded-[2rem] border-2 group active:scale-[0.98] transition-all bg-card shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        {/* Name at the very top and larger */}
                        {item.clientId ? (
                          <h3 className="font-black text-2xl leading-tight break-words pr-2 text-primary">
                            {clients?.find(c => c.id === item.clientId)?.name || "Cliente"}
                          </h3>
                        ) : item.supplierId ? (
                          <h3 className="font-black text-2xl leading-tight break-words pr-2 text-orange-500">
                            {suppliers?.find(s => s.id === item.supplierId)?.name || "Fornecedor"}
                          </h3>
                        ) : (
                          <h3 className="font-black text-2xl leading-tight break-words pr-2">
                            {item.observations || item.description || "Sem descrição"}
                          </h3>
                        )}

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">
                              {format(new Date(item.date), "dd MMMM yyyy", { locale: ptBR })}
                            </span>
                          </div>

                          {(item.clientId || item.supplierId) && (
                            <p className="text-xs font-bold text-muted-foreground leading-tight">
                              {item.observations || item.description || "Sem descrição"}
                            </p>
                          )}

                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            {item.type === "revenue" 
                              ? serviceTypes?.find(s => s.id === item.serviceTypeId)?.name || "Serviço"
                              : expenseCats?.find(e => e.id === item.expenseCategoryId)?.name || "Geral"
                            }
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive h-10 w-10 rounded-xl bg-destructive/5 shrink-0"
                        onClick={() => handleDelete(item.id, item.type)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-primary/5">
                      {item.type === "revenue" ? (
                        <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                          <ArrowUpRight className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Entrada</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-3 py-1 rounded-full">
                          <ArrowDownRight className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Saída</span>
                        </div>
                      )}
                      <div className={cn("text-xl font-black tabular-nums", item.type === "revenue" ? "text-emerald-500" : "text-destructive")}>
                        {item.type === "revenue" ? "+" : "-"} R$ {Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
