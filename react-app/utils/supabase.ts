import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ehysqseqcnewyndigvfo.supabase.co";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_API_KEY as string;

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
