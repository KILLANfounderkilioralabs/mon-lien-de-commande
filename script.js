/* =============================================================================
   TEMPLATE SIMPLE — Formulaire de commande WhatsApp pour TikTokeurs
   KilioraLabs — version sans fiche produit / sans photo

   ─────────────────────────────────────────────────────────────────────────
   👉 POUR CRÉER UNE BOUTIQUE POUR UN NOUVEAU CLIENT :
   Modifie UNIQUEMENT l'objet STORE ci-dessous. Le reste du fichier n'a
   normalement pas besoin d'être touché.
   ─────────────────────────────────────────────────────────────────────────
   ========================================================================= */

const STORE = {
  name: "kilioralabs",
  tagline: "Livraison rapide - Paiement à la livraison - dépôt de validation ",

  // Numéro WhatsApp du vendeur — format international SANS "+" ni espaces
  whatsapp: "2250508731308",

  currency: "FCFA",
  primaryColor: "#16a34a",

  // Logo affiché dans l'en-tête (facultatif). Laisser vide "" pour n'afficher
  // que le nom de la boutique. Exemple : "logo.png" (fichier placé à la racine
  // du repo, à côté d'index.html) ou une URL complète "https://...".
  logoUrl: "logokiioralabs.jpg",

  // Prix unitaire pré-rempli par défaut (le client peut le modifier au besoin,
  // utile si les prix varient selon les commandes reçues sur TikTok)
  defaultUnitPrice: 5000,

  // Texte affiché uniquement si le client choisit "Dépôt pour validation".
  // Personnalise ce texte avec tes coordonnées de paiement (numéro Wave,
  // Mobile Money…) si tu veux les afficher directement ici.
  depositNote: "📸 NB : Une fois sur WhatsApp, merci d'envoyer une capture d'écran de votre paiement pour confirmer votre commande.",

  // Moyens de paiement proposés selon le mode choisi par le client.
  paymentMethodsByMode: {
    delivery: ["Espèces", "Wave", "Orange Money", "MTN Mobile Money"],
    deposit: ["Wave", "Orange Money", "MTN Mobile Money"]
  }
};

// Icônes affichées pour chaque moyen de paiement (facultatif, purement visuel)
const PAYMENT_METHOD_ICONS = {
  "Espèces": "💵",
  "Wave": "📲",
  "Orange Money": "🟠",
  "MTN Mobile Money": "💛"
};

/* =============================================================================
   APPLICATION DE LA CONFIGURATION AU DOM
   ========================================================================= */

(function applyStoreConfig() {
  document.documentElement.style.setProperty("--accent", STORE.primaryColor);
  document.documentElement.style.setProperty("--accent-dark", shadeColor(STORE.primaryColor, -18));

  document.title = `${STORE.name} — Commande WhatsApp`;

  setText("brandName", STORE.name);
  setText("brandTrust", STORE.tagline);
  setText("currencySuffix", STORE.currency);
  setText("footerText", `© ${STORE.name} — Ce site ne stocke aucune donnée. Vos informations sont envoyées uniquement par WhatsApp.`);
  setText("depositNote", STORE.depositNote);

  const logo = document.getElementById("brandLogo");
  if (logo && STORE.logoUrl) {
    logo.src = STORE.logoUrl;
    logo.alt = `Logo ${STORE.name}`;
    logo.hidden = false;
    logo.addEventListener("error", () => { logo.hidden = true; });
  }
})();

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

/* =============================================================================
   ÉTAT
   ========================================================================= */

const state = {
  quantity: 1,
  paymentMode: "",     // "Paiement à la livraison" | "Dépôt pour validation"
  paymentMethod: ""    // Espèces / Wave / Orange Money / MTN Mobile Money…
};

function formatPrice(amount) {
  return `${Number(amount || 0).toLocaleString("fr-FR")} ${STORE.currency}`;
}

/* =============================================================================
   PRIX UNITAIRE + QUANTITÉ
   ========================================================================= */

function initUnitPrice() {
  const input = document.getElementById("unitPrice");
  input.value = STORE.defaultUnitPrice;
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "");
    updateTotal({ flash: true });
  });
}

function initQuantityControl() {
  const input = document.getElementById("quantity");
  const minusBtn = document.getElementById("qtyMinus");
  const plusBtn = document.getElementById("qtyPlus");

  function setQuantity(value) {
    const qty = Math.max(1, Math.min(99, parseInt(value, 10) || 1));
    state.quantity = qty;
    input.value = qty;
    updateTotal({ flash: true });
  }

  minusBtn.addEventListener("click", () => setQuantity(state.quantity - 1));
  plusBtn.addEventListener("click", () => setQuantity(state.quantity + 1));
  input.addEventListener("change", () => setQuantity(input.value));
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "");
  });
}

/* =============================================================================
   TOTAL EN TEMPS RÉEL
   ========================================================================= */

function updateTotal({ flash = false } = {}) {
  const unit = parseInt(document.getElementById("unitPrice").value, 10) || 0;
  const total = unit * state.quantity;
  const formatted = formatPrice(total);

  setText("totalValue", formatted);
  setText("mobileTotal", formatted);

  if (flash) {
    const el = document.getElementById("totalValue");
    el.classList.remove("is-updated");
    void el.offsetWidth;
    el.classList.add("is-updated");
  }
}

/* =============================================================================
   PAIEMENT — étape 1 : mode (livraison / dépôt), cartes sélectionnables
   ========================================================================= */

function initPaymentCards() {
  const cards = document.querySelectorAll("#paymentCards .payment-card");

  cards.forEach(card => {
    card.addEventListener("click", () => {
      state.paymentMode = card.dataset.value;
      state.paymentMethod = ""; // on repart de zéro si le mode change

      cards.forEach(c => {
        c.classList.remove("is-checked");
        c.setAttribute("aria-pressed", "false");
      });
      card.classList.add("is-checked");
      card.setAttribute("aria-pressed", "true");

      clearFieldError("field-payment");
      renderPaymentMethodSection();
    });
  });
}

/* =============================================================================
   PAIEMENT — étape 2 : un seul bloc "Moyen de paiement", contenu dynamique
   ========================================================================= */

function renderPaymentMethodSection() {
  const section = document.getElementById("paymentMethodSection");
  const title = document.getElementById("paymentMethodTitle");
  const optionsWrap = document.getElementById("paymentMethodOptions");
  const note = document.getElementById("depositNote");

  if (!state.paymentMode) {
    section.hidden = true;
    return;
  }

  const isDeposit = state.paymentMode === "Dépôt pour validation";
  const methods = isDeposit ? STORE.paymentMethodsByMode.deposit : STORE.paymentMethodsByMode.delivery;

  title.textContent = isDeposit ? "Moyen de paiement du dépôt" : "Moyen de paiement";

  optionsWrap.innerHTML = methods
    .map(
      method => `
      <button type="button" class="payment-card payment-card--compact" data-value="${method}" aria-pressed="${state.paymentMethod === method}">
        <span class="payment-card__icon">${PAYMENT_METHOD_ICONS[method] || "💳"}</span>
        <span class="payment-card__text">
          <span class="payment-card__title">${method}</span>
        </span>
        <span class="payment-card__check" aria-hidden="true"></span>
      </button>`
    )
    .join("");

  const methodCards = optionsWrap.querySelectorAll(".payment-card");
  methodCards.forEach(card => {
    if (card.dataset.value === state.paymentMethod) card.classList.add("is-checked");
    card.addEventListener("click", () => {
      state.paymentMethod = card.dataset.value;
      methodCards.forEach(c => {
        c.classList.remove("is-checked");
        c.setAttribute("aria-pressed", "false");
      });
      card.classList.add("is-checked");
      card.setAttribute("aria-pressed", "true");
      clearFieldError("field-paymentMethod");
    });
  });

  note.classList.toggle("is-visible", isDeposit);
  section.hidden = false;
}

/* =============================================================================
   VALIDATION
   ========================================================================= */

function showFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  if (el) el.classList.add("has-error");
}
function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  if (el) el.classList.remove("has-error");
}

function validateForm() {
  let isValid = true;

  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const productName = document.getElementById("productName").value.trim();
  const city = document.getElementById("city").value.trim();
  const address = document.getElementById("address").value.trim();

  ["field-fullName", "field-phone", "field-productName", "field-city", "field-address", "field-payment", "field-paymentMethod"]
    .forEach(clearFieldError);

  if (fullName.length < 2) { showFieldError("field-fullName"); isValid = false; }

  const phoneDigits = phone.replace(/[^0-9]/g, "");
  if (phoneDigits.length < 8) { showFieldError("field-phone"); isValid = false; }

  if (productName.length < 2) { showFieldError("field-productName"); isValid = false; }

  if (city.length < 2) { showFieldError("field-city"); isValid = false; }

  if (address.length < 3) { showFieldError("field-address"); isValid = false; }

  if (!state.paymentMode) {
    showFieldError("field-payment");
    isValid = false;
  } else if (!state.paymentMethod) {
    showFieldError("field-paymentMethod");
    isValid = false;
  }

  return isValid;
}

/* =============================================================================
   MESSAGE WHATSAPP
   ========================================================================= */

function buildWhatsAppMessage() {
  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const productName = document.getElementById("productName").value.trim();
  const size = document.getElementById("size").value.trim();
  const color = document.getElementById("color").value.trim();
  const city = document.getElementById("city").value.trim();
  const address = document.getElementById("address").value.trim();
  const comment = document.getElementById("comment").value.trim();

  const unit = parseInt(document.getElementById("unitPrice").value, 10) || 0;
  const total = unit * state.quantity;

  const lines = [
    "🛒 NOUVELLE COMMANDE",
    "",
    "👤 Client",
    `Nom : ${fullName}`,
    `Téléphone : ${phone}`,
    "",
    "📦 Produit",
    `Nom : ${productName}`,
    `Quantité : ${state.quantity}`,
    `Taille : ${size || "—"}`,
    `Couleur : ${color || "—"}`,
    "",
    "💰 Montant",
    `Prix unitaire : ${formatPrice(unit)}`,
    `Total : ${formatPrice(total)}`,
    "",
    "🚚 Livraison",
    `Commune : ${city}`,
    `Adresse : ${address}`,
    "",
    `💳 Paiement`,
    `Mode : ${state.paymentMode}`,
    `Moyen : ${state.paymentMethod}`,
    "",
    `📝 Commentaire : ${comment || "—"}`
  ];

  return lines.join("\n");
}

function openWhatsApp() {
  const message = buildWhatsAppMessage();
  const url = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
}

/* =============================================================================
   SOUMISSION
   ========================================================================= */

function handleSubmit(triggerBtn) {
  if (!validateForm()) {
    showToast("Merci de compléter les champs obligatoires.");
    const firstError = document.querySelector(".field.has-error");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  triggerBtn.classList.add("is-loading");
  const label = document.getElementById("submitBtnLabel");
  const originalLabel = label ? label.textContent : null;
  if (label) label.textContent = "Ouverture de WhatsApp…";

  setTimeout(() => {
    openWhatsApp();
    triggerBtn.classList.remove("is-loading");
    if (label && originalLabel) label.textContent = originalLabel;
  }, 350);
}

/* =============================================================================
   TOAST
   ========================================================================= */

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

/* =============================================================================
   INITIALISATION
   ========================================================================= */

function init() {
  initUnitPrice();
  initQuantityControl();
  initPaymentCards();
  updateTotal();

  ["fullName", "phone", "productName", "city", "address"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
      clearFieldError(`field-${id}`);
    });
  });

  document.getElementById("submitBtn").addEventListener("click", function () {
    handleSubmit(this);
  });
  document.getElementById("submitBtnMobile").addEventListener("click", function () {
    handleSubmit(this);
  });

  document.getElementById("orderForm").addEventListener("submit", e => e.preventDefault());
}

document.addEventListener("DOMContentLoaded", init);
