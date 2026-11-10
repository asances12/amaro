import { varieties } from './varieties.js';

const STORAGE_KEY = 'amaro-shopping-bag';
const grid = document.querySelector('#product-grid');
const overlay = document.querySelector('#cart-overlay');
const checkoutOverlay = document.querySelector('#checkout-overlay');
const cartItems = document.querySelector('#cart-items');
const toast = document.querySelector('.shop-toast');
let toastTimer;
let returnFocusTo = null;

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return Object.fromEntries(varieties
      .filter(({ id }) => Number.isInteger(stored[id]) && stored[id] > 0)
      .map(({ id }) => [id, stored[id]]));
  } catch {
    return {};
  }
}

let cart = loadCart();
const itemCount = () => Object.values(cart).reduce((total, amount) => total + amount, 0);
const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const PACK_PRICE = 5.95;
const priceLabel = () => `${euro.format(PACK_PRICE)} por pack`;

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    notify('No se ha podido guardar la cesta en este dispositivo.');
  }
}

function renderProducts() {
  grid.innerHTML = varieties.map((variety) => `<article class="product-card" id="${variety.id}"><div class="product-visual pack-visual"><img class="product-image" src="${variety.image}" alt="Pack AMARO: ${variety.name}" loading="lazy"><span class="product-sticker">${String(variety.rank).padStart(2, '0')} / ${String(varieties.length).padStart(2, '0')}</span></div><div class="product-info"><div><h3>${variety.name}</h3><span class="product-level">${variety.level}</span><p>${variety.description}</p></div></div><p class="product-price">${priceLabel(variety.price)}</p><button class="add-button" type="button" data-add="${variety.id}" aria-label="Añadir el pack ${variety.name} a la cesta">Añadir pack a la cesta <span aria-hidden="true">＋</span></button></article>`).join('');

  grid.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => {
    const variety = varieties.find(({ id }) => id === button.dataset.add);
    cart[variety.id] = (cart[variety.id] || 0) + 1;
    saveCart();
    renderCart();
    notify(`El pack ${variety.name} se ha añadido a la cesta.`);
  }));
}

function renderCart() {
  const count = itemCount();
  document.querySelectorAll('.cart-count').forEach((node) => { node.textContent = count; });
  document.querySelector('.cart-open').setAttribute('aria-label', `Abrir cesta, ${count} ${count === 1 ? 'artículo' : 'artículos'}`);

  const entries = varieties.filter(({ id }) => cart[id]);
  document.querySelector('#cart-empty').hidden = entries.length > 0;
  document.querySelector('#cart-footer').hidden = entries.length === 0;
  cartItems.innerHTML = entries.map((variety) => `<article class="cart-item"><div class="cart-thumb ${variety.visual}"><img src="${variety.image}" alt="Pack AMARO: ${variety.name}" loading="lazy"></div><div class="cart-item-info"><h3>Pack ${variety.name}</h3><p>${variety.level}</p><div class="quantity-control"><button type="button" data-quantity="${variety.id}" data-change="-1" aria-label="Quitar un pack ${variety.name}">−</button><span aria-label="Cantidad">${cart[variety.id]}</span><button type="button" data-quantity="${variety.id}" data-change="1" aria-label="Añadir otro pack ${variety.name}">＋</button><button type="button" class="remove-item" data-remove="${variety.id}" aria-label="Quitar el pack ${variety.name} de la cesta">Quitar</button></div></div><strong>${euro.format(PACK_PRICE * cart[variety.id])}</strong></article>`).join('');

  cartItems.querySelectorAll('[data-quantity]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.quantity;
    cart[id] += Number(button.dataset.change);
    if (cart[id] <= 0) delete cart[id];
    saveCart();
    renderCart();
  }));
  cartItems.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => {
    delete cart[button.dataset.remove];
    saveCart();
    renderCart();
  }));

  const subtotal = entries.reduce((sum, variety) => sum + PACK_PRICE * cart[variety.id], 0);
  document.querySelector('#cart-total').textContent = euro.format(subtotal);
  document.querySelector('#checkout-items').innerHTML = entries.map((variety) => `<div class="checkout-line"><span>${cart[variety.id]} × Pack ${variety.name}</span><strong>${euro.format(PACK_PRICE * cart[variety.id])}</strong></div>`).join('');
  document.querySelector('#checkout-summary').textContent = `Total de los productos: ${euro.format(subtotal)}`;
}

function openCart() {
  returnFocusTo = document.activeElement;
  overlay.hidden = false;
  document.body.classList.add('modal-open');
  document.querySelector('#cart-close').focus();
}
function closeCart() {
  overlay.hidden = true;
  document.body.classList.remove('modal-open');
  if (returnFocusTo?.isConnected) returnFocusTo.focus();
}
function closeCheckout() {
  checkoutOverlay.hidden = true;
  document.body.classList.remove('modal-open');
  if (returnFocusTo?.isConnected) returnFocusTo.focus();
}

document.querySelector('.cart-open').addEventListener('click', openCart);
document.querySelector('.cart-scrim').addEventListener('click', closeCart);
document.querySelector('#cart-close').addEventListener('click', closeCart);
document.querySelector('.cart-continue').addEventListener('click', () => {
  closeCart();
  document.querySelector('#products').scrollIntoView({ behavior: 'smooth' });
});
document.querySelector('#checkout-button').addEventListener('click', () => {
  returnFocusTo = document.querySelector('.cart-open');
  overlay.hidden = true;
  checkoutOverlay.hidden = false;
  document.body.classList.add('modal-open');
  document.querySelector('#checkout-close').focus();
});
document.querySelectorAll('.checkout-close, .checkout-done').forEach((button) => button.addEventListener('click', closeCheckout));
checkoutOverlay.addEventListener('click', (event) => {
  if (event.target === checkoutOverlay) closeCheckout();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!checkoutOverlay.hidden) closeCheckout();
    else if (!overlay.hidden) closeCart();
  }
});

renderProducts();
renderCart();
if (window.location.hash) {
  const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  target?.scrollIntoView();
}
