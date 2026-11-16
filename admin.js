;(function () {
  const cfg = window.SITE_CONFIG || {}
  const $ = (s) => document.querySelector(s)
  const $$ = (s) => Array.from(document.querySelectorAll(s))

  const loginView = $("#login")
  const appView = $("#app")
  const loginError = $("#login-error")
  const iframe = $("#preview")
  const saveBtn = $("#save")

  if (!cfg.supabaseUrl || !cfg.supabaseKey) {
    loginView.hidden = false
    showLoginError("Supabase não configurado (config.js).")
    $("#login-btn").disabled = true
    return
  }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey)
  const BUCKET = "backgrounds"

  let theme = ThemeKit.merge(null)
  let mode = "light"
  let dirty = false

  // ---------- Utilidades ----------
  let toastTimer
  function toast(msg, isError) {
    const t = $("#toast")
    t.textContent = msg
    t.classList.toggle("error", !!isError)
    t.classList.add("show")
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => t.classList.remove("show"), isError ? 6000 : 3000)
  }

  function showLoginError(msg) {
    loginError.textContent = msg
    loginError.hidden = !msg
  }

  function setDirty(v) {
    dirty = v
    saveBtn.disabled = !v
  }

  function sendPreview() {
    if (!iframe.contentWindow) return
    iframe.contentWindow.postMessage({ type: "theme-preview", theme, mode }, location.origin)
  }

  // ---------- Auth ----------
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault()
    showLoginError("")
    const btn = $("#login-btn")
    btn.disabled = true
    btn.textContent = "Entrando…"
    const { error } = await sb.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value,
    })
    btn.disabled = false
    btn.textContent = "Entrar"
    if (error) showLoginError("E-mail ou senha incorretos.")
  })

  $("#logout").addEventListener("click", async () => {
    if (dirty && !confirm("Você tem alterações não salvas. Sair mesmo assim?")) return
    setDirty(false)
    await sb.auth.signOut()
  })

  sb.auth.onAuthStateChange((_event, session) => {
    if (session) showApp()
    else showLogin()
  })

  function showLogin() {
    appView.hidden = true
    loginView.hidden = false
  }

  let loaded = false
  async function showApp() {
    loginView.hidden = true
    appView.hidden = false
    if (loaded) return
    loaded = true
    const { data, error } = await sb.from("site_theme").select("data").eq("id", 1).maybeSingle()
    if (error) toast("Não foi possível carregar o tema atual.", true)
    theme = ThemeKit.merge(data && data.data)
    render()
    sendPreview()
  }

  // ---------- Render ----------
  function render() {
    const t = theme[mode]
    $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === mode)))
    $$("[data-key]").forEach((el) => (el.value = t[el.dataset.key]))
    $$("[data-hex]").forEach((el) => (el.value = t[el.dataset.hex].toUpperCase()))
    $("#overlay-out").textContent = t.overlay + "%"
    $("#opacity-out").textContent = t.buttonBgOpacity + "%"
    renderBackgrounds()
    renderContrast()
  }

  function renderBackgrounds() {
    const list = $("#bg-list")
    list.innerHTML = ""
    const isDefault =
      JSON.stringify(theme[mode].backgrounds) === JSON.stringify(ThemeKit.DEFAULT_THEME[mode].backgrounds)
    theme[mode].backgrounds.forEach((url, i) => {
      const item = document.createElement("div")
      item.className = "bg-item"
      const img = document.createElement("img")
      img.src = url
      img.alt = `Fundo ${i + 1}`
      img.loading = "lazy"
      item.appendChild(img)
      if (isDefault) {
        const tag = document.createElement("span")
        tag.className = "tag"
        tag.textContent = "padrão"
        item.appendChild(tag)
      } else {
        const del = document.createElement("button")
        del.type = "button"
        del.textContent = "×"
        del.setAttribute("aria-label", `Remover fundo ${i + 1}`)
        del.addEventListener("click", () => {
          theme[mode].backgrounds.splice(i, 1)
          // Lista vazia volta para as imagens padrão
          theme = ThemeKit.merge(theme)
          changed()
          renderBackgrounds()
        })
        item.appendChild(del)
      }
      list.appendChild(item)
    })
  }

  function renderContrast() {
    const t = theme[mode]
    const el = $("#contrast")
    if (t.buttonBgOpacity < 60) {
      el.className = "hint info"
      el.textContent = "Botões transparentes: a leitura depende da imagem de fundo. Confira na prévia."
      return
    }
    const ratio = ThemeKit.contrastRatio(t.buttonText, t.buttonBg)
    if (ratio < 4.5) {
      el.className = "hint warn"
      el.textContent = `⚠️ Contraste baixo (${ratio.toFixed(1)}:1). O texto dos botões pode ficar difícil de ler.`
    } else {
      el.className = "hint ok"
      el.textContent = `✓ Boa leitura (contraste ${ratio.toFixed(1)}:1)`
    }
  }

  function changed() {
    setDirty(true)
    sendPreview()
  }

  // ---------- Eventos dos campos ----------
  $$(".tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode
      render()
      sendPreview()
    })
  )

  $$("[data-key]").forEach((el) =>
    el.addEventListener("input", () => {
      const key = el.dataset.key
      theme[mode][key] = el.type === "range" ? Number(el.value) : el.value
      render()
      changed()
    })
  )

  $$("[data-hex]").forEach((el) =>
    el.addEventListener("input", () => {
      let v = el.value.trim()
      if (!v.startsWith("#")) v = "#" + v
      if (/^#[0-9a-f]{6}$/i.test(v)) {
        theme[mode][el.dataset.hex] = v.toLowerCase()
        $(`[data-key="${el.dataset.hex}"]`).value = v.toLowerCase()
        renderContrast()
        changed()
      }
    })
  )

  $("#reset").addEventListener("click", () => {
    theme[mode] = JSON.parse(JSON.stringify(ThemeKit.DEFAULT_THEME[mode]))
    render()
    changed()
    toast("Padrão restaurado. Clique em Salvar para aplicar no site.")
  })

  iframe.addEventListener("load", sendPreview)

  // ---------- Upload de imagem ----------
  async function compressImage(file) {
    const bitmap = await createImageBitmap(file)
    const max = 1920
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.82)
    )
  }

  $("#bg-upload").addEventListener("change", async (e) => {
    const file = e.target.files[0]
    e.target.value = ""
    if (!file) return
    const label = $("#upload-label")
    label.textContent = "Enviando…"
    try {
      let blob
      try {
        blob = await compressImage(file)
      } catch {
        throw new Error("Formato de imagem não suportado. Use JPG, PNG ou WEBP.")
      }
      const path = `${mode}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      })
      if (error) throw new Error("Falha no envio: " + error.message)
      const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
      const isDefault =
        JSON.stringify(theme[mode].backgrounds) === JSON.stringify(ThemeKit.DEFAULT_THEME[mode].backgrounds)
      theme[mode].backgrounds = isDefault ? [data.publicUrl] : [...theme[mode].backgrounds, data.publicUrl]
      renderBackgrounds()
      changed()
      toast("Imagem adicionada. Clique em Salvar para aplicar no site.")
    } catch (err) {
      toast(err.message, true)
    } finally {
      label.textContent = "+ Adicionar imagem"
    }
  })

  // ---------- Salvar ----------
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true
    saveBtn.textContent = "Salvando…"
    const { data, error } = await sb
      .from("site_theme")
      .update({ data: theme, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select("id")
    saveBtn.textContent = "Salvar alterações"
    if (error || !data || !data.length) {
      saveBtn.disabled = false
      toast(
        error ? "Erro ao salvar: " + error.message : "Sem permissão para salvar. Fale com o desenvolvedor.",
        true
      )
      return
    }
    setDirty(false)
    toast("Salvo! O site já está com o novo visual.")
  })

  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault()
      e.returnValue = ""
    }
  })
})()
