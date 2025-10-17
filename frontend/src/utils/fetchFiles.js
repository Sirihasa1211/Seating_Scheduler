import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export async function fetchUploadedFiles() {
  const { data, error } = await supabase.storage
    .from('allocations')
    .list('output/', { sortBy: { column: 'created_at', order: 'desc' } });

  if (error) {
    console.error('Error fetching files:', error);
    return [];
  }

  const filesWithUrls = data.map(file => {
    const { data: publicUrl } = supabase.storage
      .from('allocations')
      .getPublicUrl(`input/${file.name}`);
    return { name: file.name, url: publicUrl.publicUrl };
  });

  return filesWithUrls;
}
