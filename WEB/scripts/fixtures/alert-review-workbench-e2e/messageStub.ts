type ConfirmOptions = {
  onOk?: () => void | Promise<void>
}

const messages: Array<{ type: string; message: string }> = []

function push(type: string, message: string) {
  messages.push({ type, message })
}

export function useMessage() {
  return {
    createMessage: {
      error: (message: string) => push('error', message),
      warn: (message: string) => push('warn', message),
      success: (message: string) => push('success', message),
    },
    createConfirm: (options: ConfirmOptions) => {
      void options.onOk?.()
    },
  }
}

export function getAlertReviewE2EMessages() {
  return messages
}
