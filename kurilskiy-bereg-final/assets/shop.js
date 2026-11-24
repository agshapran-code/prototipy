"use strict";

const storeUrl = "https://rybarossii.ru";
const categories = [
  { id: "fish", name: "Рыба", path: "/ryba/", photo: [49, 432, 282] },
  { id: "roe", name: "Икра", path: "/ikra/", photo: [401, 432, 282] },
  { id: "seafood", name: "Морепродукты", path: "/moreprodukty/", photo: [751, 432, 282] },
  { id: "frozen", name: "Полуфабрикаты", path: "/polufabrikaty/", photo: [400, 730, 282] },
  { id: "canned", name: "Консервы", path: "/konservy/", image: "canned" },
  { id: "new", name: "Новинки", path: "/novinki/", photo: [751, 730, 282] },
  { id: "live", name: "Живые морепродукты", path: "/zhivye-moreprodukty/", photo: [46, 730, 282], parent: "seafood", secondary: true },
  { id: "prepared", name: "Готовая продукция", image: "ready", secondary: true },
];

const products = [
  { id: "salmon", category: "fish", name: "Филе сёмги", description: "Охлаждённое филе без костей в вакуумной упаковке.", keywords: "сёмга лосось", photo: [39, 1136, 310], price: "3 190 ₽ за кг", weighted: true, options: [["Около 500 г", 1595], ["Около 1 кг", 3190]], path: "/ryba/losos-semga-file-ohlazhdennoe" },
  { id: "sturgeon", category: "roe", name: "Осетровая икра «Премиум»", description: "Зернистая икра в стеклянной банке. Три фасовки на выбор.", photo: [395, 1136, 310], price: "от 3 700 ₽ за банку", options: [["30 г", 3700], ["50 г", 5400], ["100 г", 10500]], path: "/ikra/" },
  { id: "mussels", category: "seafood", name: "Мидии в раковине", description: "В собственном соку, калибр 50–70.", photo: [740, 1136, 310], price: "990 ₽ за 1 кг", options: [["1 кг", 990]], path: "/moreprodukty/midii-v-rakovine-v-sobstvennom-soku-50-70-1-kg" },
  { id: "trout", category: "fish", name: "Морская форель", description: "Охлаждённая рыба из Мурманска, тушка 4–5 кг. Варианты разделки можно уточнить в магазине.", price: "2 290 ₽ за кг", weighted: true, options: [["Целая тушка, ориентир 4 кг", 9160]], path: "/ryba/" },
  { id: "cod-roe", category: "roe", name: "Икра трески слабой соли", description: "Нежная, умеренного посола. Банка 190 г.", price: "410 ₽ за банку", options: [["190 г", 410]], path: "/ikra/" },
  { id: "trout-roe", category: "roe", name: "Икра форели", description: "Фасовка 250 г.", price: "4 290 ₽ за банку", options: [["250 г", 4290]], path: "/ikra/ikra-foreli-2025-0-25-kg" },
  { id: "shrimp", category: "seafood", name: "Креветки ваннамей", description: "Очищенные, свежемороженые, калибр 16/20.", path: "/moreprodukty/krevetki/" },
  { id: "oysters", category: "live", name: "Хасанская устрица", description: "Живая устрица, калибр 200+.", path: "/zhivye-moreprodukty/" },
  { id: "live-mussels", category: "live", name: "Живые мидии", description: "Фасовка 1 кг.", price: "890 ₽ за 1 кг", path: "/zhivye-moreprodukty/" },
  { id: "dumplings", category: "frozen", name: "Пельмени", description: "Ассортимент рыбных пельменей.", path: "/polufabrikaty/pelmeni/" },
  { id: "cutlets", category: "frozen", name: "Котлеты", description: "Ассортимент рыбных котлет.", path: "/polufabrikaty/kotlety/" },
  { id: "cod-liver", category: "canned", name: "Печень трески", description: "В стеклянной банке, 250 г.", price: "650 ₽ за банку", options: [["250 г", 650]], path: "/konservy/" },
  { id: "canned-salmon", category: "canned", name: "Рагу из лососевых", description: "Рыбные консервы, 227 г.", price: "470 ₽ за банку", options: [["227 г", 470]], path: "/konservy/konservy-ragu-lososevyh-227-gr" },
  { id: "marlin", category: "new", name: "Филе марлина", description: "Холодного копчения.", path: "/novinki/marlin-file-holodnogo-kopcheniya-em" },
  { id: "coho", category: "new", name: "Грудинка кижуча", description: "Холодного копчения.", path: "/novinki/kizhuch-grudinka-holodnogo-kopcheniya-em" },
  { id: "philadelphia", category: "prepared", name: "Филадельфия с тигровой креветкой", description: "Пример готового блюда из меню доставки, 240 г.", source: "https://eda7.ru/pargolovo/rest/kurilskij-wrt4g/" },
  { id: "sushi", category: "prepared", name: "Суши с лососем", description: "Пример готового блюда из меню доставки, 36 г.", source: "https://eda7.ru/pargolovo/rest/kurilskij-wrt4g/" },
  { id: "poke", category: "prepared", name: "Поке", description: "Раздел в меню доставки. Состав и наличие уточняйте в магазине.", image: "ready-poke", source: "https://eda7.ru/pargolovo/rest/kurilskij-wrt4g/" },
];

const byId = (id) => document.getElementById(id);
const offers = [["offer-steak", "Стейк лосося", 259], ["offer-prawns", "Лангустины без головы", 155]].map(([id, name, perHundred]) => ({
  id, name, description: "Пример акции от 14 ноября. Выберите желаемый вес. Сумма предварительная.",
  options: [1, 2, 3, 5, 10].map(units => [units * 100 + " г", units * perHundred]), promotional: true
}));
const menuProduct = { id: "pasta-box", name: "Лангустины для пасты", options: pastaMenu.portions.map(guests => [
  guests + " чел. · " + pastaMenu.grams(guests) + " г", pastaMenu.grams(guests) * 1550 / 1000
]) };
const productById = new Map([...products, ...offers, menuProduct].map((product) => [product.id, product]));
const categoryById = new Map(categories.map((category) => [category.id, category]));
const formatRubles = (amount) => amount.toLocaleString("ru-RU") + " ₽";
const normalize = (text) => text.toLowerCase().replaceAll("ё", "е").trim();
const cart = new Map();
try {
  for (const [key, line] of JSON.parse(sessionStorage.getItem("kurilskiy-cart") || "[]")) {
    if (productById.get(line.id)?.options?.[line.option] && Number.isInteger(line.count) && line.count > 0) cart.set(key, line);
  }
} catch { /* Storage may be unavailable for local files. */ }
const dialog = byId("dialog");
const panel = byId("panel");
const initialCategory = new URLSearchParams(location.search).get("category");
let deliveryChoice = "unknown";
let selected = categoryById.has(initialCategory) ? initialCategory : "all";

function photoStyle([x, y, width], aspect) {
  const left = x / (1086 - width) * 100;
  const top = (ratio) => y / (1448 - width / ratio) * 100;
  return `--size:${1086 / width * 100}% auto;--position:${left}% ${top(aspect)}%;--position-small:${left}% ${top(1.25)}%`;
}


let showAllProducts = false;

function drawCatalog() {
  const query = normalize(byId("search").value);
  const catalogTitle = byId("catalog-title");
  catalogTitle.textContent = selected === "all" ? "Каталог" : categoryById.get(selected).name;
  const choices = [{ id: "all", name: "Все товары" }, ...categories.filter((category) => category.id !== "new" && (!category.parent || category.id === selected)), categoryById.get("new")];
  const extra = byId("category-extra");
  const browseLive = selected === "seafood" || selected === "live";
  const showRecipes = ["prepared", "frozen"].includes(selected);
  extra.hidden = !(browseLive || showRecipes);
  extra.innerHTML = browseLive
    ? '<a class="text-link" data-feature-category="' + (selected === "seafood" ? "live" : "seafood") + '" href="#catalog">' + (selected === "seafood" ? "Только живые морепродукты" : "Все морепродукты") + ' →</a>'
    : showRecipes ? '<a class="text-link" href="#recipes">Что приготовить из рыбы и морепродуктов</a>' : "";
  byId("filters").innerHTML = choices.map(({ id, name }) =>
    `<button type="button" data-filter="${id}" aria-pressed="${selected === id}">${name}</button>`
  ).join("");

  const matches = products.filter((product) =>
    (selected === "all" || product.category === selected || categoryById.get(product.category).parent === selected) &&
    (!query || normalize(product.name + " " + product.description + " " + (product.keywords ?? "") + " " + categoryById.get(product.category).name).includes(query))
  );
  byId("results").textContent = `Найдено: ${matches.length}`;
  const preview = selected === "all" && !query && !showAllProducts;
  byId("catalog-more").hidden = !preview || matches.length <= 4;
  const visible = preview ? matches.slice(0, 4) : matches;
  byId("products").innerHTML = visible.map((product) => {
    const purchase = product.options
      ? `<button type="button" class="button" data-product="${product.id}">Выбрать</button>`
      : `<a class="secondary" href="${product.source ?? (storeUrl + product.path)}">${product.source ? "Смотреть меню ↗" : "В магазине ↗"}</a>`;
    const category = categoryById.get(product.category);
    const picture = product.photo ?? category.photo;
    const image = product.image ?? category.image;
    return `<article class="product">
      <div class="product-photo${image ? " photo-" + image : ""}" aria-hidden="true"${picture ? ' style="' + photoStyle(picture, 1.61) + '"' : ""}></div>
      <div class="product-copy">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        ${product.price ? `<strong class="price">${product.price}</strong>` : ""}
        ${product.category === "new" ? `<button type="button" class="secondary" data-contact="message" data-subject="Есть ли сейчас ${product.name.toLowerCase()}? Какой вес можно заказать?">Уточнить вес и наличие</button>` : purchase}
      </div>
    </article>`;
  }).join("") || '<p>По этому запросу в демо-каталоге ничего не нашлось.</p>';
}

function openPanel(title, markup) {
  byId("dialog-title").textContent = title;
  panel.innerHTML = markup;
  if (!dialog.open) dialog.showModal();
}

function openProduct(product, preferredCut) {
  const cuts = product.id === "trout"
    ? ["Целая тушка", "Стейки", "Филе", "Филе и суповой набор отдельно"]
    : ["Одним куском", "Две порции"];
  const cutOptions = cuts.map(cut => `<option>${cut}</option>`).join("");
  const weighed = product.weighted
    ? '<p class="muted">Для весовой рыбы сумма предварительная. Магазин уточняет её после взвешивания.</p>'
    : "";
  const options = product.options.map(([name, price], index) =>
    `<option value="${index}">${name} · ${formatRubles(price)}</option>`
  );
  openPanel(product.name, `
    <p>${product.description}</p>
    <label class="field">Вес или фасовка<select id="option">${options.join("")}</select></label>
    ${product.weighted ? `<p class="price">${product.price} · <output id="portion-price" data-id="${product.id}">≈ ${formatRubles(product.options[0][1])}</output></p>
    <label class="field">Как подготовить рыбу<select id="cut-type">${cutOptions}</select></label>
    <label class="field">Дополнительное пожелание<textarea id="cut" maxlength="180" rows="2" placeholder="Например, разделить на две порции"></textarea></label>` : ""}
    ${weighed}
    ${product.promotional ? `<p>За выбранный вес · <output id="portion-price" data-id="${product.id}" aria-live="polite">≈ ${formatRubles(product.options[0][1])}</output></p>` : ""}
    <button type="button" class="button" data-add="${product.id}">В корзину</button>
    ${product.path ? `<p><a href="${storeUrl + product.path}">Источник товара и цены ↗</a></p>` : ""}
  `);
  if (preferredCut && cuts.includes(preferredCut)) byId("cut-type").value = preferredCut;
}

function changeCart(id, option, delta, cut = "") {
  const key = [id, option, encodeURIComponent(cut)].join(":");
  const count = (cart.get(key)?.count ?? 0) + delta;
  if (count > 0) cart.set(key, { id, option, count, cut });
  else cart.delete(key);
  updateBasketCount([...cart.values()].reduce((sum, line) => sum + line.count, 0));
}

function subtotal() {
  return [...cart.values()].reduce((sum, line) => sum + productById.get(line.id).options[line.option][1] * line.count, 0);
}

const deliveryOptions = {
  unknown: "Уточнить зону у менеджера",
  green: "Зелёная зона",
  yellow: "Жёлтая зона",
  red: "Красная зона",
  pickup: "Самовывоз"
};

function deliverySummary() {
  const amount = subtotal();
  let fee;
  if (deliveryChoice === "pickup") fee = 0;
  if (deliveryChoice === "green") fee = amount >= 3500 ? 0 : 350;
  if (deliveryChoice === "yellow") fee = amount >= 5500 ? 0 : 550;
  if (fee === undefined) return "Доставка по согласованию. Товары — " + formatRubles(amount) + ".";
  const service = deliveryChoice === "pickup" ? "Самовывоз" : "Доставка";
  return service + " — " + formatRubles(fee) + ". Предварительный итог — " + formatRubles(amount + fee) + ".";
}

function deliveryFields() {
  const options = Object.entries(deliveryOptions).map(([key, name]) =>
    `<option value="${key}"${key === deliveryChoice ? " selected" : ""}>${name}</option>`
  );
  return `<p><a href="https://rybarossii.ru/dostavka-v-den-zakaza" target="_blank" rel="noopener">Найти адрес на карте зон ↗</a></p>
    <label class="field">Зона доставки или самовывоз<select id="delivery-choice">${options.join("")}</select></label>
    <p id="shipping-total" aria-live="polite">${deliverySummary()}</p>`;
}

function openCart() {
  if (!cart.size) {
    openPanel("Корзина", '<p>Корзина пуста.</p><button type="button" class="secondary" data-continue>Продолжить покупки</button>');
    return;
  }
  const lines = [...cart].map(([key, { id, option, count }]) => {
    const product = productById.get(id);
    const [weight, price] = product.options[option];
    return `<div class="cart-row"><div><strong>${product.name}</strong><small>${weight} · ${formatRubles(price * count)}</small><small data-cut-key="${key}"></small></div>
      <div class="quantity"><button type="button" class="secondary" data-key="${key}" data-delta="-1" aria-label="Уменьшить количество">−</button>
      <span>${count}</span><button type="button" class="secondary" data-key="${key}" data-delta="1" aria-label="Увеличить количество">+</button></div></div>`;
  });
  openPanel("Корзина", `
    <div>${lines.join("")}</div>
    <p><strong>Товары · ${formatRubles(subtotal())}</strong></p>
    ${deliveryFields()}
    <p class="muted">После взвешивания менеджер подтвердит наличие, итоговую сумму, способ оплаты и время получения.</p>
    <button type="button" class="button" data-checkout>Оформить демо-заказ</button>
    <button type="button" class="secondary" data-continue>Продолжить покупки</button>
  `);
  for (const field of panel.querySelectorAll("[data-cut-key]")) {
    const cut = cart.get(field.dataset.cutKey).cut;
    if (cut) field.textContent = "Разделка: " + cut;
  }
}

function openCheckout() {
  openPanel("Оформление заказа", `
    <p class="muted">Для демонстрации используйте вымышленные данные. Форма ничего не отправляет.</p>
    <form id="checkout">
      ${deliveryFields()}
      <p id="fulfillment-note" class="muted"></p>
      <label class="field" id="address-field">Адрес доставки<input id="address" placeholder="Пример: Тестовая улица, 1"></label>
      <label class="field">Желаемая дата получения <small>(по желанию)</small><input type="date" id="requested-date"></label>
      <label class="field">Телефон<input type="tel" placeholder="Пример: +7 000 000-00-00" required></label>
      <label class="field">Пожелания к заказу<textarea rows="2" placeholder="Например, позвонить перед приездом"></textarea></label>
      <p><strong>Товары · ${formatRubles(subtotal())}</strong></p>
      <button class="button" type="submit">Подтвердить демо-заказ</button>
      <button class="secondary" type="button" data-back>В корзину</button>
    </form>
  `);
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });
  byId("requested-date").min = date;
  updateFulfillment();
}



byId("filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  selected = button.dataset.filter;
  drawCatalog();
  byId("filters").querySelector(`[data-filter="${selected}"]`).focus();
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-feature-category]");
  if (!link) return;
  selected = link.dataset.featureCategory;
  byId("search").value = "";
  drawCatalog();
});

byId("catalog-more").addEventListener("click", () => {
  showAllProducts = true;
  drawCatalog();
  byId("products").children[4]?.querySelector("a, button")?.focus();
});

byId("search").addEventListener("input", drawCatalog);
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product]");
  if (button) openProduct(productById.get(button.dataset.product), button.dataset.cut);
});
byId("basket").addEventListener("click", openCart);

function updateBasketCount(count) {
  try { sessionStorage.setItem("kurilskiy-cart", JSON.stringify([...cart])); } catch { /* Keep the current cart in memory. */ }
  byId("count").textContent = count;
}

panel.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.hasAttribute("data-continue")) dialog.close();
  if (button.hasAttribute("data-back")) openCart();
  if (button.hasAttribute("data-checkout")) openCheckout();
  if (button.dataset.add) {
    const cut = [byId("cut-type")?.value, byId("cut")?.value.trim()].filter(Boolean).join(" · ");
    changeCart(button.dataset.add, Number(byId("option").value), 1, cut);
    byId("cart-status").textContent = "Товар добавлен в корзину.";
    openCart();
  }
  if (button.dataset.key) {
    const { id, option, cut } = cart.get(button.dataset.key);
    changeCart(id, option, Number(button.dataset.delta), cut);
    openCart();
  }
});

function updateFulfillment() {
  const pickup = deliveryChoice === "pickup";
  byId("address-field").hidden = pickup;
  byId("address").required = !pickup;
  byId("fulfillment-note").textContent = pickup
    ? "Скобелевский проспект, 17. Ежедневно с 10:00 до 21:00."
    : "Менеджер подтвердит зону по адресу, время доставки и способ оплаты.";
}

panel.addEventListener("change", (event) => {
  if (event.target.id === "option" && byId("portion-price")) {
    const output = byId("portion-price");
    const product = productById.get(output.dataset.id);
    output.textContent = "≈ " + formatRubles(product.options[event.target.value][1]);
  }
  if (event.target.id === "delivery-choice") {
    deliveryChoice = event.target.value;
    byId("shipping-total").textContent = deliverySummary();
    if (byId("checkout")) updateFulfillment();
  }
});

panel.addEventListener("submit", (event) => {
  if (event.target.id !== "checkout") return;
  event.preventDefault();
  const summary = deliverySummary();
  const date = byId("requested-date").value;
  const items = [...cart.values()].map(({ id, option, count, cut }) => {
    const product = productById.get(id);
    return product.name + " · " + product.options[option][0] + " × " + count + (cut ? " · " + cut : "");
  });
  demoOrders.unshift({ summary, date, items });
  cart.clear();
  deliveryChoice = "unknown";
  updateBasketCount(0);
  openPanel("Демо-заказ оформлен", `
    <p>${summary} Данные и платёж не отправлены.</p>
    <p>В рабочем магазине менеджер свяжется с покупателем, подтвердит наличие, вес, пожелания к разделке, итоговую сумму, способ оплаты и время получения.</p>
    <button class="button" type="button" data-account>Посмотреть в кабинете</button>
    <button class="secondary" type="button" data-continue>Продолжить покупки</button>
  `);
});

const demoOrders = [];

function openAccount() {
  openPanel("Личный кабинет", `
    <p class="muted">Демо-кабинет. Здесь видны заказы, оформленные до обновления страницы.</p>
    <h3>Мои заказы</h3>
    <div id="order-history"></div>
    <button type="button" class="secondary" data-continue>Вернуться к покупкам</button>
  `);
  const history = byId("order-history");
  if (!demoOrders.length) history.textContent = "Вы пока не оформляли демо-заказ.";
  demoOrders.forEach((order, index) => {
    const entry = document.createElement("details");
    const title = document.createElement("summary");
    title.textContent = "Заказ № " + (demoOrders.length - index) + " · " + order.summary;
    entry.append(title);
    const lines = [...order.items];
    if (order.date) lines.push("Желаемая дата — " + order.date.split("-").reverse().join("."));
    lines.forEach(line => {
      const item = document.createElement("p");
      item.textContent = line;
      entry.append(item);
    });
    history.append(entry);
  });
}

function openContact(mode, subject = "") {
  const actions = { call: "Позвонить", callback: "Заказать звонок", message: "Написать" };
  const buttons = Object.entries(actions).map(([id, name]) =>
    `<button type="button" class="secondary" data-contact="${id}" aria-pressed="${id === mode}">${name}</button>`
  ).join("");
  const isMessage = mode === "message";
  const content = mode === "call" ? `
    <p>Магазин на Скобелевском, 17. Ежедневно с 10:00 до 21:00.</p>
    <a class="button" href="tel:+79522240844">Позвонить +7 (952) 224-08-44</a><p><a href="tel:+78124680844">Городской номер +7 (812) 468-08-44</a></p>
  ` : `<form id="contact-form" class="contact-form">
    <p class="muted">Демонстрационная форма. Используйте тестовые контакты.</p>
    <label class="field">${isMessage ? "Электронная почта для ответа" : "Телефон для звонка"}
      <input type="${isMessage ? "email" : "tel"}" required ${isMessage ? "" : 'minlength="6"'}></label>
    <label class="field">${isMessage ? "Ваш вопрос" : "Когда удобно позвонить (по желанию)"}
      <textarea rows="2" maxlength="800" ${isMessage ? "required" : ""}></textarea></label>
    <button type="submit" class="button">${isMessage ? "Отправить демо-сообщение" : "Оформить демо-звонок"}</button>
  </form>`;
  openPanel("Связаться с магазином", `<div class="contact-actions" role="group" aria-label="Способ связи">${buttons}</div>${content}`);
  if (isMessage && subject) byId("contact-form").querySelector("textarea").value = subject;
}

document.addEventListener("click", (event) => {
  const contact = event.target.closest("[data-contact]");
  if (contact) {
    const switchingMode = panel.contains(contact);
    openContact(contact.dataset.contact, contact.dataset.subject);
    if (switchingMode) panel.querySelector('[aria-pressed="true"]').focus();
  }
  if (event.target.closest("[data-account]")) openAccount();
});

panel.addEventListener("submit", (event) => {
  if (event.target.id !== "contact-form") return;
  event.preventDefault();
  openPanel("Форма заполнена", '<p>Это демонстрация. Контакты и сообщение остались в браузере.</p><button type="button" class="button" data-continue>Закрыть</button>');
});

const pickViews = {
  dish: ["assets/salmon-dinner.jpg", "Вариант подачи сёмги с картофелем и укропом на двоих"],
  fillet: ["assets/salmon-fillet.webp", "Охлаждённое филе сёмги до приготовления"]
};
document.querySelector(".photo-switch").addEventListener("click", (event) => {
  const choice = event.target.closest("[data-photo]");
  if (!choice || choice.getAttribute("aria-pressed") === "true") return;
  const img = byId("pick-photo");
  [img.src, img.alt] = pickViews[choice.dataset.photo];
  img.classList.toggle("fillet-view", choice.dataset.photo === "fillet");
  for (const button of choice.parentElement.children) {
    button.setAttribute("aria-pressed", String(button === choice));
  }
});



updateBasketCount([...cart.values()].reduce((sum, line) => sum + line.count, 0));

drawCatalog();
if (location.hash === "#basket") openCart();
window.addEventListener("hashchange", () => { if (location.hash === "#basket") openCart(); });
const menuRequest = new URLSearchParams(location.search);
if (menuRequest.get("menu") === "pasta") {
  const guests = Number(menuRequest.get("guests"));
  const option = pastaMenu.portions.indexOf(guests);
  if (option >= 0) {
    const note = menuRequest.get("complete") === "yes"
      ? "Просьба собрать дополнительно: " + pastaMenu.extras(guests).join(", ") + ". Наличие и цена по согласованию."
      : "Только морепродукты.";
    changeCart(menuProduct.id, option, 1, note);
    history.replaceState(null, "", location.href.split("?")[0] + "#catalog");
    openCart();
  }
}
const voiceButtons = document.querySelectorAll(".voice-select button");
function showVoice(active) {
  for (const button of voiceButtons) {
    const selected = button === active;
    button.setAttribute("aria-pressed", String(selected));
    byId(button.getAttribute("aria-controls")).hidden = !selected;
  }
}
for (const button of voiceButtons) {
  button.addEventListener("click", () => showVoice(button));
  button.addEventListener("focus", () => showVoice(button));
  button.addEventListener("pointerenter", event => {
    if (event.pointerType === "mouse") showVoice(button);
  });
}
const compactMenu = document.querySelector(".compact-menu");
compactMenu.addEventListener("click", event => { if (event.target.closest("a,button")) compactMenu.open = false; });




if (new URLSearchParams(location.search).get("dish") === "shrimp-soup") openContact("message", "Хочу приготовить томатный крем-суп. Можно заказать 200 г очищенных креветок?");
