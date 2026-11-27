"use strict";

const find = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const normalize = (text) => text.toLowerCase().replaceAll("ё", "е").trim();
const numbers = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });
const money = (amount) => `${numbers.format(amount)} ₽`;
const storageKey = "kurilskiy-storefront-v1";
const community = "https://vk.me/kurilskiy_bereg_spb";
const storeEmail = "zakaz@rybarossii.ru";
const assetRoot = new URL("./", document.currentScript.src);
const catalogUrl = new URL("../catalog.html", assetRoot);
const zonesPage = new URL("../#delivery-map", assetRoot);
const choices = {
  unknown: { title: "Сначала уточнить зону" },
  green: { title: "Зелёная зона", fee: 350, threshold: 3500 },
  yellow: { title: "Жёлтая зона", fee: 550, threshold: 5500 },
  red: { title: "Красная зона, по согласованию" },
  pickup: { title: "Самовывоз, Скобелевский пр., 17", fee: 0 },
};

const dialog = find("#shop-dialog");
const dialogBody = find("#dialog-body");
const catalog = find("#products");
const cards = all("#products [data-product]");
const cart = new Map();
const inventory = new Map(
  (globalThis.kurilskiyProducts ?? []).map((product) => [product.id, product]),
);
let shipping = "unknown";
let rememberedZone = "unknown";
let filter = "all";
let toastTimer;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function action(text, className, callback) {
  const button = node("button", text, className);
  button.type = "button";
  button.addEventListener("click", callback);
  return button;
}

function link(text, href, className) {
  const anchor = node("a", text, className);
  anchor.href = href;
  return anchor;
}

function sizeLabel(grams) {
  return grams >= 1000 ? `${numbers.format(grams / 1000)} кг` : `${grams} г`;
}

function getGrams(size) {
  const value = size.match(/^(\d+(?:[,.]\d+)?)\s*(кг|г)$/);
  return value
    ? Math.round(
        Number(value[1].replace(",", ".")) * (value[2] === "кг" ? 1000 : 1),
      )
    : 0;
}

function unitAmount(product, size) {
  const pack = product.packs?.find(([label]) => label === size);
  if (pack) return pack[1];
  return product.rate
    ? Math.round((product.rate * getGrams(size)) / 1000)
    : null;
}

function validSize(product, size) {
  if (!product || typeof size !== "string") return false;
  if (product.packs) return product.packs.some(([label]) => label === size);
  const grams = getGrams(size);
  return Boolean(
    (product.rate || product.request) && grams > 0 && grams <= 20000,
  );
}

function restoreCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (Object.hasOwn(choices, saved.shipping)) shipping = saved.shipping;
    if (["green", "yellow", "red"].includes(saved.zone))
      rememberedZone = saved.zone;
    if (!Array.isArray(saved.lines)) return;
    for (const line of saved.lines) {
      if (!line || !validSize(inventory.get(line.id), line.size)) continue;
      if (
        typeof line.key !== "string" ||
        typeof line.cut !== "string" ||
        typeof line.note !== "string"
      )
        continue;
      if (!Number.isInteger(line.count) || line.count < 1 || line.count > 99)
        continue;
      cart.set(line.key, { ...line, note: line.note.slice(0, 180) });
    }
  } catch {
    /* The page still works when storage is disabled. */
  }
}

function saveCart() {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        shipping,
        zone: rememberedZone,
        lines: [...cart.values()],
      }),
    );
  } catch {
    /* Keep current session state in memory. */
  }
}

function notify(message) {
  const toast = find("#toast");
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toastTimer = window.setTimeout(() => {
    toast.textContent = "";
  }, 4700);
}

function itemAmount(line) {
  const amount = unitAmount(inventory.get(line.id), line.size);
  return amount === null ? null : amount * line.count;
}

function needsConfirmation(line) {
  const product = inventory.get(line.id);
  return Boolean(product.rate || product.request || product.confirm);
}

function total() {
  const lines = [...cart.values()];
  const subtotal = lines.reduce(
    (sum, line) => sum + (itemAmount(line) ?? 0),
    0,
  );
  const unpriced = lines.filter((line) => itemAmount(line) === null).length;
  const { fee, threshold } = choices[shipping];
  const onlyPromo =
    lines.length > 0 && lines.every((line) => inventory.get(line.id).promo);
  const promotionException =
    onlyPromo && Boolean(threshold) && subtotal >= threshold;
  const delivery = promotionException
    ? undefined
    : threshold && subtotal >= threshold
      ? 0
      : fee;
  return {
    subtotal,
    delivery,
    threshold,
    onlyPromo,
    promotionException,
    unpriced,
  };
}

function renderProgress() {
  const progress = find("[data-delivery-progress]");
  if (!progress) return;
  const { subtotal, delivery, threshold, promotionException } = total();
  progress.replaceChildren();
  progress.hidden = shipping === "unknown" || shipping === "pickup";
  if (progress.hidden) return;
  if (!threshold) {
    progress.append(node("p", "Магазин рассчитает доставку по вашему адресу."));
    return;
  }
  const meter = node("progress");
  meter.max = threshold;
  meter.value = Math.min(subtotal, threshold);
  meter.setAttribute(
    "aria-label",
    "Сумма товаров до порога бесплатной доставки",
  );
  const message = promotionException
    ? "Для заказа только из акционных товаров стоимость доставки уточняет магазин."
    : delivery === 0
      ? "Порог бесплатной доставки достигнут."
      : `До бесплатной доставки по этой зоне — ${money(threshold - subtotal)}.`;
  progress.append(
    node("p", `Товары в корзине — ${money(subtotal)}`),
    meter,
    node("p", message),
  );
}

function updateCart({ animate = false } = {}) {
  const badge = find("#cart-count");
  if (!badge) return;
  const count = [...cart.values()].reduce(
    (quantity, line) => quantity + line.count,
    0,
  );
  badge.textContent = count;
  const cartLink = find("#cart-link");
  const { subtotal, unpriced } = total();
  const amount = unpriced && !subtotal ? "Уточняется" : money(subtotal);
  find(".cart-label", cartLink).textContent = count ? amount : "Корзина";
  cartLink.classList.toggle("has-items", count > 0);
  cartLink.setAttribute(
    "aria-label",
    count ? `Корзина: ${count} шт., ${amount}` : "Корзина пуста",
  );
  if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    badge.animate?.(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.25)" },
        { transform: "scale(1)" },
      ],
      { duration: 260 },
    );
  }
  renderProgress();
}

function renderDelivery() {
  all("[data-delivery-mode]").forEach((control) => {
    control.setAttribute(
      "aria-pressed",
      String(
        control.dataset.deliveryMode ===
          (shipping === "pickup" ? "pickup" : "delivery"),
      ),
    );
  });
  const zones = find("[data-zone-panel]");
  const pickup = find("[data-pickup-panel]");
  if (zones) zones.hidden = shipping === "pickup";
  if (pickup) pickup.hidden = shipping !== "pickup";
  all("input[name='page-zone']").forEach((control) => {
    control.checked = control.value === shipping;
  });
  renderProgress();
}

function setDelivery(value) {
  if (!Object.hasOwn(choices, value)) return;
  shipping = value;
  if (value !== "pickup") rememberedZone = value;
  renderDelivery();
  saveCart();
}

function renderCatalog() {
  const query = normalize(find("#catalog-search").value);
  const matching = cards.filter((card) => {
    const categories = card.dataset.category.split(" ");
    return (
      (filter === "all" || categories.includes(filter)) &&
      normalize(card.dataset.search).includes(query)
    );
  });
  const visible = new Set(matching);
  for (const card of cards) card.hidden = !visible.has(card);
  const section = find("#catalog-section");
  section.value = [...section.options].some((option) => option.value === filter)
    ? filter
    : "";
  const status = find("#catalog-status");
  status.classList.toggle("sr-only", matching.length > 0);
  status.textContent = matching.length
    ? `Позиций: ${matching.length}`
    : "Ничего не нашли. Попробуйте другое название или категорию.";
}

function applyFilter(value) {
  filter = value;
  find("#catalog-search").value = "";
  const url = new URL(catalogUrl);
  if (filter !== "all") url.searchParams.set("section", filter);
  window.history.replaceState(null, "", url);
  renderCatalog();
}

function enableCategoryScroll() {
  const rail = find("#category-rail");
  if (!rail) return;
  const slider = find(".category-slider");
  const thumb = find("input", slider);
  const maxScroll = () => rail.scrollWidth - rail.clientWidth;
  const showPike = () => {
    slider.style.setProperty("--rail-position", String(thumb.valueAsNumber / 100));
  };
  const sync = () => {
    const max = maxScroll();
    slider.hidden = max <= 2;
    thumb.valueAsNumber = max > 2 ? Math.round(100 * rail.scrollLeft / max) : 0;
    showPike();
  };
  thumb.addEventListener("input", () => {
    rail.scrollLeft = maxScroll() * thumb.valueAsNumber / 100;
    showPike();
  });
  rail.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync, { passive: true });
  enableRailDrag(rail);
  sync();
}

function enableRailDrag(rail) {
  let drag;
  let dragged = false;
  rail.addEventListener("dragstart", (event) => event.preventDefault());
  rail.addEventListener("click", (event) => {
    if (!dragged || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragged = false;
  }, { capture: true });
  rail.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragged = false;
    drag = { x: event.clientX, scroll: rail.scrollLeft };
  });
  window.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const difference = event.clientX - drag.x;
    if (!dragged && Math.abs(difference) < 8) return;
    if (!dragged) {
      dragged = true;
      rail.classList.add("is-dragging");
      rail.setPointerCapture(event.pointerId);
    }
    rail.scrollLeft = drag.scroll - difference;
  });
  const stopDrag = () => {
    drag = undefined;
    rail.classList.remove("is-dragging");
  };
  window.addEventListener("pointerup", stopDrag);
  window.addEventListener("pointercancel", stopDrag);
}

function initializeReviews() {
  const rail = find("#reviews-rail");
  const pagination = find("[data-review-pages]");
  if (!rail || !pagination) return;
  const reviews = all(".review-card", rail);
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let buttons = [];
  let positions = [];
  let previousPageSize;

  const updatePage = () => {
    let nearest = 0;
    positions.forEach((position, index) => {
      if (Math.abs(rail.scrollLeft - position) < Math.abs(rail.scrollLeft - positions[nearest])) nearest = index;
    });
    buttons.forEach((button, index) => {
      if (index === nearest) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  };

  const layout = () => {
    const perPage = Number(getComputedStyle(rail).getPropertyValue("--reviews-per-page")) || 1;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    const starts = reviews.filter((_, index) => index % perPage === 0);
    const previousPage = buttons.findIndex((button) => button.hasAttribute("aria-current"));
    const previousReview = previousPage * (previousPageSize || 1);
    positions = starts.map((review) => Math.min(maxScroll, review.offsetLeft - reviews[0].offsetLeft));

    if (previousPageSize !== perPage) {
      buttons = starts.map((_, page) => {
        const button = action("", "review-page", () => {
          rail.scrollTo({ left: positions[page], behavior: motion.matches ? "instant" : "smooth" });
        });
        const first = page * perPage + 1;
        const last = Math.min(first + perPage - 1, reviews.length);
        button.setAttribute("aria-label", first === last
          ? `Отзыв ${first} из ${reviews.length}`
          : `Отзывы ${first}–${last} из ${reviews.length}`);
        button.setAttribute("aria-controls", rail.id);
        return button;
      });
      pagination.replaceChildren(...buttons);
      if (previousReview >= 0) rail.scrollLeft = positions[Math.floor(previousReview / perPage)];
      previousPageSize = perPage;
    }
    updatePage();
  };
  rail.addEventListener("scroll", updatePage, { passive: true });
  window.addEventListener("resize", layout, { passive: true });
  rail.addEventListener("keydown", (event) => {
    if (event.target !== rail || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const current = buttons.findIndex((button) => button.hasAttribute("aria-current"));
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = buttons[current + direction];
    if (!next) return;
    event.preventDefault();
    next.click();
  });
  enableRailDrag(rail);
  layout();
}

function initializeContact() {
  const contact = find(".header-contact");
  if (!contact) return;
  find("[data-feedback]", contact)?.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    contact.open = false;
    openFeedback();
  });
  document.addEventListener("click", (event) => {
    if (contact.open && !contact.contains(event.target)) contact.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !contact.open) return;
    contact.open = false;
    find("summary", contact).focus();
  });
}

function updatePrice(form) {
  const selected = find("select[name='size']", form);
  const card = form.closest("[data-product]");
  const product = inventory.get(card.dataset.product);
  const output = find("[data-price-output]", form);
  if (!selected || !product || !output) return;
  const base = unitAmount(product, selected.value);
  const grams = getGrams(selected.value);
  const buttonPrice = find("[data-button-price]", form);
  output.textContent =
    base === null
      ? ""
      : product.rate && !product.promo && grams !== 1000
        ? `≈ ${money(base)}`
        : money(base);
  if (buttonPrice) {
    buttonPrice.textContent = output.textContent;
    card.classList.toggle("price-on-button", base !== null && (!product.rate || grams === 1000));
    const label = ["В корзину", product.title, selected.value, output.textContent].filter(Boolean);
    buttonPrice.closest("button").setAttribute("aria-label", label.join(" · "));
    return;
  }
  output.hidden = base === null ||
    (product.promo ? grams === product.weights[0] : !product.rate || grams === 1000);
  const old = find("[data-old-output]", form);
  if (old)
    old.textContent = money(Math.round((product.oldRate * grams) / 1000));
}

function addCartLine(id, size, cut = "", count = 1) {
  if (!validSize(inventory.get(id), size)) return false;
  const key = JSON.stringify([id, size, cut]);
  const line = cart.get(key);
  if ((line?.count ?? 0) + count > 99) return false;
  if (line) line.count += count;
  else cart.set(key, { key, id, size, cut, note: "", count });
  return true;
}

function addToCart(form, submitter) {
  const { product: id, name } = form.closest("[data-product]").dataset;
  const data = new FormData(form);
  const size = data.get("size");
  if (!addCartLine(id, size, data.get("cut") || "")) {
    notify("Эту порцию не удалось добавить. Проверьте количество в корзине.");
    return;
  }
  updateCart({ animate: true });
  saveCart();
  if (submitter) {
    submitter.classList.add("is-added");
    window.setTimeout(() => submitter.classList.remove("is-added"), 500);
  }
  notify(`${name}, ${size} — в корзине`);
}

function showDialog(title, content) {
  find("#dialog-title").textContent = title;
  dialogBody.replaceChildren(content);
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

function field(label, control) {
  const wrapper = node("label", undefined, "dialog-field");
  wrapper.append(node("span", label), control);
  return wrapper;
}

function openCart(focusKey, focusDelta) {
  const content = document.createDocumentFragment();
  if (!cart.size) {
    const destination = catalog ? "#products" : catalogUrl.href;
    content.append(
      node("p", "В корзине пока ничего нет."),
      link("В каталог", destination, "button button-ink"),
    );
    find("a", content).addEventListener("click", () => dialog.close());
    showDialog("Корзина", content);
    return;
  }
  const fixed = node("ul", undefined, "cart-lines");
  const pending = node("ul", undefined, "cart-lines");
  let focusTarget;
  for (const line of cart.values()) {
    const product = inventory.get(line.id);
    const item = node("li", undefined, "cart-line");
    const description = node("div", undefined, "cart-product");
    const thumbnail = node("img");
    thumbnail.src = new URL(`${product.image}.webp`, assetRoot);
    thumbnail.alt = "";
    const copy = node("div");
    const price = itemAmount(line);
    const label =
      price === null
        ? "цена уточняется"
        : `${needsConfirmation(line) && product.rate ? "≈ " : ""}${money(price)}`;
    copy.append(
      node("strong", product.title),
      node("p", `${line.size} · ${label}`, "small"),
    );
    description.append(thumbnail, copy);
    const quantity = node("div", undefined, "quantity");
    for (const delta of [-1, 1]) {
      if (delta === 1) quantity.append(node("span", line.count));
      const button = action(delta === -1 ? "−" : "+", undefined, () => {
        line.count += delta;
        if (line.count < 1) cart.delete(line.key);
        updateCart();
        saveCart();
        openCart(line.key, delta);
      });
      button.disabled = delta === 1 && line.count === 99;
      button.setAttribute(
        "aria-label",
        `${delta === -1 ? "Убрать" : "Добавить"} одну позицию: ${product.title}`,
      );
      if (focusKey === line.key && focusDelta === delta) focusTarget = button;
      quantity.append(button);
    }
    item.append(description, quantity);
    if (product.cut || line.cut || line.note) {
      const notes = node("details", undefined, "line-note");
      notes.open = Boolean(line.cut || line.note);
      const comment = node("input");
      comment.type = "text";
      comment.maxLength = 180;
      comment.value = line.note;
      comment.placeholder = "Например, подготовить для духовки";
      comment.addEventListener("input", () => {
        line.note = comment.value;
        saveCart();
      });
      notes.append(
        node("summary", line.cut || "Пожелание по разделке"),
        field(
          line.cut ? "Дополнить пожелание" : "Пожелание для этой позиции",
          comment,
        ),
      );
      item.append(notes);
    }
    (needsConfirmation(line) ? pending : fixed).append(item);
  }
  for (const [heading, lines] of [
    ["Фиксированная фасовка", fixed],
    ["К подтверждению магазином", pending],
  ]) {
    if (!lines.childElementCount) continue;
    const group = node("section", undefined, "cart-group");
    group.append(node("h3", heading), lines);
    content.append(group);
  }
  const pick = node("select");
  for (const [value, { title }] of Object.entries(choices)) {
    const option = node("option", title);
    option.value = value;
    pick.append(option);
  }
  pick.value = shipping;
  const summary = node("div", undefined, "cart-total");
  summary.setAttribute("aria-live", "polite");
  function drawSummary() {
    const { subtotal, delivery, onlyPromo, unpriced } = total();
    summary.replaceChildren(
      node("p", `Товары — ${money(subtotal)}`),
      node(
        "p",
        shipping === "pickup"
          ? "Самовывоз — бесплатно"
          : `Доставка — ${delivery === undefined ? "уточнить у магазина" : money(delivery)}`,
      ),
      node(
        "strong",
        delivery === undefined
          ? `Предварительно ${money(subtotal)} без доставки`
          : `Предварительный итог — ${money(subtotal + delivery)}`,
      ),
    );
    if (unpriced)
      summary.append(
        node("p", "Позиции без цены пока не включены в сумму.", "small"),
      );
    if (onlyPromo && shipping !== "pickup")
      summary.append(
        node(
          "p",
          "Магазин уточнит тариф для заказа только из акционных товаров.",
          "small",
        ),
      );
  }
  pick.addEventListener("change", () => {
    setDelivery(pick.value);
    drawSummary();
  });
  drawSummary();
  const buttons = node("div", undefined, "checkout-actions");
  buttons.append(
    action("К оформлению", "button button-ink", openCheckout),
    action("Продолжить покупки", "back-action", () => dialog.close()),
  );
  const mapLink = link("Проверить адрес на карте магазина", zonesPage.href, "text-link");
  mapLink.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    dialog.close();
    if (location.hash === "#delivery-map") {
      const map = find("#delivery-map");
      if (map) {
        map.open = true;
        map.scrollIntoView({ block: "start" });
      }
    }
  });
  content.append(
    field("Зона доставки или самовывоз", pick),
    mapLink,
    summary,
    node(
      "p",
      pending.childElementCount
        ? "Магазин проверит наличие, вес и сумму позиций к подтверждению. Способ оплаты можно выбрать на следующем шаге."
        : "Можно выбрать способ оплаты на следующем шаге. Магазин подтвердит заказ перед получением.",
      "dialog-note",
    ),
    buttons,
  );
  showDialog("Корзина", content);
  if (focusKey)
    (focusTarget?.disabled ? null : focusTarget)?.focus({
      preventScroll: true,
    });
  if (focusKey && !focusTarget) pick.focus({ preventScroll: true });
}

function copyText(textarea, label) {
  textarea.focus();
  textarea.select();
  const attempt = navigator.clipboard?.writeText(textarea.value);
  if (attempt) {
    attempt.then(
      () => {
        label.textContent = "Скопировано. Текст можно вставить в чат.";
      },
      () => {
        label.textContent =
          "Текст выделен. Скопируйте его через меню или Ctrl+C.";
      },
    );
  } else {
    label.textContent = "Текст выделен. Скопируйте его через меню или Ctrl+C.";
  }
}

function openFeedback() {
  const form = node("form", undefined, "checkout-form feedback-form");
  const endpoint = find("meta[name='feedback-endpoint']")?.content;
  const name = node("input");
  name.name = "name";
  name.autocomplete = "name";
  name.maxLength = 80;
  name.required = true;
  const phone = node("input");
  phone.name = "phone";
  phone.type = "tel";
  phone.autocomplete = "tel";
  phone.maxLength = 30;
  phone.required = true;
  const status = node("p", "", "dialog-note");
  status.setAttribute("role", "status");
  const message = node("textarea");
  message.name = "comment";
  message.rows = 4;
  message.required = true;
  message.maxLength = 750;
  const consent = node("input");
  consent.type = "checkbox";
  consent.name = "consent";
  consent.required = true;
  const agreement = node("label", undefined, "feedback-consent");
  const terms = node("span", "Даю ");
  const policy = link("согласие на обработку данных", "https://rybarossii.ru/index.php?route=information/information/agree&information_id=7", "text-link");
  policy.target = "_blank";
  policy.rel = "noopener";
  terms.append(policy);
  agreement.append(consent, terms);
  const send = node("button", "Отправить", "button button-ink");
  send.type = "submit";
  send.disabled = !endpoint;
  if (!endpoint) status.textContent = "Отправка формы пока не подключена.";
  form.append(field("Имя", name), field("Телефон для ответа", phone), field("Сообщение", message), agreement, send, status);
  phone.addEventListener("input", () => phone.setCustomValidity(""));
  message.addEventListener("input", () => message.setCustomValidity(""));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!endpoint || send.disabled) return;
    if (!/^[0-9+().\s-]+$/.test(phone.value) || !/^\d{7,15}$/.test(phone.value.replace(/\D/g, ""))) {
      phone.setCustomValidity("Укажите номер, по которому магазин сможет вам ответить.");
      phone.reportValidity();
      return;
    }
    if (!message.value.trim()) {
      message.setCustomValidity("Напишите сообщение магазину.");
      message.reportValidity();
      return;
    }
    const payload = new FormData(form);
    payload.set("forma", "Обратная связь");
    payload.set("stranica", location.pathname);
    send.disabled = true;
    status.textContent = "Отправляем сообщение…";
    try {
      const response = await fetch(endpoint, { method: "POST", body: payload });
      if (!response.ok || (await response.json()).ok !== true) throw new Error("Feedback rejected");
      form.reset();
      status.textContent = "Сообщение отправлено.";
    } catch {
      status.textContent = "Сообщение не удалось отправить. Попробуйте ещё раз.";
    } finally {
      send.disabled = false;
    }
  });
  showDialog("Форма обратной связи", form);
}

const paymentTypes = {
  online: "Онлайн по ссылке магазина",
  card: "Картой при получении",
  cash: "Наличными при получении",
};
let checkoutDraft = {};

function openCheckout() {
  const form = node("form", undefined, "checkout-form");
  const steps = node("p", "Корзина / Контакты и оплата", "checkout-steps");
  const contact = node("div", undefined, "checkout-contact");
  const name = node("input");
  const phone = node("input");
  const address = node("input");
  for (const [input, key, autocomplete] of [
    [name, "name", "name"],
    [phone, "phone", "tel"],
    [address, "address", "street-address"],
  ]) {
    input.name = key;
    input.autocomplete = autocomplete;
    input.maxLength = 140;
    input.required = true;
    input.value = checkoutDraft[key] ?? "";
  }
  phone.type = "tel";
  phone.inputMode = "tel";
  contact.append(field("Имя", name), field("Телефон", phone));
  form.append(steps, contact);
  if (shipping !== "pickup") form.append(field("Адрес доставки", address));
  else form.append(node("p", choices.pickup.title, "dialog-note"));

  const methods = node("fieldset", undefined, "payment-methods");
  methods.append(node("legend", "Способ оплаты"));
  for (const [value, title] of Object.entries(paymentTypes)) {
    const control = node("input");
    control.type = "radio";
    control.name = "payment";
    control.value = value;
    control.checked = value === (checkoutDraft.payment ?? "online");
    const label = node("label");
    label.append(control, node("span", title));
    methods.append(label);
  }
  const amount = total();
  const priceLine =
    amount.delivery === undefined
      ? `${money(amount.subtotal)} за товары`
      : money(amount.subtotal + amount.delivery);
  const note = node("p", "", "dialog-note");
  const changePaymentNote = () => {
    note.textContent =
      find("[name='payment']:checked", methods).value === "online"
        ? "Ссылку для онлайн-оплаты отправит магазин после подтверждения заказа."
        : "Магазин подтвердит заказ и согласует оплату при получении.";
  };
  methods.addEventListener("change", changePaymentNote);
  changePaymentNote();
  const buttons = node("div", undefined, "checkout-actions");
  const proceed = node("button", "Продолжить", "button button-ink");
  proceed.type = "submit";
  buttons.append(
    proceed,
    action("Назад в корзину", "back-action", () => openCart()),
  );
  form.append(
    methods,
    node("p", `Предварительная сумма · ${priceLine}`, "checkout-price"),
    note,
    buttons,
  );
  form.addEventListener("input", () => {
    checkoutDraft = Object.fromEntries(new FormData(form));
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (
      !/^[0-9+().\s-]+$/.test(phone.value) ||
      !/^\d{7,15}$/.test(phone.value.replace(/\D/g, ""))
    ) {
      phone.setCustomValidity(
        "Укажите номер, по которому магазин сможет с вами связаться.",
      );
      phone.reportValidity();
      return;
    }
    checkoutDraft = Object.fromEntries(new FormData(form));
    openOrderHandoff();
  });
  phone.addEventListener("input", () => phone.setCustomValidity(""));
  showDialog("Оформление заказа", form);
}

function openOrderHandoff() {
  const lines = [...cart.values()];
  const { subtotal, delivery } = total();
  const body = ["Здравствуйте! Хочу оформить заказ."];
  for (const [heading, pending] of [
    ["Фиксированная фасовка", false],
    ["К подтверждению магазином", true],
  ]) {
    const group = lines.filter((line) => needsConfirmation(line) === pending);
    if (!group.length) continue;
    body.push("", heading);
    for (const line of group) {
      const notes = [line.cut, line.note].filter(Boolean).join(", ");
      body.push(
        `• ${inventory.get(line.id).title}, ${line.size} × ${line.count}${notes ? ` — ${notes}` : ""}`,
      );
    }
  }
  body.push(
    "",
    `Имя: ${checkoutDraft.name}`,
    `Телефон: ${checkoutDraft.phone}`,
    `Получение: ${choices[shipping].title}`,
  );
  if (shipping !== "pickup") body.push(`Адрес: ${checkoutDraft.address}`);
  body.push(
    `Способ оплаты: ${paymentTypes[checkoutDraft.payment]}`,
    `Товары по расчёту: ${money(subtotal)}`,
    `Доставка: ${delivery === undefined ? "по согласованию" : money(delivery)}`,
  );
  const message = node("textarea");
  message.rows = 5;
  message.value = body.join("\n");
  const checkout = document.createDocumentFragment();
  const status = node("p", "", "small");
  status.setAttribute("role", "status");
  const url = `mailto:${storeEmail}?subject=${encodeURIComponent("Заказ с витрины «Курильский Берег»")}&body=${encodeURIComponent(message.value)}`;
  const main = node("div", undefined, "checkout-actions");
  main.append(
    link("Открыть письмо магазину", url, "button button-ink"),
    action("Назад к оформлению", "back-action", openCheckout),
  );
  const other = node("div", undefined, "checkout-alternatives");
  const vk = link("ВКонтакте", community, "text-link");
  vk.target = "_blank";
  vk.rel = "noopener noreferrer";
  const details = node("details", undefined, "checkout-message");
  other.append(
    action("Скопировать заказ", "back-action", () => {
      details.open = true;
      copyText(message, status);
    }),
    vk,
  );
  details.append(
    node("summary", "Посмотреть состав заявки"),
    field("Заявка", message),
  );
  message.readOnly = true;
  checkout.append(
    node(
      "p",
      "Письмо откроется с готовым составом. Нажмите «Отправить» в почте, чтобы магазин получил заказ.",
      "dialog-note",
    ),
    main,
    other,
    status,
    details,
  );
  showDialog("Передать заказ магазину", checkout);
}

function selectProduct(link) {
  const card = cards.find((item) => item.dataset.product === link.dataset.pick);
  if (!card) return;
  applyFilter(card.dataset.category.split(" ")[0]);
  const form = find(".buy-form", card);
  const select = find("select[name='size']", card);
  if (
    select &&
    [...select.options].some((option) => option.value === link.dataset.size)
  )
    select.value = link.dataset.size;
  const cut = find("input[name='cut']", card);
  if (cut) cut.value = link.dataset.cut ? "Разделить филе на два куска" : "";
  if (form) updatePrice(form);
  card.scrollIntoView({ block: "start" });
  (select || find("button, a", card))?.focus({ preventScroll: true });
}

function initializeShop() {
  renderDelivery();
  const deliveryMap = find("#delivery-map");
  if (deliveryMap) {
    const openLinkedMap = () => {
      if (location.hash === "#delivery-map") deliveryMap.open = true;
    };
    window.addEventListener("hashchange", openLinkedMap);
    deliveryMap.addEventListener("submit", (event) => {
      checkoutDraft.address = new FormData(event.target).get("text").trim();
    });
    openLinkedMap();
  }
  enableCategoryScroll();
  initializeReviews();
  initializeContact();
  all("[data-occasion-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.occasionPanel !== "first";
  });
  all(".buy-form").forEach((form) => {
    form.addEventListener("change", () => updatePrice(form));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      addToCart(form, event.submitter);
    });
    updatePrice(form);
  });
  all("input[name='page-zone']").forEach((control) =>
    control.addEventListener("change", () => setDelivery(control.value)),
  );
  all("[data-delivery-mode]").forEach((control) =>
    control.addEventListener("click", () =>
      setDelivery(
        control.dataset.deliveryMode === "pickup" ? "pickup" : rememberedZone,
      ),
    ),
  );
  all("[data-occasion]").forEach((control) =>
    control.addEventListener("click", () => {
      all("[data-occasion]").forEach((tab) =>
        tab.setAttribute("aria-pressed", String(tab === control)),
      );
      all("[data-occasion-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.occasionPanel !== control.dataset.occasion;
      });
    }),
  );
  all("[data-pick]").forEach((control) =>
    control.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      selectProduct(control);
    }),
  );
}

function initializeCatalog() {
  const section = find("#catalog-section");
  const params = new URLSearchParams(location.search);
  const requested = params.get("section");
  const initialCard = cards.find((card) => location.hash === `#${card.id}`);
  if ([...section.options].some((option) => option.value === requested)) filter = requested;
  else if (initialCard) filter = initialCard.dataset.category.split(" ")[0];
  renderCatalog();
  find("#catalog-search").addEventListener("input", renderCatalog);
  section.addEventListener("change", (event) => applyFilter(event.target.value));

  if (!initialCard) return;
  const form = find(".buy-form", initialCard);
  const select = form && find("select[name='size']", form);
  if (select && params.has("size")) {
    const size = sizeLabel(Number(params.get("size")));
    if ([...select.options].some((option) => option.value === size)) select.value = size;
  }
  const cut = form && find("input[name='cut']", form);
  if (cut && params.get("cut") === "halves") cut.value = "Разделить филе на два куска";
  if (form) updatePrice(form);
  requestAnimationFrame(() => initialCard.scrollIntoView({ block: "start", behavior: "instant" }));
}

function recipeSelection(row, factor) {
  const product = inventory.get(row.dataset.ingredientProduct);
  if (!product) return null;
  const grams = Math.round(Number(row.dataset.ingredientBase) * factor);
  if (product.packs) {
    const pack = product.packs.find((entry) => entry[2]);
    return pack
      ? {
          product,
          size: pack[0],
          count: Math.ceil(grams / pack[2]),
          packed: true,
        }
      : null;
  }
  return { product, size: sizeLabel(grams), count: 1 };
}

function initializeRecipe(recipe) {
  const servings = find("[data-servings]", recipe);
  const rows = all("[data-ingredient-base]", recipe);
  const estimate = find("[data-ingredients-total]", recipe);
  const add = find("[data-add-ingredients]", recipe);
  const selected = () =>
    rows
      .filter((row) => find("input[type='checkbox']:checked", row))
      .map((row) =>
        recipeSelection(
          row,
          Number(servings.value) / Number(recipe.dataset.recipeBase),
        ),
      )
      .filter(Boolean);

  function update() {
    const factor = Number(servings.value) / Number(recipe.dataset.recipeBase);
    for (const row of rows) {
      const raw = Number(row.dataset.ingredientBase) * factor;
      find("[data-ingredient-quantity]", row).textContent =
        `${numbers.format(raw)} ${row.dataset.ingredientUnit}`;
      const pick = recipeSelection(row, factor);
      const pack = find("[data-ingredient-pack]", row);
      if (pack && pick) {
        pack.textContent = pick.packed
          ? `В корзину · ${pick.count} уп. по ${pick.size}`
          : pick.product.request
            ? "Цена уточняется"
            : "Вес для заказа";
      }
    }
    const items = selected();
    const subtotal = items.reduce(
      (sum, item) =>
        sum + (unitAmount(item.product, item.size) ?? 0) * item.count,
      0,
    );
    const pending = items.some(
      (item) => unitAmount(item.product, item.size) === null,
    );
    estimate.textContent =
      items.length === 0
        ? "Выберите продукты из магазина."
        : pending
          ? subtotal
            ? `≈ ${money(subtotal)} плюс позиции с уточняемой ценой`
            : "Стоимость подтвердит магазин"
          : `≈ ${money(subtotal)} за выбранные продукты`;
    add.disabled = items.length === 0;
  }

  recipe.addEventListener("change", update);
  add.addEventListener("click", () => {
    const items = selected();
    const exceedsLimit = items.some(
      ({ product, size, count }) =>
        (cart.get(JSON.stringify([product.id, size, ""]))?.count ?? 0) + count >
        99,
    );
    if (exceedsLimit)
      return notify("Уменьшите количество этой позиции в корзине.");
    const added = items.filter(({ product, size, count }) =>
      addCartLine(product.id, size, "", count),
    );
    if (!added.length) return;
    updateCart({ animate: true });
    saveCart();
    notify("Продукты из рецепта добавлены в корзину.");
    openCart();
  });
  update();
}

if (dialog?.showModal && inventory.size) {
  restoreCart();
  updateCart();
  find("#cart-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    openCart();
  });
  initializeShop();
  if (catalog) initializeCatalog();
  all("[data-recipe-base]").forEach(initializeRecipe);
  document.documentElement.classList.add("enhanced");
}

function swimAlongOrderRoute(trail) {
  const origin = trail.getBoundingClientRect();
  const markers = all(".order-route li > span", trail.parentElement);
  const stops = markers.map((marker) => {
    const box = marker.getBoundingClientRect();
    return [box.left + box.width / 2 - origin.left, box.top + box.height / 2 - origin.top];
  });
  if (stops.length !== 3) return;
  const animateRoute = (element, frames, options) => {
    const animation = element.animate?.(frames, options);
    if (animation) animation.id = "delivery-route";
  };
  const vertical = Math.abs(stops[1][1] - stops[0][1]) > Math.abs(stops[1][0] - stops[0][0]);
  const poses = [
    [0, 0, 0, -4, 0],
    [0, 0.87, 0.13, -1, 0],
    [0.32, 0.91, 0.25, -11, -10],
    [0.69, 0.91, 0.38, 9, 8],
    [1, 0.91, 0.5, 4, 0],
    [1.33, 0.9, 0.63, -10, -10],
    [1.68, 0.86, 0.76, 8, 8],
    [2, 0.82, 0.89, -3, 0],
    [2, 0, 1, 0, 0],
  ];
  all("img", trail).forEach((fish, index) => {
    const frames = poses.map(([position, opacity, offset, tilt, sway]) => {
      const step = Math.floor(position);
      const [startX, startY] = stops[step];
      const [endX, endY] = stops[Math.min(step + 1, stops.length - 1)];
      const x = startX + (endX - startX) * (position - step);
      const y = startY + (endY - startY) * (position - step);
      const offsetX = vertical ? x - 22 + sway * 0.4 : x - index * 24;
      const offsetY = vertical ? y - index * 9 : y - 29 + sway - index * 9;
      const angle = (vertical ? 90 : 0) + tilt;
      return {
        opacity: opacity * (index === 0 ? 1 : 0.74),
        offset,
        transform: `translate(${offsetX}px, ${offsetY}px) translate(-50%, -50%) rotate(${angle}deg) scaleX(-1)`,
      };
    });
    animateRoute(fish, frames, { duration: 5800, delay: index * 420, fill: "both" });
  });
  markers.forEach((marker, index) => {
    const delay = [0.13, 0.5, 0.89][index] * 5800 - 230;
    const timing = { duration: 820, delay, easing: "ease-in-out" };
    animateRoute(marker, [
      { transform: "scale(1)", backgroundColor: "#193e4b", color: "#eef9fa" },
      { transform: "scale(1.13)", backgroundColor: "#bce7e4", color: "#173b48", offset: 0.4 },
      { transform: "scale(1)", backgroundColor: "#193e4b", color: "#eef9fa" },
    ], timing);
    animateRoute(marker.nextElementSibling, [
      { transform: "translateX(0)", color: "#f1fbfc" },
      { transform: "translateX(3px)", color: "#bce7e4", offset: 0.4 },
      { transform: "translateX(0)", color: "#f1fbfc" },
    ], timing);
  });
}

if (
  "IntersectionObserver" in window &&
  !matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        target.animate?.(
          [
            { opacity: 0.7, transform: "translateY(18px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 560,
            easing: "cubic-bezier(.2,.75,.25,1)",
            delay: Number(target.dataset.revealDelay || 0),
          },
        );
        observer.unobserve(target);
      }
    },
    { threshold: 0.16 },
  );
  all(".reveal").forEach((section) => observer.observe(section));
  cards.forEach((card, index) => {
    card.dataset.revealDelay = (index % 4) * 42;
    observer.observe(card);
  });
  const swimmers = all("[data-swim-on-view]");
  if (swimmers.length) {
    const swimObserver = new IntersectionObserver((entries) => {
      for (const { intersectionRatio, isIntersecting, target } of entries) {
        const delivery = target.hasAttribute("data-delivery-swim");
        if (delivery) {
          if (!isIntersecting) {
            target.classList.remove("is-swimming");
            target.parentElement.getAnimations({ subtree: true })
              .filter((animation) => animation.id === "delivery-route")
              .forEach((animation) => animation.cancel());
          } else if (intersectionRatio >= 0.65 && !target.classList.contains("is-swimming")) {
            swimAlongOrderRoute(target);
            target.classList.add("is-swimming");
          }
        } else if (isIntersecting) {
          target.classList.add("is-swimming");
          swimObserver.unobserve(target);
        }
      }
    }, { threshold: [0, 0.35, 0.65] });
    swimmers.forEach((swimmer) => {
      if (swimmer.hasAttribute("data-delivery-swim")) {
        document.fonts.ready.then(() => swimObserver.observe(swimmer));
      } else {
        swimObserver.observe(swimmer);
      }
    });
  }
}

const backTop = find(".back-top");
const header = find(".site-header");
if (backTop && header && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(([entry]) => {
    backTop.hidden = entry.isIntersecting;
  });
  observer.observe(header);
}
