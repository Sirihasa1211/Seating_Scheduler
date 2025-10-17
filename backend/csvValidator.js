const fs = require('fs');
const Papa = require('papaparse');

const requiredHeaders = {
  students: ['RollNo', 'Name', 'Department', 'Section', 'Year'],
  courses: ['Department', 'CourseCode','CourseName', 'ExamDate', 'ExamTime', 'Year'],
  rooms: ['RoomNo', 'NoOfBenches', 'BenchCapacity'],
};

async function validateCSVFile(filePath, type) {
    console.log("Validating CSV for type:", type);
  if (!requiredHeaders[type]) throw new Error(`Unknown CSV type: ${type}`);

  const csvData = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

  if (!parsed.meta.fields) return { valid: false, errors: ['CSV has no headers'] };

  const headers = parsed.meta.fields;
  const missing = requiredHeaders[type].filter(h => !headers.includes(h));

  if (missing.length > 0)
    return { valid: false, errors: [`${type}.csv missing headers: ${missing.join(', ')}`] };

  return { valid: true, errors: [] };
}

module.exports = { validateCSVFile };
