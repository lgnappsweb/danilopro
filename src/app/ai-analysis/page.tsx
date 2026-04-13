
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RemovedPage() {
  const router = useRouter()
  useEffect(() => {
    router.push("/dashboard")
  }, [router])
  return null
}
