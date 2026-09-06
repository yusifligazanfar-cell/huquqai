import courtsData from '@/data/courts.json';

export interface Court {
  id: number;
  court_id: number;
  title: string;
  slug: string;
  type: string;
  region: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  url: string;
}

export const ALL_COURTS: Court[] = courtsData as Court[];

export function getAllCourts(): Court[] {
  return ALL_COURTS;
}

export function getCourtTypes(): string[] {
  const types = new Set<string>();
  ALL_COURTS.forEach(c => {
    if (c.type) types.add(c.type);
  });
  return Array.from(types);
}

export function getCourtRegions(): string[] {
  const regions = new Set<string>();
  ALL_COURTS.forEach(c => {
    if (c.region) regions.add(c.region);
  });
  return Array.from(regions).sort((a, b) => a.localeCompare(b, 'az'));
}

function normalizeStr(text: string): string {
  return text.toLowerCase()
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/ə/g, 'e').replace(/ç/g, 'c').replace(/ş/g, 's')
    .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ğ/g, 'g')
    .trim();
}

export function findBestCourtMatch(text: string, caseCategoryHint: string = 'mülki'): Court | null {
  if (!text) return null;
  const normText = normalizeStr(text);

  // 1. Determine target court type
  let targetType = 'Rayon (şəhər) məhkəmələri';
  if (normText.includes('inzibati mehkeme') || caseCategoryHint.includes('inzibati')) {
    targetType = 'İnzibati məhkəmələr';
  } else if (normText.includes('kommersiya mehkeme') || caseCategoryHint.includes('kommersiya') || normText.includes('sahibkar')) {
    targetType = 'Kommersiya məhkəmələri';
  } else if (normText.includes('apellyasiya mehkeme') || caseCategoryHint.includes('apellyasiya')) {
    targetType = 'Apellyasiya məhkəmələri';
  } else if (normText.includes('agir cinayet') || caseCategoryHint.includes('ağır')) {
    targetType = 'Ağır cinayətlər məhkəmələri';
  } else if (normText.includes('herbi mehkeme') || caseCategoryHint.includes('hərbi')) {
    targetType = 'Hərbi məhkəmələr';
  }

  // 2. Look for Baku districts first (most frequent and specific)
  const bakuDistricts = [
    'yasamal', 'nesimi', 'bineqedi', 'nerimanov', 'xetai',
    'sebail', 'nizami', 'suraxani', 'sabuncu', 'xezer', 'qaradag', 'pirallahi'
  ];

  for (const dist of bakuDistricts) {
    if (normText.includes(dist)) {
      const match = ALL_COURTS.find(c => {
        const tNorm = normalizeStr(c.title);
        return tNorm.includes(dist) && c.type === targetType;
      });
      if (match) return match;
    }
  }

  // 3. Look for regional cities/districts (e.g. Sumqayıt, Gəncə, Şəki, Lənkəran, Şirvan, Bərdə, Quba, etc.)
  // Sort candidate regions by length descending to match longest specific name first
  const districtList: { name: string; court: Court }[] = [];
  for (const court of ALL_COURTS) {
    if (court.type !== targetType) continue;
    let cleanReg = normalizeStr(court.region)
      .replace(' rayonu', '')
      .replace(' seheri', '')
      .replace(' rayon', '')
      .trim();

    if (cleanReg && cleanReg !== 'baki') {
      districtList.push({ name: cleanReg, court });
    }
  }

  districtList.sort((a, b) => b.name.length - a.name.length);

  for (const item of districtList) {
    if (normText.includes(item.name)) {
      return item.court;
    }
  }

  // 4. If nothing specific found, check if Baku general is mentioned for specialized courts
  if (normText.includes('baki')) {
    const bakiCourt = ALL_COURTS.find(c => c.type === targetType && normalizeStr(c.title).includes('baki'));
    if (bakiCourt) return bakiCourt;
  }

  return null;
}
