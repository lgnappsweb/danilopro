
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Wrench } from "lucide-react"
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { collection, query, limit } from "firebase/firestore"
import { hexToHsl } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  
  const profilesQuery = useMemoFirebase(() => query(collection(db, "usuarios"), limit(1)), [db])
  const { data: profiles } = useCollection(profilesQuery)
  const profile = profiles?.[0]
  
  const appName = profile?.customAppName || "DaniloPro"

  useEffect(() => {
    if (profile?.primaryColor) {
      const primaryHsl = hexToHsl(profile.primaryColor);
      document.documentElement.style.setProperty('--primary', primaryHsl);
      document.documentElement.style.setProperty('--ring', primaryHsl);
    }
  }, [profile])

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const ALLOWED_EMAILS = ["danilojrmontador@hotmail.com", "lgngregorio@icloud.com", "lgnappsweb@gmail.com"];

  useEffect(() => {
    if (user && !isUserLoading) {
      router.replace("/welcome")
    }
  }, [user, isUserLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const cleanEmail = email.toLowerCase().trim();

    if (!ALLOWED_EMAILS.includes(cleanEmail)) {
      const message = "Acesso negado. E-mail sem permissão."
      setError(message)
      toast({ variant: "destructive", title: "Restrição", description: message })
      setLoading(false)
      return
    }

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, cleanEmail, password)
      router.push("/welcome")
    } catch (err: any) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, password)
          router.push("/welcome")
        } catch (createErr: any) {
          console.error("Error creating user:", createErr)
          setError("Erro na validação de acesso. Verifique sua senha.")
        }
      } else {
        console.error("Login error:", err)
        setError("Erro de autenticação.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (isUserLoading || user) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md border-primary/20 bg-card/80 backdrop-blur-xl shadow-2xl rounded-[2rem]">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-5xl font-headline font-bold">
            {appName.endsWith("Pro") ? <>{appName.slice(0, -3)}<span className="text-primary">Pro</span></> : appName}
          </CardTitle>
          <CardDescription>Sistema Profissional de Gestão</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Atenção</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="email" type="email" className="pl-10 h-14 rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="password" type={showPassword ? "text" : "password"} className="pl-10 pr-10 h-14 rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff /> : <Eye />}</button></div>
            </div>
            <Button className="w-full h-14 text-xl font-black rounded-2xl" type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Entrar"}</Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 border-t pt-6 bg-muted/20 rounded-b-[2rem]">
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wrench className="w-4 h-4 text-primary" /> Acesso Restrito</div>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground whitespace-nowrap">Desenvolvedor: <span className="text-primary">Lucas Gregório do Nascimento</span></p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
