const express = require('express');
const multer = require('multer');
const fs = require('fs');
const allocation = require('./allocation');
const { validateCSVFile } = require('./csvValidator');

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

const nodemailer = require('nodemailer');

const BUCKET = 'allocations';

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
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred SMTP service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ---------------- Route ----------------
router.post('/send-email', async (req, res) => {
  try {
    const { department, filePath, toEmail } = req.body;
    if (!department || !filePath || !toEmail)
      return res.status(400).json({ error: 'Department, filePath, and toEmail required' });

    // 1️⃣ Download CSV from Supabase
    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .download(filePath);

    if (error) return res.status(500).json({ error: 'Supabase download failed: ' + JSON.stringify(error) });

    const localFilePath = path.join(__dirname, filePath.split('/').pop()); // temp local file
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(localFilePath, buffer);

    // 2️⃣ Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: `Exam Allocation - ${department}`,
      text: `Attached is the exam allocation CSV for ${department} department.`,
      attachments: [
        { filename: path.basename(localFilePath), path: localFilePath }
      ]
    });

    // 3️⃣ Cleanup temp file
    fs.unlinkSync(localFilePath);

    res.json({ success: true, msg: `Email sent to ${department} (${toEmail})` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
