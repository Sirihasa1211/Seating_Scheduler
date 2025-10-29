import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, PlayCircle, Loader2, Moon, Sun } from 'lucide-react';
import CSVUploader from '../components/CSVUploader';
import ProgressBar from '../components/ProgressBar';
import MetricsCharts from '../components/MetricsCharts';
import OutputTable from '../components/OutputTable';
import { processAllocation } from '../utils/api';

const STAGES = [
  { id: 'upload', label: 'Uploading Files' },
  { id: 'validate', label: 'Validating Data' },
  { id: 'allocate', label: 'Allocating Students' },
  { id: 'generate', label: 'Generating Outputs' }
];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [studentsFile, setStudentsFile] = useState(null);
  const [coursesFile, setCoursesFile] = useState(null);
  const [roomsFile, setRoomsFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [outputFiles, setOutputFiles] = useState([]);

  useEffect(() => {
    loadUser();
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const canRunAllocation = studentsFile && coursesFile && roomsFile && !processing;

  const runAllocation = async () => {
  if (!canRunAllocation) return;

  setProcessing(true);
  setProgress(0);
  setCurrentStage(0);

  try {
    // Stage 1: Sending files to backend
    setProgress(25);
    const result = await processAllocation(studentsFile, coursesFile, roomsFile);

    // Stage 2: Complete
    setCurrentStage(3);
    setProgress(100);
    setMetrics(result.metrics);
    const filesArray = Object.entries(result.outputFiles).map(([fileName, content]) => {
  // Extract department from filename (assuming CSE/ECE/MECH etc. is in the filename)
  const deptMatch = fileName.match(/_(CSE|ECE|MECH|CIVIL|EEE)_/);
  const department = deptMatch ? deptMatch[1] : 'UNKNOWN';

  return {
    department,
    fileName,
    filePath: `${fileName}`, // adjust according to your backend
    fileSize: new Blob([content]).size // size in bytes
  };
});

    setOutputFiles(filesArray);
console.log(result.outputFiles);
  } catch (error) {
    alert('Allocation failed: ' + error.message);
  } finally {
    setProcessing(false);
  }
};


  const sendEmail = async (file) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ 
        department: file.department,
        fileName: file.fileName,
        filePath: file.filePath
      })
    });
    
    if (!response.ok) throw new Error('Email sending failed');
    return response.json();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Student Allocation System</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${processing ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                {processing ? 'Processing' : 'Idle'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">{user?.email}</span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {darkMode ? <Sun className="w-5 h-5 text-gray-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard Overview</h2>
          <p className="text-gray-600 dark:text-gray-400">Upload CSV files, validate data, and generate allocation results</p>
        </div>

        {/* CSV Upload */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CSVUploader
            title="Students Data"
            type="students"      
            requiredColumns={['RollNo', 'Name', 'Department', 'Section', 'Year']}
            onFileValidated={(file) => setStudentsFile(file)}
          />
          <CSVUploader
            title="Courses Data"
            type="courses"
            requiredColumns={['CourseCode', 'Department', 'ExamDate', 'ExamTime','Year']}
            onFileValidated={(file) => setCoursesFile(file)}
          />
          <CSVUploader
            title="Rooms Data"
            type="rooms"
            requiredColumns={['RoomNo', 'NoOfBenches', 'BenchCapacity']}
            onFileValidated={(file) => setRoomsFile(file)}
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={runAllocation}
            disabled={!canRunAllocation}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
            {processing ? 'Processing...' : 'Run Allocation'}
          </button>
        </div>

        {/* Progress */}
        {processing && (
          <ProgressBar progress={progress} currentStage={currentStage} stages={STAGES} />
        )}

        {/* Metrics */}
        {metrics && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Allocation Metrics</h3>
            <MetricsCharts metrics={metrics} />
          </div>
        )}

        {/* Output Files */}
        
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Department Output Files</h3>
            <OutputTable files={outputFiles} onSendEmail={sendEmail} />
          </div>
       
      </main>
    </div>
  );
}
