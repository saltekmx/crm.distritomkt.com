import type { AxiosError } from 'axios'

/**
 * Standard API error shape returned by the backend.
 * All errors follow: { detalle: string, codigo: string, toast: boolean }
 */
interface ApiErrorBody {
  detalle?: string
  codigo?: string
  toast?: boolean
}

/**
 * Extract a user-friendly error message from an Axios error.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrio un error inesperado',
): string {
  const axiosError = error as AxiosError<ApiErrorBody>
  return axiosError?.response?.data?.detalle || fallback
}

/**
 * Extract the error code from an Axios error response.
 */
export function getApiErrorCode(error: unknown): string | undefined {
  const axiosError = error as AxiosError<ApiErrorBody>
  return axiosError?.response?.data?.codigo
}

/**
 * Check if the API error should be shown as a toast.
 * Returns true if the backend explicitly says toast: true,
 * or if there's no toast field (legacy/unknown errors default to true).
 */
export function shouldShowToast(error: unknown): boolean {
  const axiosError = error as AxiosError<ApiErrorBody>
  const toast = axiosError?.response?.data?.toast
  // If backend didn't send toast field, default to true for 4xx/5xx
  return toast !== false
}
