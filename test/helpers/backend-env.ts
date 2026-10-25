// These success-contract tests always target a synthetic, mocked backend.
process.env.SUPABASE_BASE_URL = 'https://offline-tests.example.invalid';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_offline_test';
