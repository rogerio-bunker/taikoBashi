let isAnimating = false

const html = document.documentElement
const isPreview = new URLSearchParams(location.search).has("preview")

// Tema: começa pelo cache (abre rápido) e depois atualiza com o Supabase
let currentTheme = ThemeKit.loadCache()

function currentMode() {
  return html.classList.contains("light") ? "light" : "dark"
}

// Restaurar modo salvo
let savedMode = null
try {
  savedMode = localStorage.getItem("theme")
} catch {}
if (savedMode === "dark") html.classList.remove("light")

// Botão claro/escuro desativado no painel: o site fica no modo escolhido por ela
// (não salva no localStorage, para a preferência do visitante voltar se ela reativar)
function syncForcedMode() {
  const f = ThemeKit.forcedMode(currentTheme)
  if (f) html.classList.toggle("light", f === "light")
}
if (!isPreview) syncForcedMode()

ThemeKit.apply(currentTheme, currentMode())

if (isPreview) {
  // Prévia dentro do painel admin: recebe o tema via postMessage
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin) return
    const d = e.data
    if (!d || d.type !== "theme-preview") return
    currentTheme = d.theme
    html.classList.toggle("light", d.mode === "light")
    ThemeKit.apply(currentTheme, d.mode, d.bg)
  })
} else {
  // Primeira visita: esconde os textos padrão até chegar o conteúdo do painel (máx. 1,5 s)
  const pending = !currentTheme
  if (pending) html.classList.add("content-pending")
  const reveal = () => html.classList.remove("content-pending")
  if (pending) setTimeout(reveal, 1500)
  ThemeKit.fetchRemote().then((remote) => {
    if (!remote) return reveal()
    const changed = JSON.stringify(remote) !== JSON.stringify(currentTheme)
    currentTheme = remote
    ThemeKit.saveCache(remote)
    const before = currentMode()
    syncForcedMode()
    if (changed || currentMode() !== before) ThemeKit.apply(currentTheme, currentMode())
    reveal()
  })
}

// ========== Transição Crossfade ==========

function toggleMode() {
  if (isAnimating) return
  isAnimating = true

  const goingToLight = !html.classList.contains("light")

  // Overlay de fade
  const overlay = document.createElement("div")
  overlay.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;z-index:9998;pointer-events:none;opacity:0;transition:opacity 0.4s ease;"
  overlay.style.background = goingToLight ? "#fff" : "#000"
  document.body.appendChild(overlay)

  // Fade in do overlay
  requestAnimationFrame(() => {
    overlay.style.opacity = "1"
  })

  // No meio do fade, trocar o tema
  setTimeout(() => {
    html.classList.toggle("light")
    const mode = currentMode()
    if (!isPreview) {
      try {
        localStorage.setItem("theme", mode)
      } catch {}
    }
    ThemeKit.apply(currentTheme, mode)

    // Fade out do overlay
    setTimeout(() => {
      overlay.style.opacity = "0"
      overlay.addEventListener("transitionend", () => {
        overlay.remove()
        isAnimating = false
      })
    }, 100)
  }, 400)
}

// Suporte a teclado no switch
document.getElementById("switch").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    toggleMode()
  }
})
