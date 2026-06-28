/**
 * Supabase Configuration & Helper Functions
 * ==========================================
 * Digunakan untuk menyimpan dataset dan hasil ke Supabase DB.
 */

const SUPABASE_URL = 'https://hvbzsaxxbinvekmsyluf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qY1L2qSabytNHmYFCcDQ3w_TTuXcgq5';

let supabaseClient = null;

// Cek jika kredensial sudah diubah dari default
const isSupabaseConfigured = SUPABASE_URL !== 'https://YOUR-PROJECT-ID.supabase.co';

if (isSupabaseConfigured && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Client Initialized");
} else {
    console.warn("Supabase belum dikonfigurasi. Data hanya akan disimpan di sessionStorage.");
}

/**
 * Menyimpan dataset ke Supabase
 * @param {Array} data - Array of customer data objects
 * @returns {Promise<Object>}
 */
async function saveDatasetToCloud(data) {
    if (!supabaseClient) throw new Error("Supabase belum dikonfigurasi.");
    
    const user = await getCurrentUser();
    
    const { data: result, error } = await supabaseClient
        .from('datasets')
        .insert([
            { 
                name: `Dataset ${new Date().toLocaleString()}`, 
                data: data,
                user_id: user ? user.id : null
            }
        ])
        .select();
        
    if (error) throw error;
    return result[0];
}

/**
 * Mengambil history dataset dari Supabase
 * @returns {Promise<Array>}
 */
async function getDatasetsFromCloud() {
    if (!supabaseClient) throw new Error("Supabase belum dikonfigurasi.");
    
    const user = await getCurrentUser();
    let query = supabaseClient.from('datasets').select('id, name, created_at');
    
    if (user) {
        query = query.eq('user_id', user.id);
    } else {
        query = query.is('user_id', null);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
        
    if (error) throw error;
    return data;
}

/**
 * Menyimpan hasil K-Means ke Supabase
 * @param {number} datasetId - ID dari tabel datasets
 * @param {number} k - Jumlah cluster
 * @param {Object} kmeansResult - Full result object
 * @returns {Promise<Object>}
 */
async function saveResultToCloud(datasetId, k, kmeansResult) {
    if (!supabaseClient) throw new Error("Supabase belum dikonfigurasi.");
    
    const user = await getCurrentUser();

    const { data, error } = await supabaseClient
        .from('clustering_results')
        .insert([
            { 
                dataset_id: datasetId, 
                k: k, 
                result: kmeansResult,
                user_id: user ? user.id : null
            }
        ])
        .select();
        
    if (error) throw error;
    return data[0];
}

window.supabaseClient = supabaseClient;
window.isSupabaseConfigured = isSupabaseConfigured;
window.saveDatasetToCloud = saveDatasetToCloud;
window.getDatasetsFromCloud = getDatasetsFromCloud;
window.saveResultToCloud = saveResultToCloud;

/**
 * Authentication Functions
 */
async function signUp(email, password) {
    if (!supabaseClient) throw new Error("Supabase belum dikonfigurasi.");
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
    });
    if (error) throw error;
    return data;
}

async function signIn(email, password) {
    if (!supabaseClient) throw new Error("Supabase belum dikonfigurasi.");
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) throw error;
    return data;
}

async function signOut() {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
}

async function getCurrentUser() {
    if (!supabaseClient) return null;
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) return null;
    return user;
}

window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
