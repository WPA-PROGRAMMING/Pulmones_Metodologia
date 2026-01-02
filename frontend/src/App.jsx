import { useState, useEffect } from "react"
import { LoginForm } from "./components/LoginForm"
import { Dashboard } from "./components/Dashboard"

function App() {
  const [token, setToken] = useState(null)  // ← Iniciar como null, no localStorage
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay token guardado
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      // Opcional: verificar si el token aún es válido
      setToken(storedToken)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (newToken) => {
    setToken(newToken)
    localStorage.setItem("token", newToken)
  }

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem("token")
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inicializando aplicación...</p>
        </div>
      </div>
    )
  }

  // MOSTRAR LOGIN si NO hay token
  if (!token) {
    return <LoginForm onLogin={handleLogin} />
  }

  // MOSTRAR DASHBOARD solo si HAY token
  return <Dashboard onLogout={handleLogout} token={token} />
}

export default App