"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  User, 
  Phone, 
  MapPin, 
  ExternalLink, 
  Pencil, 
  Landmark, 
  Calendar, 
  FileText,
  CheckCircle2,
  Info,
  X
} from "lucide-react"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  isRural: z.boolean().default(false),
  documentNumber: z.string().optional(),
  observations: z.string().optional(),
})

type ClientFormValues = z.infer<typeof clientSchema>

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

const maskDocument = (value: string) => {
  const v = value.replace(/\D/g, "");
  if (v.length <= 11) {
    return v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  } else {
    return v
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  }
};

export default function ClientsPage() {
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any | null>(null)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const clientsQuery = useMemoFirebase(() => query(collection(db, "clientes"), orderBy("name", "asc")), [db])
  const { data: clients, isLoading } = useCollection(clientsQuery)

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { 
      name: "", 
      phone: "", 
      street: "", 
      number: "", 
      neighborhood: "", 
      city: "", 
      isRural: false, 
      documentNumber: "", 
      observations: "" 
    },
  })

  const filteredClients = useMemo(() => {
    if (!clients) return []
    return clients.filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [clients, searchTerm])

  const onSubmit = (values: ClientFormValues) => {
    const colRef = collection(db, "clientes")
    
    let fullAddress = ""
    if (values.isRural) {
      fullAddress = `Área Rural, ${values.city || "Cidade não informada"}`
    } else {
      const parts = [values.street, values.number, values.neighborhood, values.city].filter(Boolean)
      fullAddress = parts.join(", ")
    }

    const payload = { 
      ...values, 
      address: fullAddress,
      updatedAt: new Date().toISOString()
    }

    if (editingClient) {
      updateDocumentNonBlocking(doc(db, "clientes", editingClient.id), payload)
    } else {
      addDocumentNonBlocking(colRef, { ...payload, createdAt: new Date().toISOString() })
    }

    setIsDialogOpen(false)
    setEditingClient(null)
    form.reset()
  }

  const handleEdit = (client: any) => {
    setEditingClient(client)
    form.reset({
      name: client.name,
      phone: client.phone,
      street: client.street || "",
      number: client.number || "",
      neighborhood: client.neighborhood || "",
      city: client.city || "",
      isRural: client.isRural || false,
      documentNumber: client.documentNumber || "",
      observations: client.observations || ""
    })
    setIsDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (clientToDelete) {
      deleteDocumentNonBlocking(doc(db, "clientes", clientToDelete))
      setClientToDelete(null)
    }
  }

  const handleOpenDetails = (client: any) => {
    setSelectedClient(client)
    setIsDetailsOpen(true)
  }

  const isRural = form.watch("isRural")

  return (
    <DashboardLayout>
      <div className="space-y-10 animate-in fade-in duration-500 overflow-x-hidden">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="space-y-3 w-full">
            <Badge variant="outline" className="px-4 py-1 border-pink-500/30 text-pink-500 font-black uppercase tracking-widest text-[10px] bg-pink-500/5">
              Base de Dados
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black font-headline tracking-tighter text-center">Clientes</h1>
            <p className="text-base md:text-xl text-muted-foreground text-center max-w-2xl mx-auto">
              Gerencie seus contatos profissionais e acompanhe o histórico de cada cliente.
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingClient(null)
              form.reset()
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto gap-3 bg-primary shadow-2xl shadow-primary/20 text-xl py-8 px-12 h-auto font-black rounded-[2rem] transition-all hover:scale-105 active:scale-95">
                <Plus className="w-7 h-7" /> Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="p-8 pb-12 bg-pink-500/10">
                <DialogHeader className="text-center">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl border-4 border-white/20 bg-pink-500/20">
                    <User className="w-10 h-10 text-pink-500" />
                  </div>
                  <DialogTitle className="text-3xl font-black text-center w-full">
                    {editingClient ? "Editar Cliente" : "Cliente"}
                  </DialogTitle>
                  <DialogDescription className="text-center text-base font-medium opacity-70">
                    Preencha os dados de contato e localização do seu cliente.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-8 -mt-8 bg-background rounded-t-[3rem] relative">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Nome Completo / Empresa</FormLabel>
                            <FormControl><Input className="h-14 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6" placeholder="Ex: João Silva" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Telefone / WhatsApp</FormLabel>
                            <FormControl>
                              <Input 
                                className="h-14 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6"
                                placeholder="(00) 00000-0000" 
                                {...field} 
                                onChange={(e) => field.onChange(maskPhone(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="documentNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Documento (CPF/CNPJ) - Opcional</FormLabel>
                            <FormControl>
                              <Input 
                                className="h-14 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6"
                                placeholder="000.000.000-00" 
                                {...field} 
                                onChange={(e) => field.onChange(maskDocument(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <Separator className="bg-primary/5" />

                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Endereço
                          </h3>
                          <FormField control={form.control} name="isRural" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Switch
                                  className="scale-110"
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-bold text-xs uppercase cursor-pointer ml-2">Área Rural</FormLabel>
                            </FormItem>
                          )} />
                        </div>

                        {!isRural ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField control={form.control} name="street" render={({ field }) => (
                              <FormItem className="sm:col-span-2">
                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Rua / Logradouro</FormLabel>
                                <FormControl><Input className="h-12 bg-muted/20 border-2 rounded-xl" placeholder="Rua..." {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="number" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Número</FormLabel>
                                <FormControl><Input className="h-12 bg-muted/20 border-2 rounded-xl" placeholder="123" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="neighborhood" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Bairro</FormLabel>
                                <FormControl><Input className="h-12 bg-muted/20 border-2 rounded-xl" placeholder="Bairro..." {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="city" render={({ field }) => (
                              <FormItem className="sm:col-span-2">
                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Cidade</FormLabel>
                                <FormControl><Input className="h-12 bg-muted/20 border-2 rounded-xl" placeholder="Cidade..." {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-6">
                            <FormField control={form.control} name="city" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Cidade / Região</FormLabel>
                                <FormControl><Input className="h-12 bg-muted/20 border-2 rounded-xl" placeholder="Cidade ou Região Rural..." {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="street" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Ponto de Referência</FormLabel>
                                <FormControl><Input className="h-12 bg-muted/20 border-2 rounded-xl" placeholder="Ex: Próximo à fazenda X" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        )}
                      </div>

                      <Separator className="bg-primary/5" />

                      <FormField control={form.control} name="observations" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Observações Internas</FormLabel>
                          <FormControl><Input className="h-14 bg-muted/20 border-2 rounded-2xl px-6" placeholder="Ex: Cliente prefere contato após as 18h" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <Button type="submit" className="w-full h-20 text-2xl font-black shadow-2xl rounded-[1.5rem] transition-all">
                        {editingClient ? "Salvar Alterações" : "Salvar Cliente"}
                      </Button>
                      <DialogClose asChild>
                        <Button variant="ghost" className="w-full h-14 font-bold text-muted-foreground hover:bg-muted rounded-2xl gap-2">
                          <X className="w-4 h-4" /> Fechar sem salvar
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
            placeholder="Buscar por nome, telefone ou documento..." 
            className="pl-16 h-16 text-xl font-medium bg-card border-2 border-primary/10 focus-visible:ring-primary rounded-3xl shadow-sm transition-all" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <Loader2 className="w-16 h-16 animate-spin text-primary opacity-50" />
            <p className="text-xl text-muted-foreground font-black uppercase tracking-[0.2em]">Sincronizando Dados...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-32 border-4 border-dashed rounded-[3rem] bg-muted/10 w-full mx-auto space-y-6">
            <div className="bg-muted w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-2xl">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                {searchTerm ? "Não encontramos nada com esses termos." : "Comece adicionando seu primeiro cliente para organizar sua base de contatos."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredClients.map(client => (
              <Card key={client.id} className="group hover:border-pink-500 transition-all duration-500 shadow-sm hover:shadow-2xl bg-card border-2 rounded-[2.5rem] p-0 overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center">
                  <div className="p-8 lg:w-1/3 flex items-start justify-between border-b lg:border-b-0 lg:border-r border-primary/10">
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-lg bg-pink-500/10 text-pink-500">
                        <User className="w-8 h-8" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-2xl font-black leading-tight group-hover:text-pink-500 transition-colors break-words pr-4">
                          {client.name}
                        </h3>
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mt-1 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-pink-500" /> Cliente Ativo
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Contato</p>
                        <div className="flex items-center gap-2 font-bold text-lg">
                          <Phone className="w-4 h-4 text-pink-500" />
                          {client.phone}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Localização</p>
                        <div className="flex items-center gap-2 font-bold text-base text-muted-foreground">
                          {client.isRural ? <Landmark className="w-4 h-4 text-pink-500" /> : <MapPin className="w-4 h-4 text-pink-500" />}
                          <span className="truncate max-w-[200px]">{client.address || "Endereço não cadastrado"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:border-l sm:pl-8 border-primary/10">
                      <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => handleOpenDetails(client)}
                        className="h-14 px-8 font-black text-xs uppercase tracking-widest rounded-2xl gap-2 hover:bg-pink-500 hover:text-white transition-all border-2"
                      >
                        <ExternalLink className="w-4 h-4" /> Detalhes
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-primary hover:text-white transition-all"
                          onClick={() => handleEdit(client)}
                        >
                          <Pencil className="w-5 h-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-destructive hover:text-white transition-all"
                          onClick={() => setClientToDelete(client.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] p-0 border-0 bg-background shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="bg-pink-500/10 p-8 pb-12 relative">
               <DialogHeader className="text-center">
                <div className="bg-pink-500 w-24 h-24 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-pink-500/20 mb-4 animate-in zoom-in-50 duration-500">
                  <User className="w-12 h-12" />
                </div>
                <DialogTitle className="text-4xl font-black">{selectedClient?.name}</DialogTitle>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="secondary" className="px-4 py-1 font-black uppercase tracking-widest text-[10px] bg-white/20">
                    ID: {selectedClient?.id.slice(-8).toUpperCase()}
                  </Badge>
                </div>
              </DialogHeader>
            </div>

            <div className="p-8 -mt-8 bg-background rounded-t-[3rem] space-y-10 relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
                      <Phone className="w-3 h-3 text-pink-500" /> WhatsApp / Telefone
                    </p>
                    <p className="text-xl font-black">{selectedClient?.phone || "Não informado"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
                      <FileText className="w-3 h-3 text-pink-500" /> CPF / CNPJ
                    </p>
                    <p className="text-xl font-black">{selectedClient?.documentNumber || "Não informado"}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-pink-500" /> Endereço Completo
                    </p>
                    <div className="p-4 bg-muted/20 rounded-2xl border-2 border-transparent">
                      <p className="text-sm font-bold leading-tight">{selectedClient?.address || "Endereço não cadastrado"}</p>
                      {selectedClient?.isRural && <Badge className="mt-2 bg-pink-500/10 text-pink-500 hover:bg-pink-500/10 border-0 font-black text-[9px] uppercase tracking-widest">Zona Rural</Badge>}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-muted" />

              <div className="space-y-3">
                <p className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2 tracking-widest px-1">
                  <Info className="w-4 h-4 text-pink-500" /> Observações e Notas Gerais
                </p>
                <div className="p-6 bg-muted/20 border-4 border-dashed rounded-[2rem] min-h-[140px] text-sm font-medium leading-relaxed italic text-muted-foreground whitespace-pre-wrap">
                  {selectedClient?.observations || "Nenhuma observação adicional registrada para este cliente."}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-black pt-4 border-t uppercase tracking-[0.2em]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  CADASTRO: {selectedClient?.createdAt ? format(new Date(selectedClient.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                </div>
              </div>

              <DialogClose asChild>
                <Button className="w-full h-20 text-2xl font-black rounded-[1.5rem] shadow-2xl shadow-primary/20">Fechar Detalhes</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
          <AlertDialogContent className="rounded-[3rem] p-10 border-0 shadow-2xl">
            <AlertDialogHeader className="text-center space-y-6">
              <div className="bg-destructive/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Trash2 className="w-12 h-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <AlertDialogTitle className="text-3xl font-black text-center w-full">Excluir Cliente?</AlertDialogTitle>
                <AlertDialogDescription className="text-lg font-medium text-center">
                  Esta ação não pode ser desfeita. Todos os dados vinculados a este cliente serão afetados.
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
      </div>
    </DashboardLayout>
  )
}
