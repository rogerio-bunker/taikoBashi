// Tema personalizável do site (cores, fundos, textos, links e tamanhos).
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

  // Textos e links (valem para os dois modos)
  const WHATSAPP =
    "https://api.whatsapp.com/send?phone=5551981900250&text=Ol%C3%A1%2C%20Gostaria%20de%20fazer%20meu%20pedido!"
  const DEFAULT_CONTENT = {
    handle: "@taikobashi.sushi",
    links: [
      { text: "Siga Taiko Bashi no instagram", url: "https://www.instagram.com/taikobashi.sushi" },
      { text: "Faça seu pedido no Site", url: "https://taikobashi.com.br/" },
      { text: "WhatsApp", url: WHATSAPP },
      {
        text: "Nosso link no ifood",
        url: "https://www.ifood.com.br/delivery/porto-alegre-rs/taiko-bashi-sushi-poa-partenon/5557c01e-b323-4834-878c-9fd804023efc?utm_medium=share",
      },
    ],
    social: [
      { icon: "logo-instagram", url: "https://www.instagram.com/taikobashi.sushi" },
      { icon: "reader-outline", url: "https://taikobashi.com.br/" },
      { icon: "logo-whatsapp", url: WHATSAPP },
      { icon: "location-outline", url: "https://share.google/dYJksb6suRZLrI8tU" },
    ],
  }

  // Ícones que a admin pode escolher (nome do Ionicons → rótulo)
  const SOCIAL_ICONS = {
    "logo-instagram": "Instagram",
    "logo-whatsapp": "WhatsApp",
    "logo-facebook": "Facebook",
    "logo-tiktok": "TikTok",
    "logo-youtube": "YouTube",
    "reader-outline": "Cardápio",
    "location-outline": "Localização",
    "call-outline": "Telefone",
    "mail-outline": "E-mail",
    "globe-outline": "Site",
    "bicycle-outline": "Delivery",
    "star-outline": "Avaliações",
  }

  // Tamanhos em px: [padrão, mínimo, máximo]
  const SIZES = {
    width: [420, 300, 640],
    buttonPad: [16, 6, 36],
    buttonFont: [16, 12, 26],
    buttonRadius: [8, 0, 40],
    buttonGap: [16, 4, 40],
    logo: [136, 48, 240],
    handle: [16, 12, 28],
    icons: [24, 16, 40],
  }
  const DEFAULT_SIZES = Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, v[0]]))

  const CACHE_KEY = "site-theme-v1"
  const lastBg = {}

  function clamp(v, min, max) {
    v = Number(v)
    if (!Number.isFinite(v)) v = min
    return Math.min(max, Math.max(min, v))
  }

  // Enquadramento de uma foto (celular e computador), com padrão centralizado
  function cleanFit(f) {
    f = f || {}
    return {
      x: f.x == null ? 50 : clamp(f.x, 0, 100),
      y: f.y == null ? 50 : clamp(f.y, 0, 100),
      zoom: f.zoom == null ? 100 : clamp(f.zoom, 100, 250),
    }
  }

  function getFit(modeTheme, url) {
    const f = (modeTheme.fit && modeTheme.fit[url]) || {}
    return { mobile: cleanFit(f.mobile), desktop: cleanFit(f.desktop) }
  }

  function isHex(v) {
    return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)
  }

  function cleanText(v, max) {
    return typeof v === "string" ? v.slice(0, max) : ""
  }

  // Só aceita links http(s), e-mail e telefone; "site.com" vira "https://site.com"
  function cleanUrl(v) {
    const u = typeof v === "string" ? v.trim() : ""
    if (!u) return ""
    if (/^(https?:\/\/|mailto:|tel:)/i.test(u)) return u
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(u)) return "https://" + u
    return ""
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
        fit: {},
      }
      if (src.fit && typeof src.fit === "object") {
        for (const url of Object.keys(src.fit)) out[mode].fit[url] = getFit(src, url)
      }
    }
    // Elementos do topo (valem para os dois modos)
    const lay = (theme && theme.layout) || {}
    out.layout = {
      showLogo: lay.showLogo !== false,
      showHandle: lay.showHandle !== false,
    }
    // Textos e links (valem para os dois modos)
    const con = (theme && theme.content) || {}
    out.content = {
      handle: typeof con.handle === "string" ? con.handle.slice(0, 60) : DEFAULT_CONTENT.handle,
      links: Array.isArray(con.links)
        ? con.links
            .filter((l) => l && typeof l === "object")
            .map((l) => ({ text: cleanText(l.text, 80), url: cleanText(l.url, 2000) }))
        : DEFAULT_CONTENT.links.map((l) => ({ ...l })),
      social: Array.isArray(con.social)
        ? con.social
            .filter((l) => l && typeof l === "object")
            .map((l) => ({
              icon: SOCIAL_ICONS[l.icon] ? l.icon : "globe-outline",
              url: cleanText(l.url, 2000),
            }))
        : DEFAULT_CONTENT.social.map((l) => ({ ...l })),
    }
    // Tamanhos (valem para os dois modos)
    const siz = (theme && theme.sizes) || {}
    out.sizes = {}
    for (const [k, [def, min, max]] of Object.entries(SIZES)) {
      out.sizes[k] = siz[k] == null ? def : clamp(siz[k], min, max)
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

  // Camada fixa do fundo (no lugar de background-attachment: fixed,
  // que no celular estica a foto para a altura da página e a deixa borrada)
  function bgLayer() {
    let el = document.getElementById("site-bg")
    if (!el) {
      el = document.createElement("div")
      el.id = "site-bg"
      el.setAttribute("aria-hidden", "true")
      document.body.prepend(el)
    }
    return el
  }

  function setLink(a, url) {
    const u = cleanUrl(url)
    if (u) {
      a.href = u
      a.target = "_blank"
      a.rel = "noopener"
    } else {
      a.removeAttribute("href")
    }
  }

  // Reaproveita os elementos que já existem (assim a animação de entrada não repete)
  function syncChildren(parent, items, make, update) {
    while (parent.children.length > items.length) parent.lastElementChild.remove()
    items.forEach((item, i) => {
      const el = parent.children[i] || parent.appendChild(make())
      update(el, item, i)
    })
    parent.style.display = items.length ? "" : "none"
  }

  function renderContent(c) {
    const handle = document.querySelector("#profile p")
    if (handle) handle.textContent = c.handle
    document.documentElement.classList.toggle("empty-handle", !c.handle.trim())

    const ul = document.querySelector("#container > ul")
    if (ul) {
      syncChildren(
        ul,
        c.links.filter((l) => l.text.trim()),
        () => document.createElement("li"),
        (li, l, i) => {
          const a = li.querySelector("a") || li.appendChild(document.createElement("a"))
          if (a.textContent !== l.text) a.textContent = l.text
          setLink(a, l.url)
          li.style.animationDelay = 0.2 + i * 0.1 + "s"
        }
      )
    }

    const social = document.getElementById("social-links")
    if (social) {
      syncChildren(
        social,
        c.social,
        () => document.createElement("a"),
        (a, l) => {
          const icon = a.querySelector("ion-icon") || a.appendChild(document.createElement("ion-icon"))
          if (icon.getAttribute("name") !== l.icon) icon.setAttribute("name", l.icon)
          a.setAttribute("aria-label", SOCIAL_ICONS[l.icon])
          setLink(a, l.url)
        }
      )
    }
  }

  // forcedBg: usado pela prévia do painel para mostrar a foto em ajuste
  function apply(theme, mode, forcedBg) {
    const full = merge(theme)
    const t = full[mode]
    const cl = document.documentElement.classList
    cl.toggle("hide-logo", !full.layout.showLogo)
    cl.toggle("hide-handle", !full.layout.showHandle)
    const s = document.documentElement.style
    for (const [k, v] of Object.entries(full.sizes)) s.setProperty(`--size-${k}`, v + "px")
    renderContent(full.content)
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

    let bg = forcedBg
    if (!bg) {
      bg = lastBg[mode]
      if (!t.backgrounds.includes(bg)) {
        bg = t.backgrounds[Math.floor(Math.random() * t.backgrounds.length)]
        lastBg[mode] = bg
      }
    }
    const fit = getFit(t, bg)
    const ls = bgLayer().style
    ls.setProperty("--bg-img", cssUrl(bg))
    ls.setProperty("--bg-ov", String(t.overlay / 100))
    for (const [dev, k] of [["mobile", "m"], ["desktop", "d"]]) {
      ls.setProperty(`--bg-x-${k}`, fit[dev].x + "%")
      ls.setProperty(`--bg-y-${k}`, fit[dev].y + "%")
      ls.setProperty(`--bg-z-${k}`, String(fit[dev].zoom / 100))
    }
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
    DEFAULT_CONTENT,
    DEFAULT_SIZES,
    SIZES,
    SOCIAL_ICONS,
    cleanUrl,
    merge,
    getFit,
    apply,
    fetchRemote,
    loadCache,
    saveCache,
    contrastRatio,
  }
})()
