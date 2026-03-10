/**
 * AI Action Protocol — universal contract for all modules.
 * Backend tools return actions, frontend dispatches them.
 */

export type ActionType = 'fill_form' | 'navigate' | 'reply' | 'confirm' | 'select'
export type ActionVariant = 'primary' | 'secondary' | 'outline' | 'destructive'

export interface AiAction {
  label: string
  type: ActionType
  payload: Record<string, unknown>
  variant: ActionVariant
  icon?: string
}

/**
 * Dispatch an AI action to the appropriate handler.
 * @param action - The action to dispatch
 * @param sendMessage - Callback to send a message back to the AI (for 'reply' actions)
 * @param navigate - React Router navigate function
 */
export function dispatchAiAction(
  action: AiAction,
  sendMessage: (text: string) => void,
  navigate: (path: string) => void,
) {
  switch (action.type) {
    case 'fill_form': {
      const route = action.payload.route as string | undefined
      const fields = action.payload.fields as Record<string, unknown> | undefined
      // Only navigate if route differs from current location
      const needsNav = route && window.location.pathname !== route
      if (needsNav) {
        navigate(route)
      }
      if (fields) {
        const dispatch = () =>
          window.dispatchEvent(new CustomEvent('ai:fill', { detail: { fields } }))
        // Delay when navigating to let the form mount; retry once for safety
        const delay = needsNav ? 600 : 50
        setTimeout(() => {
          dispatch()
          // Retry after a short extra delay to catch late-mounting forms
          if (needsNav) setTimeout(dispatch, 400)
        }, delay)
      }
      break
    }

    case 'navigate': {
      const route = action.payload.route as string | undefined
      if (route) {
        navigate(route)
      }
      break
    }

    case 'reply': {
      const text = action.payload.text as string | undefined
      if (text) {
        sendMessage(text)
      }
      break
    }

    case 'confirm': {
      window.dispatchEvent(
        new CustomEvent('ai:confirm', { detail: action.payload })
      )
      break
    }

    case 'select': {
      const text = action.payload.text as string | undefined
      if (text) {
        sendMessage(text)
      }
      break
    }
  }
}
