// Shared availability helpers for Kabina sa Aplaya
// Reads availability.json (bookings per cabin) and provides calendar utilities.

export async function loadAvailability() {
  try {
    const res = await fetch('./availability.json?v=' + Date.now());
    const data = await res.json();
    const out = {};
    for (const key of Object.keys(data.cabins || {})) {
      out[key] = bookedSet(data.cabins[key]);
    }
    return { booked: out, updated: data.updated || '' };
  } catch (e) {
    return { booked: {}, updated: '' };
  }
}

// Expand [{start,end}] ranges into a Set of 'YYYY-MM-DD' booked NIGHTS.
// end (check-out day) is exclusive, matching Airbnb/Booking iCal convention.
export function bookedSet(ranges) {
  const set = new Set();
  for (const r of ranges || []) {
    let d = parseISO(r.start);
    const end = parseISO(r.end);
    while (d < end) {
      set.add(toISO(d));
      d = addDays(d, 1);
    }
  }
  return set;
}

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// Build a month grid: array of cells {iso, day, inMonth, isPast, booked}
export function monthGrid(year, monthIdx, bookedSetForCabin) {
  const first = new Date(year, monthIdx, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push({ blank: true, key: 'b' + i });
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIdx, day);
    const iso = toISO(d);
    cells.push({
      key: iso,
      iso,
      day,
      isPast: d < today,
      booked: bookedSetForCabin ? bookedSetForCabin.has(iso) : false
    });
  }
  return cells;
}

// Check a stay (checkIn ISO string, nights int) against a booked set.
// Returns array of conflicting ISO nights.
export function conflicts(checkInISO, nights, set) {
  if (!checkInISO || !set) return [];
  const bad = [];
  let d = parseISO(checkInISO);
  for (let i = 0; i < Math.max(1, nights); i++) {
    const iso = toISO(d);
    if (set.has(iso)) bad.push(iso);
    d = addDays(d, 1);
  }
  return bad;
}

export const CABINS = [
  {
    key: 'makiling',
    name: 'Makiling',
    pax: 6,
    view: 'Deck view of Mt. Banahaw',
    tag: 'Poolside cabin',
    overnight: 5500,
    daytour: 4500,
    page: 'Makiling.dc.html',
    blurb: 'Poolside A-frame for up to 6 guests, with a private deck that looks straight out to Mt. Banahaw across Laguna de Bay.'
  },
  {
    key: 'sembrano',
    name: 'Sembrano',
    pax: 6,
    view: 'Deck view of the pool',
    tag: 'Poolside cabin',
    overnight: 5500,
    daytour: 4500,
    page: 'Sembrano.dc.html',
    blurb: 'Poolside A-frame for up to 6 guests — step off your deck and straight into the water.'
  },
  {
    key: 'banahaw',
    name: 'Banahaw',
    pax: 12,
    view: 'Balcony view of Mt. Banahaw',
    tag: 'Family cabin · billiards access',
    overnight: 11500,
    daytour: 9500,
    page: 'Banahaw.dc.html',
    blurb: 'Our biggest cabin — sleeps up to 12, with a balcony facing Mt. Banahaw and direct access to the billiards table.'
  }
];

export function peso(n) {
  return '\u20B1' + n.toLocaleString('en-PH');
}
