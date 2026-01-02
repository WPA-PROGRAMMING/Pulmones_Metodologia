import { useState, useRef } from "react"
import axios from "axios"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Upload, X, CheckCircle, AlertTriangle, FileText, Activity, Eye, Image } from "lucide-react"

export function ScanSection({ token, onScanComplete }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [patientName, setPatientName] = useState("")
  const [nss, setNss] = useState("")
  const [activeImageTab, setActiveImageTab] = useState("original")
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setResult(null)
      setActiveImageTab("original")
    }
  }

  const handleAnalyze = async () => {
    if (!file || !patientName || !nss) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('patientName', patientName)
      formData.append('nss', nss)

      console.log("Enviando imagen para análisis...")
      const response = await axios.post('http://127.0.0.1:8000/predict', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      
      const data = response.data
      console.log("Respuesta del backend:", data)
      
      const newRecord = {
        id: data.id,
        patientName: data.patient_name,
        nss: data.nss,
        diagnosis: data.prediction,
        confidence: parseFloat(data.confidence.replace('%', '')),
        date: data.timestamp,
        imageUrl: `http://127.0.0.1:8000/static/${data.filename}`,
        gradcamUrl: data.gradcam_filename ? `http://127.0.0.1:8000/gradcam/${data.gradcam_filename}` : null,
        probabilities: data.probabilities_json ? JSON.parse(data.probabilities_json) : null
      }
      
      console.log("Registro creado:", newRecord)
      console.log("URL GradCAM:", newRecord.gradcamUrl)
      
      setResult(newRecord)
      onScanComplete(newRecord)
      
      // Si hay GradCAM, activar esa pestaña automáticamente
      if (newRecord.gradcamUrl) {
        setActiveImageTab("gradcam")
      }
    } catch (error) {
      console.error("Error en análisis:", error)
      alert("Error en el análisis: " + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setPatientName("")
    setNss("")
    setActiveImageTab("original")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* COLUMNA IZQUIERDA - FORMULARIO Y SUBIDA */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos del Paciente</CardTitle>
            <CardDescription>Ingrese la información antes de escanear.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input 
                id="name" 
                value={patientName} 
                onChange={e => setPatientName(e.target.value)} 
                placeholder="Ej. Juan Pérez" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nss">NSS</Label>
              <Input 
                id="nss" 
                value={nss} 
                onChange={e => setNss(e.target.value)} 
                placeholder="Ej. 1234-56-7890" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Radiografía</CardTitle>
            <CardDescription>Seleccione una imagen para analizar</CardDescription>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm">Click para seleccionar imagen</p>
                <p className="text-xs text-muted-foreground mt-2">Formatos: JPG, PNG, JPEG, BMP, TIFF</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-64 object-contain bg-black/5" 
                />
                {!loading && !result && (
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2" 
                    onClick={() => { setFile(null); setPreview(null) }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            <div className="mt-6">
              <Button 
                className="w-full" 
                disabled={!file || !patientName || !nss || loading || !!result} 
                onClick={handleAnalyze}
              >
                {loading ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : result ? (
                  "Completado"
                ) : (
                  "Analizar Imagen"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COLUMNA DERECHA - RESULTADOS CON GRADCAM */}
      <div className="space-y-6">
        {result ? (
          <div className="space-y-6">
            {/* TARJETA DE DIAGNÓSTICO PRINCIPAL */}
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="bg-primary/5">
                <CardTitle>Resultados del Análisis</CardTitle>
                <CardDescription>Diagnóstico generado por IA</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Diagnóstico Principal */}
                <div className={`p-6 rounded-xl border-2 text-center ${
                  result.diagnosis.toLowerCase().includes("normal") 
                    ? "border-green-500/20 bg-green-500/10 text-green-700 dark:bg-green-900/20 dark:text-green-300" 
                    : "border-red-500/20 bg-red-500/10 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                }`}>
                  <h2 className="text-3xl font-bold mb-2 capitalize">{result.diagnosis}</h2>
                  <div className="flex justify-center items-center gap-2 text-sm">
                    {result.diagnosis.toLowerCase().includes("normal") 
                      ? <CheckCircle className="h-4 w-4"/> 
                      : <AlertTriangle className="h-4 w-4"/>
                    }
                    <span>Confianza: {result.confidence}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TARJETA DE VISUALIZACIÓN - ORIGINAL vs GRADCAM */}
            <Card>
              <CardHeader>
                <CardTitle>Visualización del Análisis</CardTitle>
                <CardDescription>Compare la imagen original con el mapa de calor</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeImageTab} onValueChange={setActiveImageTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="original" className="gap-2">
                      <Image className="h-4 w-4" />
                      Imagen Original
                    </TabsTrigger>
                    <TabsTrigger value="gradcam" disabled={!result.gradcamUrl}>
                      <Eye className="h-4 w-4" />
                      Mapa de Calor
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="original" className="mt-4">
                    <div className="rounded-lg overflow-hidden border bg-black/5">
                      <img 
                        src={result.imageUrl} 
                        alt="Radiografía original" 
                        className="w-full h-auto max-h-80 object-contain"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Radiografía original del paciente
                    </p>
                  </TabsContent>
                  
                  <TabsContent value="gradcam" className="mt-4">
                    {result.gradcamUrl ? (
                      <>
                        <div className="rounded-lg overflow-hidden border bg-black/5">
                          <img 
                            src={result.gradcamUrl} 
                            alt="Mapa de calor GradCAM" 
                            className="w-full h-auto max-h-80 object-contain"
                            onError={(e) => {
                              console.error("❌ Error cargando GradCAM:", result.gradcamUrl)
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'block'
                            }}
                          />
                          <div className="hidden p-8 text-center text-muted-foreground">
                            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No se pudo cargar el mapa de calor</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                          Áreas en rojo indican regiones relevantes para el diagnóstico
                        </p>
                      </>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Mapa de calor no disponible para este análisis</p>
                        <p className="text-xs mt-2">El modelo GradCAM no está configurado</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* TARJETA DE PROBABILIDADES DETALLADAS */}
            {result.probabilities && (
              <Card>
                <CardHeader>
                  <CardTitle>Probabilidades Detalladas</CardTitle>
                  <CardDescription>Distribución de confianza por condición</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(result.probabilities).map(([condition, probability]) => (
                      <div key={condition} className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize flex-1">
                          {condition}
                        </span>
                        <div className="flex items-center gap-3 flex-1 max-w-xs">
                          <div className="flex-1 bg-secondary rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all ${
                                condition === result.diagnosis 
                                  ? "bg-primary" 
                                  : "bg-muted-foreground/30"
                              }`}
                              style={{ width: `${probability * 100}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold w-12 text-right ${
                            condition === result.diagnosis ? "text-primary" : "text-muted-foreground"
                          }`}>
                            {(probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Leyenda de colores */}
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 bg-primary rounded"></div>
                      <span>Condición diagnosticada</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <div className="w-3 h-3 bg-muted-foreground/30 rounded"></div>
                      <span>Otras condiciones</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BOTÓN NUEVO ANÁLISIS */}
            <Button variant="outline" className="w-full" onClick={resetForm}>
              Nuevo Análisis
            </Button>
          </div>
        ) : (
          /* ESTADO INICIAL - SIN RESULTADOS */
          <div className="h-full flex items-center justify-center p-12 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/10">
            <div className="text-center">
              <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Resultados del Análisis</h3>
              <p className="text-sm">Suba una imagen y haga clic en "Analizar"</p>
              <p className="text-xs mt-2">Se mostrarán:</p>
              <ul className="text-xs text-left mt-1 space-y-1 max-w-xs mx-auto">
                <li>• Diagnóstico y confianza</li>
                <li>• Imagen original y mapa de calor</li>
                <li>• Probabilidades detalladas</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}