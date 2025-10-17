// allocation_large.js
const Papa = require('papaparse');
const csv = require('fast-csv');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'allocations';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ----------------- Helpers -----------------
function normalizeRowKeys(row) {
  const out = {};
  for (const k in row) {
    if (!Object.prototype.hasOwnProperty.call(row, k)) continue;
    out[k.trim().toLowerCase()] = row[k] == null ? '' : String(row[k]).trim();
  }
  return out;
}

function parseCSVString(csvString) {
  console.log("in parseCSVString");
  return new Promise((resolve, reject) => {
    const parsed = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length) {
      console.error("CSV parse errors:", parsed.errors);
      return reject(parsed.errors);
    }

    const rows = parsed.data.map(row => normalizeRowKeys(row));
    resolve(rows);
  });
}

function generateCSVString(rows) {
  return new Promise((resolve, reject) => {
    csv.writeToString(rows, { headers: true })
      .then(resolve)
      .catch(reject);
  });
}

async function uploadCSVToSupabase(filename, content) {
  const { error } = await supabase
    .storage
    .from(BUCKET)
    .upload(filename, Buffer.from(content), { upsert: true });

  if (error) {
    console.error('Supabase upload error:', error);
    throw error; // ❌ Important: throw here if you want the backend to report
  } else {
    console.log(`Uploaded ${filename} to Supabase bucket "${BUCKET}"`);
  }
}


// ----------------- Room Helpers -----------------
function getRoomCaps(rooms) {
  return rooms.map(r => ({
    roomno: String(r.roomno || ''),
    capacity: Math.max(0, parseInt(r.noofbenches || r.benches || 0) * parseInt(r.benchcapacity || r.capacity || 0)),
    orig: r
  })).filter(r => r.capacity > 0);
}

// ----------------- MinHeap -----------------
class MinHeap {
  constructor() { this.data = []; }
  push(obj) { this.data.push(obj); this._heapifyUp(); }
  pop() { if (!this.data.length) return null; const top = this.data[0]; const last = this.data.pop(); if (this.data.length) { this.data[0] = last; this._heapifyDown(); } return top; }
  _heapifyUp() { let i = this.data.length - 1; while (i > 0) { const parent = Math.floor((i - 1) / 2); if (this.data[i].capacity >= this.data[parent].capacity) break; [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]]; i = parent; } }
  _heapifyDown() { let i = 0; const n = this.data.length; while (true) { let smallest = i; const l = 2 * i + 1, r = 2 * i + 2; if (l < n && this.data[l].capacity < this.data[smallest].capacity) smallest = l; if (r < n && this.data[r].capacity < this.data[smallest].capacity) smallest = r; if (smallest === i) break; [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]]; i = smallest; } }
  isEmpty() { return this.data.length === 0; }
}

// ----------------- Main Allocation -----------------
async function allocation(studentsCSV, coursesCSV, roomsCSV) {
  const start = Date.now();

  // 1️⃣ Parse CSV strings
  const [students, courses, rooms] = await Promise.all([
    parseCSVString(studentsCSV),
    parseCSVString(coursesCSV),
    parseCSVString(roomsCSV)
  ]);
console.log("Parsed CSVs:", { students: students.length, courses: courses.length, rooms: rooms.length });
  const baseRoomCaps = getRoomCaps(rooms);
  if (!baseRoomCaps.length) throw new Error('No valid rooms.');

  // 2️⃣ Valid Dept-Year combos (only if exams exist)
  const validDeptYears = new Set();
  for (const c of courses) {
    const dept = String(c.department || '').trim();
    const year = String(c.year || '').trim();
    if (dept && year) validDeptYears.add(`${dept}|${year}`);
  }

  // 3️⃣ Precompute sections by Dept-Year-Section
  const deptYearSections = new Map();
  for (const s of students) {
    const dept = String(s.department || '').trim();
    const year = String(s.year || '').trim();
    const sec = String(s.section || '').trim();
    const roll = String(s.rollno || s.roll || '').trim();
    if (!roll) continue;
    const key = `${dept}|${year}|${sec}`;
    if (!deptYearSections.has(key)) deptYearSections.set(key, { department: dept, year, section: sec, students: [] });
    deptYearSections.get(key).students.push({ rollno: roll });
  }

  // 4️⃣ Map exam slots
  const examGroups = {};
  for (const c of courses) {
    const key = `${c.examdate || ''}|${c.examtime || ''}`;
    if (!examGroups[key]) examGroups[key] = [];
    examGroups[key].push(c);
  }

  const outputFiles = {};
  const metrics = [];
  const roomCapacityMap = new Map(baseRoomCaps.map(r => [r.roomno, r.capacity]));

  // 5️⃣ Allocation per slot
  for (const slotKey of Object.keys(examGroups)) {
    const [date, time] = slotKey.split('|');
    const heap = new MinHeap();
    for (const r of baseRoomCaps) heap.push({ roomno: r.roomno, capacity: r.capacity });

    const slotOutputRows = [];
    const roomUsage = new Map();

    for (const key of deptYearSections.keys()) {
      const { department, year, section, students: stuList } = deptYearSections.get(key);
      if (!validDeptYears.has(`${department}|${year}`)) continue;
      if (!examGroups[slotKey].some(c => c.department === department && c.year === year)) continue;

      let idx = 0;
      while (idx < stuList.length && !heap.isEmpty()) {
        const room = heap.pop();
        if (room.capacity <= 0) continue;

        const take = Math.min(stuList.length - idx, room.capacity);
        const firstRoll = stuList[idx].rollno;
        const lastRoll = stuList[idx + take - 1].rollno;

        slotOutputRows.push({
          Department: department,
          Year: year,
          Section: section,
          Room: room.roomno,
          RollRange: `${firstRoll} - ${lastRoll}`,
          TotalStudents: take
        });

        room.capacity -= take;
        roomUsage.set(room.roomno, (roomUsage.get(room.roomno) || 0) + take);
        if (room.capacity > 0) heap.push(room);
        idx += take;
      }
    }

    // Upload CSVs only for dept-year with actual data
    for (const dept of new Set(slotOutputRows.map(r => r.Department))) {
      for (const year of new Set(slotOutputRows.map(r => r.Year))) {
        const rows = slotOutputRows.filter(r => r.Department === dept && r.Year === year);
        if (!rows.length) continue;
        const safeTime = (time || '').replace(/[^\w]/g, '_') || 'time';
        const filename = `allocation_${dept}_${date}_${safeTime}_Year${year}.csv`;
        const csvContent = await generateCSVString(rows);
        outputFiles[filename] = csvContent;
        await uploadCSVToSupabase(filename, csvContent);
      }
    }

    // Compute metrics per department
    const totalCapUsed = Array.from(roomUsage.entries()).reduce((sum, [r, assigned]) => sum + (roomCapacityMap.get(r) || 0), 0);
    const totalAssigned = Array.from(roomUsage.values()).reduce((sum, x) => sum + x, 0);
    const avgUtil = totalCapUsed ? totalAssigned / totalCapUsed : 0;

    for (const dept of new Set(slotOutputRows.map(r => r.Department))) {
      const deptRows = slotOutputRows.filter(r => r.Department === dept);
      const totals = deptRows.map(r => r.TotalStudents);
      const avg = totals.reduce((a, b) => a + b, 0) / Math.max(1, totals.length);
      const stdDev = Math.sqrt(totals.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(1, totals.length));

      metrics.push({
        Department: dept,
        Date: date,
        Time: time,
        Conflicts: 0,
        Timeslots: Object.keys(examGroups).length,
        AvgUtilization: (avgUtil * 100).toFixed(2),
        FairnessStdDev: stdDev.toFixed(2),
        Runtime: ((Date.now() - start) / 1000).toFixed(2)
      });
    }
  }

  const metricsCSV = await generateCSVString(metrics);
  await uploadCSVToSupabase('metrics.csv', metricsCSV);

  return { outputFiles, metrics };
}

module.exports = allocation;
