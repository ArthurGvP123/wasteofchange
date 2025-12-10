// Konfigurasi khusus Admin/Sistem
// Mengambil kunci rahasia dari file .env
export const ADMIN_SECRET_KEY = import.meta.env.VITE_ADMIN_SECRET_KEY;

// Helper untuk generate ID 8 Karakter (Huruf Kapital + Angka)
export const generateAffiliateID = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};