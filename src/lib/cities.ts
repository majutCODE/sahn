/**
 * A bundled city list, so choosing a location by hand needs no geocoding API.
 * That keeps the non-negotiable intact: prayer times never depend on a network.
 *
 * Names live here rather than in messages/ because this is data, not UI copy —
 * the same reason surah names will not be message keys either.
 *
 * This is a starter set covering the largest Muslim populations and diaspora
 * centres. Expanding it is a content task: a GeoNames extract (CC BY 4.0,
 * attribution required) would take it to every city above ~100k.
 */

export type City = {
  id: string;
  en: string;
  ar: string;
  latitude: number;
  longitude: number;
  timeZone: string;
};

export const CITIES: readonly City[] = [
  // Arabian peninsula
  { id: 'mecca', en: 'Mecca', ar: 'مكة المكرمة', latitude: 21.3891, longitude: 39.8579, timeZone: 'Asia/Riyadh' },
  { id: 'medina', en: 'Medina', ar: 'المدينة المنورة', latitude: 24.5247, longitude: 39.5692, timeZone: 'Asia/Riyadh' },
  { id: 'riyadh', en: 'Riyadh', ar: 'الرياض', latitude: 24.7136, longitude: 46.6753, timeZone: 'Asia/Riyadh' },
  { id: 'jeddah', en: 'Jeddah', ar: 'جدة', latitude: 21.4858, longitude: 39.1925, timeZone: 'Asia/Riyadh' },
  { id: 'dubai', en: 'Dubai', ar: 'دبي', latitude: 25.2048, longitude: 55.2708, timeZone: 'Asia/Dubai' },
  { id: 'abu-dhabi', en: 'Abu Dhabi', ar: 'أبو ظبي', latitude: 24.4539, longitude: 54.3773, timeZone: 'Asia/Dubai' },
  { id: 'doha', en: 'Doha', ar: 'الدوحة', latitude: 25.2854, longitude: 51.531, timeZone: 'Asia/Qatar' },
  { id: 'kuwait-city', en: 'Kuwait City', ar: 'مدينة الكويت', latitude: 29.3759, longitude: 47.9774, timeZone: 'Asia/Kuwait' },
  { id: 'manama', en: 'Manama', ar: 'المنامة', latitude: 26.2285, longitude: 50.586, timeZone: 'Asia/Bahrain' },
  { id: 'muscat', en: 'Muscat', ar: 'مسقط', latitude: 23.588, longitude: 58.3829, timeZone: 'Asia/Muscat' },
  { id: 'sanaa', en: 'Sanaa', ar: 'صنعاء', latitude: 15.3694, longitude: 44.191, timeZone: 'Asia/Aden' },

  // Levant, Iraq, Iran, Turkey
  { id: 'amman', en: 'Amman', ar: 'عمّان', latitude: 31.9454, longitude: 35.9284, timeZone: 'Asia/Amman' },
  { id: 'beirut', en: 'Beirut', ar: 'بيروت', latitude: 33.8938, longitude: 35.5018, timeZone: 'Asia/Beirut' },
  { id: 'damascus', en: 'Damascus', ar: 'دمشق', latitude: 33.5138, longitude: 36.2765, timeZone: 'Asia/Damascus' },
  { id: 'jerusalem', en: 'Jerusalem', ar: 'القدس', latitude: 31.7683, longitude: 35.2137, timeZone: 'Asia/Hebron' },
  { id: 'gaza', en: 'Gaza', ar: 'غزة', latitude: 31.5017, longitude: 34.4668, timeZone: 'Asia/Hebron' },
  { id: 'baghdad', en: 'Baghdad', ar: 'بغداد', latitude: 33.3152, longitude: 44.3661, timeZone: 'Asia/Baghdad' },
  { id: 'najaf', en: 'Najaf', ar: 'النجف', latitude: 32.0259, longitude: 44.346, timeZone: 'Asia/Baghdad' },
  { id: 'tehran', en: 'Tehran', ar: 'طهران', latitude: 35.6892, longitude: 51.389, timeZone: 'Asia/Tehran' },
  { id: 'mashhad', en: 'Mashhad', ar: 'مشهد', latitude: 36.2605, longitude: 59.6168, timeZone: 'Asia/Tehran' },
  { id: 'istanbul', en: 'Istanbul', ar: 'إسطنبول', latitude: 41.0082, longitude: 28.9784, timeZone: 'Europe/Istanbul' },
  { id: 'ankara', en: 'Ankara', ar: 'أنقرة', latitude: 39.9334, longitude: 32.8597, timeZone: 'Europe/Istanbul' },

  // North and sub-Saharan Africa
  { id: 'cairo', en: 'Cairo', ar: 'القاهرة', latitude: 30.0444, longitude: 31.2357, timeZone: 'Africa/Cairo' },
  { id: 'alexandria', en: 'Alexandria', ar: 'الإسكندرية', latitude: 31.2001, longitude: 29.9187, timeZone: 'Africa/Cairo' },
  { id: 'khartoum', en: 'Khartoum', ar: 'الخرطوم', latitude: 15.5007, longitude: 32.5599, timeZone: 'Africa/Khartoum' },
  { id: 'tripoli', en: 'Tripoli', ar: 'طرابلس', latitude: 32.8872, longitude: 13.1913, timeZone: 'Africa/Tripoli' },
  { id: 'tunis', en: 'Tunis', ar: 'تونس', latitude: 36.8065, longitude: 10.1815, timeZone: 'Africa/Tunis' },
  { id: 'algiers', en: 'Algiers', ar: 'الجزائر', latitude: 36.7538, longitude: 3.0588, timeZone: 'Africa/Algiers' },
  { id: 'casablanca', en: 'Casablanca', ar: 'الدار البيضاء', latitude: 33.5731, longitude: -7.5898, timeZone: 'Africa/Casablanca' },
  { id: 'rabat', en: 'Rabat', ar: 'الرباط', latitude: 34.0209, longitude: -6.8416, timeZone: 'Africa/Casablanca' },
  { id: 'fes', en: 'Fes', ar: 'فاس', latitude: 34.0331, longitude: -5.0003, timeZone: 'Africa/Casablanca' },
  { id: 'nouakchott', en: 'Nouakchott', ar: 'نواكشوط', latitude: 18.0735, longitude: -15.9582, timeZone: 'Africa/Nouakchott' },
  { id: 'dakar', en: 'Dakar', ar: 'داكار', latitude: 14.7167, longitude: -17.4677, timeZone: 'Africa/Dakar' },
  { id: 'bamako', en: 'Bamako', ar: 'باماكو', latitude: 12.6392, longitude: -8.0029, timeZone: 'Africa/Bamako' },
  { id: 'kano', en: 'Kano', ar: 'كانو', latitude: 12.0022, longitude: 8.592, timeZone: 'Africa/Lagos' },
  { id: 'lagos', en: 'Lagos', ar: 'لاغوس', latitude: 6.5244, longitude: 3.3792, timeZone: 'Africa/Lagos' },
  { id: 'mogadishu', en: 'Mogadishu', ar: 'مقديشو', latitude: 2.0469, longitude: 45.3182, timeZone: 'Africa/Mogadishu' },
  { id: 'nairobi', en: 'Nairobi', ar: 'نيروبي', latitude: -1.2921, longitude: 36.8219, timeZone: 'Africa/Nairobi' },
  { id: 'johannesburg', en: 'Johannesburg', ar: 'جوهانسبرغ', latitude: -26.2041, longitude: 28.0473, timeZone: 'Africa/Johannesburg' },
  { id: 'cape-town', en: 'Cape Town', ar: 'كيب تاون', latitude: -33.9249, longitude: 18.4241, timeZone: 'Africa/Johannesburg' },

  // South, Central and Southeast Asia
  { id: 'kabul', en: 'Kabul', ar: 'كابول', latitude: 34.5553, longitude: 69.2075, timeZone: 'Asia/Kabul' },
  { id: 'karachi', en: 'Karachi', ar: 'كراتشي', latitude: 24.8607, longitude: 67.0011, timeZone: 'Asia/Karachi' },
  { id: 'lahore', en: 'Lahore', ar: 'لاهور', latitude: 31.5204, longitude: 74.3587, timeZone: 'Asia/Karachi' },
  { id: 'islamabad', en: 'Islamabad', ar: 'إسلام آباد', latitude: 33.6844, longitude: 73.0479, timeZone: 'Asia/Karachi' },
  { id: 'dhaka', en: 'Dhaka', ar: 'دكا', latitude: 23.8103, longitude: 90.4125, timeZone: 'Asia/Dhaka' },
  { id: 'delhi', en: 'Delhi', ar: 'دلهي', latitude: 28.6139, longitude: 77.209, timeZone: 'Asia/Kolkata' },
  { id: 'mumbai', en: 'Mumbai', ar: 'مومباي', latitude: 19.076, longitude: 72.8777, timeZone: 'Asia/Kolkata' },
  { id: 'hyderabad-in', en: 'Hyderabad', ar: 'حيدر آباد', latitude: 17.385, longitude: 78.4867, timeZone: 'Asia/Kolkata' },
  { id: 'colombo', en: 'Colombo', ar: 'كولومبو', latitude: 6.9271, longitude: 79.8612, timeZone: 'Asia/Colombo' },
  { id: 'male', en: 'Malé', ar: 'ماليه', latitude: 4.1755, longitude: 73.5093, timeZone: 'Indian/Maldives' },
  { id: 'tashkent', en: 'Tashkent', ar: 'طشقند', latitude: 41.2995, longitude: 69.2401, timeZone: 'Asia/Tashkent' },
  { id: 'almaty', en: 'Almaty', ar: 'ألماتي', latitude: 43.222, longitude: 76.8512, timeZone: 'Asia/Almaty' },
  { id: 'baku', en: 'Baku', ar: 'باكو', latitude: 40.4093, longitude: 49.8671, timeZone: 'Asia/Baku' },
  { id: 'kuala-lumpur', en: 'Kuala Lumpur', ar: 'كوالالمبور', latitude: 3.139, longitude: 101.6869, timeZone: 'Asia/Kuala_Lumpur' },
  { id: 'jakarta', en: 'Jakarta', ar: 'جاكرتا', latitude: -6.2088, longitude: 106.8456, timeZone: 'Asia/Jakarta' },
  { id: 'surabaya', en: 'Surabaya', ar: 'سورابايا', latitude: -7.2575, longitude: 112.7521, timeZone: 'Asia/Jakarta' },
  { id: 'singapore', en: 'Singapore', ar: 'سنغافورة', latitude: 1.3521, longitude: 103.8198, timeZone: 'Asia/Singapore' },
  { id: 'brunei', en: 'Bandar Seri Begawan', ar: 'بندر سري بكاوان', latitude: 4.9031, longitude: 114.9398, timeZone: 'Asia/Brunei' },

  // Europe
  { id: 'london', en: 'London', ar: 'لندن', latitude: 51.5074, longitude: -0.1278, timeZone: 'Europe/London' },
  { id: 'birmingham', en: 'Birmingham', ar: 'برمنغهام', latitude: 52.4862, longitude: -1.8904, timeZone: 'Europe/London' },
  { id: 'manchester', en: 'Manchester', ar: 'مانشستر', latitude: 53.4808, longitude: -2.2426, timeZone: 'Europe/London' },
  { id: 'bradford', en: 'Bradford', ar: 'برادفورد', latitude: 53.795, longitude: -1.7594, timeZone: 'Europe/London' },
  { id: 'glasgow', en: 'Glasgow', ar: 'غلاسكو', latitude: 55.8642, longitude: -4.2518, timeZone: 'Europe/London' },
  { id: 'dublin', en: 'Dublin', ar: 'دبلن', latitude: 53.3498, longitude: -6.2603, timeZone: 'Europe/Dublin' },
  { id: 'paris', en: 'Paris', ar: 'باريس', latitude: 48.8566, longitude: 2.3522, timeZone: 'Europe/Paris' },
  { id: 'marseille', en: 'Marseille', ar: 'مرسيليا', latitude: 43.2965, longitude: 5.3698, timeZone: 'Europe/Paris' },
  { id: 'brussels', en: 'Brussels', ar: 'بروكسل', latitude: 50.8503, longitude: 4.3517, timeZone: 'Europe/Brussels' },
  { id: 'amsterdam', en: 'Amsterdam', ar: 'أمستردام', latitude: 52.3676, longitude: 4.9041, timeZone: 'Europe/Amsterdam' },
  { id: 'berlin', en: 'Berlin', ar: 'برلين', latitude: 52.52, longitude: 13.405, timeZone: 'Europe/Berlin' },
  { id: 'frankfurt', en: 'Frankfurt', ar: 'فرانكفورت', latitude: 50.1109, longitude: 8.6821, timeZone: 'Europe/Berlin' },
  { id: 'stockholm', en: 'Stockholm', ar: 'ستوكهولم', latitude: 59.3293, longitude: 18.0686, timeZone: 'Europe/Stockholm' },
  { id: 'oslo', en: 'Oslo', ar: 'أوسلو', latitude: 59.9139, longitude: 10.7522, timeZone: 'Europe/Oslo' },
  { id: 'copenhagen', en: 'Copenhagen', ar: 'كوبنهاغن', latitude: 55.6761, longitude: 12.5683, timeZone: 'Europe/Copenhagen' },
  { id: 'sarajevo', en: 'Sarajevo', ar: 'سراييفو', latitude: 43.8563, longitude: 18.4131, timeZone: 'Europe/Sarajevo' },
  { id: 'moscow', en: 'Moscow', ar: 'موسكو', latitude: 55.7558, longitude: 37.6173, timeZone: 'Europe/Moscow' },

  // Americas and Oceania
  { id: 'toronto', en: 'Toronto', ar: 'تورونتو', latitude: 43.6532, longitude: -79.3832, timeZone: 'America/Toronto' },
  { id: 'montreal', en: 'Montreal', ar: 'مونتريال', latitude: 45.5019, longitude: -73.5674, timeZone: 'America/Toronto' },
  { id: 'new-york', en: 'New York', ar: 'نيويورك', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
  { id: 'detroit', en: 'Detroit', ar: 'ديترويت', latitude: 42.3314, longitude: -83.0458, timeZone: 'America/Detroit' },
  { id: 'chicago', en: 'Chicago', ar: 'شيكاغو', latitude: 41.8781, longitude: -87.6298, timeZone: 'America/Chicago' },
  { id: 'houston', en: 'Houston', ar: 'هيوستن', latitude: 29.7604, longitude: -95.3698, timeZone: 'America/Chicago' },
  { id: 'minneapolis', en: 'Minneapolis', ar: 'مينيابوليس', latitude: 44.9778, longitude: -93.265, timeZone: 'America/Chicago' },
  { id: 'atlanta', en: 'Atlanta', ar: 'أتلانتا', latitude: 33.749, longitude: -84.388, timeZone: 'America/New_York' },
  { id: 'los-angeles', en: 'Los Angeles', ar: 'لوس أنجلوس', latitude: 34.0522, longitude: -118.2437, timeZone: 'America/Los_Angeles' },
  { id: 'sydney', en: 'Sydney', ar: 'سيدني', latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney' },
  { id: 'melbourne', en: 'Melbourne', ar: 'ملبورن', latitude: -37.8136, longitude: 144.9631, timeZone: 'Australia/Melbourne' }
];

export function findCity(id: string | undefined): City | undefined {
  return id ? CITIES.find((c) => c.id === id) : undefined;
}

/** Case- and diacritic-insensitive search across both scripts. */
export function searchCities(query: string, limit = 8): City[] {
  const q = normalise(query);
  if (!q) return [];
  return CITIES.filter(
    (c) => normalise(c.en).includes(q) || normalise(c.ar).includes(q)
  ).slice(0, limit);
}

function normalise(value: string): string {
  return value
    .normalize('NFD')
    // Strip Latin diacritics and Arabic harakat so "Male" finds "Malé" and
    // an unvocalised query still matches a vocalised name.
    .replace(/[̀-ًͯ-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();
}
