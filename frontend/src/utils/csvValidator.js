export function validateCSV(type, data) {
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  const required = {
    students: ['RollNo', 'Name', 'Department', 'Section', 'Year'],
    courses: ['CourseCode', 'Department', 'Year', 'ExamDate', 'ExamTime'],
    rooms: ['RoomNo', 'NoOfBenches', 'BenchCapacity'],
  };

  if (!required[type]) {
    console.error(`Unknown CSV type for validation: ${type}`);
    return { valid: false, message: `Unknown CSV type: ${type}` };
  }

  const missing = required[type].filter(h => !headers.includes(h));

  if (missing.length > 0) {
    return { valid: false, message: `${type}.csv is missing headers: ${missing.join(', ')}` };
  }

  return { valid: true };
}

