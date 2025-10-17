import { supabase } from '../lib/supabase';



export const processAllocation = async (studentsFile, coursesFile, roomsFile) => {
  const { data: { session } } = await supabase.auth.getSession();

  const formData = new FormData();
  formData.append('students', studentsFile);
  formData.append('courses', coursesFile);
  formData.append('rooms', roomsFile);

  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/allocate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}` // DO NOT set Content-Type manually
    },
    body: formData
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Allocation failed: ' + errText);
  }
  return response.json();
};

export const downloadFile = async (filePath, fileName) => {
  const { data, error } = await supabase.storage
    .from('allocations')
    .download(filePath);
  if (error) throw error;
  const url = window.URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const sendEmail = async (department, fileName, filePath) => {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ department, fileName, filePath })
  });
  if (!response.ok) throw new Error('Email sending failed');
  return response.json();
};
