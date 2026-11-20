import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentShop = null;
let adminVerified = false;
let currentView = "home";

const $ = (id) => document.getElementById(id);

function message(id, text, isError = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#b42318" : "#16803c";
}

function makeElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function safeImageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Ba a saka farashi ba";
  return "₦" + number.toLocaleString("en-NG");
}

function makeSlug(value) {
  return value.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + "-" + Date.now().toString().slice(-6);
}

// NAVIGATION

function showView(view) {
  currentView = view;

  ["home", "seller", "admin"].forEach((name) => {
    const section = $(`${name}-view`);

    if (section) {
      section.classList.toggle("hidden", name !== view);
      section.hidden = name !== view;
    }
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  if (view === "home") loadListings();
  if (view === "seller") loadSellerDashboard();
  if (view === "admin") loadAdminDashboard();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

$("browse-btn")?.addEventListener("click", () => {
  showView("home");
  $("listings-section")?.scrollIntoView({ behavior: "smooth" });
});

$("seller-cta")?.addEventListener("click", () => showView("seller"));

// AUTHENTICATION

function setUserUI() {
  const label = $("user-label");
  if (label) label.textContent = currentUser ? currentUser.email : "Ba a shiga ba";

  const logout = $("logout");
  if (logout) {
    logout.hidden = !currentUser;
    logout.classList.toggle("hidden", !currentUser);
  }

  const authOpen = $("auth-open");
  if (authOpen) {
    authOpen.hidden = !!currentUser;
    authOpen.classList.toggle("hidden", !!currentUser);
  }
}

function openAuthDialog() {
  const dialog = $("auth-dialog");
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeAuthDialog() {
  const dialog = $("auth-dialog");
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function requireLogin() {
  if (currentUser) return true;
  message("auth-message", "Da fatan za ka fara shiga account ɗinka.", true);
  openAuthDialog();
  return false;
}

$("auth-open")?.addEventListener("click", openAuthDialog);

$("login-btn")?.addEventListener("click", async () => {
  const email = $("email")?.value.trim();
  const password = $("password")?.value;

  if (!email || !password) {
    message("auth-message", "Ka cika email da password.", true);
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    message("auth-message", error.message, true);
    return;
  }

  currentUser = data.user;
  setUserUI();
  closeAuthDialog();
  await refreshAfterLogin();
});

$("signup-btn")?.addEventListener("click", async () => {
  const email = $("email")?.value.trim();
  const password = $("password")?.value;

  if (!email || !password) {
    message("auth-message", "Ka cika email da password.", true);
    return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    message("auth-message", error.message, true);
    return;
  }

  if (data.session && data.user) {
    currentUser = data.user;
    setUserUI();
    closeAuthDialog();
    await refreshAfterLogin();
  } else {
    message("auth-message", "An aika buƙatar ƙirƙirar account. Duba email idan an nemi tabbatarwa.");
  }
});

$("logout")?.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) return alert(error.message);

  currentUser = null;
  currentShop = null;
  adminVerified = false;
  setUserUI();
  showView("home");
});

async function refreshAfterLogin() {
  setUserUI();
  await loadListings();
  if (currentView === "seller") await loadSellerDashboard();
  if (currentView === "admin") await loadAdminDashboard();
}

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user ?? null;
  setUserUI();

  Promise.resolve().then(async () => {
    if (!currentUser) {
      currentShop = null;
      adminVerified = false;
      if (currentView !== "home") showView("home");
      return;
    }
    await refreshAfterLogin();
  });
});

// MARKETPLACE

async function loadListings() {
  const container = $("listings");
  if (!container) return;

  container.replaceChildren();
  message("status", "Ana loda kayayyaki...");

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    message("status", "An samu matsala: " + error.message, true);
    return;
  }

  renderMarketplace(data || []);
}

function renderMarketplace(items) {
  const container = $("listings");
  if (!container) return;

  container.replaceChildren();

  if (!items.length) {
    message("status", "Babu kayayyakin da aka amince da su tukuna.");
    return;
  }

  message("status", `${items.length} kayayyaki sun bayyana.`);

  items.forEach((item) => {
    const card = makeElement("article", "listing-card");

    const imageUrl = safeImageUrl(item.image_url);
    if (imageUrl) {
      const image = makeElement("img", "listing-image");
      image.src = imageUrl;
      image.alt = item.title || "Kayan sayarwa";
      image.loading = "lazy";
      card.append(image);
    }

    card.append(makeElement("h3", "", item.title || "Kayan sayarwa"));
    card.append(makeElement("p", "", item.description || ""));
    card.append(makeElement("strong", "", formatPrice(item.price)));
    container.append(card);
  });
}

$("search")?.addEventListener("input", () => {
  const term = $("search").value.trim().toLowerCase();

  document.querySelectorAll("#listings .listing-card").forEach((card) => {
    card.hidden = !card.textContent.toLowerCase().includes(term);
  });
});

// SHOP REGISTRATION

$("shop-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireLogin()) return;

  const name = $("shop-name")?.value.trim();
  const description = $("shop-description")?.value.trim() || "";

  if (!name) {
    message("shop-message", "Ka saka sunan shago.", true);
    return;
  }

  const { data: existing, error: checkError } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", currentUser.id)
    .limit(1);

  if (checkError) {
    message("shop-message", checkError.message, true);
    return;
  }

  if (existing?.length) {
    message("shop-message", "Kana da shago a baya. Duba matsayin shagonka.");
    await loadSellerDashboard();
    return;
  }

  const { error } = await supabase.from("shops").insert({
    owner_id: currentUser.id,
    name,
    slug: makeSlug(name),
    description
  });

  if (error) {
    message("shop-message", error.message, true);
    return;
  }

  $("shop-form").reset();
  message("shop-message", "An aika buƙatar buɗe shago cikin nasara! Ana jiran amincewar Admin.");
  await loadSellerDashboard();
});

// SELLER DASHBOARD

function setListingFormEnabled(enabled) {
  const form = $("listing-form");
  if (!form) return;

  form.querySelectorAll("input, textarea, select, button").forEach((field) => {
    field.disabled = !enabled;
  });
}

async function loadSellerDashboard() {
  if (!currentUser) {
    currentShop = null;
    message("seller-status", "Sai ka shiga account kafin amfani da Seller Dashboard.", true);
    setListingFormEnabled(false);
    return;
  }

  message("seller-status", "Ana duba matsayin shagonka...");

  const { data: shops, error } = await supabase
    .from("shops")
    .select("id, name, status")
    .eq("owner_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    message("seller-status", error.message, true);
    setListingFormEnabled(false);
    return;
  }

  currentShop = shops?.[0] || null;

  if (!currentShop) {
    message("seller-status", "Ba ka da shago tukuna. Cika fom ɗin buɗe shago.");
    setListingFormEnabled(false);
    renderSellerListings([]);
    return;
  }

  if (currentShop.status === "approved") {
    message("seller-status", `An amince da shagon "${currentShop.name}". Za ka iya saka kaya.`);
    message("listing-form-notice", "Sabon kaya zai jira amincewar Admin.");
    setListingFormEnabled(true);
    await loadSellerListings();
    return;
  }

  if (currentShop.status === "suspended") {
    message("seller-status", "An dakatar da shagonka. Tuntuɓi Admin.", true);
  } else {
    message("seller-status", "Ana jiran Admin ya amince da shagonka.");
  }

  message("listing-form-notice", "Ba za ka iya saka kaya ba sai an amince da shagonka.", true);
  setListingFormEnabled(false);
  await loadSellerListings();
}

$("seller-refresh")?.addEventListener("click", loadSellerDashboard);

// ADD LISTING

$("listing-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!requireLogin()) return;

  if (!currentShop || currentShop.status !== "approved") {
    message("listing-message", "Sai an amince da shagonka kafin ka saka kaya.", true);
    return;
  }

  const title = $("listing-title")?.value.trim();
  const description = $("listing-description")?.value.trim();
  const listing_type = $("listing-type")?.value || "product";
  const price = Number($("listing-price")?.value);
  const stock = Number($("listing-stock")?.value || 0);
  const image_url = $("listing-image")?.value.trim() || "";

  if (!title || !description || !Number.isFinite(price) || price < 0) {
    message("listing-message", "Ka duba sunan kaya, bayani da farashi.", true);
    return;
  }

  if (!Number.isInteger(stock) || stock < 0) {
    message("listing-message", "Adadin kaya bai dace ba.", true);
    return;
  }

  if (image_url && !safeImageUrl(image_url)) {
    message("listing-message", "Link ɗin hoton dole ya kasance HTTP ko HTTPS.", true);
    return;
  }

  const { error } = await supabase.from("listings").insert({
    shop_id: currentShop.id,
    title,
    description,
    listing_type,
    price,
    stock,
    image_url
  });

  if (error) {
    message("listing-message", "Ba a iya saka kayan ba: " + error.message, true);
    return;
  }

  $("listing-form").reset();
  message("listing-message", "An aika kayan cikin nasara. Yana jiran amincewar Admin.");
  await loadSellerListings();
});

// SELLER'S LISTINGS

async function loadSellerListings() {
  if (!currentShop) {
    renderSellerListings([]);
    return;
  }

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("shop_id", currentShop.id)
    .order("created_at", { ascending: false });

  if (error) {
    message("seller-status", error.message, true);
    return;
  }

  renderSellerListings(data || []);
}

function renderSellerListings(items) {
  const container = $("seller-listings");
  if (!container) return;

  container.replaceChildren();

  if (!items.length) {
    container.append(makeElement("p", "", "Ba ka saka kaya ba tukuna."));
    return;
  }

  items.forEach((item) => {
    const card = makeElement("article", "listing-card");
    card.append(makeElement("h3", "", item.title || "Kaya"));
    card.append(makeElement("p", "", item.description || ""));
    card.append(makeElement("p", "", "Farashi: " + formatPrice(item.price)));
    card.append(makeElement("p", "", "Adadi: " + item.stock));
    card.append(makeElement("p", "", "Matsayi: " + item.status));

    const edit = makeElement("button", "", "Gyara");
    edit.type = "button";
    edit.addEventListener("click", () => editListing(item));
    card.append(edit);

    const remove = makeElement("button", "", "Goge");
    remove.type = "button";
    remove.addEventListener("click", () => deleteListing(item));
    card.append(remove);

    container.append(card);
  });
}

async function editListing(item) {
  const title = prompt("Sunan kaya:", item.title || "");
  if (title === null) return;

  const description = prompt("Bayanin kaya:", item.description || "");
  if (description === null) return;

  const priceText = prompt("Farashi:", String(item.price ?? ""));
  if (priceText === null) return;

  const stockText = prompt("Adadin kaya:", String(item.stock ?? 0));
  if (stockText === null) return;

  const image_url = prompt("Link ɗin hoton kaya:", item.image_url || "");
  if (image_url === null) return;

  const price = Number(priceText);
  const stock = Number(stockText);

  if (!title.trim() || !description.trim() || !Number.isFinite(price) ||
      price < 0 || !Number.isInteger(stock) || stock < 0) {
    alert("Ka duba bayanan da ka shigar.");
    return;
  }

  if (image_url.trim() && !safeImageUrl(image_url.trim())) {
    alert("Link ɗin hoton bai dace ba.");
    return;
  }

  const { error } = await supabase
    .from("listings")
    .update({
      title: title.trim(),
      description: description.trim(),
      price,
      stock,
      image_url: image_url.trim(),
      updated_at: new Date().toISOString()
    })
    .eq("id", item.id);

  if (error) {
    alert("An kasa gyara kaya: " + error.message);
    return;
  }

  alert("An gyara bayanan kayan.");
  await loadSellerListings();
}

async function deleteListing(item) {
  if (!confirm(`Kana son goge "${item.title}"?`)) return;

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", item.id);

  if (error) {
    alert("An kasa goge kaya: " + error.message);
    return;
  }

  await loadSellerListings();
}

// ADMIN DASHBOARD

async function checkAdmin() {
  if (!currentUser) return false;

  const { data, error } = await supabase.rpc("is_yeeszone_admin");
  if (error) {
    console.error(error.message);
    return false;
  }

  return data === true;
}

async function loadAdminDashboard() {
  if (!currentUser) {
    adminVerified = false;
    message("admin-status", "Sai ka shiga account na Admin.", true);
    return;
  }

  message("admin-status", "Ana tabbatar da izinin Admin...");
  adminVerified = await checkAdmin();

  if (!adminVerified) {
    message("admin-status", "Ba ka da izinin shiga wannan shafin.", true);
    ["admin-pending", "admin-approved", "admin-suspended", "admin-listing-pending"]
      .forEach((id) => $(id)?.replaceChildren());
    return;
  }

  message("admin-status", "An tabbatar da izinin Admin.");
  await loadAdminShops();
  await loadPendingListings();
}

$("admin-refresh")?.addEventListener("click", loadAdminDashboard);

async function loadAdminShops() {
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    message("admin-status", "An kasa loda shaguna: " + error.message, true);
    return;
  }

  const groups = {
    pending: $("admin-pending"),
    approved: $("admin-approved"),
    suspended: $("admin-suspended")
  };

  Object.values(groups).forEach((container) => container?.replaceChildren());

  (data || []).forEach((shop) => {
    const container = groups[shop.status];
    if (!container) return;

    const card = makeElement("article", "admin-shop-card");
    card.append(makeElement("h3", "", shop.name || "Shago"));
    card.append(makeElement("p", "", shop.description || ""));
    card.append(makeElement("small", "", "Matsayi: " + shop.status));

    if (shop.status !== "approved") {
      const approve = makeElement("button", "", "Amince da shago");
      approve.type = "button";
      approve.addEventListener("click", () => changeShopStatus(shop.id, "approved"));
      card.append(approve);
    }

    if (shop.status !== "suspended") {
      const suspend = makeElement("button", "", "Dakatar da shago");
      suspend.type = "button";
      suspend.addEventListener("click", () => changeShopStatus(shop.id, "suspended"));
      card.append(suspend);
    }

    if (shop.status !== "pending") {
      const pending = makeElement("button", "", "Mayar zuwa jiran amincewa");
      pending.type = "button";
      pending.addEventListener("click", () => changeShopStatus(shop.id, "pending"));
      card.append(pending);
    }

    container?.append(card);
  });
}

async function changeShopStatus(shopId, newStatus) {
  if (!adminVerified) return;

  const { error } = await supabase.rpc("admin_set_shop_status", {
    p_shop_id: shopId,
    p_status: newStatus
  });

  if (error) {
    message("admin-status", "An kasa canza matsayin shago: " + error.message, true);
    return;
  }

  message("admin-status", "An canza matsayin shago cikin nasara.");
  await loadAdminShops();
}

// ADMIN APPROVES LISTINGS

async function loadPendingListings() {
  const container = $("admin-listing-pending");
  if (!container || !adminVerified) return;

  container.replaceChildren();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) {
    container.append(makeElement("p", "", "An kasa loda kayayyaki: " + error.message));
    return;
  }

  if (!data?.length) {
    container.append(makeElement("p", "", "Babu sabon kaya da ke jiran amincewa."));
    return;
  }

  data.forEach((item) => {
    const card = makeElement("article", "admin-listing-card");
    card.append(makeElement("h3", "", item.title || "Kaya"));
    card.append(makeElement("p", "", item.description || ""));
    card.append(makeElement("p", "", "Farashi: " + formatPrice(item.price)));
    card.append(makeElement("p", "", "Adadi: " + item.stock));

    const approve = makeElement("button", "", "Amince da kaya");
    approve.type = "button";
    approve.addEventListener("click", () => approveListing(item.id));
    card.append(approve);

    container.append(card);
  });
}

async function approveListing(listingId) {
  if (!adminVerified) return;
  if (!confirm("Ka tabbatar kana son amincewa da wannan kaya?")) return;

  const { error } = await supabase.rpc("admin_approve_listing", {
    p_listing_id: listingId
  });

  if (error) {
    message("admin-status", "An kasa amincewa da kaya: " + error.message, true);
    return;
  }

  message("admin-status", "An amince da kaya cikin nasara.");
  await loadPendingListings();
  await loadListings();
}

// START

async function startApp() {
  const { data, error } = await supabase.auth.getSession();

  if (error) console.error(error.message);

  currentUser = data?.session?.user ?? null;
  setUserUI();
  await loadListings();
}

startApp();
