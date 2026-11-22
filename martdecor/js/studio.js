const menu = document.querySelector(".topbar nav");
if(menu){
  const toggle=document.createElement("button");
  toggle.className="menu-toggle"; toggle.type="button"; toggle.textContent="Меню";
  toggle.setAttribute("aria-expanded","false"); menu.id="main-navigation";toggle.setAttribute("aria-controls",menu.id);
  menu.before(toggle);
  function setMenu(open){menu.classList.toggle("open",open);toggle.setAttribute("aria-expanded",String(open))}
  toggle.onclick=()=>setMenu(!menu.classList.contains("open"));
  menu.addEventListener("click",()=>setMenu(false));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&menu.classList.contains("open")){setMenu(false);toggle.focus()}});
}

const roomFinishes = {
  bath: [
    {tab:"Светлый камень", title:"Стена с золотистыми прожилками", note:"В отделке за ванной повторяются оттенки дерева и тёплого металла. Крупный рисунок виден по всей высоте стены.", category:"natural", album:"album-1", products:[]},
    {tab:"Тёмный камень", title:"Тёмная стена за ванной", note:"Скрытая подсветка отделяет белую ванну от стены. При выборе шпона для ванной уточните у комплектатора условия монтажа.", category:"natural", album:"album-2", products:["dblack"]},
    {tab:"Бирюза", title:"Бирюзовая акцентная стена", note:"На цветной поверхности заметны светлые и медные прожилки. Соседняя однотонная стена оставляет рисунок на виду.", category:"natural", album:"album-3", products:[]},
    {tab:"Рельеф", title:"Геометрия в цвет стены", note:"Прямоугольные рамки создают рельеф за отдельно стоящей ванной. Оттенок профилей повторяет фон.", category:"decor", album:"album-4", products:["orac-mouldings"]}
  ],
  living: [
    {tab:"Штукатурка", title:"Шалфейная штукатурка", note:"На стене за диваном видны мягкие переходы оттенка. В боковом свете заметен след инструмента.", category:"plaster", products:["decor-plaster"]},
    {tab:"Рейки", title:"Вертикальные рейки под дуб", note:"Светлый шпон и тёмные промежутки между рейками дают стене глубину. Рисунок продолжается от пола до потолка.", category:"panels", products:["latte"]},
    {tab:"Обои", title:"Ботанический рисунок", note:"Тонкие ветви медного оттенка выделяют стену за диваном. На соседней стене можно повторить цвет фона.", category:"wallpaper", products:["fresq-classic"]},
    {"tab": "Рейки XL", "title": "Светлые рейки за диваном", "note": "Крупный план из каталога салона. Свет из окна подчёркивает полосы разной ширины.", "category": "panels", "products": ["slats-xl"], "photo": "vk-samples/slats-xl.webp"}
  ],
  bedroom: [
    {tab:"Панели", title:"Молочный рельеф", note:"Узкие вертикали за изголовьем ловят свет от окна. Матовая краска объединяет выступы и впадины одним оттенком.", category:"panels", products:["dd912","charmant"]},
    {tab:"Обои", title:"Тканая фактура", note:"Переплетение нитей заметно вблизи. Издалека стена выглядит как цельное полотно тёплого песочного цвета.", category:"wallpaper", products:["hikari"]},
    {tab:"Молдинги", title:"Рамки в цвет стены", note:"Тонкие молдинги очерчивают прямоугольники над изголовьем. Стену и профили объединяет один серо-голубой оттенок.", category:"decor", products:["orac-mouldings","charmant"]},
    {"tab": "QUILT", "title": "Терракотовый рельеф QUILT", "note": "В спальне рядом с кроватью модули развёрнуты в двух направлениях. Из одного рисунка складывается рельефная стена.", "category": "panels", "products": ["quilt"], "photo": "vk-samples/quilt.webp"}
  ],
  office: [
    {tab:"Штукатурка", title:"Оливковая штукатурка", note:"На свободной стене над столом хорошо видны переходы зелёного оттенка. Деревянные полки добавляют тепла.", category:"plaster", products:["decor-plaster"]},
    {tab:"Рейки", title:"Дубовые рейки", note:"Рейки проходят за полками и столом. При боковом свете каждая планка отбрасывает узкую тень.", category:"panels", products:["latte"]},
    {tab:"Камень", title:"Графитовый камень", note:"Светлые прожилки проходят через тёмную стену над столом. У натурального шпона рисунок каждого листа свой.", category:"natural", products:["dblack"]},
    {"tab": "Ясень", "title": "Панель «Ясень Кристал»", "note": "Рейки на чёрном войлоке отделяют зону с телевизором. На фото из карточки хорошо видно, как свет падает вдоль стены.", "category": "panels", "products": ["ash-crystal"], "photo": "vk-samples/ash-crystal.webp"}
  ]
};

function setupRoomGallery(gallery) {
  const tabs = [...gallery.querySelectorAll("[data-room]")];
  const choices = [...gallery.querySelectorAll(".room-choices button")];
  const materialsDialog = gallery.querySelector("#room-materials");
  gallery.querySelector(".materials-jump").onclick = () => materialsDialog.showModal();
  const catalogLink = gallery.querySelector("#room-route");
  const selection = new URL(catalogLink.href).searchParams.get("selection");
  const categoryLinks = {plaster:"Все штукатурки", panels:"Все панели", wallpaper:"Обои и фрески", decor:"Лепнина и панно", natural:"Камень и бамбук"};
  const remembered = new Map();
  let room = "living";
  let current = 0;

  function linkTo(path, key, value) {
    const params = new URLSearchParams({[key]:value});
    if (selection !== null) params.set("selection", selection);
    return path + "?" + params.toString();
  }

  function materialTile(id) {
    const item = window.martdecor.items.find(entry => entry.id === id);
    const tile = document.createElement("a");
    tile.href = linkTo("item.html", "id", id);
    const preview = document.createElement("img");
    preview.src = "assets/" + item.image;
    preview.alt = "";
    const caption = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = item.name;
    const action = document.createElement("small");
    action.textContent = item.price ? item.price.toLocaleString("ru-RU") + " ₽" + (item.unit ? " / " + item.unit : "") : "Посмотреть материал";
    caption.append(name, action);
    tile.append(preview, caption);
    return tile;
  }

  function show(index) {
    const variants = roomFinishes[room];
    current = (index + variants.length) % variants.length;
    remembered.set(room, current);
    const finish = variants[current];
    const tab = tabs.find(button => button.dataset.room === room);
    for (const button of tabs) button.setAttribute("aria-pressed", String(button === tab));
    choices.forEach((button, i) => {
      button.textContent = variants[i].tab;
      button.setAttribute("aria-pressed", String(i === current));
    });
    const photo = gallery.querySelector("#room-image");
    photo.src = finish.album ? "assets/rooms/" + finish.album + ".webp" : finish.photo ? "assets/" + finish.photo : "assets/rooms/" + room + "-" + (current + 1) + ".webp";
    gallery.querySelector(".room-caption > span").textContent = finish.album ? "Фото из галереи салона" : finish.photo ? "Интерьер из карточки панели" : "Визуализация интерьера";
    gallery.querySelector(".swatches-heading h3").textContent = finish.photo ? "Материал на фото" : finish.album ? "Материалы для похожего решения" : "Похожие материалы в салоне";
    gallery.dataset.activeRoom = room;
    photo.classList.toggle("catalog-photo", Boolean(finish.album || finish.photo));
    photo.alt = tab.textContent + ". " + finish.title;
    gallery.querySelector("#room-title").textContent = finish.title;
    gallery.querySelector("#room-note").textContent = finish.note;
    gallery.querySelector("#room-count").textContent = (current + 1) + " / " + variants.length;
    gallery.querySelector("#room-products").replaceChildren(...finish.products.map(materialTile));
    catalogLink.dataset.route = "catalog.html?category=" + finish.category;
    catalogLink.href = linkTo("catalog.html", "category", finish.category);
    catalogLink.textContent = categoryLinks[finish.category];
    if (!finish.products.length) {
      const category = window.martdecor.categories.find(entry => entry.id === finish.category);
      const card = catalogLink.cloneNode(false);
      card.removeAttribute("id");
      const preview = document.createElement("img");
      preview.src = "assets/" + category.image;
      preview.alt = "";
      const caption = document.createElement("strong");
      caption.textContent = "Открыть раздел «" + category.title + "»";
      card.append(preview, caption);
      gallery.querySelector("#room-products").append(card);
    }
    history.replaceState({...history.state, room, finishIndex:current}, "");
  }

  tabs.forEach(button => button.onclick = () => {
    room = button.dataset.room;
    show(remembered.get(room) || 0);
  });
  choices.forEach((button, i) => button.onclick = () => show(i));
  gallery.querySelector("#prev-room").onclick = () => show(current - 1);
  gallery.querySelector("#next-room").onclick = () => show(current + 1);
  if (Object.hasOwn(roomFinishes, history.state?.room)) room = history.state.room;
  show(history.state?.finishIndex || 0);
}

const gallery = document.querySelector("#gallery.compare");
if (gallery) setupRoomGallery(gallery);




