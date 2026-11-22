(() => {
  const {categories, items, articles} = window.martdecor;
  const query = new URL(location.href).searchParams;
  const storageKey = "martdecor-selection-v2";
  const itemById = new Map(items.map(item => [item.id, item]));
  const categoryById = new Map(categories.map(category => [category.id, category]));
  const roomExamples = {
    plaster:{image:"rooms/living-1.webp",description:"Визуализация гостиной с матовой штукатуркой"},
    mirrors:{image:"rooms/album-1.webp",description:"Круглое зеркало в ванной. Пример размещения из галереи салона."},
    gypsum:{image:"vk-samples/gypsum-7.webp",description:"Композиция из цветных гипсовых элементов на стене",item:"gypsum-7"},
    panels: {image:"oak.jpg", description:"Акустические панели на стене", item:"latte"},
    wallpaper: {image:"salon-29.jpg", description:"Фактура и рисунок обоев в подборке салона"},
    decor: {image:"shangrila.png", description:"Гипсовое панно SHANGRILA на стене", item:"shangrila"},
    color: {image:"orac.jpg", description:"Окрашенные стены и отделка в детской"},
    natural: {image:"vk-7657.jpg", description:"Рельефное покрытие Decaro в интерьере", item:"ceppo"}
  };
  const selection = readSelection();
  const get = selector => document.querySelector(selector);
  const format = value => new Intl.NumberFormat("ru-RU").format(value);
  const price = item => item.price ? format(item.price) + " ₽" + (item.unit ? " / " + item.unit : "") : "Цена по запросу";

  function readSelection() {
    let value = query.get("selection");
    if (value === null) {
      try { value = localStorage.getItem(storageKey); } catch { value = ""; }
    }
    return new Set((value || "").split(",").filter(id => itemById.has(id)));
  }

  function node(tag, text = "", css = "") {
    const element = document.createElement(tag);
    if (text) element.textContent = window.typo(text);
    if (css) element.className = css;
    return element;
  }

  function route(href, label = "", css = "") {
    const link = node("a", label, css);
    link.setAttribute("href", href);
    link.dataset.route = href;
    return link;
  }

  function image(file, description) {
    const img = node("img");
    img.src = "assets/" + file;
    img.alt = description;
    img.loading = "lazy";
    return img;
  }

  function decorateRoutes() {
    for (const link of document.querySelectorAll("a[data-route]")) {
      if (!link.dataset.route) link.dataset.route = link.getAttribute("href");
      const target = new URL(link.dataset.route, document.baseURI);
      target.searchParams.set("selection", Array.from(selection).join(","));
      link.href = target.href;
    }
    document.querySelectorAll("[data-selection-count]").forEach(count => {
      count.hidden = selection.size === 0;
      count.textContent = selection.size;
    });
  }

  function productCard(item) {
    const card = route("item.html?id=" + item.id, "", "product-card");
    const content = node("div");
    content.append(node("span", categoryById.get(item.category).title, "category-label"));
    content.append(node("h3", item.name), node("p", item.summary), node("span", price(item)));
    card.append(image(item.image, item.photoNote || item.name), content);
    return card;
  }

  function renderHome() {
    get("#home-categories").append(...categories.map(category => {
      const card = route("catalog.html?category=" + category.id, "", "category");
      const content = node("div");
      content.append(node("h3", category.title), node("p", category.description));
      card.append(image(category.image, ""), content);
      return card;
    }));

  }

  function connectTextureButton(button, surface, zoomedLabel, normalLabel) {
    button.onclick = () => {
      const zoomed = surface.classList.toggle("is-detail");
      button.setAttribute("aria-pressed", String(zoomed));
      button.textContent = zoomed ? zoomedLabel : normalLabel;
    };
  }

  function interiorButton(example) {
    const button = node("button", "Посмотреть в интерьере", "button secondary");
    button.type = "button";
    button.onclick = () => {
      const popup = node("dialog", "", "interior-popup");
      popup.setAttribute("aria-label", "Пример в интерьере");
      const close = node("button", "Закрыть ×");
      close.onclick = () => popup.close();
      popup.append(close, image(example.image, example.description), node("p", example.description));
      popup.addEventListener("close", () => popup.remove(), {once:true});
      if (example.zoom) {
        const zoom = node("button", "Увеличить фактуру", "texture-toggle");
        zoom.type = "button";
        zoom.setAttribute("aria-pressed", "false");
        connectTextureButton(zoom, popup, "Полное фото", "Увеличить фактуру");
        popup.append(zoom);
      }
      document.body.append(popup);
      popup.showModal();
    };
    return button;
  }

  function renderCatalog() {
    const search = get("#search");
    const category = get("#category");
    const style = get("#style");
    for (const group of categories) {
      const option = node("option", group.title);
      option.value = group.id;
      category.append(option);
    }
    category.value = categoryById.has(query.get("category")) ? query.get("category") : "";
    const update = () => {
      const term = search.value.trim().toLocaleLowerCase("ru");
      const found = items.filter(item =>
        (!category.value || item.category === category.value) &&
        (!style.value || item.style === style.value) &&
        (!term || (item.name + " " + item.id + " " + (item.brand || "") + " " + item.summary).toLocaleLowerCase("ru").includes(term))
      );
      get("#results").textContent = found.length ? "Найдено: " + found.length : "По вашему запросу ничего не найдено. Попробуйте изменить фильтры.";
      get("#catalog-results").replaceChildren(...found.map(productCard));
      const preview = get("#catalog-preview");
      const example = roomExamples[category.value];
      preview.hidden = !example;
      if (example) {
        const copy = node("div");
        copy.append(node("h2", "Как выглядит в интерьере"), node("p", example.description));
        copy.append(interiorButton(example));
        if (example.item) copy.append(route("item.html?id=" + example.item, "Посмотреть этот материал"));
        preview.replaceChildren(image(example.image, example.description), copy);
      }
      decorateRoutes();
    };
    search.addEventListener("input", update);
    category.addEventListener("change", update);
    style.addEventListener("change", update);
    get("#filters").addEventListener("submit", event => event.preventDefault());
    update();
    renderSelection();
  }

  function saveSelection() {
    const ids = Array.from(selection).join(",");
    try { localStorage.setItem(storageKey, ids); } catch {}
    try {
      const address = new URL(location.href);
      address.searchParams.set("selection", ids);
      history.replaceState(null, "", address.href);
    } catch {}
    decorateRoutes();
  }

  function renderSelection() {
    const chosen = Array.from(selection, id => itemById.get(id));
    get("#selection-items").replaceChildren(...chosen.map(item => {
      const row = node("li");
      const remove = node("button", "Убрать", "link-button");
      remove.type = "button";
      remove.setAttribute("aria-label", "Убрать " + item.name);
      remove.onclick = () => {
        selection.delete(item.id);
        saveSelection();
        renderSelection();
      };
      row.append(route("item.html?id=" + item.id, item.name), remove);
      return row;
    }));
    get("#empty-selection").hidden = chosen.length > 0;
    get("#send-selection").hidden = chosen.length === 0;
    get("#send-hint").hidden = chosen.length === 0;
    decorateRoutes();
  }

  function crumb(label, middle) {
    const path = node("nav", "", "crumb");
    path.setAttribute("aria-label", "Путь");
    path.append(route("index.html", "Главная"));
    if (middle) path.append(route(middle, "Каталог"));
    path.append(node("span", label));
    return path;
  }

  function panelEstimate(item) {
    const box = node("div", "", "estimate");
    const label = node("label", "Площадь стены, м²");
    const input = node("input");
    input.type = "number";
    input.min = "0.01";
    input.step = "any";
    const output = node("output");
    output.setAttribute("aria-live", "polite");
    input.placeholder = "10";
    label.append(input);
    input.oninput = () => {
      const area = Number(input.value);
      const count = Math.ceil(Math.round(area / item.area * 1e8) / 1e8);
      output.textContent = area > 0 ? format(count) + " шт. · " + format(count * item.price) + " ₽" : "";
    };
    box.append(label, output, node("p", "Ориентир по целым панелям. Раскрой и крепёж рассчитает комплектатор.", "small"));
    return box;
  }

  function renderItem() {
    const item = itemById.get(query.get("id"));
    const section = get("#item-content");
    if (!item) {
      section.replaceChildren(node("h1", "Материал не найден"), route("catalog.html", "Вернуться в каталог"));
      return;
    }
    document.title = item.name + " · МАРТдекор";
    const details = node("div", "", "material");
    const figure = node("figure");
    figure.append(image(item.image, item.photoNote || item.name));
    if (item.photoNote) figure.append(node("figcaption", item.photoNote));
    const texture = node("button", "Увеличить фактуру", "texture-toggle");
    texture.type = "button";
    texture.setAttribute("aria-pressed", "false");
    connectTextureButton(texture, figure, "Полное фото", "Увеличить фактуру");
    figure.append(texture);
    const info = node("div");
    info.append(node("h1", item.name), node("p", item.summary), node("p", price(item), "price"));
    if (item.spec) {
      const list = node("dl");
      for (const [name, value] of item.spec) {
        const row = node("div");
        row.append(node("dt", name), node("dd", value));
        list.append(row);
      }
      info.append(list);
    }
    info.append(node("p", "Актуальные цену и наличие уточнит менеджер.", "small"));
    if (item.area) info.append(panelEstimate(item));
    const actions = node("div", "", "actions");
    const save = node("button", selection.has(item.id) ? "Уже в подборке" : "В мою подборку", "button");
    save.type = "button";
    save.disabled = selection.has(item.id);
    const feedback = node("p", "", "feedback");
    feedback.setAttribute("role", "status");
    save.onclick = () => {
      selection.add(item.id);
      saveSelection();
      feedback.textContent = "Материал добавлен в подборку.";
      save.textContent = "Уже в подборке";
      save.disabled = true;
    };
    const ask = node("button", "Запросить подбор", "link-button");
    ask.type = "button";
    ask.dataset.request = "Подбор материалов";
    ask.dataset.material = item.name;
    actions.append(save, route("catalog.html#selection", "Открыть подборку", "button secondary"), ask);
    info.append(actions, feedback);
    const visual = node("div", "", "material-visual");
    visual.append(figure);
    const exact = ["ash-crystal","quilt","slats-xl","gypsum-7","latte"].includes(item.id);
    const example = exact ? {image:item.image, description:item.name + " в интерьере · фото из каталога салона"} : roomExamples[item.category];
    const samePhoto = example?.image === item.image;
    if (samePhoto) texture.remove();
    if (example) visual.append(interiorButton({...example, zoom:samePhoto, description:exact ? example.description : "Пример для раздела «" + categoryById.get(item.category).title + "». " + example.description}));
    details.append(visual, info);
    section.replaceChildren(crumb(categoryById.get(item.category).title, "catalog.html?category=" + item.category), details);
  }

  function renderArticle() {
    const article = articles.find(entry => entry.id === query.get("id"));
    const section = get("#article-content");
    if (!article) {
      section.replaceChildren(node("h1", "Статья не найдена"), route("index.html#gallery", "К материалам в интерьере"));
      return;
    }
    document.title = article.title + " · МАРТдекор";
    const body = node("article", "", "article-body");
    body.append(node("h1", article.title), node("p", article.intro), image(article.image, article.title));
    body.append(...article.paragraphs.map(paragraph => node("p", paragraph)));
    body.append(article.item
      ? route("item.html?id=" + article.item, "Открыть карточку панели", "button")
      : route("catalog.html?category=" + article.category, "Открыть раздел каталога", "button"));
    section.replaceChildren(crumb(article.title), body);
  }

  const openStatus = get("[data-open-status]");
  if (openStatus) {
    const parts = new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Moscow", weekday:"short", hour:"2-digit", hourCycle:"h23"}).formatToParts(new Date());
    const hour = Number(parts.find(part => part.type === "hour").value);
    const day = parts.find(part => part.type === "weekday").value;
    const end = day === "Sat" || day === "Sun" ? 17 : 19;
    openStatus.textContent = hour >= 10 && hour < end ? "· Сейчас открыто" : "· Сейчас закрыто";
  }

  function addTopButton() {
    const button = node("button", "Наверх", "top-link");
    button.type = "button";
    button.setAttribute("aria-label", "Вернуться к началу страницы");
    const toggle = () => { button.hidden = scrollY < 420; };
    button.onclick = () => window.scrollTo({top:0, behavior:"instant"});
    document.body.append(button);
    window.addEventListener("scroll", toggle, {passive:true});
    toggle();
  }

  function addRequestDialog() {
    const testMode = new URLSearchParams(location.search).get("test-zayavka") === "1";
    const dialog = node("dialog", "", "request-dialog");
    dialog.setAttribute("aria-labelledby", "request-title");
    dialog.innerHTML = [
      '<div class="request-head"><h2 id="request-title"></h2><button type="button" class="close-request">Закрыть</button></div>',
      '<p>Оставьте имя, телефон и задачу. Из формы можно открыть готовый черновик письма менеджеру.</p>',
      '<form><div class="request-selection" hidden><b>Материалы для расчёта</b><ul></ul></div><label>Имя<input name="name" autocomplete="name" required maxlength="80"></label>',
      '<label>Телефон<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+7 900 000-00-00" maxlength="34"></label>',
      '<label>Что вы хотите подобрать?<textarea name="message" rows="3" maxlength="800"></textarea></label>',
      '<button class="button" type="submit">Подготовить заявку</button>',
      '<p class="feedback" role="status" hidden>Черновик готов. Откройте почту и отправьте письмо менеджеру.</p>',
      '<a class="button secondary mail-draft" hidden>Открыть черновик в почте</a></form>',
      '<a class="phone-link"></a>'
    ].join("");
    document.body.append(dialog);
    const form = dialog.querySelector("form");
    const name = form.elements.namedItem("name");
    const phone = form.elements.namedItem("phone");
    const comment = form.elements.namedItem("message");
    if (testMode) {
      dialog.querySelector(".request-head + p").textContent =
        "Тестовый режим. Введите вымышленные имя и комментарий. Телефон — 10 цифр, начиная с 000.";
      phone.placeholder = "0001234567";
      name.autocomplete = "off";
      phone.autocomplete = "off";
      form.querySelector('[type="submit"]').textContent = "Продолжить отправку тестовой заявки";
    }
    const draft = dialog.querySelector(".mail-draft");
    const feedback = dialog.querySelector(".feedback");
    let topic = "";
    let quoteItems = [];
    function clearDraft() {
      draft.hidden = true;
      feedback.hidden = true;
    }
    dialog.querySelector(".close-request").onclick = () => dialog.close();
    dialog.addEventListener("click", event => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right ||
          event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
    });
    document.addEventListener("click", event => {
      const trigger = event.target.closest("[data-request]");
      if (!trigger) return;
      topic = trigger.dataset.request;
      const isLunch = topic === "Ланч для дизайнеров";
      const isQuote = topic === "Расчёт подборки";
      quoteItems = isQuote ? Array.from(selection, id => itemById.get(id).name) : [];
      const requestSelection = dialog.querySelector(".request-selection");
      requestSelection.hidden = !quoteItems.length;
      requestSelection.querySelector("ul").replaceChildren(...quoteItems.map(title => node("li", title)));
      dialog.querySelector("h2").textContent = isQuote ? "Запросить расчёт" : isLunch ? "Записаться на ланч" : "Записаться на подбор";
      const phoneLink = dialog.querySelector(".phone-link");
      phoneLink.href = isLunch ? "tel:+79094210421" : "tel:+79094200420";
      phoneLink.textContent = isLunch ? "Позвонить: +7 (909) 421-04-21" : "Позвонить: +7 (909) 420-04-20";
      comment.parentElement.firstChild.textContent = isQuote ? "Размеры или комментарий" : isLunch ? "Комментарий к записи" : "Что вы хотите подобрать?";
      form.reset();
      name.setCustomValidity("");
      phone.setCustomValidity("");
      if (trigger.dataset.material) comment.value = "Интересует материал «" + trigger.dataset.material + "».";
      clearDraft();
      dialog.showModal();
      name.focus();
    });
    form.addEventListener("input", () => {
      name.setCustomValidity("");
      phone.setCustomValidity("");
      clearDraft();
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      name.setCustomValidity(name.value.trim() ? "" : "Укажите имя.");
      const testPhone = phone.value.trim();
      phone.setCustomValidity(testMode
        ? (/^000\d{7}$/.test(testPhone) ? "" : "Введите 10 цифр, начиная с 000.")
        : (phone.value.replace(/\D/g, "").length >= 7 ? "" : "Введите телефон, по которому с вами можно связаться."));
      if (!form.reportValidity()) return;
      if (testMode) {
        const data = new URLSearchParams({
          testLead: "1", name: name.value.trim(), phone: testPhone, comment: comment.value.trim()
        });
        location.assign("https://script.google.com/macros/s/AKfycbw0gsSbE0XceLnjA_QCXGyQJk0Csg6RsGTGP7tGATrfkHyxaaIGW6KNNvOlDqlu2CCT/exec" + "#" + data);
        return;
      }
      const body = [
        quoteItems.length ? "Здравствуйте! Прошу рассчитать мою подборку." : "Здравствуйте! Хочу записаться: " + topic + ".",
        "Имя: " + name.value.trim(),
        "Телефон: " + phone.value.trim(),
        quoteItems.length ? "Материалы:\n" + quoteItems.map(title => "• " + title).join("\n") : "",
        comment.value.trim()
      ].filter(Boolean).join("\n");
      draft.href = "mailto:info@martdecor.ru?subject=" + encodeURIComponent(topic + " · МАРТдекор") +
        "&body=" + encodeURIComponent(body);
      feedback.hidden = false;
      draft.hidden = false;
      draft.focus();
    });
  }
  const render = {home:renderHome, catalog:renderCatalog, item:renderItem, article:renderArticle};
  render[document.body.dataset.page]();
  addTopButton();
  addRequestDialog();
  decorateRoutes();
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({behavior:"instant"});
  }
})();








