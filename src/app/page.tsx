
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { Loader2, Wrench } from "lucide-react"
import { collection, query, limit, getDocFromServer, doc } from "firebase/firestore"

export default function Home() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  const db = useFirestore()

  // Testar conexão com o Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Erro de conexão com o Firebase: O cliente está offline. Verifique a configuração.");
        }
      }
    }
    testConnection();
  }, [db]);

  // Buscar branding para a tela de carregamento inicial
  const profilesQuery = useMemoFirebase(() => query(collection(db, "usuarios"), limit(1)), [db])
  const { data: profiles } = useCollection(profilesQuery)
  const profile = profiles?.[0]
  
  // Usar customAppLogoUrl globalmente
  const logoUrl = profile?.customAppLogoUrl

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.replace("/welcome")
      } else {
        router.replace("/login")
      }
    }
  }, [user, isUserLoading, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-8">
      <div className={`rounded-full border border-primary shadow-2xl shadow-primary/20 aspect-square flex items-center justify-center w-32 h-32 overflow-hidden animate-pulse ${logoUrl ? 'p-0' : 'p-6 bg-primary/10'}`}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <Wrench className="h-16 w-16 text-primary" />
        )}
      </div>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">
          Restaurando Conexão...
        </p>
      </div>
    </div>
  )
}
