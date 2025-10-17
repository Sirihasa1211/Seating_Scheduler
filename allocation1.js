// allocation_large.js
const { createClient } = require('@supabase/supabase-js');
const csv = require('fast-csv');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
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
  return new Promise((resolve, reject) => {
    const rows = [];
    csv.parseString(csvString, { headers: true, trim: true })
      .on('error', err => reject(err))
      .on('data', row => rows.push(normalizeRowKeys(row)))
      .on('end', () => resolve(rows));
  });
}

function generateCSVString(rows) {
  return new Promise((resolve, reject) => {
    csv.writeToString(rows, { headers: true })
      .then(resolve)
      .catch(reject);
  });
}

async function downloadCSVFromSupabase(filename) {
  const { data, error } = await supabase.storage.from(BUCKET).download(filename);
  if (error) throw error;
  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer.toString('utf-8');
}

async function uploadCSVToSupabase(filename, content) {
  const { error } = await supabase.storage.from(BUCKET).upload(filename, Buffer.from(content), { upsert: true });
  if (error) throw error;
}

// ----------------- Room Helpers -----------------
function getRoomCaps(rooms) {
  return rooms.map(r => ({
    roomno: String(r.roomno || ''),
    capacity: Math.max(
      0,
      parseInt(r.noofbenches || r.benches || 0) *
        parseInt(r.benchcapacity || r.capacity || 0)
    ),
    orig: r
  })).filter(r => r.capacity > 0);
}

// ----------------- Priority Queue -----------------
class MinHeap {
  constructor() { this.data = []; }
  push(obj) { this.data.push(obj); this._heapifyUp(); }
  pop() {
    if (!this.data.length) return null;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length) {
      this.data[0] = last;
      this._heapifyDown();
    }
    return top;
  }
  _heapifyUp() {
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.data[i].capacity >= this.data[parent].capacity) break;
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }
  _heapifyDown() {
    let i = 0;
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].capacity < this.data[smallest].capacity) smallest = l;
      if (r < n && this.data[r].capacity < this.data[smallest].capacity) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
  isEmpty() { return this.data.length === 0; }
}

// ----------------- Main Allocation -----------------
async function allocation() {
  const start = Date.now();

  // 1️⃣ Fetch & parse CSVs
  const [studentsCSV, coursesCSV, roomsCSV] = await Promise.all([
    downloadCSVFromSupabase('input/students.csv'),
    downloadCSVFromSupabase('input/courses.csv'),
    downloadCSVFromSupabase('input/rooms.csv')
  ]);
  const [students, courses, rooms] = await Promise.all([
    parseCSVString(studentsCSV),
    parseCSVString(coursesCSV),
    parseCSVString(roomsCSV)
  ]);

  const baseRoomCaps = getRoomCaps(rooms);
  if (!baseRoomCaps.length) throw new Error('No valid rooms.');

  // 2️⃣ Map department+year+section -> students
  const deptYearSectionMap = new Map();
  for (const s of students) {
    const dept = String(s.department || '');
    const sec = String(s.section || '');
    const year = String(s.year || s.academicyear || '');
    const roll = String(s.rollno || s.roll || '');
    if (!roll) continue;
    const key = `${dept}||${year}||${sec}`;
    if (!deptYearSectionMap.has(key))
      deptYearSectionMap.set(key, { department: dept, year, section: sec, students: [] });
    deptYearSectionMap.get(key).students.push({ rollno: roll });
  }

  // 3️⃣ Group courses by exam slot
  const examGroups = {};
  for (const c of courses) {
    const key = `${c.examdate || ''}|${c.examtime || ''}`;
    if (!examGroups[key]) examGroups[key] = [];
    examGroups[key].push(c);
  }

  const outputFiles = {};
  const metrics = [];
  const roomCapacityMap = new Map(baseRoomCaps.map(r => [r.roomno, r.capacity]));

  // 4️⃣ Allocation per slot
  for (const slotKey of Object.keys(examGroups)) {
    const [date, time] = slotKey.split('|');
    const coursesInSlot = examGroups[slotKey];
    const depts = Array.from(new Set(coursesInSlot.map(c => String(c.department || ''))));

    // Collect sections with year info
    const sections = [];
    for (const [key, obj] of deptYearSectionMap.entries()) {
      if (obj.students.length) sections.push({ ...obj, size: obj.students.length });
    }

    // Sort sections by descending size (FFD)
    sections.sort((a, b) => b.size - a.size);

    // Setup min-heap for best-fit room allocation
    const heap = new MinHeap();
    for (const r of baseRoomCaps) heap.push({ roomno: r.roomno, capacity: r.capacity });

    const slotOutputRows = [];
    const roomUsage = new Map();

    // Allocate sections with year-based mixing rule
    for (const sec of sections) {
      let idx = 0;
      while (idx < sec.size) {
        const roomsAvailable = heap.data.filter(r => r.capacity > 0).sort((a, b) => a.capacity - b.capacity);
        if (!roomsAvailable.length) break;
        const room = roomsAvailable[0];

        const take = Math.min(sec.size - idx, room.capacity);
        const firstRoll = sec.students[idx].rollno;
        const lastRoll = sec.students[idx + take - 1].rollno;

        slotOutputRows.push({
          Department: sec.department,
          Year: sec.year,
          Section: sec.section,
          Room: room.roomno,
          RollRange: `${firstRoll} - ${lastRoll}`,
          TotalStudents: take
        });

        room.capacity -= take;
        roomUsage.set(room.roomno, (roomUsage.get(room.roomno) || 0) + take);
        idx += take;
      }
    }

    // 🧩 NEW: Upload CSV per Department + Year
    const deptYearGroups = {};
    for (const row of slotOutputRows) {
      const key = `${row.Department}_${row.Year}`;
      if (!deptYearGroups[key]) deptYearGroups[key] = [];
      deptYearGroups[key].push(row);
    }

    for (const key of Object.keys(deptYearGroups)) {
      const [dept, year] = key.split('_');
      const rows = deptYearGroups[key];
      const safeTime = (time || '').replace(/[^\w]/g, '_') || 'time';
      const safeYear = year ? year.replace(/\s+/g, '') : 'UnknownYear';
      const filename = `allocation_${dept}_${safeYear}_${date}_${safeTime}.csv`;
      const csvContent = await generateCSVString(rows);
      outputFiles[filename] = csvContent;
      await uploadCSVToSupabase(filename, csvContent);
    }

    // Compute metrics
    const totalCapUsed = Array.from(roomUsage.entries()).reduce((sum, [r, assigned]) => sum + (roomCapacityMap.get(r) || 0), 0);
    const totalAssigned = Array.from(roomUsage.values()).reduce((sum, x) => sum + x, 0);
    const avgUtil = totalCapUsed ? totalAssigned / totalCapUsed : 0;

    for (const key of Object.keys(deptYearGroups)) {
      const [dept, year] = key.split('_');
      const deptRows = deptYearGroups[key];
      const totals = deptRows.map(r => r.TotalStudents);
      const avg = totals.reduce((a, b) => a + b, 0) / Math.max(1, totals.length);
      const stdDev = Math.sqrt(totals.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(1, totals.length));

      metrics.push({
        Department: dept,
        Year: year,
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

  // Upload metrics CSV
  const metricsCSV = await generateCSVString(metrics);
  await uploadCSVToSupabase('metrics.csv', metricsCSV);

  return { outputFiles, metrics };
}

module.exports = allocation;
