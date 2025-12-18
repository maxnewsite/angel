-- Check if documents exist and their details
SELECT 
  d.id,
  d.deal_id,
  d.file_name,
  d.storage_path,
  d.visibility,
  d.uploaded_by_user_id,
  d.created_at,
  deals.status as deal_status,
  startups.name as startup_name
FROM documents d
JOIN deals ON deals.id = d.deal_id
JOIN startups ON startups.id = deals.startup_id
ORDER BY d.created_at DESC
LIMIT 5;

-- Check storage.objects to see if files are there
SELECT 
  name as file_path,
  bucket_id,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'deal-docs'
ORDER BY created_at DESC
LIMIT 5;
