"use strict";
const pastaMenu = {
  portions: [2, 4, 6, 8],
  grams: guests => guests * 125,
  extras(guests) {
    const number = value => value.toLocaleString("ru-RU");
    return [this.grams(guests) + " г пасты", number(guests / 4) + " шт. лука-порея", number(250 * guests / 4) + " мл сливок", number(2 * guests / 4) + " ст. л. масла", "соль и перец по вкусу"];
  }
};
const menuForm = document.querySelector("#menu-order");
if (menuForm) {
  const renderMenu = () => {
    const guests = Number(menuForm.elements.guests.value);
    document.querySelector("#menu-weight").textContent = pastaMenu.grams(guests) + " г лангустинов";
    document.querySelector("#menu-extras").replaceChildren(...pastaMenu.extras(guests).map(text => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }));
  };
  menuForm.addEventListener("change", renderMenu);
  renderMenu();
}
