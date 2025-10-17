const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const { validateCSVFile } = require('./csvValidator');
const allocation= require('./allocation'); // <- your existing allocation logic
require('dotenv').config();
const routes = require('./routes');
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors({ origin: 'http://localhost:3001', credentials: true }));
app.use(express.json());
app.use('/api', routes);
// Test endpoint
app.get('/test', (req, res) => res.send('Server working'));

// CSV validation
app.post('/api/validate-csv', upload.single('file'), async (req, res) => {
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

// Real allocation endpoint (large dataset)
app.post('/api/allocate', upload.fields([
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

    // Run allocation logic
    const allocationResult = await allocation(studentsCSV, coursesCSV, roomsCSV);

    // Cleanup temp files
    fs.unlinkSync(files.students[0].path);
    fs.unlinkSync(files.courses[0].path);
    fs.unlinkSync(files.rooms[0].path);

    res.json(allocationResult);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Email sending endpoint (can integrate Nodemailer/SendGrid)
app.post('/api/send-email', async (req, res) => {
  try {
    const { department, filePath } = req.body;
    if (!department || !filePath) return res.status(400).json({ error: 'Department and filePath required' });

    console.log(`Sending email to ${department} with file ${filePath}`);
    res.json({ success: true, msg: `Email sent to ${department}` });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
