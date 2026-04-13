
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { Wrench, ChevronRight, Loader2 } from "lucide-react"
import { doc } from "firebase/firestore"
import { hexToHsl } from "@/lib/utils"

export default function WelcomePage() {
  const router = useRouter()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)

  const profileRef = useMemoFirebase(() => (user ? doc(db, "usuarios", user.uid) : null), [db, user?.uid])
  const { data: profile } = useDoc(profileRef)

  useEffect(() => {
    setMounted(true)
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  // Aplicar cor primária personalizada
  useEffect(() => {
    if (profile?.primaryColor) {
      const primaryHsl = hexToHsl(profile.primaryColor);
      document.documentElement.style.setProperty('--primary', primaryHsl);
      document.documentElement.style.setProperty('--ring', primaryHsl);
    }
  }, [profile])

  if (!mounted || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  // Valores customizados ou padrões
  const bgImage = profile?.customWelcomeBgUrl || "https://images.unsplash.com/photo-1631561381316-570336556ab4?q=80&w=2000"
  const appName = profile?.customAppName || "DaniloPro"
  const welcomeTitle = profile?.welcomeTitle || appName
  const welcomeSubtitle = profile?.welcomeSubtitle || "Excelência em Gestão de Serviços, Estoque e Resultados Profissionais."
  const buttonText = profile?.welcomeButtonText || "Acessar Sistema"
  const footerText = profile?.welcomeFooterText || "Powered by DaniloPro Intelligence"
  const logoUrl = profile?.customAppLogoUrl

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black">
      {/* Imagem de Fundo em Tela Cheia */}
      <div className="absolute inset-0 z-0">
        <Image
          src={bgImage}
          alt="Background"
          fill
          priority
          className="object-cover opacity-60"
          unoptimized={bgImage.startsWith("data:")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Conteúdo Central */}
      <div className="relative z-10 text-center px-6 max-w-4xl space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="flex justify-center mb-10 -mt-28 md:-mt-24">
          <div className={`backdrop-blur-xl rounded-full border border-primary shadow-2xl shadow-primary/20 aspect-square flex items-center justify-center w-44 h-44 md:w-48 md:h-48 overflow-hidden ${logoUrl ? 'p-0' : 'p-6 bg-primary/10'}`}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Wrench className="h-16 w-16 text-primary" />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-black font-headline tracking-tighter text-white">
            {welcomeTitle.endsWith("Pro") ? (
              <>
                {welcomeTitle.slice(0, -3)}
                <span className="text-primary">{welcomeTitle.slice(-3)}</span>
              </>
            ) : welcomeTitle}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            {welcomeSubtitle}
          </p>
        </div>

        <div className="pt-8">
          <button 
            onClick={() => router.push("/dashboard")}
            className="group h-20 px-12 text-2xl font-black rounded-full shadow-2xl shadow-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all flex items-center gap-4 mx-auto"
          >
            {buttonText}
            <ChevronRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>

      {/* Rodapé Decorativo */}
      <div className="absolute bottom-8 left-0 right-0 z-10 text-center px-4">
        <p className="text-[10px] uppercase font-black tracking-[0.5em] text-white/30 truncate">
          {footerText}
        </p>
      </div>
    </div>
  )
}
