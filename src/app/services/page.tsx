"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Calendar, User, Settings2, CheckCircle, Clock, XCircle, Loader2, Trash2, Pencil, MoreVertical, DollarSign, Info, CheckCircle2, X, Package, Truck, Share2, FileDown, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
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
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc, increment, updateDoc } from "firebase/firestore"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Separator } from "@/components/ui/separator"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

const serviceSchema = z.object({
  clientId: z.string().min(1, "Cliente é obrigatório"),
  serviceTypeId: z.string().min(1, "Tipo de serviço é obrigatório"),
  scheduledDate: z.string().min(1, "Data é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
  chargedValue: z.string().min(1, "Valor é obrigatório"),
  observations: z.string().optional(),
  materials: z.array(z.object({
    productId: z.string().min(1, "Produto é obrigatório"),
    quantity: z.coerce.number().min(0.001, "Quantidade deve ser maior que zero"),
  })).default([]),
})

type ServiceFormValues = z.infer<typeof serviceSchema>

const maskCurrency = (value: string) => {
  let v = value.replace(/\D/g, "");
  v = (Number(v) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });
  return v;
};

const parseCurrencyToNumber = (value: string) => {
  return Number(value.replace(/\./g, "").replace(",", "."));
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Concluído":
      return <Badge className="bg-primary/10 text-primary border-primary/30 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]"><CheckCircle className="w-3 h-3 mr-2" /> {status}</Badge>
    case "Em andamento":
      return <Badge className="bg-secondary/10 text-secondary border-secondary/30 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]"><Clock className="w-3 h-3 mr-2" /> {status}</Badge>
    case "Agendado":
      return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]"><Calendar className="w-3 h-3 mr-2" /> {status}</Badge>
    case "Cancelado":
      return <Badge className="bg-destructive/10 text-destructive border-destructive/30 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]"><XCircle className="w-3 h-3 mr-2" /> {status}</Badge>
    default:
      return <Badge variant="outline" className="px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">{status}</Badge>
  }
}

export default function ServicesPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<any | null>(null)
  const [viewingService, setViewingService] = useState<any | null>(null)
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)

  const servicesQuery = useMemoFirebase(() => user ? query(collection(db, "servicos"), orderBy("createdAt", "desc")) : null, [db, user])
  const clientsQuery = useMemoFirebase(() => user ? collection(db, "clientes") : null, [db, user])
  const serviceTypesQuery = useMemoFirebase(() => user ? collection(db, "service_types") : null, [db, user])
  const productsQuery = useMemoFirebase(() => user ? query(collection(db, "estoque"), orderBy("name", "asc")) : null, [db, user])

  const { data: services, isLoading } = useCollection(servicesQuery)
  const { data: clients } = useCollection(clientsQuery)
  const { data: serviceTypes } = useCollection(serviceTypesQuery)
  const { data: products } = useCollection(productsQuery)

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      status: "Agendado",
      scheduledDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      chargedValue: "",
      clientId: "",
      serviceTypeId: "",
      observations: "",
      materials: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "materials",
  })

  const filteredServices = useMemo(() => {
    if (!services) return []
    return services.filter(s => {
      const clientName = clients?.find(c => c.id === s.clientId)?.name?.toLowerCase() || ""
      const typeName = serviceTypes?.find(t => t.id === s.serviceTypeId)?.name?.toLowerCase() || ""
      return clientName.includes(searchTerm.toLowerCase()) || typeName.includes(searchTerm.toLowerCase())
    })
  }, [services, clients, serviceTypes, searchTerm])

  const onSubmit = async (values: ServiceFormValues) => {
    const colRef = collection(db, "servicos")
    const numericValue = parseCurrencyToNumber(values.chargedValue)
    
    const payload = {
      ...values,
      chargedValue: numericValue,
      updatedAt: new Date().toISOString(),
    }

    // Stock deduction logic
    const handleStockAdjustment = async (oldMaterials: any[] = [], newMaterials: any[] = []) => {
      // Map old materials for easy lookup
      const oldMap = new Map(oldMaterials.map(m => [m.productId, m.quantity]))
      // Map new materials
      const newMap = new Map(newMaterials.map(m => [m.productId, m.quantity]))

      // All unique product IDs involved
      const allProductIds = new Set([...oldMap.keys(), ...newMap.keys()])

      for (const productId of allProductIds) {
        const oldQty = oldMap.get(productId) || 0
        const newQty = newMap.get(productId) || 0
        const diff = newQty - oldQty

        if (diff !== 0) {
          // Deduct the difference from stock
          // If diff > 0, we used more material, so we subtract from stock
          // If diff < 0, we used less material, so we add back to stock
          await updateDoc(doc(db, "estoque", productId), {
            currentQuantity: increment(-diff)
          }).catch(err => console.error(`Erro ao atualizar estoque para ${productId}:`, err))
        }
      }
    }

    if (editingService) {
      await handleStockAdjustment(editingService.materials || [], values.materials)
      updateDocumentNonBlocking(doc(db, "servicos", editingService.id), payload)
    } else {
      await handleStockAdjustment([], values.materials)
      addDocumentNonBlocking(colRef, { ...payload, createdAt: new Date().toISOString() })
    }

    setIsDialogOpen(false)
    setEditingService(null)
    form.reset()
  }

  const handleEdit = (service: any) => {
    setEditingService(service)
    form.reset({
      clientId: service.clientId,
      serviceTypeId: service.serviceTypeId,
      scheduledDate: service.scheduledDate,
      status: service.status,
      chargedValue: maskCurrency(String(service.chargedValue * 100)),
      observations: service.observations || "",
      materials: service.materials || [],
    })
    setIsDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (serviceToDelete) {
      const service = services?.find(s => s.id === serviceToDelete)
      if (service && service.materials && service.materials.length > 0) {
        for (const m of service.materials) {
          await updateDoc(doc(db, "estoque", m.productId), {
            currentQuantity: increment(m.quantity)
          }).catch(err => console.error(`Erro ao retornar estoque para ${m.productId}:`, err))
        }
      }
      deleteDocumentNonBlocking(doc(db, "servicos", serviceToDelete))
      setServiceToDelete(null)
    }
  }

  const profileRef = useMemoFirebase(() => (user ? doc(db, "usuarios", user.uid) : null), [db, user?.uid])
  const { data: profile } = useDoc(profileRef)
  const appName = profile?.customAppName || "DaniloPro"

  const shareOnWhatsApp = (service: any) => {
    const client = clients?.find(c => c.id === service.clientId)
    const serviceType = serviceTypes?.find(t => t.id === service.serviceTypeId)
    const date = service.scheduledDate ? format(new Date(service.scheduledDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"
    
    const text = `*🛠️ DETALHES DO SERVIÇO - ${appName.toUpperCase()}*

👤 *Cliente:* ${client?.name || "N/A"}
📝 *Serviço:* ${serviceType?.name || "N/A"}
📅 *Data/Hora:* ${date}
💰 *Valor:* R$ ${Number(service.chargedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📊 *Status:* ${service.status}

📋 *Observações:*
${service.observations || "Nenhuma observação."}

📦 *Materiais:*
${service.materials?.length > 0 
  ? service.materials.map((m: any) => {
      const product = products?.find(p => p.id === m.productId)
      return `- ${m.quantity}x ${product?.name || "Material"}`
    }).join('\n')
  : "Nenhum material utilizado."}

---
_Gerado por ${appName}_`

    const encodedText = encodeURIComponent(text)
    window.open(`https://wa.me/?text=${encodedText}`, '_blank')
  }

  const generatePDF = (service: any) => {
    const client = clients?.find(c => c.id === service.clientId)
    const serviceType = serviceTypes?.find(t => t.id === service.serviceTypeId)
    const date = service.scheduledDate ? format(new Date(service.scheduledDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"
    
    const doc = new jsPDF()
    
    // Header
    doc.setFillColor(249, 115, 22) // Orange-500
    doc.rect(0, 0, 210, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text(appName.toUpperCase(), 20, 25)
    
    doc.setFontSize(10)
    doc.text("ORDEM DE SERVIÇO", 160, 25)
    
    // Body
    doc.setTextColor(31, 41, 55) // Gray-800
    doc.setFontSize(12)
    doc.text("DADOS DO CLIENTE", 20, 55)
    doc.line(20, 58, 190, 58)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Nome: ${client?.name || "N/A"}`, 20, 65)
    doc.text(`Telefone: ${client?.phone || "N/A"}`, 20, 72)
    doc.text(`Documento: ${client?.documentNumber || "N/A"}`, 20, 79)
    
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("DETALHES DO SERVIÇO", 20, 95)
    doc.line(20, 98, 190, 98)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Tipo de Serviço: ${serviceType?.name || "N/A"}`, 20, 105)
    doc.text(`Data e Hora: ${date}`, 20, 112)
    doc.text(`Status: ${service.status}`, 20, 119)
    doc.text(`Valor Total: R$ ${Number(service.chargedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 126)
    
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("OBSERVAÇÕES", 20, 142)
    doc.line(20, 145, 190, 145)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const obsLines = doc.splitTextToSize(service.observations || "Nenhuma observação.", 170)
    doc.text(obsLines, 20, 152)
    
    // Materials Table
    if (service.materials && service.materials.length > 0) {
      const tableData = service.materials.map((m: any) => {
        const product = products?.find(p => p.id === m.productId)
        return [product?.name || "Material", m.quantity, product?.unit || "un"]
      })
      
      autoTable(doc, {
        startY: 170,
        head: [['Material', 'Quantidade', 'Unidade']],
        body: tableData,
        headStyles: { fillColor: [249, 115, 22] },
        theme: 'striped'
      })
    }
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(156, 163, 175)
      doc.text(`Gerado por ${appName} em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 285)
      doc.text(`Página ${i} de ${pageCount}`, 180, 285)
    }
    
    doc.save(`servico-${client?.name || 'sem-nome'}-${format(new Date(), "dd-MM-yyyy")}.pdf`)
  }

  return (
    <DashboardLayout>
      <div className="space-y-10 animate-in fade-in duration-500 overflow-x-hidden">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="space-y-3 w-full">
            <Badge variant="outline" className="px-4 py-1 border-orange-500/30 text-orange-500 font-black uppercase tracking-widest text-[10px] bg-orange-500/5">
              Gestão Operacional
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black font-headline tracking-tighter text-center">Serviços</h1>
            <p className="text-base md:text-xl text-muted-foreground text-center max-w-2xl mx-auto">
              Controle seus agendamentos, ordens de serviço e histórico de atendimentos.
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingService(null)
              form.reset()
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto gap-3 bg-primary shadow-2xl shadow-primary/20 text-xl py-8 px-12 h-auto font-black rounded-[2rem] transition-all hover:scale-105 active:scale-95">
                <Plus className="w-7 h-7" /> Serviço
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="p-8 pb-12 bg-orange-500/10">
                <DialogHeader className="text-center">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl border-4 border-white/20 bg-orange-500/20">
                    <Settings2 className="w-10 h-10 text-orange-500" />
                  </div>
                  <DialogTitle className="text-3xl font-black text-center w-full">
                    {editingService ? "Editar Serviço" : "Serviço"}
                  </DialogTitle>
                  <DialogDescription className="text-center text-base font-medium opacity-70">
                    Preencha os detalhes técnicos e financeiros do serviço.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-8 -mt-8 bg-background rounded-t-[3rem] relative">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="clientId" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Cliente</FormLabel>
                              <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black uppercase tracking-widest gap-1 hover:bg-primary/10 hover:text-primary">
                                    <Plus className="w-3 h-3" /> Novo Cliente
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[2rem]">
                                  <DialogHeader>
                                    <DialogTitle>Novo Cliente</DialogTitle>
                                    <DialogDescription>Cadastre um novo cliente rapidamente.</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <FormLabel>Nome do Cliente</FormLabel>
                                      <Input id="new-client-name" placeholder="Ex: João Silva" />
                                    </div>
                                    <div className="space-y-2">
                                      <FormLabel>Telefone (opcional)</FormLabel>
                                      <Input id="new-client-phone" placeholder="(00) 00000-0000" />
                                    </div>
                                    <Button 
                                      className="w-full" 
                                      onClick={async () => {
                                        const nameInput = document.getElementById("new-client-name") as HTMLInputElement;
                                        const phoneInput = document.getElementById("new-client-phone") as HTMLInputElement;
                                        if (nameInput.value) {
                                          const docRef = await addDocumentNonBlocking(collection(db, "clientes"), { 
                                            name: nameInput.value,
                                            phone: phoneInput.value,
                                            createdAt: new Date().toISOString()
                                          });
                                          if (docRef) {
                                            form.setValue("clientId", docRef.id);
                                            setIsClientDialogOpen(false);
                                          }
                                          nameInput.value = "";
                                          phoneInput.value = "";
                                        }
                                      }}
                                    >
                                      Cadastrar Cliente
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-14 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6">
                                  <SelectValue placeholder="Selecione o cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="serviceTypeId" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Tipo de Serviço</FormLabel>
                              <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black uppercase tracking-widest gap-1 hover:bg-primary/10 hover:text-primary">
                                    <Plus className="w-3 h-3" /> Novo Tipo
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[2rem]">
                                  <DialogHeader>
                                    <DialogTitle>Novo Tipo de Serviço</DialogTitle>
                                    <DialogDescription>Cadastre um novo tipo de serviço para selecionar na lista.</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <FormLabel>Nome do Tipo</FormLabel>
                                      <Input id="new-service-type" placeholder="Ex: Manutenção Preventiva" />
                                    </div>
                                    <Button 
                                      className="w-full" 
                                      onClick={async () => {
                                        const input = document.getElementById("new-service-type") as HTMLInputElement;
                                        if (input.value) {
                                          const docRef = await addDocumentNonBlocking(collection(db, "service_types"), { 
                                            name: input.value,
                                            createdAt: new Date().toISOString()
                                          });
                                          if (docRef) {
                                            form.setValue("serviceTypeId", docRef.id);
                                            setIsTypeDialogOpen(false);
                                          }
                                          input.value = "";
                                        }
                                      }}
                                    >
                                      Cadastrar Tipo
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-14 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6">
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {serviceTypes?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Data/Hora</FormLabel>
                            <FormControl><Input className="h-14 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6" type="datetime-local" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="chargedValue" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Valor (R$)</FormLabel>
                            <FormControl>
                              <Input 
                                className="h-14 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6" 
                                placeholder="0,00"
                                {...field}
                                onChange={(e) => field.onChange(maskCurrency(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="status" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Status Inicial</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-14 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6"><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Agendado">Agendado</SelectItem>
                                <SelectItem value="Em andamento">Em andamento</SelectItem>
                                <SelectItem value="Concluído">Concluído</SelectItem>
                                <SelectItem value="Cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <Separator className="bg-primary/5" />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Materiais Utilizados</FormLabel>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-xl gap-2 font-bold"
                            onClick={() => append({ productId: "", quantity: 1 })}
                          >
                            <Plus className="w-4 h-4" /> Adicionar Material
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-3 items-start animate-in slide-in-from-top-2 duration-300">
                              <FormField
                                control={form.control}
                                name={`materials.${index}.productId`}
                                render={({ field: productField }) => (
                                  <FormItem className="flex-1">
                                    <Select onValueChange={productField.onChange} value={productField.value}>
                                      <FormControl>
                                        <SelectTrigger className="h-12 bg-muted/20 border-2 rounded-xl">
                                          <SelectValue placeholder="Selecione o material" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {products?.map(p => (
                                          <SelectItem key={p.id} value={p.id}>
                                            {p.name} ({p.currentQuantity} {p.unit})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`materials.${index}.quantity`}
                                render={({ field: qtyField }) => (
                                  <FormItem className="w-24">
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="any" 
                                        className="h-12 text-center font-bold bg-muted/20 border-2 rounded-xl" 
                                        placeholder="Qtd"
                                        {...qtyField} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-12 w-12 rounded-xl text-destructive hover:bg-destructive/10"
                                onClick={() => remove(index)}
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </div>
                          ))}
                          {fields.length === 0 && (
                            <div className="text-center py-6 border-2 border-dashed rounded-2xl bg-muted/5">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nenhum material adicionado</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator className="bg-primary/5" />

                      <FormField control={form.control} name="observations" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Observações do Trabalho</FormLabel>
                          <FormControl><Input className="h-14 bg-muted/20 border-2 rounded-2xl px-6" placeholder="Detalhes específicos do serviço..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <Button type="submit" className="w-full h-20 text-2xl font-black shadow-2xl rounded-[1.5rem] transition-all">
                        {editingService ? "Salvar Alterações" : "Confirmar Agendamento"}
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

        <div className="relative group w-full max-w-3xl mx-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Filtrar por cliente ou tipo de serviço..." 
            className="pl-16 h-16 text-xl font-medium bg-card border-2 border-primary/10 focus-visible:ring-primary rounded-3xl shadow-sm transition-all" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <Loader2 className="w-16 h-16 animate-spin text-primary opacity-50" />
            <p className="text-xl text-muted-foreground font-black uppercase tracking-[0.2em]">Sincronizando Dados...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-32 border-4 border-dashed rounded-[3rem] bg-muted/10 w-full mx-auto space-y-6">
            <div className="bg-muted w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Settings2 className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-2xl">Nenhum serviço encontrado</h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                {searchTerm ? "Tente buscar por termos diferentes." : "Sua agenda está vazia. Adicione seu primeiro serviço para começar o controle operacional."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredServices.map((service) => {
              const client = clients?.find(c => c.id === service.clientId)
              const serviceType = serviceTypes?.find(t => t.id === service.serviceTypeId)
              const formattedDate = service.scheduledDate ? format(new Date(service.scheduledDate), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"

              return (
                <div key={service.id} className="cursor-pointer" onClick={() => setViewingService(service)}>
                  <Card className="group hover:border-orange-500 transition-all duration-500 shadow-sm hover:shadow-2xl bg-card border-2 rounded-[2.5rem] p-0 overflow-hidden">
                    <div className="flex flex-col lg:flex-row lg:items-center">
                      <div className="p-8 lg:w-1/3 flex items-start justify-between border-b lg:border-b-0 lg:border-r border-primary/10">
                        <div className="flex items-center gap-5 min-w-0">
                          <div className="w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-lg bg-orange-500/10 text-orange-500">
                            <Settings2 className="w-8 h-8" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-2xl font-black leading-tight group-hover:text-orange-500 transition-colors break-words pr-4">
                              {client?.name || "Cliente Removido"}
                            </h3>
                            <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest mt-1 border-orange-500/20 bg-orange-500/5">
                              {serviceType?.name || "Geral"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3 font-bold text-base text-muted-foreground p-3 px-5 rounded-2xl bg-muted/20 border-2 border-transparent group-hover:border-orange-500/5 transition-all">
                            <Calendar className="w-5 h-5 text-orange-500" />
                            {formattedDate}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(service.status)}
                          </div>
                          {service.materials && service.materials.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {service.materials.map((m: any, idx: number) => {
                                const product = products?.find(p => p.id === m.productId)
                                return (
                                  <Badge key={idx} variant="secondary" className="text-[9px] font-bold py-0.5 px-2 bg-muted/50 border-0">
                                    <Package className="w-2.5 h-2.5 mr-1 text-orange-500" />
                                    {m.quantity}x {product?.name || "Material"}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:border-l sm:pl-8 border-primary/10">
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Valor do Serviço</p>
                            <p className="text-3xl font-black text-primary leading-none">
                              R$ {Number(service.chargedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-primary hover:text-white transition-all"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(service)
                              }}
                            >
                              <Pencil className="w-5 h-5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-destructive hover:text-white transition-all"
                              onClick={(e) => {
                                e.stopPropagation()
                                setServiceToDelete(service.id)
                              }}
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        )}

        <AlertDialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
          <AlertDialogContent className="rounded-[3rem] p-10 border-0 shadow-2xl">
            <AlertDialogHeader className="text-center space-y-6">
              <div className="bg-destructive/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Trash2 className="w-12 h-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <AlertDialogTitle className="text-3xl font-black text-center w-full">Excluir Serviço?</AlertDialogTitle>
                <AlertDialogDescription className="text-lg font-medium text-center">
                  Esta ação removerá permanentemente este serviço do seu histórico operacional.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col gap-4 pt-8 w-full">
              <AlertDialogAction 
                onClick={handleConfirmDelete} 
                className="w-full h-20 text-xl font-black rounded-[1.5rem] bg-destructive text-white hover:bg-destructive/90 shadow-xl shadow-destructive/20 order-1 sm:order-2"
              >
                Confirmar Exclusão
              </AlertDialogAction>
              <AlertDialogCancel className="w-full h-20 text-xl font-black rounded-[1.5rem] order-2 sm:order-1 border-2 transition-all hover:bg-muted">
                Voltar
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!viewingService} onOpenChange={(open) => !open && setViewingService(null)}>
          <DialogContent className="sm:max-w-[700px] rounded-[3rem] p-0 border-0 shadow-2xl overflow-hidden">
            {viewingService && (
              <div className="flex flex-col h-full max-h-[90vh]">
                <div className="p-8 bg-orange-500/10 border-b border-orange-500/10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                        <Settings2 className="w-8 h-8 text-orange-500" />
                      </div>
                      <div>
                        <DialogTitle className="text-3xl font-black tracking-tighter">Detalhes do Serviço</DialogTitle>
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">Ordem de Serviço #{viewingService.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                    <DialogClose asChild>
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-orange-500/20"><X className="w-6 h-6" /></Button>
                    </DialogClose>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {getStatusBadge(viewingService.status)}
                    <Badge variant="outline" className="bg-white/50 border-orange-500/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">
                      <Calendar className="w-3 h-3 mr-2 text-orange-500" />
                      {viewingService.scheduledDate ? format(new Date(viewingService.scheduledDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-500" /> Cliente
                      </h4>
                      <div className="p-5 rounded-3xl bg-muted/30 border-2 border-transparent">
                        <p className="text-xl font-black">{clients?.find(c => c.id === viewingService.clientId)?.name || "N/A"}</p>
                        <p className="text-sm font-bold text-muted-foreground mt-1">{clients?.find(c => c.id === viewingService.clientId)?.phone || "Sem telefone"}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" /> Financeiro
                      </h4>
                      <div className="p-5 rounded-3xl bg-emerald-500/5 border-2 border-emerald-500/10">
                        <p className="text-xs font-black uppercase text-emerald-600/60 mb-1">Valor Cobrado</p>
                        <p className="text-3xl font-black text-emerald-600">R$ {Number(viewingService.chargedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" /> Observações
                    </h4>
                    <div className="p-6 rounded-3xl bg-blue-500/5 border-2 border-blue-500/10 min-h-[100px]">
                      <p className="text-base font-medium leading-relaxed italic text-blue-900/70">
                        {viewingService.observations || "Nenhuma observação registrada para este serviço."}
                      </p>
                    </div>
                  </div>

                  {viewingService.materials && viewingService.materials.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-500" /> Materiais Utilizados
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {viewingService.materials.map((m: any, idx: number) => {
                          const product = products?.find(p => p.id === m.productId)
                          return (
                            <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border-2 border-transparent">
                              <div className="p-2 bg-orange-500/10 rounded-xl">
                                <Package className="w-5 h-5 text-orange-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black truncate">{product?.name || "Material"}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{m.quantity} {product?.unit || "un"}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 bg-muted/30 border-t flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={() => shareOnWhatsApp(viewingService)}
                    className="flex-1 h-16 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-lg gap-3 shadow-xl shadow-[#25D366]/20"
                  >
                    <MessageSquare className="w-6 h-6" /> Compartilhar WhatsApp
                  </Button>
                  <Button 
                    onClick={() => generatePDF(viewingService)}
                    variant="outline"
                    className="flex-1 h-16 rounded-2xl border-2 border-primary/20 font-black text-lg gap-3 hover:bg-primary/5"
                  >
                    <FileDown className="w-6 h-6 text-primary" /> Gerar PDF Profissional
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
