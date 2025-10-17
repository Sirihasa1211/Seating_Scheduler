import { useState } from 'react';
import { Download, Send, Loader2 } from 'lucide-react';
import { downloadFile } from '../utils/api';

export default function OutputTable({ files, onSendEmail }) {
  //console.log("output file length",files.length);
  console.log(files);
  const [downloading, setDownloading] = useState(null);
  const [sending, setSending] = useState(null);

  const handleDownload = async (file) => {
    console.log("in handle download");
    setDownloading(file.department);
    try {
      await downloadFile(file.filePath, file.fileName);
    } catch (error) {
      alert('Download failed: ' + error.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleSendEmail = async (file) => {
    setSending(file.department);
    try {
      await onSendEmail(file);
      alert(`Email sent to ${file.department} department`);
    } catch (error) {
      alert('Email failed: ' + error.message);
    } finally {
      setSending(null);
    }
  };

  const deptColors = {
    CSE: 'bg-blue-500',
    ECE: 'bg-purple-500',
    MECH: 'bg-orange-500',
    CIVIL: 'bg-green-500',
    EEE: 'bg-yellow-500'
  };

  if (!files || files.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No output files generated yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">File Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {files.map((file) => (
              <tr key={file.department} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${deptColors[file.department] || 'bg-gray-500'}`}>
                    {file.department}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-white">{file.fileName}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {(file.fileSize / 1024).toFixed(1)} KB
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.department}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-50"
                    >
                      {downloading === file.department ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleSendEmail(file)}
                      disabled={sending === file.department}
                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
                    >
                      {sending === file.department ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
