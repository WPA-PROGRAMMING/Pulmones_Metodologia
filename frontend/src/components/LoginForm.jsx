import { useState } from "react"
import axios from "axios"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Activity, Lock, Mail } from "lucide-react"

export function LoginForm({ onLogin }) {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e, type) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const API_URL = "http://127.0.0.1:8000"

    try {
      if (type === "login") {
        const formData = new FormData()
        formData.append('username', email)
        formData.append('password', password)
        const response = await axios.post(`${API_URL}/login`, formData)
        onLogin(response.data.access_token)
      } else {
        await axios.post(`${API_URL}/register`, {
          email: regEmail,
          password: regPassword
        })
        alert("Cuenta creada exitosamente. Inicia sesión.")
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Error de conexión.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">MediScan AI</CardTitle>
          <CardDescription>Plataforma de Diagnóstico Inteligente</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={(e) => handleSubmit(e, "login")} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" className="pl-9" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Cargando..." : "Ingresar"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={(e) => handleSubmit(e, "register")} className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label>Correo</Label>
                    <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label>Contraseña</Label>
                    <Input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>Crear Cuenta</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}