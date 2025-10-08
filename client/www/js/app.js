
// === CONFIG ===
const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:8080';

let TOKEN = localStorage.getItem('TOKEN') || null;
let CART = []; // {itemId,name,qty,price}
let CURRENT_USER = null;

// === Helpers ===
const authHeader = () => (TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {});
const setToken = (t) => {
  TOKEN = t;
  localStorage.setItem('TOKEN', t);
};
const notify = (msg) => alert(msg);

// Small helper to fetch current user and cache it
async function fetchMe() {
  if (!TOKEN) return null;
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, { headers: { ...authHeader() } });
    if (!res.ok) return null;
    const me = await res.json();
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
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setToken(data.token);
      await toggleAdminBtn(); // set CURRENT_USER + show/hide Admin
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
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      setToken(data.token);
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
    const res = await fetch(`${API_BASE}/api/menu`);
    const items = await res.json();
    const $list = $('#menuList').empty();
    items.forEach((it) => {
      const li = $(
        `<li>
          <a href="#">
            <h2>${it.name}</h2>
            <p>${it.description || ''}</p>
            <span class="price">$${Number(it.price).toFixed(2)}</span>
          </a>
        </li>`
      );
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
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ items: CART }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order failed');
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
    const res = await fetch(`${API_BASE}/api/bookings/my`, { headers: { ...authHeader() } });
    const list = await res.json();
    const $list = $('#bookingList').empty();
    list.forEach((b) => {
      const li = $(
        `<li>
          <h2>${b.date} ${b.time} • ${b.partySize} people</h2>
          <p>${b.status}</p>
        </li>`
      );
      $list.append(li);
    });
    $list.listview().listview('refresh');
  } catch (e) {
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
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ partySize, date, time, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Booking failed');
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
    const res = await fetch(`${API_BASE}/api/orders/my`, { headers: { ...authHeader() } });
    const list = await res.json();
    const $list = $('#ordersList').empty();
    list.forEach((o) => {
      const li = $(
        `<li>
          <h2>Order ${o._id}</h2>
          <p>Status: ${o.status} — Total: $${Number(o.total).toFixed(2)}</p>
        </li>`
      );
      $list.append(li);
    });
    $list.listview().listview('refresh');
  } catch (e) {
    notify('Failed to load orders');
  }
});

// === Profile ===
$(document).on('pageshow', '#profilePage', async function () {
  if (!TOKEN) return notify('Please login first.');
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, { headers: { ...authHeader() } });
    const me = await res.json();
    $('#profileBox').html(
      `<p><strong>Name:</strong> ${me.name}</p>
       <p><strong>Email:</strong> ${me.email}</p>
       <p><strong>Role:</strong> ${me.role}</p>`
    );
  } catch (e) {
    notify('Failed to load profile');
  }
});


// ===============================
// ======== ADMIN FEATURES ========
// ===============================

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
    const res = await fetch(`${API_BASE}/api/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Create failed');

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
    const res = await fetch(`${API_BASE}/api/menu`);
    const items = await res.json();
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
    const res = await fetch(`${API_BASE}/api/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
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
    const res = await fetch(`${API_BASE}/api/menu/${id}`, {
      method: 'DELETE',
      headers: { ...authHeader() },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Delete failed');
    await adminLoadMenu();
    notify('Deleted');
  } catch (err) {
    notify(err.message);
  }
});

// Load all orders (Admin)
async function adminLoadOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`, { headers: { ...authHeader() } });
    const orders = await res.json();
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

// Apply order status change (Admin)
$(document).on('click', '.applyStatusBtn', async function (e) {
  e.preventDefault();
  const $li = $(this).closest('li');
  const id = $li.data('id');
  const status = $li.find('select.orderStatusSel').val();
  try {
    const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
    notify('Status updated');
    await adminLoadOrders();
  } catch (err) {
    notify(err.message);
  }
});
