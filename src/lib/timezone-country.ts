/**
 * Fallback location signal for when the host adds no IP-country header (local dev, non-Vercel hosting):
 * the browser's IANA time zone mapped to an ISO country. Covers each country's main zones.
 */
const zones: Record<string, string> = {
  // Middle East
  "Asia/Dubai": "AE", "Asia/Muscat": "OM", "Asia/Riyadh": "SA", "Asia/Qatar": "QA", "Asia/Bahrain": "BH", "Asia/Kuwait": "KW",
  "Asia/Baghdad": "IQ", "Asia/Tehran": "IR", "Asia/Amman": "JO", "Asia/Beirut": "LB", "Asia/Damascus": "SY", "Asia/Aden": "YE",
  "Asia/Jerusalem": "IL", "Asia/Tel_Aviv": "IL", "Asia/Gaza": "PS", "Asia/Hebron": "PS", "Europe/Istanbul": "TR", "Asia/Istanbul": "TR",
  "Asia/Nicosia": "CY", "Asia/Famagusta": "CY", "Europe/Nicosia": "CY",
  // South & Central Asia
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Karachi": "PK", "Asia/Dhaka": "BD", "Asia/Dacca": "BD", "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP", "Asia/Katmandu": "NP", "Asia/Thimphu": "BT", "Indian/Maldives": "MV", "Asia/Kabul": "AF",
  "Asia/Tashkent": "UZ", "Asia/Samarkand": "UZ", "Asia/Almaty": "KZ", "Asia/Qostanay": "KZ", "Asia/Aqtobe": "KZ", "Asia/Aqtau": "KZ",
  "Asia/Atyrau": "KZ", "Asia/Oral": "KZ", "Asia/Qyzylorda": "KZ", "Asia/Bishkek": "KG", "Asia/Dushanbe": "TJ", "Asia/Ashgabat": "TM",
  "Asia/Baku": "AZ", "Asia/Tbilisi": "GE", "Asia/Yerevan": "AM",
  // East & South-East Asia
  "Asia/Shanghai": "CN", "Asia/Urumqi": "CN", "Asia/Chongqing": "CN", "Asia/Harbin": "CN", "Asia/Hong_Kong": "HK", "Asia/Macau": "MO",
  "Asia/Taipei": "TW", "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Pyongyang": "KP", "Asia/Ulaanbaatar": "MN", "Asia/Manila": "PH",
  "Asia/Singapore": "SG", "Asia/Kuala_Lumpur": "MY", "Asia/Kuching": "MY", "Asia/Jakarta": "ID", "Asia/Pontianak": "ID",
  "Asia/Makassar": "ID", "Asia/Jayapura": "ID", "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN",
  "Asia/Phnom_Penh": "KH", "Asia/Vientiane": "LA", "Asia/Yangon": "MM", "Asia/Rangoon": "MM", "Asia/Brunei": "BN", "Asia/Dili": "TL",
  // Europe
  "Europe/London": "GB", "Europe/Belfast": "GB", "Europe/Dublin": "IE", "Europe/Lisbon": "PT", "Atlantic/Madeira": "PT",
  "Atlantic/Azores": "PT", "Europe/Madrid": "ES", "Atlantic/Canary": "ES", "Africa/Ceuta": "ES", "Europe/Paris": "FR",
  "Europe/Brussels": "BE", "Europe/Amsterdam": "NL", "Europe/Luxembourg": "LU", "Europe/Berlin": "DE", "Europe/Busingen": "DE",
  "Europe/Zurich": "CH", "Europe/Vienna": "AT", "Europe/Rome": "IT", "Europe/Malta": "MT", "Europe/Monaco": "MC",
  "Europe/Copenhagen": "DK", "Europe/Oslo": "NO", "Europe/Stockholm": "SE", "Europe/Helsinki": "FI", "Atlantic/Reykjavik": "IS",
  "Europe/Warsaw": "PL", "Europe/Prague": "CZ", "Europe/Bratislava": "SK", "Europe/Budapest": "HU", "Europe/Ljubljana": "SI",
  "Europe/Zagreb": "HR", "Europe/Belgrade": "RS", "Europe/Sarajevo": "BA", "Europe/Podgorica": "ME", "Europe/Skopje": "MK",
  "Europe/Tirane": "AL", "Europe/Athens": "GR", "Europe/Sofia": "BG", "Europe/Bucharest": "RO", "Europe/Chisinau": "MD",
  "Europe/Kiev": "UA", "Europe/Kyiv": "UA", "Europe/Minsk": "BY", "Europe/Vilnius": "LT", "Europe/Riga": "LV", "Europe/Tallinn": "EE",
  "Europe/Moscow": "RU", "Europe/Kaliningrad": "RU", "Europe/Samara": "RU", "Asia/Yekaterinburg": "RU", "Asia/Novosibirsk": "RU",
  "Asia/Krasnoyarsk": "RU", "Asia/Irkutsk": "RU", "Asia/Vladivostok": "RU",
  // Africa
  "Africa/Cairo": "EG", "Africa/Casablanca": "MA", "Africa/Algiers": "DZ", "Africa/Tunis": "TN", "Africa/Tripoli": "LY",
  "Africa/Khartoum": "SD", "Africa/Juba": "SS", "Africa/Addis_Ababa": "ET", "Africa/Asmara": "ER", "Africa/Djibouti": "DJ",
  "Africa/Mogadishu": "SO", "Africa/Nairobi": "KE", "Africa/Kampala": "UG", "Africa/Dar_es_Salaam": "TZ", "Africa/Kigali": "RW",
  "Africa/Bujumbura": "BI", "Africa/Lagos": "NG", "Africa/Accra": "GH", "Africa/Abidjan": "CI", "Africa/Dakar": "SN",
  "Africa/Bamako": "ML", "Africa/Conakry": "GN", "Africa/Freetown": "SL", "Africa/Monrovia": "LR", "Africa/Lome": "TG",
  "Africa/Porto-Novo": "BJ", "Africa/Ouagadougou": "BF", "Africa/Niamey": "NE", "Africa/Ndjamena": "TD", "Africa/Douala": "CM",
  "Africa/Libreville": "GA", "Africa/Brazzaville": "CG", "Africa/Kinshasa": "CD", "Africa/Lubumbashi": "CD", "Africa/Luanda": "AO",
  "Africa/Lusaka": "ZM", "Africa/Harare": "ZW", "Africa/Maputo": "MZ", "Africa/Blantyre": "MW", "Africa/Johannesburg": "ZA",
  "Africa/Windhoek": "NA", "Africa/Gaborone": "BW", "Africa/Maseru": "LS", "Africa/Mbabane": "SZ", "Indian/Antananarivo": "MG",
  "Indian/Mauritius": "MU", "Indian/Mahe": "SC", "Africa/Banjul": "GM", "Africa/Nouakchott": "MR", "Atlantic/Cape_Verde": "CV",
  // Americas
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA", "America/Winnipeg": "CA", "America/Halifax": "CA",
  "America/St_Johns": "CA", "America/Regina": "CA", "America/Moncton": "CA", "America/Montreal": "CA", "America/Whitehorse": "CA",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Phoenix": "US", "America/Los_Angeles": "US",
  "America/Anchorage": "US", "Pacific/Honolulu": "US", "America/Detroit": "US", "America/Indiana/Indianapolis": "US", "America/Boise": "US",
  "America/Mexico_City": "MX", "America/Cancun": "MX", "America/Monterrey": "MX", "America/Tijuana": "MX", "America/Guatemala": "GT",
  "America/El_Salvador": "SV", "America/Tegucigalpa": "HN", "America/Managua": "NI", "America/Costa_Rica": "CR", "America/Panama": "PA",
  "America/Havana": "CU", "America/Jamaica": "JM", "America/Port-au-Prince": "HT", "America/Santo_Domingo": "DO",
  "America/Puerto_Rico": "PR", "America/Port_of_Spain": "TT", "America/Barbados": "BB", "America/Nassau": "BS",
  "America/St_Kitts": "KN", "America/St_Lucia": "LC", "America/Antigua": "AG", "America/Grand_Turk": "TC",
  "America/Bogota": "CO", "America/Caracas": "VE", "America/Guyana": "GY", "America/Paramaribo": "SR", "America/Lima": "PE",
  "America/Guayaquil": "EC", "America/La_Paz": "BO", "America/Santiago": "CL", "America/Asuncion": "PY", "America/Montevideo": "UY",
  "America/Argentina/Buenos_Aires": "AR", "America/Buenos_Aires": "AR", "America/Sao_Paulo": "BR", "America/Manaus": "BR",
  "America/Fortaleza": "BR", "America/Recife": "BR", "America/Bahia": "BR", "America/Belem": "BR",
  // Oceania
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU", "Australia/Perth": "AU", "Australia/Adelaide": "AU",
  "Australia/Hobart": "AU", "Australia/Darwin": "AU", "Australia/Canberra": "AU", "Pacific/Auckland": "NZ", "Pacific/Chatham": "NZ",
  "Pacific/Fiji": "FJ", "Pacific/Port_Moresby": "PG", "Pacific/Guam": "GU", "Pacific/Pago_Pago": "AS", "Pacific/Apia": "WS", "Pacific/Tongatapu": "TO",
};

export function timezoneCountry(): string | null {
  try {
    return zones[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? null;
  } catch {
    return null;
  }
}
