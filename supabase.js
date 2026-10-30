// Configuración de Supabase.
// Reemplaza estos dos valores con los datos de tu proyecto (Project Settings > API).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://eahytxmlinznxjkrurlp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0l4f1Zl68h2uK5c4CeZMsg_6sCBhKqn";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const isSupabaseConfigured = !SUPABASE_URL.includes("Electrocredit web") &&
  !SUPABASE_ANON_KEY.includes("PEGA_AQUI");
