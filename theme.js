// Tema personalizável do site (cores e imagens de fundo).
// Os valores vêm do Supabase (tabela site_theme) e caem nestes padrões se faltar algo.
;(function () {
  const DEFAULT_THEME = {
    light: {
      backgrounds: ["./assets/novafoto.jpg"],
      library: [],
      overlay: 0,
      text: "#1a1a2e",
      buttonBg: "#ffffff",
      buttonBgOpacity: 82,
      buttonText: "#1a1a2e",
    },
    dark: {
      backgrounds: ["./assets/darkmode1.png", "./assets/darkmode2.png"],
      library: [],
      overlay: 55,
      text: "#f0ebe4",
      buttonBg: "#ffffff",
      buttonBgOpacity: 4,
      buttonText: "#f0ebe4",
    },
  }

  const CACHE_KEY = "site-theme-v1"
  const lastBg = {}

  function clamp(v, min, max) {
    v = Number(v)
    if (!Number.isFinite(v)) v = min
    return Math.min(max, Math.max(min, v))
  }

  function isHex(v) {
    return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)
  }

  // Completa o tema com os padrões e descarta valores inválidos
  function merge(theme) {
    const out = {}
    for (const mode of ["light", "dark"]) {
      const def = DEFAULT_THEME[mode]
      const src = (theme && theme[mode]) || {}
      const backgrounds = Array.isArray(src.backgrounds)
        ? src.backgrounds.filter((u) => typeof u === "string" && u)
        : []
      out[mode] = {
        backgrounds: backgrounds.length ? backgrounds : [...def.backgrounds],
        // Fotos enviadas pela admin (marcadas ou não), para poder reescolher depois
        library: Array.isArray(src.library)
          ? [...new Set(src.library.filter((u) => typeof u === "string" && u))]
          : [],
        overlay: src.overlay == null ? def.overlay : clamp(src.overlay, 0, 90),
        text: isHex(src.text) ? src.text : def.text,
        buttonBg: isHex(src.buttonBg) ? src.buttonBg : def.buttonBg,
        buttonBgOpacity:
          src.buttonBgOpacity == null ? def.buttonBgOpacity : clamp(src.buttonBgOpacity, 0, 100),
        buttonText: isHex(src.buttonText) ? src.buttonText : def.buttonText,
      }
    }
    return out
  }

  function hexToRgb(hex) {
    const n = parseInt(String(hex).slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }

  function rgba(hex, pct) {
    const [r, g, b] = hexToRgb(hex)
    return `rgba(${r}, ${g}, ${b}, ${clamp(pct, 0, 100) / 100})`
  }

  function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map((c) => {
      c /= 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  function contrastRatio(a, b) {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (l1 + 0.05) / (l2 + 0.05)
  }

  function cssUrl(u) {
    return `url("${String(u).replace(/["\\\n\r]/g, (c) => encodeURIComponent(c))}")`
  }

  function apply(theme, mode) {
    const t = merge(theme)[mode]
    const s = document.documentElement.style
    const op = t.buttonBgOpacity

    s.setProperty("--text-color", t.text)
    s.setProperty("--button-text", t.buttonText)
    s.setProperty("--surface-color", rgba(t.buttonBg, op))
    s.setProperty("--surface-color-hover", rgba(t.buttonBg, op < 20 ? op + 3 : Math.min(100, op + 10)))
    // "Pílulas" atrás do @, ícones e rodapé no modo claro: contrastam com a cor do texto
    s.setProperty(
      "--chip-bg",
      luminance(t.text) > 0.4 ? "rgba(20, 20, 30, 0.72)" : "rgba(255, 255, 255, 0.82)"
    )

    let bg = lastBg[mode]
    if (!t.backgrounds.includes(bg)) {
      bg = t.backgrounds[Math.floor(Math.random() * t.backgrounds.length)]
      lastBg[mode] = bg
    }
    const ov = t.overlay / 100
    document.body.style.backgroundImage =
      ov > 0
        ? `linear-gradient(rgba(8,8,8,${ov}), rgba(8,8,8,${ov})), ${cssUrl(bg)}`
        : cssUrl(bg)
  }

  async function fetchRemote() {
    const c = window.SITE_CONFIG
    if (!c || !c.supabaseUrl || !c.supabaseKey) return null
    try {
      const res = await fetch(`${c.supabaseUrl}/rest/v1/site_theme?id=eq.1&select=data`, {
        headers: { apikey: c.supabaseKey },
      })
      if (!res.ok) return null
      const rows = await res.json()
      return (rows[0] && rows[0].data) || null
    } catch {
      return null
    }
  }

  function loadCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY)) || null
    } catch {
      return null
    }
  }

  function saveCache(theme) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(theme))
    } catch {}
  }

  window.ThemeKit = {
    DEFAULT_THEME,
    merge,
    apply,
    fetchRemote,
    loadCache,
    saveCache,
    contrastRatio,
  }
})()
