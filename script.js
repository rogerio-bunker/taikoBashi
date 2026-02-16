let isAnimating = false

// Restaurar tema salvo
const savedTheme = localStorage.getItem("theme")
if (savedTheme === "dark") {
  document.documentElement.classList.remove("light")
  const img = document.querySelector("#profile img")
  if (img) img.setAttribute("src", "./assets/Avatar.png")
}

// ========== Transição Ink Splash ==========

function createSparkles(x, y, goingToLight) {
  const count = 24
  for (let i = 0; i < count; i++) {
    const sparkle = document.createElement("div")
    sparkle.className = "sparkle"
    const angle =
      (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    const distance = 50 + Math.random() * 100
    const size = 2 + Math.random() * 4
    const duration = 0.4 + Math.random() * 0.3
    const color = goingToLight ? "#ffb7c5" : "#ff6b6b"
    const glow = goingToLight ? "#ff8fa3" : "#cc3333"

    sparkle.style.cssText = `
      position:fixed;left:${x}px;top:${y}px;
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      box-shadow:0 0 ${size * 3}px ${glow};
      pointer-events:none;z-index:10000;
      animation:sparkleOut ${duration}s ease-out forwards;
      --tx:${Math.cos(angle) * distance}px;
      --ty:${Math.sin(angle) * distance}px;
    `
    document.body.appendChild(sparkle)
    setTimeout(() => sparkle.remove(), duration * 1000 + 50)
  }
}

function toggleMode() {
  if (isAnimating) return
  isAnimating = true

  const html = document.documentElement
  const img = document.querySelector("#profile img")
  const switchBtn = document.getElementById("switch")
  const container = document.getElementById("container")
  const goingToLight = !html.classList.contains("light")

  const rect = switchBtn.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  // Burst de sparkles
  createSparkles(cx, cy, goingToLight)

  // Pulse no container
  container.classList.add("transitioning")
  setTimeout(() => container.classList.remove("transitioning"), 700)

  // Canvas overlay para o ink splash
  const inkCanvas = document.createElement("canvas")
  inkCanvas.width = window.innerWidth
  inkCanvas.height = window.innerHeight
  inkCanvas.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;z-index:9998;pointer-events:none;"
  document.body.appendChild(inkCanvas)
  const ictx = inkCanvas.getContext("2d")

  // Cor da tinta (combina com o background de destino)
  const inkColor = goingToLight ? "#fce4de" : "#080808"

  // Distância máxima para cobrir a tela inteira
  const maxDist = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(window.innerWidth - cx, cy),
    Math.hypot(cx, window.innerHeight - cy),
    Math.hypot(window.innerWidth - cx, window.innerHeight - cy)
  )

  // Blobs orgânicos principais
  const blobs = []
  const numBlobs = 14
  for (let i = 0; i < numBlobs; i++) {
    const angle =
      (Math.PI * 2 * i) / numBlobs + (Math.random() - 0.5) * 0.4
    const speed = 14 + Math.random() * 18
    blobs.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 25 + Math.random() * 35,
      growth: 1.06 + Math.random() * 0.04,
    })
  }

  // Gotículas de respingo
  const splatters = []
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 18 + Math.random() * 30
    splatters.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 10,
      delay: Math.floor(Math.random() * 6),
    })
  }

  let centerRadius = 0
  let frame = 0
  let themeChanged = false
  const coverFrames = 22
  const totalFrames = 32
  const centerGrowth = (maxDist * 1.15) / coverFrames

  function animateInk() {
    ictx.fillStyle = inkColor

    // Centro crescente
    centerRadius += centerGrowth
    ictx.beginPath()
    ictx.arc(cx, cy, centerRadius, 0, Math.PI * 2)
    ictx.fill()

    // Blobs orgânicos (criam borda irregular como tinta)
    blobs.forEach((b) => {
      b.x += b.vx
      b.y += b.vy
      b.radius *= b.growth
      b.vx *= 0.97
      b.vy *= 0.97

      ictx.beginPath()
      ictx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
      ictx.fill()
    })

    // Gotículas
    splatters.forEach((s) => {
      if (frame >= s.delay) {
        s.x += s.vx
        s.y += s.vy
        s.vx *= 0.93
        s.vy *= 0.93

        ictx.beginPath()
        ictx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        ictx.fill()
      }
    })

    frame++

    // Trocar tema quando a tela estiver coberta
    if (frame >= coverFrames - 2 && !themeChanged) {
      themeChanged = true
      html.classList.toggle("light")
      const isLight = html.classList.contains("light")
      localStorage.setItem("theme", isLight ? "light" : "dark")
      img.setAttribute(
        "src",
        isLight ? "./assets/avatar-light.png" : "./assets/Avatar.png"
      )
    }

    if (frame < totalFrames) {
      requestAnimationFrame(animateInk)
    } else {
      // Fade out para revelar o novo tema
      let opacity = 1
      function fadeOut() {
        opacity -= 0.06
        if (opacity <= 0) {
          inkCanvas.remove()
          isAnimating = false
          return
        }
        inkCanvas.style.opacity = opacity
        requestAnimationFrame(fadeOut)
      }
      fadeOut()
    }
  }

  requestAnimationFrame(animateInk)
}

// Suporte a teclado no switch
document.getElementById("switch").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault()
    toggleMode()
  }
})

// ========== Canvas: Nebulosas + Estrelas (dark) / Sakura (light) ==========
const canvas = document.getElementById("stars")
const ctx = canvas.getContext("2d")

let stars = []
let shootingStars = []
let nebulae = []

function isLightMode() {
  return document.documentElement.classList.contains("light")
}

function resizeCanvas() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

// --- Textura de papel japonês (washi) ---
let paperPattern = null

function createPaperTexture() {
  const tex = document.createElement("canvas")
  tex.width = 256
  tex.height = 256
  const tctx = tex.getContext("2d")
  const data = tctx.createImageData(256, 256)
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.random() * 25
    data.data[i] = v
    data.data[i + 1] = v
    data.data[i + 2] = v
    data.data[i + 3] = 10
  }
  tctx.putImageData(data, 0, 0)
  paperPattern = ctx.createPattern(tex, "repeat")
}

// --- Nebulosas carmesim (Japanese Luxury) ---
function createNebulae() {
  nebulae = []
  const colors = [
    { r: 120, g: 12, b: 12 },
    { r: 80, g: 8, b: 18 },
    { r: 100, g: 15, b: 10 },
    { r: 50, g: 5, b: 20 },
    { r: 70, g: 10, b: 8 },
  ]

  for (let i = 0; i < 4; i++) {
    nebulae.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 200 + Math.random() * 300,
      color: colors[i % colors.length],
      opacity: 0.018 + Math.random() * 0.022,
      driftX: (Math.random() - 0.5) * 0.08,
      driftY: (Math.random() - 0.5) * 0.05,
    })
  }
}

function drawNebulae() {
  nebulae.forEach((n) => {
    n.x += n.driftX
    n.y += n.driftY

    if (n.x > canvas.width + n.radius) n.x = -n.radius
    if (n.x < -n.radius) n.x = canvas.width + n.radius
    if (n.y > canvas.height + n.radius) n.y = -n.radius
    if (n.y < -n.radius) n.y = canvas.height + n.radius

    const gradient = ctx.createRadialGradient(
      n.x, n.y, 0,
      n.x, n.y, n.radius
    )
    gradient.addColorStop(
      0,
      `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${n.opacity})`
    )
    gradient.addColorStop(
      0.5,
      `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${n.opacity * 0.3})`
    )
    gradient.addColorStop(
      1,
      `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, 0)`
    )

    ctx.beginPath()
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
  })
}

// --- Estrelas (tons quentes: branco, dourado, âmbar) ---
const starPalette = [
  { r: 255, g: 255, b: 255 },
  { r: 255, g: 245, b: 225 },
  { r: 255, g: 225, b: 180 },
  { r: 255, g: 210, b: 160 },
  { r: 240, g: 230, b: 220 },
  { r: 255, g: 200, b: 150 },
]

function createStars() {
  stars = []
  const numStars = Math.floor((canvas.width * canvas.height) / 3500)

  for (let i = 0; i < numStars; i++) {
    const color = starPalette[Math.floor(Math.random() * starPalette.length)]
    const radius = Math.random() * 1.5 + 0.2
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: radius,
      color: color,
      opacity: Math.random(),
      twinkleSpeed: Math.random() * 0.015 + 0.004,
      twinkleDirection: Math.random() > 0.5 ? 1 : -1,
      isHero: radius > 1.3,
    })
  }
}

function drawCrossGlare(x, y, size, opacity, color) {
  const len = size * 7
  const { r, g, b } = color

  const hGrad = ctx.createLinearGradient(x - len, y, x + len, y)
  hGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
  hGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`)
  hGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
  ctx.beginPath()
  ctx.moveTo(x - len, y)
  ctx.lineTo(x + len, y)
  ctx.strokeStyle = hGrad
  ctx.lineWidth = 0.6
  ctx.stroke()

  const vGrad = ctx.createLinearGradient(x, y - len, x, y + len)
  vGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
  vGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`)
  vGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
  ctx.beginPath()
  ctx.moveTo(x, y - len)
  ctx.lineTo(x, y + len)
  ctx.strokeStyle = vGrad
  ctx.lineWidth = 0.6
  ctx.stroke()
}

function createShootingStar() {
  if (shootingStars.length < 2 && Math.random() < 0.008) {
    shootingStars.push({
      x: Math.random() * canvas.width,
      y: 0,
      length: Math.random() * 80 + 50,
      speed: Math.random() * 10 + 8,
      opacity: 1,
      angle: Math.PI / 4 + (Math.random() * 0.3 - 0.15),
      width: 0.8 + Math.random() * 1.2,
    })
  }
}

function updateShootingStars() {
  shootingStars = shootingStars.filter((star) => {
    star.x += Math.cos(star.angle) * star.speed
    star.y += Math.sin(star.angle) * star.speed
    star.opacity -= 0.008
    return (
      star.opacity > 0 && star.x < canvas.width && star.y < canvas.height
    )
  })
}

function drawDarkMode() {
  // Camada 0: Textura de papel japonês
  if (paperPattern) {
    ctx.fillStyle = paperPattern
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Camada 1: Nebulosas carmesim
  drawNebulae()

  // Camada 2: Estrelas
  stars.forEach((star) => {
    star.opacity += star.twinkleSpeed * star.twinkleDirection
    if (star.opacity >= 1 || star.opacity <= 0.15) {
      star.twinkleDirection *= -1
    }

    const { r, g, b } = star.color

    ctx.beginPath()
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.opacity})`
    ctx.fill()

    if (star.radius > 0.7) {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.radius * 2.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.06})`
      ctx.fill()
    }

    if (star.isHero) {
      drawCrossGlare(star.x, star.y, star.radius, star.opacity, star.color)
    }
  })

  // Camada 3: Estrelas cadentes (douradas)
  shootingStars.forEach((star) => {
    const tailX = star.x - Math.cos(star.angle) * star.length
    const tailY = star.y - Math.sin(star.angle) * star.length

    const gradient = ctx.createLinearGradient(
      star.x, star.y,
      tailX, tailY
    )
    gradient.addColorStop(0, `rgba(255, 230, 180, ${star.opacity})`)
    gradient.addColorStop(0.3, `rgba(255, 200, 140, ${star.opacity * 0.5})`)
    gradient.addColorStop(1, "rgba(200, 150, 80, 0)")

    ctx.beginPath()
    ctx.moveTo(star.x, star.y)
    ctx.lineTo(tailX, tailY)
    ctx.strokeStyle = gradient
    ctx.lineWidth = star.width
    ctx.lineCap = "round"
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(star.x, star.y, star.width, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 248, 230, ${star.opacity})`
    ctx.fill()
  })
}

// --- Sparkles / Shimmer (light mode) ---
let sparkles = []

function createSparkleParticles() {
  sparkles = []
  const count = Math.floor((canvas.width * canvas.height) / 12000)

  for (let i = 0; i < count; i++) {
    sparkles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      opacity: Math.random(),
      pulseSpeed: Math.random() * 0.04 + 0.01,
      pulseDir: Math.random() > 0.5 ? 1 : -1,
      driftX: (Math.random() - 0.5) * 0.3,
      driftY: Math.random() * -0.2 - 0.05,
      // Algumas partículas são "estrelinhas" de 4 pontas
      isStar: Math.random() > 0.7,
    })
  }
}

function drawSparkle(s) {
  if (s.isStar && s.size > 1.5) {
    // Estrela de 4 pontas (brilho em cruz)
    const len = s.size * 3
    const grad1 = ctx.createLinearGradient(s.x - len, s.y, s.x + len, s.y)
    grad1.addColorStop(0, "rgba(255, 255, 255, 0)")
    grad1.addColorStop(0.5, `rgba(255, 255, 255, ${s.opacity * 0.6})`)
    grad1.addColorStop(1, "rgba(255, 255, 255, 0)")
    ctx.beginPath()
    ctx.moveTo(s.x - len, s.y)
    ctx.lineTo(s.x + len, s.y)
    ctx.strokeStyle = grad1
    ctx.lineWidth = 0.8
    ctx.stroke()

    const grad2 = ctx.createLinearGradient(s.x, s.y - len, s.x, s.y + len)
    grad2.addColorStop(0, "rgba(255, 255, 255, 0)")
    grad2.addColorStop(0.5, `rgba(255, 255, 255, ${s.opacity * 0.6})`)
    grad2.addColorStop(1, "rgba(255, 255, 255, 0)")
    ctx.beginPath()
    ctx.moveTo(s.x, s.y - len)
    ctx.lineTo(s.x, s.y + len)
    ctx.strokeStyle = grad2
    ctx.lineWidth = 0.8
    ctx.stroke()
  }

  // Ponto central brilhante
  ctx.beginPath()
  ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`
  ctx.fill()

  // Halo suave
  ctx.beginPath()
  ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255, 220, 230, ${s.opacity * 0.15})`
  ctx.fill()
}

function updateAndDrawLightMode() {
  sparkles.forEach((s) => {
    // Pulsar opacidade
    s.opacity += s.pulseSpeed * s.pulseDir
    if (s.opacity >= 1) { s.opacity = 1; s.pulseDir = -1 }
    if (s.opacity <= 0) { s.opacity = 0; s.pulseDir = 1 }

    // Drift leve (subindo devagar)
    s.x += s.driftX
    s.y += s.driftY

    // Wrap around
    if (s.y < -10) { s.y = canvas.height + 10; s.x = Math.random() * canvas.width }
    if (s.x < -10) s.x = canvas.width + 10
    if (s.x > canvas.width + 10) s.x = -10

    drawSparkle(s)
  })
}

// --- Loop de animação ---
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (isLightMode()) {
    updateAndDrawLightMode()
  } else {
    createShootingStar()
    updateShootingStars()
    drawDarkMode()
  }

  requestAnimationFrame(animate)
}

// Inicializar
resizeCanvas()
createPaperTexture()
createStars()
createNebulae()
createSparkleParticles()
animate()

window.addEventListener("resize", () => {
  resizeCanvas()
  createStars()
  createNebulae()
  createSparkleParticles()
})
