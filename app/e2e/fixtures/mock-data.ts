/**
 * Shared mock data objects for Studio e2e tests.
 *
 * Shapes mirror api.distritomkt.com/app/studio/schemas.py and
 * src/services/api.ts (StudioGeneration, StudioTemplate, etc.).
 */

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export interface MockModel {
  id: string
  name: string
  api_type: string
  max_batch: number
  supports_editing: boolean
  aspect_ratios: string[]
  price_hint: string
}

export const MOCK_MODELS: MockModel[] = [
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash',
    api_type: 'gemini',
    max_batch: 4,
    supports_editing: true,
    aspect_ratios: ['1:1', '4:5', '3:4', '16:9', '9:16', '3:2'],
    price_hint: '$0.02',
  },
  {
    id: 'imagen-3',
    name: 'Imagen 3',
    api_type: 'imagen',
    max_batch: 4,
    supports_editing: false,
    aspect_ratios: ['1:1', '16:9', '9:16'],
    price_hint: '$0.04',
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    api_type: 'openai',
    max_batch: 1,
    supports_editing: false,
    aspect_ratios: ['1:1', '16:9', '9:16'],
    price_hint: '$0.08',
  },
]

// ---------------------------------------------------------------------------
// Generations
// ---------------------------------------------------------------------------

export interface MockGeneration {
  id: number
  proyecto_id: number
  tipo: string
  prompt: string
  estilo: string | null
  aspect_ratio: string
  estado: 'pending' | 'generating' | 'complete' | 'failed'
  url_salida: string | null
  key_salida: string | null
  mensaje_error: string | null
  is_favorito: boolean
  media_id_salida: number | null
  tags: string[] | null
  modelo: string | null
  seed: number | null
  output_format: string | null
  creado_en: string
  actualizado_en: string
}

const now = new Date().toISOString()

export const MOCK_GENERATIONS: MockGeneration[] = [
  {
    id: 101,
    proyecto_id: 1,
    tipo: 'image',
    prompt: 'Foto de producto minimalista con fondo blanco',
    estilo: 'product',
    aspect_ratio: '1:1',
    estado: 'complete',
    url_salida: 'https://placehold.co/512x512/1a1a2e/e0e0e0?text=Gen+101',
    key_salida: 'studio/gen_101.png',
    mensaje_error: null,
    is_favorito: true,
    media_id_salida: null,
    tags: ['producto', 'minimalista'],
    modelo: 'gemini-2.5-flash-image',
    seed: 42,
    output_format: 'png',
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: 102,
    proyecto_id: 1,
    tipo: 'image',
    prompt: 'Banner para redes sociales estilo moderno',
    estilo: 'social',
    aspect_ratio: '16:9',
    estado: 'complete',
    url_salida: 'https://placehold.co/1024x576/2a1a3e/e0e0e0?text=Gen+102',
    key_salida: 'studio/gen_102.png',
    mensaje_error: null,
    is_favorito: false,
    media_id_salida: 55,
    tags: ['social', 'banner'],
    modelo: 'gemini-2.5-flash-image',
    seed: null,
    output_format: 'png',
    creado_en: new Date(Date.now() - 3600_000).toISOString(),
    actualizado_en: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 103,
    proyecto_id: 1,
    tipo: 'image',
    prompt: 'Imagen cinematica de paisaje urbano',
    estilo: 'cinematic',
    aspect_ratio: '16:9',
    estado: 'complete',
    url_salida: 'https://placehold.co/1024x576/0a1a2e/e0e0e0?text=Gen+103',
    key_salida: 'studio/gen_103.png',
    mensaje_error: null,
    is_favorito: false,
    media_id_salida: null,
    tags: null,
    modelo: 'imagen-3',
    seed: null,
    output_format: 'jpg',
    creado_en: new Date(Date.now() - 7200_000).toISOString(),
    actualizado_en: new Date(Date.now() - 7200_000).toISOString(),
  },
]

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface MockTemplate {
  id: number
  nombre: string
  prompt: string
  negative_prompt: string | null
  estilo: string | null
  aspect_ratio: string
  creado_por: number
  compartido: boolean
  creado_en: string
  actualizado_en: string
}

export const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: 1,
    nombre: 'Producto E-commerce',
    prompt: 'Professional product photo on white background, studio lighting, high resolution',
    negative_prompt: 'blurry, low quality',
    estilo: 'product',
    aspect_ratio: '1:1',
    creado_por: 1,
    compartido: false,
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: 2,
    nombre: 'Social Media Post',
    prompt: 'Modern social media post with vibrant colors and bold typography',
    negative_prompt: null,
    estilo: 'social',
    aspect_ratio: '4:5',
    creado_por: 1,
    compartido: true,
    creado_en: now,
    actualizado_en: now,
  },
]

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export interface MockConversation {
  id: number
  titulo: string
  creado_en: string
  actualizado_en: string
}

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: 10,
    titulo: 'Sesion de diseno',
    creado_en: now,
    actualizado_en: now,
  },
  {
    id: 11,
    titulo: 'Ideas para campainha',
    creado_en: new Date(Date.now() - 86400_000).toISOString(),
    actualizado_en: new Date(Date.now() - 86400_000).toISOString(),
  },
]

export interface MockConversationDetail {
  id: number
  titulo: string
  mensajes: Array<{
    id: number
    rol: string
    contenido: string
    accion?: unknown
    creado_en: string
  }>
}

export const MOCK_CONVERSATION_DETAIL: MockConversationDetail = {
  id: 10,
  titulo: 'Sesion de diseno',
  mensajes: [
    {
      id: 1,
      rol: 'user',
      contenido: 'Genera una imagen de un cafe latte',
      creado_en: now,
    },
    {
      id: 2,
      rol: 'assistant',
      contenido: 'He generado la imagen del cafe latte. Aqui tienes el resultado.',
      creado_en: now,
    },
  ],
}

// ---------------------------------------------------------------------------
// SSE Chat Stream
// ---------------------------------------------------------------------------

export function buildMockSSEStream(text: string): string {
  const lines: string[] = []

  const words = text.split(' ')
  let accumulated = ''
  for (const word of words) {
    accumulated += (accumulated ? ' ' : '') + word
    lines.push(
      `data: ${JSON.stringify({ type: 'token', content: word + ' ' })}\n\n`,
    )
  }

  lines.push(
    `data: ${JSON.stringify({
      type: 'done',
      content: accumulated,
      quick_actions: ['Generar Imagenes', 'Ver Galeria'],
    })}\n\n`,
  )

  return lines.join('')
}

// ---------------------------------------------------------------------------
// Project Info
// ---------------------------------------------------------------------------

export const MOCK_PROJECT = {
  id: 1,
  nombre: 'Proyecto Demo',
}

// ---------------------------------------------------------------------------
// Prompt History (localStorage key used by the app)
// ---------------------------------------------------------------------------

export const PROMPT_HISTORY_KEY = 'studio-prompt-history'

export const MOCK_PROMPT_HISTORY = [
  'Foto de producto con fondo degradado',
  'Logo minimalista en blanco y negro',
  'Ilustracion para post de Instagram',
]
