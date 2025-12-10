const BASE_URL = "https://www.emsifa.com/api-wilayah-indonesia/api";

// Helper fetcher agar kode lebih rapi
const fetcher = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal mengambil data wilayah");
    return await response.json();
  } catch (error) {
    console.error("API Wilayah Error:", error);
    return [];
  }
};

export const getProvinces = () => fetcher(`${BASE_URL}/provinces.json`);
export const getRegencies = (provinceId) => fetcher(`${BASE_URL}/regencies/${provinceId}.json`);
export const getDistricts = (regencyId) => fetcher(`${BASE_URL}/districts/${regencyId}.json`);