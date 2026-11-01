export async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Try the legacy copy method when clipboard permission is unavailable.
    }
  }
  if (typeof document.execCommand !== "function") return false

  const field = document.createElement("textarea")
  field.value = value
  field.setAttribute("readonly", "")
  field.style.position = "fixed"
  field.style.opacity = "0"
  document.body.append(field)
  field.select()
  const copied = document.execCommand("copy")
  field.remove()
  return copied
}
