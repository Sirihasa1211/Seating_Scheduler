import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function CSVUploader({ title, type, requiredColumns, onFileValidated }) {
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidating(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', type); // dynamic: "students", "courses", or "rooms"

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/validate-csv`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data);

      if (data.valid && onFileValidated) {
        onFileValidated(selectedFile, data);
      }
    } catch (err) {
      console.error(err);
      setResult({ valid: false, errors: ['Failed to validate CSV'] });
    } finally {
      setValidating(false);
    }
  };

  const getStatusIcon = () => {
    if (validating) return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    if (result?.valid) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (result && !result.valid) return <XCircle className="w-5 h-5 text-red-500" />;
    return <Upload className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {getStatusIcon()}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={validating}
        className="w-full py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex flex-col items-center justify-center gap-2"
      >
        <Upload className="w-8 h-8 text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {file ? file.name : 'Click to upload CSV'}
        </span>
      </button>

      <div className="mt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Required columns:</p>
        <div className="flex flex-wrap gap-1">
          {requiredColumns.map((col) => (
            <span key={col} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
              {col}
            </span>
          ))}
        </div>
      </div>

      {result && !result.valid && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Validation Errors:</p>
          {result.errors?.map((error, idx) => (
            <p key={idx} className="text-xs text-red-600 dark:text-red-300">• {error}</p>
          ))}
        </div>
      )}

      {result?.valid && (
        <div className="mt-4 text-xs text-green-600 dark:text-green-400">
          ✓ Valid CSV
        </div>
      )}
    </div>
  );
}
