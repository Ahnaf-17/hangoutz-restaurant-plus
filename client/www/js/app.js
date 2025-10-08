// === CONFIG ===
const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:8080';

let TOKEN = localStorage.getItem('TOKEN') || null;
let CART = []; // {itemId,name,qty,price}

// === Helpers ===
const authHeader = () => TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {};
const setToken = (t) => { TOKEN = t; localStorage.setItem('TOKEN', t); };
const notify = (msg) => alert(msg);

// === Auth Flows ===
$(document).on('pageinit', '#loginPage', function() {
  $('#loginForm').on('submit', async function(e) {
    e.preventDefault();
    const email = $('#email').val().trim();
    const password = $('#password').val();
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setToken(data.token);
      $.mobile.changePage('#homePage');
    } catch (err) { notify(err.message); }
  });

  $('#logoutBtn').on('click', function() {
    localStorage.removeItem('TOKEN');
    TOKEN = null;
    CART = [];
  });
});

$(document).on('pageinit', '#signupPage', function() {
  $('#signupForm').on('submit', async function(e) {
    e.preventDefault();
    const name = $('#sname').val().trim();
    const email = $('#semail').val().trim();
    const password = $('#spassword').val();
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      setToken(data.token);
      $.mobile.changePage('#homePage');
    } catch (err) { notify(err.message); }
  });
});

// === Menu ===
$(document).on('pageshow', '#menuPage', async function() {
  try {
    const res = await fetch(`${API_BASE}/api/menu`);
    const items = await res.json();
    const $list = $('#menuList').empty();
    items.forEach(it => {
      const li = $(`<li><a href="#"><h2>${it.name}</h2><p>${it.description||''}</p><span class="price">$${it.price.toFixed(2)}</span></a></li>`);
      li.on('click', function() {
        const existing = CART.find(x => x.itemId === it._id);
        if (existing) { existing.qty += 1; } else { CART.push({ itemId: it._id, name: it.name, qty: 1, price: it.price }); }
        notify(`Added ${it.name}`);
      });
      $list.append(li);
    });
    $list.listview().listview('refresh');
  } catch (e) { notify('Failed to load menu'); }
});

$('#placeOrderBtn').on('click', async function() {
  if (!TOKEN) return notify('Please login first.');
  if (!CART.length) return notify('Cart is empty.');
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ items: CART })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order failed');
    CART = [];
    notify('Order placed!');
  } catch (e) { notify(e.message); }
});

// === Bookings ===
$(document).on('pageshow', '#bookingPage', async function() {
  if (!TOKEN) return notify('Please login first.');
  await loadBookings();
});

async function loadBookings() {
  try {
    const res = await fetch(`${API_BASE}/api/bookings/my`, { headers: { ...authHeader() } });
    const list = await res.json();
    const $list = $('#bookingList').empty();
    list.forEach(b => {
      const li = $(`<li><h2>${b.date} ${b.time} • ${b.partySize} people</h2><p>${b.status}</p></li>`);
      $list.append(li);
    });
    $list.listview().listview('refresh');
  } catch (e) { notify('Failed to load bookings'); }
}

$('#bookingForm').on('submit', async function(e) {
  e.preventDefault();
  const partySize = parseInt($('#partySize').val(), 10);
  const date = $('#bdate').val().trim();
  const time = $('#btime').val().trim();
  const notes = $('#bnotes').val().trim();
  try {
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ partySize, date, time, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Booking failed');
    notify('Booking created.');
    await loadBookings();
  } catch (e) { notify(e.message); }
});

// === Orders List ===
$(document).on('pageshow', '#ordersPage', async function() {
  if (!TOKEN) return notify('Please login first.');
  try {
    const res = await fetch(`${API_BASE}/api/orders/my`, { headers: { ...authHeader() } });
    const list = await res.json();
    const $list = $('#ordersList').empty();
    list.forEach(o => {
      const li = $(`<li><h2>Order ${o._id}</h2><p>Status: ${o.status} — Total: $${o.total.toFixed(2)}</p></li>`);
      $list.append(li);
    });
    $list.listview().listview('refresh');
  } catch (e) { notify('Failed to load orders'); }
});

// === Profile ===
$(document).on('pageshow', '#profilePage', async function() {
  if (!TOKEN) return notify('Please login first.');
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, { headers: { ...authHeader() } });
    const me = await res.json();
    $('#profileBox').html(`<p><strong>Name:</strong> ${me.name}</p><p><strong>Email:</strong> ${me.email}</p><p><strong>Role:</strong> ${me.role}</p>`);
  } catch (e) { notify('Failed to load profile'); }
});
