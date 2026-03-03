// Supabase Configuration
// Get your credentials from https://app.supabase.com

const SUPABASE_CONFIG = {
    // Replace with your Supabase project URL
    url: 'https://cldjcovclblvobivvcll.supabase.co',
    
    // Replace with your Supabase anon key
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZGpjb3ZjbGJsdm9iaXZ2Y2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDE0ODMsImV4cCI6MjA4ODExNzQ4M30.0aZFdwByEyxnbowBIiGYD74IzINkiMEoEw7guwHOvm0'
};

// Database table names
const DB_TABLES = {
    reviewers: 'reviewers',
    restaurants: 'restaurants',
    reviews: 'reviews'
};

// Initialize Supabase client will be done in supabase-client.js