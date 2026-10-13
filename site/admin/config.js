// CRM connection settings.
// Fill these in from Supabase → Project Settings → API (see docs/CRM-SETUP.md).
// The anon key is designed to be public: Row Level Security only lets JanLee's account read or write data.
// Leave both empty to run the dashboard in DEMO mode with sample data (nothing is saved to a server).
window.CRM_CONFIG = {
  supabaseUrl: '',      // e.g. 'https://abcd1234.supabase.co'
  supabaseAnonKey: '',  // the "anon public" key
  adminEmail: 'interiorsbyjanlee@gmail.com',
};
