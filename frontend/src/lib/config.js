// Configuración centralizada para las URLs del backend
export const BACKEND_CONFIG = {
  BASE_URL: 'http://127.0.0.1:8000',
  ENDPOINTS: {
    LOGIN: '/login',
    REGISTER: '/register',
    PREDICT: '/predict',
    HISTORY: '/history',
    GRADCAM: '/gradcam',
    STATIC: '/static'
  }
}

// Función helper para construir URLs completas
export const getBackendUrl = (endpoint) => {
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`
}