// src/utils/wasteData.js

export const WASTE_CATEGORIES = {
  anorganik: {
    id: "anorganik",
    label: "Anorganik (Daur Ulang)",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    types: [
      { id: "plastik_botol", label: "Botol Plastik (Bening/PET)", price: 3000, points: 50 },
      { id: "plastik_campur", label: "Plastik Campur (Ember/Gelas)", price: 1500, points: 30 },
      { id: "kertas_kardus", label: "Kardus & Karton", price: 1500, points: 30 },
      { id: "kertas_hvs", label: "Kertas Putih (Buku/HVS)", price: 2500, points: 40 },
      { id: "kertas_koran", label: "Koran / Kertas Buram", price: 1000, points: 20 },
      { id: "logam_kaleng", label: "Kaleng Aluminium (Minuman)", price: 10000, points: 100 },
      { id: "logam_besi", label: "Besi & Logam Lainnya", price: 3000, points: 50 },
      { id: "kaca", label: "Botol Kaca & Beling", price: 500, points: 10 },
    ]
  },
  organik: {
    id: "organik",
    label: "Organik (Kompos)",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    types: [
      { id: "sisa_makanan", label: "Sisa Makanan (Basah)", price: 100, points: 20 },
      { id: "sampah_kebun", label: "Sampah Kebun (Daun/Ranting)", price: 100, points: 20 },
    ]
  },
  b3: {
    id: "b3",
    label: "B3 & Lainnya",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    types: [
      { id: "jelantah", label: "Minyak Jelantah", price: 5000, points: 80 },
      { id: "elektronik", label: "Elektronik (E-Waste)", price: 5000, points: 100 },
      { id: "baterai", label: "Baterai Bekas", price: 0, points: 100 }, // Poin tinggi untuk keamanan
      { id: "lampu", label: "Lampu Neon/Bohlam", price: 0, points: 100 },
      { id: "tekstil", label: "Pakaian / Tekstil Bekas", price: 500, points: 20 },
    ]
  }
};

/**
 * Helper untuk menghitung estimasi (Tidak Berubah)
 * @param {string} categoryId - key utama
 * @param {string} typeId - id sub jenis
 * @param {number} weightInKg - berat dalam KG
 */
export const calculateEstimate = (categoryId, typeId, weightInKg) => {
  const category = WASTE_CATEGORIES[categoryId];
  if (!category) return { money: 0, points: 0 };

  const item = category.types.find(i => i.id === typeId);
  if (!item) return { money: 0, points: 0 };

  return {
    money: Math.floor(item.price * weightInKg),
    points: Math.floor(item.points * weightInKg)
  };
};

/**
 * Helper untuk mendapatkan semua tipe dalam satu array datar
 * Berguna untuk validasi atau dropdown gabungan
 */
export const getAllWasteTypes = () => {
  let allTypes = [];
  Object.values(WASTE_CATEGORIES).forEach(cat => {
    cat.types.forEach(type => {
      allTypes.push({
        ...type,
        categoryLabel: cat.label,
        categoryId: cat.id
      });
    });
  });
  return allTypes;
};