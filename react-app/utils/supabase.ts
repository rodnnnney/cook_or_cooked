import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ehysqseqcnewyndigvfo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeXNxc2VxY25ld3luZGlndmZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjAwMTI3OSwiZXhwIjoyMDU3NTc3Mjc5fQ.nPhx59SKtmX5YFnT8owUXPNmQsZhvmXmMvKS8_Luen4";

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
