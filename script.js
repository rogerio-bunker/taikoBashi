let isAnimating = false

// Background aleatório para o modo light
function setLightBackground() {
  document.body.style.backgroundImage = `url('./assets/novafoto.jpg')`
}

// Background aleatório para o modo dark
const darkBackgrounds = [
  "./assets/darkmode1.png",
  "./assets/darkmode2.png",
]

function setRandomDarkBackground() {
  const bg = darkBackgrounds[Math.floor(Math.random() * darkBackgrounds.length)]
  document.body.style.backgroundImage = `linear-gradient(rgba(8,8,8,0.55), rgba(8,8,8,0.55)), url('${bg}')`
}

// Restaurar tema salvo e configurar avatar/background
const savedTheme = localStorage.getItem("theme")
const img = document.querySelector("#profile img")

if (savedTheme === "dark") {
  document.documentElement.classList.remove("light")
  if (img) img.setAttribute("src", "./assets/favicon.svg")
  setRandomDarkBackground()
} else {
  // Light mode (padrão) — avatar correto + background aleatório
  if (img) img.setAttribute("src", "./assets/favicon.svg")
  setLightBackground()
}

// ========== Transição Crossfade ==========

function toggleMode() {
  if (isAnimating) return
  isAnimating = true

  const html = document.documentElement
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
    const isLight = html.classList.contains("light")
    localStorage.setItem("theme", isLight ? "light" : "dark")

    if (isLight) {
      setLightBackground()
    } else {
      setRandomDarkBackground()
    }

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

