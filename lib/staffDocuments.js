// Passport files live in the private `staff-documents` bucket. The staff table stores the object PATH,
// and the UI shows files through short-lived signed URLs (logged-in users only).
const BUCKET = 'staff-documents'
const SIGNED_URL_SECONDS = 300

// Accepts a storage path, or a legacy public URL (…/object/public/staff-documents/<path>), and returns the path.
export function docPath(value) {
  if (!value) return null
  const marker = `/${BUCKET}/`
  const i = value.indexOf(marker)
  if (value.startsWith('http') && i !== -1) return decodeURIComponent(value.slice(i + marker.length).split('?')[0])
  return value
}

export async function getSignedDocUrl(supabase, value) {
  const path = docPath(value)
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error) return null
  return data.signedUrl
}

export async function uploadStaffDoc(supabase, staffId, slot, file) {
  const path = `${staffId}-${slot}-${Date.now()}.${file.name.split('.').pop()}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  return { path, error }
}

export async function removeStaffDocs(supabase, values) {
  const paths = values.map(docPath).filter(Boolean)
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
}
