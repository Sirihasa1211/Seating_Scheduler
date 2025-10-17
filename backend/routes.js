const express = require('express');
const multer = require('multer');
const fs = require('fs');
const allocation = require('./allocation');
const { validateCSVFile } = require('./csvValidator');

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => res.send('Server working'));

// CSV validation endpoint
router.post('/validate-csv', upload.single('file'), async (req, res) => {
  try {
    const { type } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ valid: false, errors: ['No file uploaded'] });

    const result = await validateCSVFile(file.path, type);
    fs.unlinkSync(file.path);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false, errors: [err.message] });
  }
});

// Allocation endpoint
router.post('/allocate', upload.fields([
  { name: 'students', maxCount: 1 },
  { name: 'courses', maxCount: 1 },
  { name: 'rooms', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files;
    if (!files.students || !files.courses || !files.rooms)
      return res.status(400).json({ error: 'All three CSV files are required' });

    const studentsCSV = fs.readFileSync(files.students[0].path, 'utf8');
    const coursesCSV = fs.readFileSync(files.courses[0].path, 'utf8');
    const roomsCSV = fs.readFileSync(files.rooms[0].path, 'utf8');

    const allocationResult = await allocation(studentsCSV, coursesCSV, roomsCSV);

    fs.unlinkSync(files.students[0].path);
    fs.unlinkSync(files.courses[0].path);
    fs.unlinkSync(files.rooms[0].path);

    res.json(allocationResult);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Email endpoint
router.post('/send-email', async (req, res) => {
  try {
    const { department, filePath } = req.body;
    if (!department || !filePath) return res.status(400).json({ error: 'Department and filePath required' });

    console.log(`Sending email to ${department} with file ${filePath}`);
    res.json({ success: true, msg: `Email sent to ${department}` });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
