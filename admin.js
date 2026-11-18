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
  let device = "mobile"
  let editBg = null // foto em ajuste no card "Enquadramento"
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
    iframe.contentWindow.postMessage(
      { type: "theme-preview", theme, mode, bg: currentEditBg() },
      location.origin
    )
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
    renderFit()
    $$("[data-layout]").forEach((el) => (el.checked = theme.layout[el.dataset.layout]))
    $("#switch-pos").value = theme.layout.switchPos
    renderContentEditor()
    renderSizes()
  }

  // ---------- Textos, botões e ícones (valem para os dois modos) ----------
  function moveItem(arr, i, dir) {
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    renderContentEditor()
    changed()
  }

  function removeItem(arr, i, what) {
    if (!confirm(`Remover este ${what}?`)) return
    arr.splice(i, 1)
    renderContentEditor()
    changed()
  }

  function smallBtn(label, title, onClick, disabled) {
    const b = document.createElement("button")
    b.type = "button"
    b.className = "icon-btn"
    b.textContent = label
    b.title = title
    b.setAttribute("aria-label", title)
    b.disabled = !!disabled
    b.addEventListener("click", onClick)
    return b
  }

  function textInput(value, placeholder, maxLength, onInput) {
    const inp = document.createElement("input")
    inp.type = "text"
    inp.value = value
    inp.placeholder = placeholder
    inp.maxLength = maxLength
    inp.addEventListener("input", () => {
      onInput(inp.value)
      changed()
    })
    return inp
  }

  function urlInput(item) {
    const inp = textInput(item.url, "Link (ex.: https://...)", 2000, (v) => (item.url = v))
    inp.type = "url"
    inp.spellcheck = false
    const check = () => {
      const bad = item.url.trim() && !ThemeKit.cleanUrl(item.url)
      inp.classList.toggle("invalid", !!bad)
      inp.title = bad ? "Link inválido: comece com https://, mailto: ou tel:" : ""
    }
    inp.addEventListener("input", check)
    check()
    return inp
  }

  function rowControls(arr, i, what) {
    const box = document.createElement("div")
    box.className = "row-controls"
    box.append(
      smallBtn("↑", "Mover para cima", () => moveItem(arr, i, -1), i === 0),
      smallBtn("↓", "Mover para baixo", () => moveItem(arr, i, 1), i === arr.length - 1),
      smallBtn("×", `Remover ${what}`, () => removeItem(arr, i, what))
    )
    return box
  }

  function renderContentEditor() {
    const c = theme.content
    $("#handle-text").value = c.handle

    const links = $("#links-list")
    links.innerHTML = ""
    c.links.forEach((l, i) => {
      const row = document.createElement("div")
      row.className = "edit-row"
      const fields = document.createElement("div")
      fields.className = "edit-fields"
      fields.append(textInput(l.text, "Texto do botão", 80, (v) => (l.text = v)), urlInput(l))
      row.append(fields, rowControls(c.links, i, "botão"))
      links.appendChild(row)
    })
    if (!c.links.length) links.innerHTML = '<p class="muted small">Nenhum botão.</p>'

    const social = $("#social-list")
    social.innerHTML = ""
    c.social.forEach((s, i) => {
      const row = document.createElement("div")
      row.className = "edit-row"
      const fields = document.createElement("div")
      fields.className = "edit-fields"
      const sel = document.createElement("select")
      sel.setAttribute("aria-label", "Ícone")
      for (const [name, label] of Object.entries(ThemeKit.SOCIAL_ICONS)) {
        const o = document.createElement("option")
        o.value = name
        o.textContent = label
        sel.appendChild(o)
      }
      sel.value = s.icon
      sel.addEventListener("change", () => {
        s.icon = sel.value
        changed()
      })
      fields.append(sel, urlInput(s))
      row.append(fields, rowControls(c.social, i, "ícone"))
      social.appendChild(row)
    })
    if (!c.social.length) social.innerHTML = '<p class="muted small">Nenhum ícone.</p>'
  }

  const switchSel = $("#switch-pos")
  for (const [value, label] of Object.entries(ThemeKit.SWITCH_POS)) {
    const o = document.createElement("option")
    o.value = value
    o.textContent = label
    switchSel.appendChild(o)
  }
  switchSel.addEventListener("change", () => {
    theme.layout.switchPos = switchSel.value
    // Desativado: mostra na prévia o modo que vai ficar fixo no site
    const forced = ThemeKit.forcedMode(theme)
    if (forced && forced !== mode) {
      mode = forced
      render()
    }
    changed()
  })

  $("#handle-text").addEventListener("input", (e) => {
    theme.content.handle = e.target.value
    changed()
  })

  $("#link-add").addEventListener("click", () => {
    theme.content.links.push({ text: "Novo botão", url: "" })
    renderContentEditor()
    changed()
    const rows = $$("#links-list .edit-row input")
    if (rows.length) rows[rows.length - 2].select()
  })

  $("#social-add").addEventListener("click", () => {
    theme.content.social.push({ icon: "globe-outline", url: "" })
    renderContentEditor()
    changed()
  })

  $("#content-reset").addEventListener("click", () => {
    if (!confirm("Voltar o nome, os botões e os ícones para os originais?")) return
    theme.content = JSON.parse(JSON.stringify(ThemeKit.DEFAULT_CONTENT))
    renderContentEditor()
    changed()
  })

  // ---------- Tamanhos ----------
  const SIZE_LABELS = {
    width: "Largura da área dos botões",
    buttonPad: "Altura dos botões",
    buttonFont: "Tamanho da letra dos botões",
    buttonRadius: "Arredondamento dos cantos",
    buttonGap: "Espaço entre os botões",
    logo: "Tamanho do logo",
    handle: "Tamanho do nome abaixo do logo",
    icons: "Tamanho dos ícones",
  }

  const sizesBox = $("#sizes")
  for (const [key, [, min, max]] of Object.entries(ThemeKit.SIZES)) {
    const label = document.createElement("label")
    label.className = "field"
    const span = document.createElement("span")
    span.textContent = SIZE_LABELS[key] + " "
    const out = document.createElement("output")
    out.dataset.sizeOut = key
    span.appendChild(out)
    const range = document.createElement("input")
    range.type = "range"
    range.min = min
    range.max = max
    range.step = 1
    range.dataset.size = key
    range.addEventListener("input", () => {
      theme.sizes[key] = Number(range.value)
      out.textContent = range.value + "px"
      changed()
    })
    label.append(span, range)
    sizesBox.appendChild(label)
  }

  function renderSizes() {
    $$("[data-size]").forEach((el) => (el.value = theme.sizes[el.dataset.size]))
    $$("[data-size-out]").forEach((el) => (el.textContent = theme.sizes[el.dataset.sizeOut] + "px"))
  }

  $("#sizes-reset").addEventListener("click", () => {
    theme.sizes = { ...ThemeKit.DEFAULT_SIZES }
    renderSizes()
    changed()
  })

  // ---------- Enquadramento ----------
  function currentEditBg() {
    const list = theme[mode].backgrounds
    if (!list.includes(editBg)) editBg = list[0]
    return editBg
  }

  function renderFit() {
    const t = theme[mode]
    const url = currentEditBg()
    const list = $("#fit-list")
    list.innerHTML = ""
    t.backgrounds.forEach((u, i) => {
      const b = document.createElement("button")
      b.type = "button"
      b.setAttribute("role", "radio")
      b.setAttribute("aria-checked", String(u === url))
      b.setAttribute("aria-label", `Ajustar foto ${i + 1}`)
      const img = document.createElement("img")
      img.src = u
      img.alt = ""
      img.loading = "lazy"
      b.appendChild(img)
      b.addEventListener("click", () => {
        editBg = u
        renderFit()
        sendPreview()
      })
      list.appendChild(b)
    })
    list.hidden = t.backgrounds.length < 2
    const f = ThemeKit.getFit(t, url)[device]
    $$("[data-fit]").forEach((el) => (el.value = f[el.dataset.fit]))
    $("#zoom-out").textContent = f.zoom + "%"
    $("#x-out").textContent = f.x + "%"
    $("#y-out").textContent = f.y + "%"
  }

  function setFit(key, value) {
    const t = theme[mode]
    const url = currentEditBg()
    const fit = ThemeKit.getFit(t, url)
    fit[device][key] = value
    t.fit = t.fit || {}
    t.fit[url] = fit
  }

  function setDevice(d) {
    device = d
    $$("[data-device]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.device === d)))
    const frame = $("#frame")
    frame.classList.toggle("phone", d === "mobile")
    frame.classList.toggle("desktop", d === "desktop")
    layoutFrame()
    renderFit()
  }

  // Na prévia de computador, o site é renderizado a 1280x800 e reduzido para caber
  function layoutFrame() {
    const frame = $("#frame")
    if (device !== "desktop") {
      iframe.style.transform = ""
      frame.style.height = ""
      return
    }
    const scale = frame.clientWidth / 1280
    iframe.style.transform = `scale(${scale})`
    frame.style.height = 800 * scale + 16 + "px"
  }
  window.addEventListener("resize", layoutFrame)

  const DEFAULT_BGS = [
    ...new Set([...ThemeKit.DEFAULT_THEME.light.backgrounds, ...ThemeKit.DEFAULT_THEME.dark.backgrounds]),
  ]

  // Todas as fotos disponíveis: padrões (dos dois modos) + enviadas + as já marcadas
  function gallery() {
    const t = theme[mode]
    return [...new Set([...DEFAULT_BGS, ...t.library, ...t.backgrounds])]
  }

  function toggleBackground(url) {
    const t = theme[mode]
    const i = t.backgrounds.indexOf(url)
    if (i >= 0) {
      if (t.backgrounds.length === 1) return toast("Deixe pelo menos uma foto marcada.", true)
      // Foto enviada antes da galeria existir: guarda na galeria para não sumir ao desmarcar
      if (!DEFAULT_BGS.includes(url) && !t.library.includes(url)) t.library.push(url)
      t.backgrounds.splice(i, 1)
    } else {
      t.backgrounds = gallery().filter((u) => u === url || t.backgrounds.includes(u))
    }
    renderBackgrounds()
    renderFit()
    changed()
  }

  function removeFromLibrary(url) {
    const t = theme[mode]
    if (t.backgrounds.length === 1 && t.backgrounds[0] === url)
      return toast("Marque outra foto antes de excluir esta.", true)
    if (!confirm("Excluir esta foto da galeria?")) return
    t.library = t.library.filter((u) => u !== url)
    t.backgrounds = t.backgrounds.filter((u) => u !== url)
    if (t.fit) delete t.fit[url]
    renderBackgrounds()
    renderFit()
    changed()
  }

  function renderBackgrounds() {
    const list = $("#bg-list")
    list.innerHTML = ""
    const t = theme[mode]
    gallery().forEach((url, i) => {
      const selected = t.backgrounds.includes(url)
      const isDefault = DEFAULT_BGS.includes(url)
      const item = document.createElement("div")
      item.className = "bg-item" + (selected ? " selected" : "")

      const pick = document.createElement("button")
      pick.type = "button"
      pick.className = "pick"
      pick.setAttribute("role", "checkbox")
      pick.setAttribute("aria-checked", String(selected))
      pick.setAttribute("aria-label", `Foto ${i + 1}${isDefault ? " (padrão)" : ""}`)
      pick.addEventListener("click", () => toggleBackground(url))
      const img = document.createElement("img")
      img.alt = ""
      img.loading = "lazy"
      // Foto pequena: avisa que vai ficar borrada
      img.addEventListener("load", () => {
        const side = Math.max(img.naturalWidth, img.naturalHeight)
        if (side >= MIN_GOOD_SIDE) return
        item.classList.add("lowres")
        const warn = document.createElement("span")
        warn.className = "lowres-tag"
        warn.textContent = "⚠️"
        warn.title = `Foto pequena (${img.naturalWidth}×${img.naturalHeight}): pode ficar borrada`
        item.appendChild(warn)
      })
      img.src = url
      pick.appendChild(img)
      const check = document.createElement("span")
      check.className = "check"
      check.textContent = "✓"
      pick.appendChild(check)
      item.appendChild(pick)

      if (isDefault) {
        const tag = document.createElement("span")
        tag.className = "tag"
        tag.textContent = "padrão"
        item.appendChild(tag)
      } else {
        const del = document.createElement("button")
        del.type = "button"
        del.className = "del"
        del.textContent = "×"
        del.title = "Excluir da galeria"
        del.setAttribute("aria-label", `Excluir foto ${i + 1} da galeria`)
        del.addEventListener("click", () => removeFromLibrary(url))
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

  $$("[data-layout]").forEach((el) =>
    el.addEventListener("change", () => {
      theme.layout[el.dataset.layout] = el.checked
      changed()
    })
  )

  $$("[data-device]").forEach((b) => b.addEventListener("click", () => setDevice(b.dataset.device)))

  $$("[data-fit]").forEach((el) =>
    el.addEventListener("input", () => {
      setFit(el.dataset.fit, Number(el.value))
      renderFit()
      changed()
    })
  )

  $("#fit-reset").addEventListener("click", () => {
    setFit("x", 50)
    setFit("y", 50)
    setFit("zoom", 100)
    renderFit()
    changed()
  })

  $("#reset").addEventListener("click", () => {
    const { library, fit } = theme[mode]
    theme[mode] = JSON.parse(JSON.stringify(ThemeKit.DEFAULT_THEME[mode]))
    theme[mode].library = library
    theme[mode].fit = fit
    render()
    changed()
    toast("Padrão restaurado. Clique em Salvar para aplicar no site.")
  })

  iframe.addEventListener("load", sendPreview)

  // ---------- Upload de imagem ----------
  const MAX_BYTES = 4.8 * 1024 * 1024 // limite do bucket é 5 MB
  const MAX_SIDE = 4096
  const MIN_GOOD_SIDE = 2000 // abaixo disso a foto estica e borra na tela
  const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

  // Mantém a foto original sempre que possível; só reduz se passar dos limites
  async function prepareImage(file) {
    const bitmap = await createImageBitmap(file)
    const side = Math.max(bitmap.width, bitmap.height)
    if (
      side < MIN_GOOD_SIDE &&
      !confirm(
        `Esta foto é pequena (${bitmap.width}×${bitmap.height} pixels) e vai ficar borrada no site.\n\n` +
          "Ela provavelmente veio do WhatsApp, do Instagram ou de um print. Para ficar nítida, envie a foto original da câmera/galeria.\n\n" +
          "Enviar mesmo assim?"
      )
    ) {
      return null
    }
    if (EXT[file.type] && file.size <= MAX_BYTES && side <= MAX_SIDE) {
      return { blob: file, type: file.type }
    }
    const scale = Math.min(1, 3840 / side)
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext("2d")
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const encode = (type, q) =>
      new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), type, q)
      )
    // PNG/WEBP podem ter fundo transparente: reduz em WEBP (mantém a transparência).
    // JPG não tem transparência e deixaria o fundo preto.
    if (file.type === "image/png" || file.type === "image/webp") {
      for (const q of [0.95, 0.9, 0.85, 0.8]) {
        const blob = await encode("image/webp", q)
        if (blob.type !== "image/webp") break // navegador sem WEBP (Safari antigo)
        if (blob.size <= MAX_BYTES) return { blob, type: "image/webp" }
      }
      const png = await encode("image/png")
      if (png.size <= MAX_BYTES) return { blob: png, type: "image/png" }
    }
    let blob
    for (const q of [0.92, 0.88, 0.84, 0.8, 0.75]) {
      blob = await encode("image/jpeg", q)
      if (blob.size <= MAX_BYTES) break
    }
    return { blob, type: "image/jpeg" }
  }

  $("#bg-upload").addEventListener("change", async (e) => {
    const file = e.target.files[0]
    e.target.value = ""
    if (!file) return
    const label = $("#upload-label")
    label.textContent = "Enviando…"
    try {
      let img
      try {
        img = await prepareImage(file)
      } catch {
        throw new Error("Formato de imagem não suportado. Use JPG, PNG ou WEBP.")
      }
      if (!img) return // desistiu do envio da foto pequena
      if (img.blob.size > 5 * 1024 * 1024) throw new Error("Imagem muito grande (máx. 5 MB).")
      const path = `${mode}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[img.type]}`
      const { error } = await sb.storage.from(BUCKET).upload(path, img.blob, {
        contentType: img.type,
        cacheControl: "31536000",
      })
      if (error) throw new Error("Falha no envio: " + error.message)
      const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
      theme[mode].library.push(data.publicUrl)
      theme[mode].backgrounds.push(data.publicUrl)
      editBg = data.publicUrl
      renderBackgrounds()
      renderFit()
      changed()
      toast("Imagem adicionada e marcada. Desmarque as que não quiser e clique em Salvar.")
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
