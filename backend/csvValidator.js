const fs = require('fs');
const Papa = require('papaparse');

const requiredHeaders = {
  students: ['RollNo', 'Name', 'Department', 'Section', 'Year'],
  courses: ['Department', 'CourseCode','CourseName', 'ExamDate', 'ExamTime', 'Year'],
  rooms: ['RoomNo', 'NoOfBenches', 'BenchCapacity'],
};

async function validateCSVFile(filePath, type) {
  console.log(`Validating ${type} CSV at ${filePath}`);
  const errors = [];
  const csvData = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

  // Check headers
  console.log("checking headers");
  if (!parsed.meta.fields) return { valid: false, errors: ['CSV has no headers'] };
  const missingHeaders = requiredHeaders[type].filter(h => !parsed.meta.fields.includes(h));
  if (missingHeaders.length > 0) errors.push(`${type}.csv missing headers: ${missingHeaders.join(', ')}`);

  // Check rows
  parsed.data.forEach((row, index) => {
    requiredHeaders[type].forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push(`${type}.csv row ${index + 2} missing value for ${field}`);
      }
    });
  });

  // Check room capacity vs students
  if (type === 'rooms') {
    const totalCapacity = parsed.data.reduce((sum, row) => {
      const benchCapacity = parseInt(row.BenchCapacity) || 0;
      const noOfBenches = parseInt(row.NoOfBenches) || 0;
      return sum + benchCapacity * noOfBenches;
    }, 0);
    const studentsFile = 'uploads/students.csv';
    if (fs.existsSync(studentsFile)) {
      console.log("checking student count vs room capacity");
      console.log("total room capacity:", totalCapacity);
      console.log("reading student data from:", studentsFile.length);
      const studentData = Papa.parse(fs.readFileSync(studentsFile, 'utf8'), { header: true, skipEmptyLines: true }).data;
      if (studentData.length > totalCapacity) {
        errors.push(`Total room capacity (${totalCapacity}) is less than total students (${studentData.length})`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCSVFile };
