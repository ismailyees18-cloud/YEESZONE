import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const $ = (id) => document.getElementById(id);

const configured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_PROJECT') &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes('YOUR_PUBLISHABLE');

const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let currentUser = null;
let allListings = [];
let adminVerified = false;

$('year').textContent = new Date().getFullYear();

function message(text, warning = false) {
  $('status').textContent = text;
  $('status').classList.toggle('warning', warning);
}

function updateAccountUI() {
  $('user-label').textContent = currentUser
    ? currentUser.email
    : 'Ba a shiga ba';

  $('auth-open').classList.toggle('hidden', !!currentUser);
  $('logout').classList.toggle('hidden', !currentUser);
}

function money(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? `₦${n.toLocaleString('en-NG')}`
    : 'Farashi bai bayyana ba';
}

function renderListings(items) {
  const root = $('listings');
  root.innerHTML = '';

  if (!items.length) {
    root.innerHTML = '<div class="panel"><strong>Ba a samu kaya ba tukuna.</strong><p>Da zarar an saka listings a database, za su bayyana a nan.</p></div>';
    return;
  }

  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'listing-card';

    const title = item.title || item.name || 'Listing';
    const description = item.description || 'Babu cikakken bayani tukuna.';
    const type = item.type || item.listing_type || 'Kaya / Sabis';

    card.innerHTML = '<span class="listing-type"></span><h3></h3><p></p><div class="price"></div>';

    card.querySelector('.listing-type').textContent =
      String(type).toUpperCase();

    card.querySelector('h3').textContent = title;
    card.querySelector('p').textContent = description;

    card.querySelector('.price').textContent =
      item.price == null
        ? 'A tuntubi mai sayarwa'
        : money(item.price);

    root.appendChild(card);
  }
}

async function loadListings() {
  if (!supabase) {
    message('A saka Project URL da Publishable key a config.js.', true);
    return;
  }

  message('Ana ɗauko kayayyaki...');

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .limit(30);

  if (error) {
    message(`Ba a iya ɗauko listings ba: ${error.message}`, true);
    return;
  }

  allListings = data || [];
  renderListings(allListings);
  message(`${allListings.length} listing(s) aka samu.`);
}

function showView(name) {
  for (const view of ['home', 'seller', 'admin']) {
    $(view + '-view').classList.toggle('hidden', view !== name);
  }

  document.querySelectorAll('.nav-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.view === name);
  });

  if (name === 'admin') {
    loadAdminDashboard();
  }
}

document.querySelectorAll('.nav-btn').forEach(button => {
  button.addEventListener('click', () => showView(button.dataset.view));
});

$('browse-btn').addEventListener('click', () => {
  $('listings-section').scrollIntoView({ behavior: 'smooth' });
});

$('seller-cta').addEventListener('click', () => showView('seller'));

$('search').addEventListener('input', event => {
  const q = event.target.value.toLowerCase();

  renderListings(allListings.filter(item =>
    [item.title, item.name, item.description, item.type, item.listing_type]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  ));
});

$('auth-open').addEventListener('click', () => {
  $('auth-message').textContent = '';
  $('auth-dialog').showModal();
});

$('login-btn').addEventListener('click', async () => {
  if (!supabase) {
    $('auth-message').textContent =
      'Ba a haɗa database ba. Duba config.js.';
    return;
  }

  const email = $('email').value.trim();
  const password = $('password').value;

  if (!email || !password) {
    $('auth-message').textContent =
      'Shigar da email da password.';
    return;
  }

  $('login-btn').disabled = true;
  $('auth-message').textContent = 'Ana shiga...';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      $('auth-message').textContent = error.message;
      return;
    }

    currentUser = data.user;
    updateAccountUI();
    $('auth-dialog').close();
    $('auth-form').reset();

  } catch (error) {
    $('auth-message').textContent = error.message;
  } finally {
    $('login-btn').disabled = false;
  }
});

$('signup-btn').addEventListener('click', async () => {
  if (!supabase) {
    $('auth-message').textContent =
      'Ba a haɗa database ba. Duba config.js.';
    return;
  }

  const email = $('email').value.trim();
  const password = $('password').value;

  if (!email || !password || password.length < 6) {
    $('auth-message').textContent =
      'Shigar da email da password mai aƙalla haruffa 6.';
    return;
  }

  $('signup-btn').disabled = true;
  $('auth-message').textContent = 'Ana ƙirƙirar account...';

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    $('auth-message').textContent = error
      ? error.message
      : 'An aika buƙatar ƙirƙirar account. Duba email idan an nemi tabbatarwa.';

  } catch (error) {
    $('auth-message').textContent = error.message;
  } finally {
    $('signup-btn').disabled = false;
  }
});

$('logout').addEventListener('click', async () => {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();

  if (error) {
    message(error.message, true);
    return;
  }

  currentUser = null;
  adminVerified = false;
  updateAccountUI();
  showView('home');
});

async function refreshSession() {
  if (!supabase) {
    $('user-label').textContent = 'Ba a haɗa database ba';
    return;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    message(error.message, true);
    return;
  }

  currentUser = data.session?.user || null;
  updateAccountUI();
}

/* SHOP REGISTRATION */

function makeShopSlug(name) {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'shop';

  const suffix = Math.random().toString(36).slice(2, 8);

  return `${base}-${suffix}`;
}

function shopStatusText(status) {
  if (status === 'approved') {
    return 'An amince da shagonka.';
  }

  if (status === 'suspended') {
    return 'An dakatar da shagonka. Tuntuɓi masu gudanarwa.';
  }

  return 'An riga an aika buƙatar shagonka. Ana jiran amincewa.';
}

$('shop-form').addEventListener('submit', async event => {
  event.preventDefault();

  const shopMessage = $('shop-message');
  const submitButton = $('shop-submit');

  shopMessage.textContent = '';

  if (!supabase) {
    shopMessage.textContent =
      'Ba a haɗa database ba. Duba config.js.';
    return;
  }

  if (!currentUser) {
    shopMessage.textContent =
      'Da farko ka shiga account ɗinka kafin buɗe shago.';
    return;
  }

  const name = $('shop-name').value.trim();
  const description = $('shop-description').value.trim();

  if (name.length < 2) {
    shopMessage.textContent =
      'Sunan shago ya zama aƙalla haruffa biyu.';
    return;
  }

  if (!description) {
    shopMessage.textContent =
      'Ka rubuta bayanin shagonka.';
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Ana aika buƙata...';

  try {
    const { data: existingShop, error: checkError } = await supabase
      .from('shops')
      .select('id, name, status')
      .eq('owner_id', currentUser.id)
      .limit(1)
      .maybeSingle();

    if (checkError) {
      throw new Error(
        'Ba a iya duba bayanan shago ba: ' + checkError.message
      );
    }

    if (existingShop) {
      shopMessage.textContent =
        `${shopStatusText(existingShop.status)} Sunan shago: ${existingShop.name}`;

      return;
    }

    const { error: insertError } = await supabase
      .from('shops')
      .insert({
        owner_id: currentUser.id,
        name,
        slug: makeShopSlug(name),
        description
      });

    if (insertError) {
      throw insertError;
    }

    shopMessage.textContent =
      'An aika buƙatar buɗe shago cikin nasara! Ana jiran amincewar masu gudanarwa.';

    $('shop-form').reset();

  } catch (error) {
    shopMessage.textContent =
      'An samu matsala: ' + error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Miƙa buƙatar buɗe shago';
  }
});

/* ADMIN DASHBOARD */

function setAdminMessage(text, warning = false) {
  const status = $('admin-status');
  status.textContent = text;
  status.classList.toggle('warning', warning);
}

function makeShopCard(shop) {
  const card = document.createElement('article');
  card.className = 'listing-card';

  const title = document.createElement('h3');
  title.textContent = shop.name;

  const description = document.createElement('p');
  description.textContent = shop.description || 'Babu bayanin shago.';

  const status = document.createElement('p');
  status.textContent = `Matsayi: ${shop.status}`;

  const date = document.createElement('small');
  date.textContent = shop.created_at
    ? `An ƙirƙira: ${new Date(shop.created_at).toLocaleDateString('ha-NG')}`
    : '';

  const actions = document.createElement('div');
  actions.className = 'hero-actions';

  if (shop.status === 'pending' || shop.status === 'suspended') {
    const approveButton = document.createElement('button');
    approveButton.className = 'btn btn-primary';
    approveButton.textContent = 'Amince da shago';
    approveButton.addEventListener('click', () => {
      changeShopStatus(shop.id, 'approved', approveButton);
    });
    actions.appendChild(approveButton);
  }

  if (shop.status === 'approved') {
    const suspendButton = document.createElement('button');
    suspendButton.className = 'btn btn-outline';
    suspendButton.textContent = 'Dakatar da shago';
    suspendButton.addEventListener('click', () => {
      changeShopStatus(shop.id, 'suspended', suspendButton);
    });
    actions.appendChild(suspendButton);
  }

  card.append(title, description, status, date, actions);

  return card;
}

function renderShopGroup(elementId, shops, emptyMessage) {
  const root = $(elementId);
  root.replaceChildren();

  if (!shops.length) {
    const note = document.createElement('p');
    note.textContent = emptyMessage;
    root.appendChild(note);
    return;
  }

  shops.forEach(shop => {
    root.appendChild(makeShopCard(shop));
  });
}

async function loadAdminDashboard() {
  adminVerified = false;

  if (!supabase) {
    setAdminMessage('Ba a haɗa database ba. Duba config.js.', true);
    return;
  }

  if (!currentUser) {
    setAdminMessage('Da farko ka shiga account ɗinka.', true);
    return;
  }

  setAdminMessage('Ana tabbatar da izinin Admin...');

  try {
    const { data: isAdmin, error: permissionError } = await supabase
      .rpc('is_yeeszone_admin');

    if (permissionError) {
      throw permissionError;
    }

    if (isAdmin !== true) {
      setAdminMessage(
        'Ba ka da izinin shiga Admin Dashboard.', true
      );

      renderShopGroup('admin-pending', [], 'Ba a nuna bayanai ba.');
      renderShopGroup('admin-approved', [], 'Ba a nuna bayanai ba.');
      renderShopGroup('admin-suspended', [], 'Ba a nuna bayanai ba.');
      return;
    }

    adminVerified = true;
    setAdminMessage('An tabbatar da izinin Admin. Ana ɗauko shaguna...');

    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, owner_id, name, description, status, created_at')
      .order('created_at', { ascending: false });

    if (shopsError) {
      throw shopsError;
    }

    const allShops = shops || [];

    renderShopGroup(
      'admin-pending',
      allShops.filter(shop => shop.status === 'pending'),
      'Babu buƙatar shago da ke jira a yanzu.'
    );

    renderShopGroup(
      'admin-approved',
      allShops.filter(shop => shop.status === 'approved'),
      'Babu shagon da aka amince da shi tukuna.'
    );

    renderShopGroup(
      'admin-suspended',
      allShops.filter(shop => shop.status === 'suspended'),
      'Babu shagon da aka dakatar.'
    );

    setAdminMessage(`An loda shaguna ${allShops.length} cikin nasara.`);

  } catch (error) {
    adminVerified = false;
    setAdminMessage('An samu matsala: ' + error.message, true);
  }
}

async function changeShopStatus(shopId, newStatus, button) {
  if (!supabase || !currentUser || !adminVerified) {
    setAdminMessage('Ba ka da izinin yin wannan aiki.', true);
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Ana aiki...';

  try {
    const { error } = await supabase.rpc('admin_set_shop_status', {
      p_shop_id: shopId,
      p_status: newStatus
    });

    if (error) {
      throw error;
    }

    setAdminMessage(
      newStatus === 'approved'
        ? 'An amince da shagon cikin nasara.'
        : 'An dakatar da shagon cikin nasara.'
    );

    await loadAdminDashboard();

  } catch (error) {
    setAdminMessage('Ba a kammala aikin ba: ' + error.message, true);
    button.disabled = false;
    button.textContent = originalText;
  }
}

$('admin-refresh').addEventListener('click', () => {
  loadAdminDashboard();
});

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    adminVerified = false;
    updateAccountUI();
  });
}

await refreshSession();
await loadListings();
      
