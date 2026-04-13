"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, AlertTriangle, ArrowRightLeft, History, Loader2, Trash2, Package, Info, MapPin, Tag, Warehouse, Pencil, DollarSign, CheckCircle2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
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
import { Separator } from "@/components/ui/separator"
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cn } from "@/lib/utils"

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  materialCategoryId: z.string().min(1, "Categoria é obrigatória"),
  supplierId: z.string().min(1, "Fornecedor é obrigatória"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  currentQuantity: z.string().min(1, "Quantidade é obrigatória"),
  minimumQuantity: z.string().min(1, "Quantidade mínima é obrigatória"),
  unitCost: z.string().min(1, "Custo unitário é obrigatório"),
  storageLocation: z.string().optional(),
  observations: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

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

export default function StockPage() {
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  const productsQuery = useMemoFirebase(() => query(collection(db, "estoque"), orderBy("name", "asc")), [db])
  const categoriesQuery = useMemoFirebase(() => collection(db, "material_categories"), [db])
  const suppliersQuery = useMemoFirebase(() => collection(db, "fornecedores"), [db])

  const { data: products, isLoading: loadingProducts } = useCollection(productsQuery)
  const { data: categories } = useCollection(categoriesQuery)
  const { data: suppliers } = useCollection(suppliersQuery)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      storageLocation: "",
      observations: "",
      unit: "un",
      currentQuantity: "",
      minimumQuantity: "",
      unitCost: "",
      materialCategoryId: "",
      supplierId: "",
    },
  })

  const filteredProducts = useMemo(() => {
    if (!products) return []
    return products.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.storageLocation?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [products, searchTerm])

  const metrics = useMemo(() => {
    if (!products) return { totalValue: 0, alertCount: 0, categoryCount: 0 }
    
    const totalValue = products.reduce((acc, p) => acc + (Number(p.currentQuantity) * Number(p.unitCost)), 0)
    const alertCount = products.filter(p => Number(p.currentQuantity) < Number(p.minimumQuantity)).length
    const uniqueCategories = new Set(products.map(p => p.materialCategoryId)).size

    return { totalValue, alertCount, categoryCount: uniqueCategories }
  }, [products])

  const onSubmit = (values: ProductFormValues) => {
    const colRef = collection(db, "estoque")
    const numericCost = parseCurrencyToNumber(values.unitCost)
    
    const payload = {
      ...values,
      currentQuantity: Number(values.currentQuantity),
      minimumQuantity: Number(values.minimumQuantity),
      unitCost: numericCost,
      updatedAt: new Date().toISOString(),
    }

    if (editingProduct) {
      updateDocumentNonBlocking(doc(db, "estoque", editingProduct.id), payload)
    } else {
      addDocumentNonBlocking(colRef, { ...payload, createdAt: new Date().toISOString() })
    }

    setIsDialogOpen(false)
    setEditingProduct(null)
    form.reset()
  }

  const handleEdit = (product: any) => {
    setEditingProduct(product)
    form.reset({
      name: product.name,
      materialCategoryId: product.materialCategoryId,
      supplierId: product.supplierId,
      unit: product.unit || "un",
      currentQuantity: String(product.currentQuantity),
      minimumQuantity: String(product.minimumQuantity),
      unitCost: maskCurrency(String(product.unitCost * 100)),
      storageLocation: product.storageLocation || "",
      observations: product.observations || "",
    })
    setIsDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteDocumentNonBlocking(doc(db, "estoque", productToDelete))
      setProductToDelete(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-10 animate-in fade-in duration-500 overflow-x-hidden">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="space-y-3 w-full">
            <Badge variant="outline" className="px-4 py-1 border-yellow-500/30 text-yellow-500 font-black uppercase tracking-widest text-[10px] bg-yellow-500/5">
              Inventário Ativo
            </Badge>
            <h1 className="text-5xl md:text-6xl font-black font-headline tracking-tighter text-center">Estoque</h1>
            <p className="text-base md:text-xl text-muted-foreground text-center max-w-2xl mx-auto">
              Gerencie seus materiais, insumos e receba alertas automáticos de estoque baixo.
            </p>
          </div>
          
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setEditingProduct(null)
                form.reset()
              }
            }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto gap-3 bg-primary shadow-2xl shadow-primary/20 text-xl py-8 px-12 h-auto font-black rounded-[2rem] transition-all hover:scale-105 active:scale-95">
                  <Plus className="w-7 h-7" /> Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="p-8 pb-12 bg-yellow-500/10">
                  <DialogHeader className="text-center">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl border-4 border-white/20 bg-yellow-500/20">
                      <Package className="w-10 h-10 text-yellow-500" />
                    </div>
                    <DialogTitle className="text-3xl font-black text-center w-full">
                      {editingProduct ? "Editar Material" : "Material"}
                    </DialogTitle>
                    <DialogDescription className="text-center text-base font-medium opacity-70">
                      Preencha os dados técnicos e de fornecimento do item.
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
                              <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Nome do Material / SKU</FormLabel>
                              <FormControl><Input className="h-14 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6" placeholder="Ex: Cabo Flexível 2.5mm" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="materialCategoryId" render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Categoria</FormLabel>
                                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black uppercase tracking-widest gap-1 hover:bg-primary/10 hover:text-primary">
                                      <Plus className="w-3 h-3" /> Nova
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="rounded-[2rem]">
                                    <DialogHeader>
                                      <DialogTitle>Nova Categoria</DialogTitle>
                                      <DialogDescription>Cadastre uma nova categoria de material.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <FormLabel>Nome da Categoria</FormLabel>
                                        <div className="flex gap-2">
                                          <Input id="new-material-category" placeholder="Ex: Elétrica, Hidráulica" />
                                          <Button 
                                            onClick={async () => {
                                              const input = document.getElementById("new-material-category") as HTMLInputElement;
                                              if (input.value) {
                                                const docRef = await addDocumentNonBlocking(collection(db, "material_categories"), { 
                                                  name: input.value,
                                                  createdAt: new Date().toISOString()
                                                });
                                                if (docRef) {
                                                  form.setValue("materialCategoryId", docRef.id);
                                                  setIsCategoryDialogOpen(false);
                                                }
                                                input.value = "";
                                              }
                                            }}
                                          >
                                            Cadastrar
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      <Separator />
                                      
                                      <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Categorias Existentes</Label>
                                        <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2">
                                          {categories?.map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg group">
                                              <span className="text-sm font-medium">{cat.name}</span>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => deleteDocumentNonBlocking(doc(db, "material_categories", cat.id))}
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          ))}
                                          {(!categories || categories.length === 0) && (
                                            <p className="text-xs text-center py-4 text-muted-foreground italic">Nenhuma categoria cadastrada.</p>
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
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="supplierId" render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Fornecedor</FormLabel>
                                <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-black uppercase tracking-widest gap-1 hover:bg-primary/10 hover:text-primary">
                                      <Plus className="w-3 h-3" /> Novo
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="rounded-[2rem]">
                                    <DialogHeader>
                                      <DialogTitle>Novo Fornecedor</DialogTitle>
                                      <DialogDescription>Cadastre um novo fornecedor para seus materiais.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <FormLabel>Nome do Fornecedor</FormLabel>
                                        <Input id="new-supplier-name" placeholder="Ex: Elétrica Central" />
                                      </div>
                                      <div className="space-y-2">
                                        <FormLabel>Ramo / Categoria</FormLabel>
                                        <Input id="new-supplier-category" placeholder="Ex: Elétrica, Hidráulica" />
                                      </div>
                                      <Button 
                                        className="w-full" 
                                        onClick={async () => {
                                          const nameInput = document.getElementById("new-supplier-name") as HTMLInputElement;
                                          const categoryInput = document.getElementById("new-supplier-category") as HTMLInputElement;
                                          if (nameInput.value) {
                                            const docRef = await addDocumentNonBlocking(collection(db, "fornecedores"), { 
                                              name: nameInput.value,
                                              category: categoryInput.value,
                                              createdAt: new Date().toISOString()
                                            });
                                            if (docRef) {
                                              form.setValue("supplierId", docRef.id);
                                              setIsSupplierDialogOpen(false);
                                            }
                                            nameInput.value = "";
                                            categoryInput.value = "";
                                          }
                                        }}
                                      >
                                        Cadastrar Fornecedor
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
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {suppliers?.map(sup => <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <Separator className="bg-primary/5" />

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                          <FormField control={form.control} name="unit" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Unidade</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 font-bold bg-muted/20 border-2 rounded-xl">
                                    <SelectValue placeholder="Un." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="un">Unidades (un)</SelectItem>
                                  <SelectItem value="m">Metros (m)</SelectItem>
                                  <SelectItem value="kg">Peso (kg)</SelectItem>
                                  <SelectItem value="g">Peso (g)</SelectItem>
                                  <SelectItem value="l">Litros (l)</SelectItem>
                                  <SelectItem value="ml">Mililitros (ml)</SelectItem>
                                  <SelectItem value="m2">Medida (m²)</SelectItem>
                                  <SelectItem value="m3">Medida (m³)</SelectItem>
                                  <SelectItem value="cx">Caixa (cx)</SelectItem>
                                  <SelectItem value="pct">Pacote (pct)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="currentQuantity" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Qtd. Atual</FormLabel>
                              <FormControl><Input className="h-12 text-lg font-bold bg-muted/20 border-2 rounded-xl text-center" type="number" step="any" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="minimumQuantity" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Qtd. Mínima</FormLabel>
                              <FormControl><Input className="h-12 text-lg font-bold bg-muted/20 border-2 rounded-xl text-center" type="number" step="any" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="unitCost" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Custo Unit.</FormLabel>
                              <FormControl>
                                <Input 
                                  className="h-12 text-lg font-bold bg-muted/20 border-2 rounded-xl text-right" 
                                  placeholder="R$ 0,00"
                                  {...field} 
                                  onChange={(e) => field.onChange(maskCurrency(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <Separator className="bg-primary/5" />

                        <FormField control={form.control} name="storageLocation" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Localização no Depósito</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
                                <Input className="h-14 pl-12 text-lg font-bold bg-muted/20 border-2 rounded-2xl" placeholder="Ex: Armário 03, Prateleira B" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <Button type="submit" className="w-full h-20 text-2xl font-black shadow-2xl rounded-[1.5rem] transition-all">
                          {editingProduct ? "Salvar Alterações" : "Salvar no Estoque"}
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
            <Button variant="outline" className="w-full sm:w-auto h-16 px-10 text-base font-bold rounded-[1.5rem] gap-2 border-2 transition-all hover:bg-muted">
              <History className="w-5 h-5" /> Histórico de Movimentações
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-primary/5 border-primary/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
            <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 text-primary transition-transform group-hover:scale-110" />
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Capital em Estoque</p>
            <div className="text-4xl font-black">R$ {metrics.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </Card>
          <Card className={cn("p-8 rounded-[2.5rem] relative overflow-hidden group border-2 transition-all", metrics.alertCount > 0 ? "bg-orange-500/5 border-orange-500/30" : "bg-card border-primary/10")}>
            <AlertTriangle className={cn("absolute -right-4 -bottom-4 w-32 h-32 opacity-5 transition-transform group-hover:scale-110", metrics.alertCount > 0 ? "text-orange-500" : "text-primary")} />
            <p className={cn("text-[10px] font-black uppercase tracking-[0.3em] mb-2", metrics.alertCount > 0 ? "text-orange-500" : "text-muted-foreground")}>Alertas Críticos</p>
            <div className={cn("text-4xl font-black", metrics.alertCount > 0 ? "text-orange-500" : "text-primary")}>
              {metrics.alertCount} Itens
            </div>
          </Card>
          <Card className="bg-card p-8 border-2 border-primary/10 rounded-[2.5rem] hidden md:block">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">Grupos Organizados</p>
            <div className="text-4xl font-black text-foreground">{metrics.categoryCount} Categorias</div>
          </Card>
        </div>

        <div className="relative group w-full max-w-3xl mx-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Buscar material no inventário..." 
            className="pl-16 h-16 text-xl font-medium bg-card border-2 border-primary/10 focus-visible:ring-primary rounded-3xl shadow-sm transition-all" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loadingProducts ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <Loader2 className="w-16 h-16 animate-spin text-primary opacity-50" />
            <p className="text-xl text-muted-foreground font-black uppercase tracking-[0.2em]">Sincronizando Dados...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-32 border-4 border-dashed rounded-[3rem] bg-muted/10 w-full mx-auto space-y-6">
            <div className="bg-muted w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Package className="w-12 h-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-2xl">Inventário vazio</h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                {searchTerm ? "Não encontramos materiais com esse nome." : "Comece agora a organizar seu estoque físico e financeiro."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredProducts.map((item) => {
              const category = categories?.find(c => c.id === item.materialCategoryId)
              const isLow = Number(item.currentQuantity) < Number(item.minimumQuantity)
              const progress = Math.min((Number(item.currentQuantity) / (Number(item.minimumQuantity) * 2 || 1)) * 100, 100)
              
              return (
                <Card key={item.id} className={cn("group transition-all duration-500 shadow-sm hover:shadow-2xl bg-card border-2 rounded-[2.5rem] p-0 overflow-hidden", isLow ? "hover:border-orange-500" : "hover:border-yellow-500")}>
                  <div className="flex flex-col lg:flex-row lg:items-center">
                    <div className="p-8 lg:w-1/3 flex items-start justify-between border-b lg:border-b-0 lg:border-r border-primary/10">
                      <div className="flex items-center gap-5 min-w-0">
                        <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-lg", isLow ? "bg-orange-500/10 text-orange-500" : "bg-yellow-500/10 text-yellow-500")}>
                          {isLow ? <AlertTriangle className="w-8 h-8" /> : <Package className="w-8 h-8" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-2xl font-black leading-tight break-words pr-4">
                            {item.name}
                          </h3>
                          <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest mt-1 border-yellow-500/20 bg-yellow-500/5">
                            {category?.name || "Geral"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-8 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                      <div className="flex flex-col gap-5 flex-1 max-w-sm">
                        <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                          <MapPin className="w-5 h-5 text-yellow-500" />
                          {item.storageLocation || "Local não definido"}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className={isLow ? "text-orange-500" : "text-primary"}>
                              {isLow ? "Reposição Necessária" : "Quantidade Saudável"}
                            </span>
                            <span className="font-bold">{item.currentQuantity} {item.unit || 'un'}</span>
                          </div>
                          <Progress 
                            value={progress} 
                            className={cn("h-2.5", isLow ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary")} 
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:border-l sm:pl-8 border-primary/10">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Custo por {item.unit || 'un'}</p>
                          <p className="text-3xl font-black text-primary leading-none">
                            R$ {Number(item.unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-primary hover:text-white transition-all"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="w-5 h-5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-destructive hover:text-white transition-all"
                            onClick={() => setProductToDelete(item.id)}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
          <AlertDialogContent className="rounded-[3rem] p-10 border-0 shadow-2xl">
            <AlertDialogHeader className="text-center space-y-6">
              <div className="bg-destructive/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Trash2 className="w-12 h-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <AlertDialogTitle className="text-3xl font-black text-center w-full">Remover do Estoque?</AlertDialogTitle>
                <AlertDialogDescription className="text-lg font-medium text-center">
                  Esta ação é irreversível. O item e seu histórico de custos serão removidos do sistema.
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
