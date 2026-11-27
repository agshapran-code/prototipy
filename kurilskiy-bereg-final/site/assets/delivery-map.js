"use strict";

const houseAtEnd = /(?:^|[\s,])(\d+[а-яa-z]?(?:\s*\/\s*\d+[а-яa-z]?)?(?:[\s,]*(?:корп(?:ус)?|стр(?:оение)?|лит(?:ера)?|к|с)\.?\s*[0-9а-яa-z]+){0,3})$/iu;

function deliveryHouse(value) {
  return value.toLowerCase().replace(/корп(?:ус)?\.?/g, "к")
    .replace(/стр(?:оение)?\.?/g, "с").replace(/лит(?:ера)?\.?/g, "л")
    .replace(/[\s,\.]/g, "");
}

function addressWords(value) {
  return value.toLowerCase().replaceAll("ё", "е").match(/[а-яa-z0-9]+/gu) || [];
}

function deliveryStreet(value) {
  return addressWords(value).filter((word) =>
    !/^(?:ул|улица|пр|проспект|пер|переулок|ш|шоссе|наб|набережная|бульвар|пл|площадь|дорога|проезд|д|дом)$/.test(word),
  );
}

function addressQuery(value) {
  const text = value.trim().replace(/,\s*(?:санкт[- ]петербург|спб)\.?$/iu, "");
  const match = text.match(houseAtEnd);
  if (!match) return null;
  const prefix = text.slice(0, match.index).replace(/(?:^|[\s,]+)(?:дом|д)\.?\s*$/iu, "");
  const parts = prefix.split(",").map((part) => part.trim()).filter(Boolean);
  const streetText = (parts.pop() || "").replace(/^(?:санкт[- ]петербург|спб)\.?\s+/iu, "");
  const street = deliveryStreet(streetText);
  if (!street.some((word) => /[а-яa-z]/u.test(word))) return null;
  const town = addressWords(parts.at(-1) || "").filter((word) => !/^(г|город|пос|поселок)$/.test(word));
  return { text, street, town, house: deliveryHouse(match[1]) };
}

function exactDeliveryMatches(features, query) {
  const matches = new Map();
  for (const { properties: item, geometry } of features) {
    if (!item?.street || !item.housenumber || geometry?.type !== "Point") continue;
    const coords = geometry.coordinates;
    if (coords?.length !== 2 || !coords.every(Number.isFinite)) continue;
    const street = deliveryStreet(item.street);
    const city = item.city || item.locality || item.district || item.county || "";
    const place = addressWords([item.city, item.locality, item.district, item.county, item.state].filter(Boolean).join(" "));
    const matchesTown = query.town.join(" ") === "спб"
      ? place.includes("петербург")
      : query.town.every((word) => place.includes(word));
    if (!matchesTown || deliveryHouse(item.housenumber) !== query.house || !query.street.every((word) => street.includes(word))) continue;

    const address = [city, item.street, item.housenumber].filter(Boolean).join(", ");
    const key = addressWords(address).join(" ");
    const building = item.osm_key === "building" || item.osm_key === "place";
    if (matches.has(key) && (!building || matches.get(key).building)) continue;
    matches.set(key, { coords, address, building, exactStreet: query.street.length === street.length });
  }
  return [...matches.values()];
}

function deliveryRingContains([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[j];
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
    if (Math.abs(cross) < 1e-12 && x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by)) return true;
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

function deliveryZoneAt(point, features) {
  // The published map's drawing order decides which zone covers an overlapping point.
  for (const feature of [...features].reverse()) {
    const [outer, ...holes] = feature.geometry.coordinates;
    if (deliveryRingContains(point, outer) && !holes.some((ring) => deliveryRingContains(point, ring))) return feature.properties.zone;
  }
  return "unknown";
}

function initializeDeliveryMap(section, options) {
  const findMap = (selector) => section.querySelector(selector);
  const form = findMap("form");
  const input = findMap("#delivery-map-address");
  const status = findMap("[data-address-status]");
  const matches = findMap("[data-address-matches]");
  const result = findMap("[data-address-result]");
  const next = findMap("[data-address-next]");
  const pickup = findMap("[data-address-pickup]");
  const surface = findMap("[data-address-map]");
  const pointButton = findMap("[data-address-point]");
  const colors = { green: "#4c9841", yellow: "#c49014", red: "#c5494b" };
  let dataRequest;
  let features;
  let map;
  let pin;
  let search;

  const announce = (message, visuallyHidden = false) => {
    status.classList.toggle("sr-only", visuallyHidden);
    status.textContent = message;
  };

  function setPicking(picking) {
    pointButton.setAttribute("aria-pressed", String(picking));
    pointButton.textContent = picking ? "Отменить выбор точки" : "Указать точку на карте";
    surface.classList.toggle("is-picking", picking);
  }

  function showLocation(coords, address = "") {
    const zone = deliveryZoneAt(coords, features);
    const [lng, lat] = coords;
    pin?.remove();
    pin = L.marker([lat, lng], {
      icon: L.divIcon({ className: "delivery-map-pin", iconSize: [23, 23], iconAnchor: [11, 25] }),
      interactive: false,
      keyboard: false,
    }).addTo(map);
    map.setView([lat, lng], Math.max(16, map.getZoom()), { animate: false });
    matches.hidden = true;
    setPicking(false);
    options.select({ zone, address });

    const { title, tariff } = options.describe(zone);
    result.dataset.zone = zone;
    findMap("[data-address-zone]").textContent = title;
    findMap("[data-address-label]").textContent = address || "Точка на карте. Введите точный адрес при оформлении.";
    findMap("[data-address-tariff]").textContent = tariff;
    next.textContent = options.hasItems() ? "Перейти в корзину" : "Выбрать товары";
    pickup.hidden = zone === "green" || zone === "yellow";
    result.hidden = false;
    announce([title, address, tariff].filter(Boolean).join(". "), true);
    if (!address) result.scrollIntoView({ block: "nearest", behavior: "instant" });
  }

  function loadMap() {
    if (map) {
      map.invalidateSize({ pan: false });
      return Promise.resolve();
    }
    if (!dataRequest) {
      dataRequest = fetch(new URL("delivery-zones.geojson", options.assetRoot)).then(async (response) => {
        if (!response.ok || !globalThis.L) throw new Error("Map unavailable");
        ({ features } = await response.json());
        map = L.map(surface, { scrollWheelZoom: false, minZoom: 8, maxZoom: 19 });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        const zones = L.geoJSON(features, {
          interactive: false,
          style: ({ properties }) => ({ color: colors[properties.zone], weight: 2, fillOpacity: 0.23 }),
        }).addTo(map);
        // If the disclosure closes while loading, defer measuring its size until reopening.
        if (section.open) map.fitBounds(zones.getBounds(), { padding: [9, 9] });
        else map.setView(zones.getBounds().getCenter(), 10);
        map.on("click", ({ latlng }) => {
          if (pointButton.getAttribute("aria-pressed") === "true") showLocation([latlng.lng, latlng.lat]);
        });
      }).catch((error) => {
        dataRequest = undefined;
        throw error;
      });
    }
    return dataRequest;
  }

  function clearSearch() {
    search?.abort();
    search = undefined;
    if (!result.hidden) options.select(null);
    matches.hidden = result.hidden = true;
    pin?.remove();
    announce("");
  }

  async function searchAddress(event) {
    event.preventDefault();
    clearSearch();
    setPicking(false);
    const query = addressQuery(input.value);
    if (!query) {
      announce("Укажите улицу и номер дома. Если ищете за городом, добавьте населённый пункт через запятую.");
      return;
    }
    announce("Ищем дом…");
    const current = new AbortController();
    search = current;
    const timeout = setTimeout(() => current.abort(), 9000);
    const endpoint = new URL("https://photon.komoot.io/api/");
    endpoint.search = new URLSearchParams({ q: query.text, lang: "default", limit: "12", lat: "59.94", lon: "30.31", bbox: "29.05,59.20,31.75,60.70" });
    try {
      const response = await fetch(endpoint, { signal: current.signal });
      if (!response.ok) throw new Error("Address lookup unavailable");
      const candidates = exactDeliveryMatches((await response.json()).features, query);
      await loadMap();
      if (search !== current) return;
      if (!candidates.length) {
        announce("Точный дом не найден. Проверьте улицу, номер дома, корпус или строение. Можно указать точку на карте.");
      } else if (candidates.length === 1 && candidates[0].exactStreet) {
        showLocation(candidates[0].coords, candidates[0].address);
      } else {
        matches.replaceChildren(...candidates.map(({ coords, address }) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "back-action";
          button.textContent = address;
          button.addEventListener("click", () => showLocation(coords, address));
          return button;
        }));
        matches.hidden = false;
        announce("Выберите нужный адрес.");
      }
    } catch {
      if (search === current) announce("Поиск сейчас недоступен. Укажите точку на карте или уточните доставку у магазина.");
    } finally {
      clearTimeout(timeout);
      if (search === current) search = undefined;
    }
  }

  form.addEventListener("submit", searchAddress);
  input.addEventListener("input", clearSearch);
  section.addEventListener("toggle", () => {
    if (section.open) loadMap().catch(() => {
      announce("Карта пока недоступна. Откройте карту магазина или уточните доставку по телефону.");
    });
  });
  pointButton.addEventListener("click", async () => {
    const picking = pointButton.getAttribute("aria-pressed") !== "true";
    if (picking) clearSearch();
    setPicking(picking);
    if (!picking) { announce(""); return; }
    try {
      await loadMap();
      if (pointButton.getAttribute("aria-pressed") === "true") announce("Нажмите на карту там, где находится ваш дом.");
    } catch {
      setPicking(false);
      announce("Карта пока недоступна. Уточните доставку у магазина.");
    }
  });
  next.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !options.hasItems()) return;
    event.preventDefault();
    options.openCart();
  });
  pickup.addEventListener("click", options.pickup);
}
