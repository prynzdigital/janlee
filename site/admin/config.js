// CRM settings that are safe to be public.
// Secrets (database, password, session key, file storage) live only in Vercel → Settings → Environment Variables.
// The dashboard asks /api/auth whether the server is set up; with no API (local preview) it runs in demo mode.
window.CRM_CONFIG = {
  adminEmail: 'interiorsbyjanlee@gmail.com',
  instagram: 'https://www.instagram.com/interiorsbyjanlee/',
};
