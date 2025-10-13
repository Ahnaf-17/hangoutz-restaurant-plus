// === CONFIG ===
// Default to your Vercel API (you can override via localStorage.setItem('API_BASE', 'https://...'))
const DEFAULT_API_BASE = 'https://hangoutz-restaurant-plus.vercel.app';
let API_BASE = (localStorage.getItem('API_BASE') || DEFAULT_API_BASE).replace(/\/+$/, '');

// Build safe URLs without accidental double slashes
const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

// Safe JSON parsing so empty bodies don't crash the app
async function safeJson(res) {
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

// Unified fetch wrapper: adds headers, parses JSON, throws on !ok
async function api(path, { method = 'GET', headers = {}, body, auth = false } = {}) {
  const finalHeaders = { ...headers };
  if (!(body instanceof FormData)) finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  if (auth && TOKEN) finalHeaders['Authorization'] = `Bearer ${TOKEN}`;

  const res = await fetch(apiUrl(path), {
    method,
    headers: finalHeaders,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    // credentials: 'include', // ONLY if your API uses cookies; you're using bearer tokens so keep this commented
  });

  const data = await safeJson(res);
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// === STATE ===
let TOKEN = localStorage.getItem('TOKEN') || null;
let CART = []; // {itemId,name,qty,price}
let CURRENT_USER = null;

// === Helpers ===
const setToken = (t) => { TOKEN = t; localStorage.setItem('TOKEN', t); };
const notify = (msg) => alert(msg);

// Fetch current user (and cache)
async function fetchMe() {
  if (!TOKEN) return null;
  try {
    const me = await api('/api/users/me', { auth: true });
    CURRENT_USER = me;
    return me;
  } catch {
    return null;
  }
}

// Toggle Admin button based on role
async function toggleAdminBtn() {
  const me = await fetchMe();
  if (me && (me.role === 'admin' || me.role === 'staff')) {
    $('#adminBtn').show();
  } else {
    $('#adminBtn').hide();
  }
}

// === Auth Flows ===
$(document).on('pageinit', '#loginPage', function () {
  $('#loginForm').on('submit', async function (e) {
    e.preventDefault();
    const email = $('#email').val().trim();
    const password = $('#password').val();
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      // Expecting { token, user }
      if (!data?.token) throw new Error('Login failed (no token)');

      setToken(data.token);
      // keep a couple fallbacks around
      if (data.user) {
        sessionStorage.setItem('userName', data.user.name || '');
        sessionStorage.setItem('userEmail', data.user.email || '');
      }
      await toggleAdminBtn();
      $.mobile.changePage('#homePage');
    } catch (err) {
      notify(err.message);
    }
  });

  $('#logoutBtn').on('click', function () {
    localStorage.removeItem('TOKEN');
    TOKEN = null;
    CART = [];
    CURRENT_USER = null;
    $('#adminBtn').hide();
  });
});

$(document).on('pageinit', '#signupPage', function () {
  $('#signupForm').on('submit', async function (e) {
    e.preventDefault();
    const name = $('#sname').val().trim();
    const email = $('#semail').val().trim();
    const password = $('#spassword').val();
    try {
      const data = await api('/api/auth/signup', {
        method: 'POST',
        body: { name, email, password }
      });

      if (!data?.token) throw new Error('Signup failed (no token)');

      setToken(data.token);
      if (data.user) {
        sessionStorage.setItem('userName', data.user.name || '');
        sessionStorage.setItem('userEmail', data.user.email || '');
      }
      await toggleAdminBtn();
      $.mobile.changePage('#homePage');
    } catch (err) {
      notify(err.message);
    }
  });
});

// Keep Admin button state fresh whenever Home is shown
$(document).on('pageshow', '#homePage', async function () {
  await toggleAdminBtn();
});

// === Menu ===
$(document).on('pageshow', '#menuPage', async function () {
  try {
    const items = await api('/api/menu');
    const $list = $('#menuList').empty();
    items.forEach((it) => {
      const li = $(`
        <li>
          <a href="#">
            <h2>${it.name}</h2>
            <p>${it.description || ''}</p>
            <span class="price">$${Number(it.price).toFixed(2)}</span>
          </a>
        </li>
      `);
      li.on('click', function () {
        const existing = CART.find((x) => x.itemId === it._id);
        if (existing) {
          existing.qty += 1;
        } else {
          CART.push({ itemId: it._id, name: it.name, qty: 1, price: it.price });
        }
        notify(`Added ${it.name}`);
      });
      $list.append(li);
    });
    $list.listview().listview('refresh');
  } catch (e) {
    notify('Failed to load menu');
  }
});

$('#placeOrderBtn').on('click', async function () {
  if (!TOKEN) return notify('Please login first.');
  if (!CART.length) return notify('Cart is empty.');
  try {
    await api('/api/orders', {
      method: 'POST',
      auth: true,
      body: { items: CART }
    });
    CART = [];
    notify('Order placed!');
  } catch (e) {
    notify(e.message);
  }
});

// === Bookings ===
$(document).on('pageshow', '#bookingPage', async function () {
  if (!TOKEN) return notify('Please login first.');
  await loadBookings();
});

async function loadBookings() {
  try {
    const list = await api('/api/bookings/my', { auth: true });
    const $list = $('#bookingList').empty();

    const fallbackName  = sessionStorage.getItem('userName')  || '—';
    const fallbackEmail = sessionStorage.getItem('userEmail') || '—';

    if (!Array.isArray(list) || list.length === 0) {
      $list.append('<li>No bookings yet.</li>').listview().listview('refresh');
      return;
    }

    list.forEach((b) => {
      const userName  = (b.user && b.user.name)  || b.customerName  || fallbackName;
      const userEmail = (b.user && b.user.email) || b.customerEmail || fallbackEmail;

      const li = $(`
        <li>
          <h2>${b.date} ${b.time} • ${b.partySize} ${b.partySize == 1 ? 'person' : 'people'}</h2>
          <p><strong>Customer:</strong> ${userName} &lt;${userEmail}&gt;</p>
          <p>${b.status || 'pending'}</p>
          ${b.notes ? `<p><em>${b.notes}</em></p>` : ''}
        </li>
      `);
      $list.append(li);
    });

    $list.listview().listview('refresh');
  } catch (e) {
    console.error(e);
    notify('Failed to load bookings');
  }
}

$('#bookingForm').on('submit', async function (e) {
  e.preventDefault();
  const partySize = parseInt($('#partySize').val(), 10);
  const date = $('#bdate').val().trim();
  const time = $('#btime').val().trim();
  const notes = $('#bnotes').val().trim();
  try {
    await api('/api/bookings', {
      method: 'POST',
      auth: true,
      body: { partySize, date, time, notes }
    });
    notify('Booking created.');
    await loadBookings();
  } catch (e) {
    notify(e.message);
  }
});

// === Orders List (customer) ===
$(document).on('pageshow', '#ordersPage', async function () {
  if (!TOKEN) return notify('Please login first.');

  try {
    const list = await api('/api/orders/my', { auth: true });
    const $list = $('#ordersList').empty();

    const fallbackName  = sessionStorage.getItem('userName')  || '—';
    const fallbackEmail = sessionStorage.getItem('userEmail') || '—';

    list.forEach((o) => {
      const itemsText = (o.items || []).map(i => `${i.qty}× ${i.name}`).join(', ') || '(no items)';
      const canDelete = (o.status === 'completed' || o.status === 'cancelled');

      const userName  = (o.user && o.user.name) || o.customerName  || fallbackName;
      const userEmail = (o.user && o.user.email) || o.customerEmail || fallbackEmail;

      const li = $(`
        <li data-id="${o._id}">
          <a href="#">
            <h2>Order ${o._id}</h2>
            <p><strong>Customer:</strong> ${userName} &lt; ${ userEmail } &gt;</p>
            <p><strong>Items:</strong> ${itemsText}</p>
            <p>Status: ${o.status} — Total: $${Number(o.total || 0).toFixed(2)}</p>
          </a>
          ${canDelete ? '<a href="#" class="deleteOrderBtn">Delete</a>' : ''}
        </li>
      `);

      $list.append(li);
    });

    $list.listview({ splitIcon: 'delete', splitTheme: 'b' }).listview('refresh');
  } catch (e) {
    console.error(e);
    notify('Failed to load orders');
  }
});

// Delete order (only for completed/cancelled — server enforces it)
$(document).on('click', '.deleteOrderBtn', async function (e) {
  e.preventDefault();
  const id = $(this).closest('li').data('id');
  if (!confirm('Delete this order? This cannot be undone.')) return;

  try {
    await api(`/api/orders/${id}`, { method: 'DELETE', auth: true });
    notify('Order deleted');

    const list = await api('/api/orders/my', { auth: true });
    const $list = $('#ordersList').empty();
    list.forEach((o) => {
      const itemsText = (o.items || []).map(i => `${i.qty}× ${i.name}`).join(', ') || '(no items)';
      const canDelete = (o.status === 'completed' || o.status === 'cancelled');
      const li = $(`
        <li data-id="${o._id}">
          <a href="#">
            <h2>Order ${o._id}</h2>
            <p><strong>Items:</strong> ${itemsText}</p>
            <p>Status: ${o.status} — Total: $${Number(o.total).toFixed(2)}</p>
          </a>
          ${canDelete ? '<a href="#" class="deleteOrderBtn">Delete</a>' : ''}
        </li>
      `);
      $list.append(li);
    });
    $('#ordersList').listview({ splitIcon: 'delete', splitTheme: 'b' }).listview('refresh');
  } catch (err) {
    notify(err.message);
  }
});

// === Profile ===
$(document).on('pageshow', '#profilePage', async function () {
  if (!TOKEN) return notify('Please login first.');
  try {
    const me = await api('/api/users/me', { auth: true });
    $('#profileBox').html(
      `<p><strong>Name:</strong> ${me.name}</p>
       <p><strong>Email:</strong> ${me.email}</p>
       <p><strong>Role:</strong> ${me.role}</p>`
    );
  } catch (e) {
    notify('Failed to load profile');
  }
});

// ======== ADMIN FEATURES ========

// Admin page guard + loaders
$(document).on('pageshow', '#adminPage', async function () {
  if (!TOKEN) {
    notify('Please login');
    return $.mobile.changePage('#loginPage');
  }
  const me = await fetchMe();
  if (!me || !['admin', 'staff'].includes(me.role)) {
    notify('Forbidden: admin/staff only');
    return $.mobile.changePage('#homePage');
  }
  await adminLoadMenu();
  await adminLoadOrders();
  await adminLoadBookings();
});

// Create menu item (Admin)
$('#adminCreateMenuForm').on('submit', async function (e) {
  e.preventDefault();
  const body = {
    name: $('#mName').val().trim(),
    price: parseFloat($('#mPrice').val()),
    category: $('#mCategory').val().trim() || 'General',
    description: $('#mDesc').val().trim(),
    available: $('#mAvail').is(':checked'),
  };
  try {
    await api('/api/menu', { method: 'POST', auth: true, body });
    // clear form
    $('#mName').val('');
    $('#mPrice').val('');
    $('#mCategory').val('General');
    $('#mDesc').val('');
    $('#mAvail').prop('checked', true);
    await adminLoadMenu();
    notify('Item created');
  } catch (e) {
    notify(e.message);
  }
});

// Load all menu items (Admin)
async function adminLoadMenu() {
  try {
    const items = await api('/api/menu');
    const $list = $('#adminMenuList').empty();
    items.forEach((it) => {
      const li = $(`
        <li data-id="${it._id}">
          <a href="#">
            <h2>${it.name} <span style="float:right">$${Number(it.price).toFixed(2)}</span></h2>
            <p>${it.category} • ${it.available ? 'Available' : 'Unavailable'}</p>
            <p>${it.description || ''}</p>
          </a>
          <a href="#" class="editMenuBtn">Edit</a>
          <a href="#" class="deleteMenuBtn">Delete</a>
        </li>
      `);
      $list.append(li);
    });
    $list.listview({ splitIcon: 'gear', splitTheme: 'b' }).listview('refresh');
  } catch {
    notify('Failed to load admin menu');
  }
}

// Edit / Delete (delegated)
$(document).on('click', '.editMenuBtn', async function (e) {
  e.preventDefault();
  const id = $(this).closest('li').data('id');
  const newPrice = prompt('New price?');
  if (newPrice === null) return;
  const body = { price: parseFloat(newPrice) };
  try {
    await api(`/api/menu/${id}`, { method: 'PUT', auth: true, body });
    await adminLoadMenu();
    notify('Updated');
  } catch (err) {
    notify(err.message);
  }
});

$(document).on('click', '.deleteMenuBtn', async function (e) {
  e.preventDefault();
  const id = $(this).closest('li').data('id');
  if (!confirm('Delete this item?')) return;
  try {
    await api(`/api/menu/${id}`, { method: 'DELETE', auth: true });
    await adminLoadMenu();
    notify('Deleted');
  } catch (err) {
    notify(err.message);
  }
});

// Load all orders (Admin)
async function adminLoadOrders() {
  try {
    const orders = await api('/api/orders', { auth: true });
    const $list = $('#adminOrdersList').empty();
    orders.forEach((o) => {
      const options = ['placed', 'preparing', 'ready', 'completed', 'cancelled']
        .map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`)
        .join('');
      const items = (o.items || []).map((i) => `${i.qty}× ${i.name}`).join(', ');
      const li = $(`
        <li data-id="${o._id}">
          <h2>Order ${o._id}</h2>
          <p>${items || '(no items)'} • Total: $${Number(o.total).toFixed(2)}</p>
          <label for="st-${o._id}">Status</label>
          <select class="orderStatusSel" id="st-${o._id}">${options}</select>
          <a href="#" class="applyStatusBtn ui-btn ui-mini ui-btn-b">Apply</a>
        </li>
      `);
      $list.append(li);
    });
    $list.listview().listview('refresh');
  } catch {
    notify('Failed to load orders');
  }
}

async function adminLoadBookings() {
  try {
    const bookings = await api('/api/bookings', { auth: true });
    const $list = $('#adminBookingsList').empty();

    bookings.forEach(b => {
      const canApprove = b.status === 'pending';
      const canCancel  = b.status !== 'cancelled';

      const li = $(`
        <li data-id="${b._id}">
          <h2>Booking ${b._id}</h2>
          <p>${b.date} ${b.time} • Party: ${b.partySize}</p>
          <p>Status: <strong>${b.status}</strong></p>
          <div class="ui-grid-a">
            <div class="ui-block-a">
              ${canApprove ? '<a href="#" class="approveBookingBtn ui-btn ui-mini ui-btn-b">Approve</a>' : ''}
            </div>
            <div class="ui-block-b">
              ${canCancel ? '<a href="#" class="cancelBookingBtn ui-btn ui-mini" style="background:#d9534f;color:#fff">Cancel</a>' : ''}
            </div>
          </div>
        </li>
      `);
      $list.append(li);
    });

    $list.listview().listview('refresh');
  } catch (e) {
    notify('Failed to load bookings');
  }
}

// Apply order status change (Admin)
$(document).on('click', '.applyStatusBtn', async function (e) {
  e.preventDefault();
  const $li = $(this).closest('li');
  const id = $li.data('id');
  const status = $li.find('select.orderStatusSel').val();
  try {
    await api(`/api/orders/${id}/status`, {
      method: 'PUT',
      auth: true,
      body: { status }
    });
    notify('Status updated');
    await adminLoadOrders();
  } catch (err) {
    notify(err.message);
  }
});

// Approve booking (Admin/Staff)
$(document).on('click', '#adminBookingsList .approveBookingBtn', async function (e) {
  e.preventDefault();
  const id = $(this).closest('li').data('id');
  try {
    await api(`/api/bookings/${id}/status`, {
      method: 'PUT',
      auth: true,
      body: { status: 'confirmed' }
    });
    notify('Booking approved');
    await adminLoadBookings();
  } catch (err) {
    notify(err.message);
  }
});

// Cancel booking (Admin/Staff)
$(document).on('click', '#adminBookingsList .cancelBookingBtn', async function (e) {
  e.preventDefault();
  const id = $(this).closest('li').data('id');
  if (!confirm('Cancel this booking?')) return;

  try {
    await api(`/api/bookings/${id}/status`, {
      method: 'PUT',
      auth: true,
      body: { status: 'cancelled' }
    });
    notify('Booking cancelled');
    await adminLoadBookings();
  } catch (err) {
    notify(err.message);
  }
});
