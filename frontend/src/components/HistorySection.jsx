import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Search, Calendar, User, FileText, Activity, Eye, FolderOpen } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

export function HistorySection({ history }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [activeTab, setActiveTab] = useState("original")

  const filteredHistory = history.filter(
    (record) => 
      record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      record.nss.includes(searchTerm)
  )

  // Estado cuando no hay historial
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pacientes</CardTitle>
          <CardDescription>No se han realizado análisis aún</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No hay historial disponible
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Los análisis que realice aparecerán aquí
            </p>
            <Button 
              onClick={() => document.querySelector('[data-value="scan"]').click()}
              className="gap-2"
            >
              <Activity className="h-4 w-4" />
              Realizar primer análisis
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* --- TABLA PRINCIPAL (solo se muestra si hay historial) --- */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Historial de Pacientes</CardTitle>
              <CardDescription>
                {filteredHistory.length === 0 && searchTerm ? 
                  `No se encontraron resultados para "${searchTerm}"` : 
                  `${filteredHistory.length} análisis encontrados`
                }
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre o NSS..." 
                className="pl-8" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead className="text-right">Confianza</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 opacity-50" />
                        <p>No se encontraron análisis que coincidan con la búsqueda</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((record) => (
                    <TableRow 
                      key={record.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">
                        {record.patientName} 
                        <div className="text-xs text-muted-foreground">{record.nss}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          record.diagnosis.includes('Normal') 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                        }`}>
                          {record.diagnosis}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{record.confidence}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- MODAL DE DETALLES --- */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        {selectedRecord && (
          <DialogContent className="sm:max-w-[700px]" onOpenChange={setSelectedRecord}>
            <DialogHeader>
              <DialogTitle>Detalles del Análisis</DialogTitle>
              <DialogDescription>
                Reporte completo generado por IA - {new Date(selectedRecord.date).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              {/* 1. Datos del Paciente */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="mr-2 h-4 w-4" /> Paciente
                  </div>
                  <p className="font-medium">{selectedRecord.patientName}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4" /> NSS
                  </div>
                  <p className="font-medium">{selectedRecord.nss}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" /> Fecha
                  </div>
                  <p className="font-medium">{new Date(selectedRecord.date).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Activity className="mr-2 h-4 w-4" /> Confianza IA
                  </div>
                  <p className="font-medium">{selectedRecord.confidence}%</p>
                </div>
              </div>

              {/* 2. Diagnóstico Destacado */}
              <div className={`p-4 rounded-lg border text-center ${
                  selectedRecord.diagnosis.includes('Normal') 
                  ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900 dark:text-green-300' 
                  : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900 dark:text-red-300'
                }`}>
                  <h3 className="text-lg font-bold uppercase tracking-wide">
                    {selectedRecord.diagnosis}
                  </h3>
              </div>

              {/* 3. Probabilidades Detalladas */}
              {selectedRecord.probabilities && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Distribución de Probabilidades</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {Object.entries(selectedRecord.probabilities).map(([condition, probability]) => (
                        <div key={condition} className="flex justify-between items-center">
                          <span className="text-sm flex-1">{condition}</span>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1 bg-secondary rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  condition === selectedRecord.diagnosis 
                                    ? "bg-primary" 
                                    : "bg-muted-foreground/30"
                                }`}
                                style={{ width: `${probability * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">
                              {(probability * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 4. Visualización de Imágenes */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium leading-none text-muted-foreground">
                  Visualización del Análisis
                </h4>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="original">
                      Radiografía Original
                    </TabsTrigger>
                    <TabsTrigger value="gradcam" disabled={!selectedRecord.gradcamUrl}>
                      <Eye className="h-4 w-4 mr-2" />
                      Mapa de Calor
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="original" className="mt-4">
                    <div className="rounded-lg overflow-hidden border bg-black/5">
                      <img 
                        src={selectedRecord.imageUrl} 
                        alt="Radiografía del paciente" 
                        className="w-full h-auto max-h-[300px] object-contain"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="gradcam" className="mt-4">
                    {selectedRecord.gradcamUrl ? (
                      <div className="rounded-lg overflow-hidden border bg-black/5">
                        <img 
                          src={selectedRecord.gradcamUrl} 
                          alt="Mapa de calor GradCAM" 
                          className="w-full h-auto max-h-[300px] object-contain"
                        />
                        <div className="p-3 bg-muted/50 text-center text-sm text-muted-foreground">
                          Áreas en rojo indican regiones relevantes para el diagnóstico
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Mapa de calor no disponible para este análisis</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}