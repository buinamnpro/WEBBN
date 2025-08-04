// Supabase Configuration for LMS Dashboard
const SUPABASE_CONFIG = {
    URL: 'https://pihvvpnaempsrrlqqpiz.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpaHZ2cG5hZW1wc3JybHFxcGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTY0ODAsImV4cCI6MjA2OTg3MjQ4MH0._P52RuVhguI5ptuVdl789YWZT0oBvZd8Wz7x4nUWYFw',
    TABLE_NAME: 'lms_questions'
};

// Initialize Supabase client
let supabase;

// Initialize Supabase
async function initSupabase() {
    try {
        // Load Supabase client dynamically
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');

        supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);

        console.log('✅ Supabase client initialized');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        return false;
    }
}

// Get questions from Supabase
async function getQuestions() {
    try {
        if (!supabase) {
            console.error('❌ Supabase client not initialized');
            return [];
        }

        const { data, error } = await supabase
            .from(SUPABASE_CONFIG.TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('❌ Error fetching questions:', error);
            return [];
        }

        console.log('📦 Fetched questions:', data.length);
        return data || [];
    } catch (error) {
        console.error('❌ Error in getQuestions:', error);
        return [];
    }
}

// Subscribe to real-time updates
function subscribeToQuestions(callback) {
    try {
        if (!supabase) {
            console.error('❌ Supabase client not initialized');
            return null;
        }

        const subscription = supabase
            .channel('lms_questions_changes')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: SUPABASE_CONFIG.TABLE_NAME
                },
                (payload) => {
                    console.log('🆕 New question received:', payload.new);
                    callback(payload.new);
                }
            )
            .subscribe((status) => {
                console.log('📡 Subscription status:', status);
            });

        return subscription;
    } catch (error) {
        console.error('❌ Error subscribing to questions:', error);
        return null;
    }
}

// Get question count
async function getQuestionCount() {
    try {
        if (!supabase) {
            return 0;
        }

        const { count, error } = await supabase
            .from(SUPABASE_CONFIG.TABLE_NAME)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Error getting count:', error);
            return 0;
        }

        return count || 0;
    } catch (error) {
        console.error('❌ Error in getQuestionCount:', error);
        return 0;
    }
}

// Test connection
async function testConnection() {
    try {
        if (!supabase) {
            return false;
        }

        const { data, error } = await supabase
            .from(SUPABASE_CONFIG.TABLE_NAME)
            .select('id')
            .limit(1);

        return !error;
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        return false;
    }
}

// Export functions
window.SupabaseConfig = {
    initSupabase,
    getQuestions,
    subscribeToQuestions,
    getQuestionCount,
    testConnection
}; 