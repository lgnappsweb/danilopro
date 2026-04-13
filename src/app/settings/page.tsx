"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser, useFirestore, useDoc, setDocumentNonBlocking, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { 
  User, 
  Building2, 
  Shield, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Phone, 
  MapPin, 
  Home, 
  Moon, 
  Sun, 
  Wrench, 
  ImageIcon, 
  Link as LinkIcon, 
  Upload, 
  Type, 
  CreditCard, 
  Palette, 
  Paintbrush, 
  RotateCcw, 
  FileText
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { hexToHsl, cn } from "@/lib/utils"

export default function SettingsPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState("")
  const [personalPhone, setPersonalPhone] = useState("")
  const [personalEmail, setPersonalEmail] = useState("")
  const [personalStreet, setPersonalStreet] = useState("")
  const [personalNumber, setPersonalNumber] = useState("")
  const [personalNeighborhood, setPersonalNeighborhood] = useState("")
  const [personalCity, setPersonalCity] = useState("")

  const [businessName, setBusinessName] = useState("")
  const [businessDocument, setBusinessDocument] = useState("")
  const [businessPhone, setBusinessPhone] = useState("")
  const [businessEmail, setBusinessEmail] = useState("")
  const [businessStreet, setBusinessStreet] = useState("")
  const [businessNumber, setBusinessNumber] = useState("")
  const [businessNeighborhood, setBusinessNeighborhood] = useState("")
  const [businessCity, setBusinessCity] = useState("")

  const [customAppName, setCustomAppName] = useState("")
  const [customAppLogoUrl, setCustomAppLogoUrl] = useState("")
  
  const [customWelcomeBgUrl, setCustomWelcomeBgUrl] = useState("")
  const [welcomeTitle, setWelcomeTitle] = useState("")
  const [welcomeSubtitle, setWelcomeSubtitle] = useState("")
  const [welcomeButtonText, setWelcomeButtonText] = useState("")
  const [welcomeFooterText, setWelcomeFooterText] = useState("")

  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark">("dark")
  const [primaryColor, setPrimaryColor] = useState("#2563eb")

  const DEFAULT_PRIMARY = "#2563eb";

  const profileRef = useMemoFirebase(() => (user ? doc(db, "usuarios", user.uid) : null), [db, user?.uid])
  const { data: profile, isLoading: isLoadingProfile } = useDoc(profileRef)

  useEffect(() => {
    if (profile) {
      setName(profile.name || "")
      setPersonalPhone(profile.phone || "")
      setPersonalEmail(profile.personalEmail || "")
      setPersonalStreet(profile.personalStreet || "")
      setPersonalNumber(profile.personalNumber || "")
      setPersonalNeighborhood(profile.personalNeighborhood || "")
      setPersonalCity(profile.personalCity || "")
      
      setBusinessName(profile.businessName || "")
      setBusinessDocument(profile.businessDocument || "")
      setBusinessPhone(profile.businessPhone || "")
      setBusinessEmail(profile.businessEmail || "")
      setBusinessStreet(profile.businessStreet || "")
      setBusinessNumber(profile.businessNumber || "")
      setBusinessNeighborhood(profile.businessNeighborhood || "")
      setBusinessCity(profile.businessCity || "")
      
      setSelectedTheme(profile.theme || "dark")
      setPrimaryColor(profile.primaryColor || DEFAULT_PRIMARY)

      setCustomAppName(profile.customAppName || "DaniloPro")
      setCustomAppLogoUrl(profile.customAppLogoUrl || "")

      setCustomWelcomeBgUrl(profile.customWelcomeBgUrl || "")
      setWelcomeTitle(profile.welcomeTitle || "")
      setWelcomeSubtitle(profile.welcomeSubtitle || "")
      setWelcomeButtonText(profile.welcomeButtonText || "")
      setWelcomeFooterText(profile.welcomeFooterText || "")
    }
  }, [profile])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setter(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const maskPhone = (value: string) => {
    return value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").replace(/(-\d{4})\d+?$/, "$1");
  };

  const maskDocument = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
    } else {
      return v.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d)/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    const profileDoc = doc(db, "usuarios", user.uid)
    
    const businessFullAddress = [businessStreet, businessNumber, businessNeighborhood, businessCity].filter(Boolean).join(", ")
    const personalFullAddress = [personalStreet, personalNumber, personalNeighborhood, personalCity].filter(Boolean).join(", ")

    const payload = {
      id: user.uid,
      name,
      phone: personalPhone,
      personalEmail,
      personalStreet,
      personalNumber,
      personalNeighborhood,
      personalCity,
      personalAddress: personalFullAddress,
      businessName,
      businessDocument,
      businessPhone,
      businessEmail,
      businessStreet,
      businessNumber,
      businessNeighborhood,
      businessCity,
      businessAddress: businessFullAddress,
      customAppName,
      customAppLogoUrl,
      customWelcomeBgUrl,
      welcomeTitle,
      welcomeSubtitle,
      welcomeButtonText,
      welcomeFooterText,
      email: profile?.email || user.email,
      role: "admin",
      theme: selectedTheme,
      primaryColor,
      updatedAt: new Date().toISOString()
    }

    try {
      setDocumentNonBlocking(profileDoc, payload, { merge: true })
      const isDark = selectedTheme === 'dark'
      document.documentElement.classList.toggle('dark', isDark)
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
      const primaryHsl = hexToHsl(primaryColor);
      document.documentElement.style.setProperty('--primary', primaryHsl);
      document.documentElement.style.setProperty('--ring', primaryHsl);
      toast({ title: "Configurações salvas!" })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({ variant: "destructive", title: "Erro ao salvar" })
    } finally {
      setLoading(false)
    }
  }

  if (isUserLoading || isLoadingProfile) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-10 max-w-5xl mx-auto overflow-x-hidden px-1 sm:px-0">
        <div className="text-center space-y-3">
          <Badge variant="outline" className="px-4 py-1 border-primary/30 text-primary font-black uppercase tracking-widest text-[10px] bg-primary/5">
            Painel de Controle
          </Badge>
          <h1 className="text-5xl md:text-6xl font-black font-headline tracking-tighter text-center break-words">Aparência</h1>
          <p className="text-base md:text-xl text-muted-foreground text-center max-w-2xl mx-auto px-4">Personalize a identidade e aparência do seu aplicativo profissional.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <Tabs defaultValue="app" className="w-full">
            <div className="px-2 sm:px-0 mb-8 overflow-x-hidden">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1.5 rounded-[2rem] bg-muted/50 border-2 border-primary/10 gap-1.5 shadow-sm">
                <TabsTrigger value="app" className="rounded-2xl py-4 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm min-w-0 truncate">App</TabsTrigger>
                <TabsTrigger value="welcome" className="rounded-2xl py-4 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm min-w-0 truncate">Entrada</TabsTrigger>
                <TabsTrigger value="business" className="rounded-2xl py-4 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm min-w-0 truncate">Empresa</TabsTrigger>
                <TabsTrigger value="profile" className="rounded-2xl py-4 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm min-w-0 truncate">Perfil</TabsTrigger>
                <TabsTrigger value="system" className="rounded-2xl py-4 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white shadow-sm min-w-0 truncate">Cores</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="app" className="pt-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-2 border-primary/10 bg-card shadow-sm p-6 md:p-10 rounded-[2.5rem] w-full">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Type className="w-4 h-4 text-primary" /> Nome do Aplicativo</Label>
                    <Input 
                      placeholder="Ex: DaniloPro Instalações" 
                      className="h-16 text-xl font-bold bg-muted/20 border-2 rounded-2xl px-6" 
                      value={customAppName} 
                      onChange={(e) => setCustomAppName(e.target.value)} 
                    />
                  </div>
                  
                  <Separator className="bg-primary/5" />
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-primary">
                      <ImageIcon className="w-5 h-5" />
                      <h3 className="text-sm font-black uppercase tracking-widest">Logotipo Global</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <Button type="button" variant="outline" className="w-full h-16 gap-3 text-lg font-bold rounded-2xl border-dashed border-2 hover:bg-muted" onClick={() => logoInputRef.current?.click()}>
                          <Upload className="w-5 h-5" /> Enviar Logo
                        </Button>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setCustomAppLogoUrl)} />
                        <div className="relative">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input 
                            placeholder="Ex: https://meusite.com/logo.png" 
                            className="h-16 pl-12 text-lg font-medium bg-muted/20 border-2 rounded-2xl" 
                            value={customAppLogoUrl} 
                            onChange={(e) => setCustomAppLogoUrl(e.target.value)} 
                          />
                        </div>
                        <p className="text-xs text-muted-foreground italic text-center">Dica: Imagens quadradas (PNG/SVG) funcionam melhor.</p>
                      </div>
                      <div className="flex flex-col items-center justify-center border-4 border-dashed rounded-[3rem] p-8 bg-muted/10 relative overflow-hidden group">
                        <div className={`rounded-3xl border-4 border-white/20 shadow-2xl aspect-square flex items-center justify-center w-40 h-40 overflow-hidden transition-transform group-hover:scale-105 ${customAppLogoUrl ? 'p-0' : 'p-10 bg-primary/10'}`}>
                          {customAppLogoUrl ? <img src={customAppLogoUrl} alt="Preview" className="w-full h-full object-cover" /> : <Wrench className="w-16 h-16 text-primary" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="welcome" className="pt-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-2 border-primary/10 bg-card shadow-sm p-6 md:p-10 rounded-[2.5rem] w-full">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Título de Impacto</Label>
                      <Input 
                        placeholder="Ex: DaniloPro" 
                        className="h-16 text-xl font-bold bg-muted/20 border-2 rounded-2xl px-6" 
                        value={welcomeTitle} 
                        onChange={(e) => setWelcomeTitle(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-4">
                      <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Subtítulo Explicativo</Label>
                      <Input 
                        placeholder="Ex: Gestão Profissional de Serviços" 
                        className="h-16 text-xl font-bold bg-muted/20 border-2 rounded-2xl px-6" 
                        value={welcomeSubtitle} 
                        onChange={(e) => setWelcomeSubtitle(e.target.value)} 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Texto do Botão</Label>
                      <Input 
                        placeholder="Ex: Acessar Sistema" 
                        className="h-16 text-xl font-bold bg-muted/20 border-2 rounded-2xl px-6" 
                        value={welcomeButtonText} 
                        onChange={(e) => setWelcomeButtonText(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-4">
                      <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Texto de Rodapé</Label>
                      <Input 
                        placeholder="Ex: Powered by DaniloPro" 
                        className="h-16 text-xl font-bold bg-muted/20 border-2 rounded-2xl px-6" 
                        value={welcomeFooterText} 
                        onChange={(e) => setWelcomeFooterText(e.target.value)} 
                      />
                    </div>
                  </div>

                  <Separator className="bg-primary/5" />

                  <div className="space-y-6">
                    <Label className="text-xl font-black flex items-center gap-3"><ImageIcon className="text-primary" /> Papel de Parede (Full HD)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <Button type="button" variant="outline" className="w-full h-16 rounded-2xl border-dashed border-2 font-bold text-lg" onClick={() => bgInputRef.current?.click()}>Galeria de Fundos</Button>
                        <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setCustomWelcomeBgUrl)} />
                        <Input 
                          className="h-16 text-lg bg-muted/20 border-2 rounded-2xl px-6" 
                          placeholder="Ex: https://unsplash.com/fundo-trabalho.jpg" 
                          value={customWelcomeBgUrl} 
                          onChange={(e) => setCustomWelcomeBgUrl(e.target.value)} 
                        />
                      </div>
                      <div className="relative h-48 border-4 border-dashed rounded-[2.5rem] overflow-hidden bg-muted/20 shadow-inner group">
                        {customWelcomeBgUrl ? (
                          <img src={customWelcomeBgUrl} alt="BG Preview" className="w-full h-full object-cover opacity-60 transition-transform group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-black uppercase text-[10px] tracking-widest">Sem Imagem Selecionada</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="business" className="pt-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-2 border-primary/10 bg-card shadow-sm p-6 md:p-10 rounded-[2.5rem] w-full">
                <div className="grid gap-8 md:grid-cols-2 w-full">
                  <div className="space-y-4">
                    <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Nome Fantasia</Label>
                    <Input placeholder="Ex: Danilo Instalações ME" className="h-16 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">CNPJ / CPF Comercial</Label>
                    <Input placeholder="Ex: 00.000.000/0001-00" className="h-16 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6" value={businessDocument} onChange={(e) => setBusinessDocument(maskDocument(e.target.value))} />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Telefone Comercial</Label>
                    <Input placeholder="Ex: (11) 99999-9999" className="h-16 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6" value={businessPhone} onChange={(e) => setBusinessPhone(maskPhone(e.target.value))} />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">E-mail de Contato</Label>
                    <Input placeholder="Ex: comercial@danilopro.com" className="h-16 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="pt-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-2 border-primary/10 bg-card shadow-sm p-6 md:p-10 rounded-[2.5rem] w-full">
                <div className="grid gap-8 md:grid-cols-2 w-full">
                  <div className="space-y-4">
                    <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Seu Nome Completo</Label>
                    <Input placeholder="Ex: Danilo Jr Nascimento" className="h-16 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Telefone Pessoal</Label>
                    <Input placeholder="Ex: (11) 98888-8888" className="h-16 text-lg font-bold bg-muted/20 border-2 rounded-2xl px-6" value={personalPhone} onChange={(e) => setPersonalPhone(maskPhone(e.target.value))} />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="pt-2 space-y-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-2 border-primary/10 bg-card p-6 md:p-10 rounded-[2.5rem] w-full">
                <div className="space-y-10">
                  <div className="space-y-6">
                    <Label className="text-xl font-black flex items-center gap-3"><Moon className="text-primary" /> Modo de Exibição</Label>
                    <RadioGroup value={selectedTheme} onValueChange={(v) => setSelectedTheme(v as "light" | "dark")} className="grid grid-cols-2 gap-6">
                      <div>
                        <RadioGroupItem value="light" id="t-light" className="peer sr-only" />
                        <Label htmlFor="t-light" className="flex flex-col items-center p-8 border-4 rounded-[2rem] cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all bg-card shadow-sm hover:bg-muted/50">
                          <Sun className="mb-3 w-8 h-8 text-orange-500" /> 
                          <span className="font-black uppercase text-xs tracking-widest">Claro</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="dark" id="t-dark" className="peer sr-only" />
                        <Label htmlFor="t-dark" className="flex flex-col items-center p-8 border-4 rounded-[2rem] cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all bg-card shadow-sm hover:bg-muted/50">
                          <Moon className="mb-3 w-8 h-8 text-blue-500" /> 
                          <span className="font-black uppercase text-xs tracking-widest">Escuro</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <Separator className="bg-primary/5" />
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label className="text-xl font-black flex items-center gap-3"><Paintbrush className="text-primary" /> Cor de Destaque</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPrimaryColor(DEFAULT_PRIMARY)} className="font-black text-[10px] uppercase tracking-widest hover:text-primary">
                        <RotateCcw className="w-3 h-3 mr-2" /> Restaurar Padrão
                      </Button>
                    </div>
                    <div className="flex items-center gap-6 p-6 bg-muted/20 rounded-[2rem] border-2">
                      <Input type="color" className="h-20 w-32 p-2 rounded-2xl cursor-pointer bg-background border-2" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                      <div className="flex flex-col">
                        <p className="text-2xl font-black uppercase tracking-tight">{primaryColor}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Hexadecimal Selecionado</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-center pt-10 sticky bottom-6 z-50 px-2">
            <Button type="submit" className="w-full sm:w-auto h-24 px-16 text-2xl font-black gap-4 shadow-2xl shadow-primary/30 rounded-[2rem] bg-primary transition-all hover:scale-105 active:scale-95" disabled={loading}>
              {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Save className="w-8 h-8" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
