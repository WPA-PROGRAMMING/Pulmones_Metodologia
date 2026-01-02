import { useState, useEffect } from "react"
import axios from "axios"
import { Button } from "./ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Activity, History, LogOut, Upload, Sun, Moon, AlertCircle } from "lucide-react"
import { ScanSection } from "./ScanSection"
import { HistorySection } from "./HistorySection"
import { useTheme } from "./ThemeProvider"

export function Dashboard({ onLogout, token }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { theme, setTheme } = useTheme()

  // --- CARGAR HISTORIAL AL INICIAR ---
  useEffect(() => {
    const fetchHistory = async () => {
      if (!token) return

      try {
        setLoading(true)
        setError(null)
        
        console.log("Cargando historial...")
        const response = await axios.get('http://127.0.0.1:8000/history', {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000 // 10 segundos timeout
        })

        if (response.data && response.data.length > 0) {
          // Transformar datos con los nuevos campos
          const mappedData = response.data.map((item) => ({
            id: item.id,
            patientName: item.patient_name || "Sin nombre",
            nss: item.nss || "N/A",
            diagnosis: item.prediction,
            confidence: parseFloat(item.confidence?.replace('%', '') || 0),
            date: item.timestamp,
            imageUrl: `http://127.0.0.1:8000/static/${item.filename}`,
            gradcamUrl: item.gradcam_filename ? `http://127.0.0.1:8000/gradcam/${item.gradcam_filename}` : null,
            probabilities: item.probabilities_json ? JSON.parse(item.probabilities_json) : null
          }))

          setHistory(mappedData.reverse())
          console.log(`Historial cargado: ${mappedData.length} registros`)
        } else {
          // No hay historial - no es un error
          setHistory([])
          console.log("No hay historial disponible")
        }
      } catch (error) {
        console.error("Error cargando historial:", error)
        if (error.code === 'NETWORK_ERROR' || !error.response) {
          setError("No se puede conectar con el servidor. Verifique que el backend esté ejecutándose.")
        } else if (error.response.status === 401) {
          setError("Sesión expirada. Por favor, inicie sesión nuevamente.")
          onLogout() // Cerrar sesión si el token es inválido
        } else if (error.response.status === 404) {
          // No hay historial - no es un error
          setHistory([])
          setError(null)
        } else {
          setError("Error al cargar el historial. Intente nuevamente.")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [token, onLogout])

  // --- ACTUALIZAR AL ESCANEAR ---
  const handleNewScan = (record) => {
    setHistory([record, ...history])
    setError(null) // Limpiar error si había uno
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="container mx-auto flex h-16 items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <Activity className="h-6 w-6" />
            <span>MediScan AI</span>
          </div>

          {/* Controles Derecha */}
          <div className="flex items-center gap-4">

            {/* Botones de Tema */}
            <div className="flex items-center border rounded-md p-1 bg-muted/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title="Cambiar tema"
              >
                {theme === "dark" ? (
                  <Sun className="h-[1.2rem] w-[1.2rem]" />
                ) : (
                  <Moon className="h-[1.2rem] w-[1.2rem]" />
                )}
              </Button>
            </div>

            {/* Botón Logout */}
            <Button variant="destructive" size="sm" onClick={onLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="container mx-auto py-8 px-4">
        {/* Mostrar error solo si es un error real, no cuando no hay historial */}
        {error && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                Verifique que el servidor esté ejecutándose en http://127.0.0.1:8000
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="scan" className="space-y-6">

          {/* Navegación de Pestañas */}
          <div className="flex justify-center md:justify-start">
            <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
              <TabsTrigger value="scan" className="gap-2">
                <Upload className="h-4 w-4" /> Escanear
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" /> Historial
                {history.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {history.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pestaña 1: Escáner */}
          <TabsContent value="scan" className="animate-in fade-in-50 duration-500">
            <ScanSection token={token} onScanComplete={handleNewScan} />
          </TabsContent>

          {/* Pestaña 2: Historial */}
          <TabsContent value="history" className="animate-in fade-in-50 duration-500">
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <div className="text-center">
                  <Activity className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                  <p>Cargando historial...</p>
                </div>
              </div>
            ) : (
              <HistorySection history={history} />
            )}
          </TabsContent>

        </Tabs>
      </main>
    </div>
  )
}