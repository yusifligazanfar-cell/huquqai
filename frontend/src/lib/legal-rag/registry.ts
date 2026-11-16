import { StructuredLaw } from './types';

export const LAW_REGISTRY: Record<string, StructuredLaw> = {
  "konstitusiya": {
    id: "konstitusiya",
    frameworkId: 897,
    name: "Azərbaycan Respublikasının Konstitusiyası",
    shortName: "Konstitusiya",
    category: "Konstitusiya hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/897",
    fallbackUrl: "https://e-qanun.az/framework/897",
    files: ["e_qanun_897.txt", "eqanun_mega_44030_Konstitusiya.txt", "konstitusiya.txt"]
  },
  "mulki": {
    id: "mulki",
    frameworkId: 46944,
    name: "Azərbaycan Respublikasının Mülki Məcəlləsi",
    shortName: "Mülki Məcəllə",
    category: "Mülki hüquq",
    sourceUrl: "https://www.e-qanun.ai/results/46944",
    fallbackUrl: "https://e-qanun.az/framework/46944",
    files: ["eqanun_mega_46944_Mülki_Məcəllə.txt", "eqanun_mega_46944_Mülki_Məcəllə_I_Hissə.txt", "e_qanun_46944.txt"]
  },
  "aile": {
    id: "aile",
    frameworkId: 46946,
    name: "Azərbaycan Respublikasının Ailə Məcəlləsi",
    shortName: "Ailə Məcəlləsi",
    category: "Ailə hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46946",
    fallbackUrl: "https://e-qanun.az/framework/46946",
    files: ["eqanun_mega_46946_Ailə_Məcəlləsi.txt", "e_qanun_46946.txt", "eqanun_mega_46955_Ailə_Məcəlləsi.txt"]
  },
  "emek": {
    id: "emek",
    frameworkId: 46943,
    name: "Azərbaycan Respublikasının Əmək Məcəlləsi",
    shortName: "Əmək Məcəlləsi",
    category: "Əmək hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46943",
    fallbackUrl: "https://e-qanun.az/framework/46943",
    files: ["eqanun_mega_46943_Əmək_Məcəlləsi.txt", "e_qanun_46943.txt", "eqanun_mega_46942_Əmək_Məcəlləsi.txt"]
  },
  "cinayet": {
    id: "cinayet",
    frameworkId: 46947,
    name: "Azərbaycan Respublikasının Cinayət Məcəlləsi",
    shortName: "Cinayət Məcəlləsi",
    category: "Cinayət hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46947",
    fallbackUrl: "https://e-qanun.az/framework/46947",
    files: ["eqanun_mega_46947_Mülki_Məcəllə.txt", "e_qanun_46947.txt"]
  },
  "inzibati_xetalar": {
    id: "inzibati_xetalar",
    frameworkId: 46960,
    name: "Azərbaycan Respublikasının İnzibati Xətalar Məcəlləsi",
    shortName: "İnzibati Xətalar Məcəlləsi",
    category: "İnzibati hüquq",
    sourceUrl: "https://www.e-qanun.ai/results/46960",
    fallbackUrl: "https://e-qanun.az/framework/46960",
    files: ["eqanun_mega_46960_İnzibati_Xətalar_Məcəlləsi.txt", "e_qanun_46960.txt"]
  },
  "mulki_prosessual": {
    id: "mulki_prosessual",
    frameworkId: 46945,
    name: "Azərbaycan Respublikasının Mülki Prosessual Məcəlləsi",
    shortName: "Mülki Prosessual Məcəllə",
    category: "Mülki proses",
    sourceUrl: "https://www.e-qanun.ai/results/46945",
    fallbackUrl: "https://e-qanun.az/framework/46945",
    files: ["eqanun_mega_46945_Mülki_Prosessual_Məcəllə.txt", "eqanun_mega_46945_Mülki_Prosessual_Məcəlləsi.txt", "e_qanun_46945.txt"]
  },
  "cinayet_prosessual": {
    id: "cinayet_prosessual",
    frameworkId: 46950,
    name: "Azərbaycan Respublikasının Cinayət-Prosessual Məcəlləsi",
    shortName: "Cinayət-Prosessual Məcəllə",
    category: "Cinayət prosesi",
    sourceUrl: "https://www.e-qanun.ai/results/46950",
    fallbackUrl: "https://e-qanun.az/framework/46950",
    files: ["eqanun_mega_46950_Cinayət_Prosessual_Məcəllə.txt", "eqanun_mega_46947_Cinayət_Prosessual_Məcəlləsi.txt", "e_qanun_46950.txt"]
  },
  "inzibati_prosessual": {
    id: "inzibati_prosessual",
    frameworkId: 46956,
    name: "Azərbaycan Respublikasının İnzibati Prosessual Məcəlləsi",
    shortName: "İnzibati Prosessual Məcəllə",
    category: "İnzibati proses",
    sourceUrl: "https://www.e-qanun.ai/results/46956",
    fallbackUrl: "https://e-qanun.az/framework/46956",
    files: ["eqanun_mega_46956_İnzibati_Prosessual_Məcəlləsi.txt", "e_qanun_46956.txt"]
  },
  "gomruk": {
    id: "gomruk",
    frameworkId: 46957,
    name: "Azərbaycan Respublikasının Gömrük Məcəlləsi",
    shortName: "Gömrük Məcəlləsi",
    category: "Gömrük hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46957",
    fallbackUrl: "https://e-qanun.az/framework/46957",
    files: ["e_qanun_46957.txt"]
  },
  "miqrasiya": {
    id: "miqrasiya",
    frameworkId: 46959,
    name: "Azərbaycan Respublikasının Miqrasiya Məcəlləsi",
    shortName: "Miqrasiya Məcəlləsi",
    category: "Miqrasiya hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46959",
    fallbackUrl: "https://e-qanun.az/framework/46959",
    files: ["e_qanun_46959.txt"]
  },
  "secki": {
    id: "secki",
    frameworkId: 46953,
    name: "Azərbaycan Respublikasının Seçki Məcəlləsi",
    shortName: "Seçki Məcəlləsi",
    category: "Seçki hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46953",
    fallbackUrl: "https://e-qanun.az/framework/46953",
    files: ["e_qanun_46953.txt"]
  },
  "cezalarin_icrasi": {
    id: "cezalarin_icrasi",
    frameworkId: 46951,
    name: "Azərbaycan Respublikasının Cəzaların İcrası Məcəlləsi",
    shortName: "Cəzaların İcrası Məcəlləsi",
    category: "Cəza-icra hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46951",
    fallbackUrl: "https://e-qanun.az/framework/46951",
    files: ["e_qanun_46951.txt"]
  },
  "su": {
    id: "su",
    frameworkId: 46940,
    name: "Azərbaycan Respublikasının Su Məcəlləsi",
    shortName: "Su Məcəlləsi",
    category: "Su hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46940",
    fallbackUrl: "https://e-qanun.az/framework/46940",
    files: ["e_qanun_46940.txt"]
  },
  "mese": {
    id: "mese",
    frameworkId: 46941,
    name: "Azərbaycan Respublikasının Meşə Məcəlləsi",
    shortName: "Meşə Məcəlləsi",
    category: "Meşə hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46941",
    fallbackUrl: "https://e-qanun.az/framework/46941",
    files: ["e_qanun_46941.txt"]
  },
  "ticaret_gemiciliyi": {
    id: "ticaret_gemiciliyi",
    frameworkId: 46952,
    name: "Azərbaycan Respublikasının Ticarət Gəmiçiliyi Məcəlləsi",
    shortName: "Ticarət Gəmiçiliyi Məcəlləsi",
    category: "Dəniz hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46952",
    fallbackUrl: "https://e-qanun.az/framework/46952",
    files: ["e_qanun_46952.txt"]
  },
  "vergi": {
    id: "vergi",
    frameworkId: 46948,
    name: "Azərbaycan Respublikasının Vergi Məcəlləsi",
    shortName: "Vergi Məcəlləsi",
    category: "Vergi hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46948",
    fallbackUrl: "https://e-qanun.az/framework/46948",
    files: ["eqanun_mega_46948_Vergi_Məcəlləsi.txt", "e_qanun_46948.txt"]
  },
  "yol_hereketi": {
    id: "yol_hereketi",
    frameworkId: 3423,
    name: "«Yol hərəkəti haqqında» Azərbaycan Respublikasının Qanunu",
    shortName: "Yol hərəkəti haqqında Qanun",
    category: "Yol hərəkəti",
    sourceUrl: "https://www.e-qanun.ai/results/3423",
    fallbackUrl: "https://e-qanun.az/framework/3423",
    files: ["eqanun_mega_46953_Yol_hərəkəti_haqqında_Qanun.txt"]
  },
  "istehlakci": {
    id: "istehlakci",
    frameworkId: 9479,
    name: "İstehlakçıların hüquqlarının müdafiəsi haqqında Azərbaycan Respublikasının Qanunu",
    shortName: "İstehlakçıların hüquqlarının müdafiəsi haqqında Qanun",
    category: "İstehlakçı hüquqları",
    sourceUrl: "https://www.e-qanun.ai/results/9479",
    fallbackUrl: "https://e-qanun.az/framework/9479",
    files: ["eqanun_mega_46951_İstehlakçıların_hüquqlarının_müdafiəsi_haqqında_Qanun.txt"]
  },
  "mehkimeler": {
    id: "mehkimeler",
    frameworkId: 3933,
    name: "Məhkəmələr və hakimlər haqqında Azərbaycan Respublikasının Qanunu",
    shortName: "Məhkəmələr və hakimlər haqqında Qanun",
    category: "Məhkəmə quruluşu",
    sourceUrl: "https://www.e-qanun.ai/results/3933",
    fallbackUrl: "https://e-qanun.az/framework/3933",
    files: ["eqanun_mega_3933_Məhkəmələr_və_hakimlər_haqqında_qanun.txt"]
  },
  "sehersalma": {
    id: "sehersalma",
    frameworkId: 46958,
    name: "Azərbaycan Respublikasının Şəhərsalma və Tikinti Məcəlləsi",
    shortName: "Şəhərsalma və Tikinti Məcəlləsi",
    category: "Tikinti hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46958",
    fallbackUrl: "https://e-qanun.az/framework/46958",
    files: ["eqanun_mega_46955_Şəhərsalma_və_Tikinti_Məcəlləsi.txt"]
  },
  "torpaq": {
    id: "torpaq",
    frameworkId: 46942,
    name: "Azərbaycan Respublikasının Torpaq Məcəlləsi",
    shortName: "Torpaq Məcəlləsi",
    category: "Torpaq hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46942",
    fallbackUrl: "https://e-qanun.az/framework/46942",
    files: ["eqanun_mega_46942_Torpaq_Məcəlləsi.txt"]
  },
  "menzil": {
    id: "menzil",
    frameworkId: 46955,
    name: "Azərbaycan Respublikasının Mənzil Məcəlləsi",
    shortName: "Mənzil Məcəlləsi",
    category: "Mənzil hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46955",
    fallbackUrl: "https://e-qanun.az/framework/46955",
    files: ["eqanun_mega_46955_Mənzil_Məcəlləsi.txt"]
  },
  "tehsil": {
    id: "tehsil",
    frameworkId: 18343,
    name: "Təhsil haqqında Azərbaycan Respublikasının Qanunu",
    shortName: "Təhsil haqqında Qanun",
    category: "Təhsil hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/18343",
    fallbackUrl: "https://e-qanun.az/framework/18343",
    files: ["eqanun_mega_18343_Təhsil_haqqında_qanun.txt", "e_qanun_18343.txt"]
  },
  "notariat": {
    id: "notariat",
    frameworkId: 107,
    name: "Notariat haqqında Azərbaycan Respublikasının Qanunu",
    shortName: "Notariat haqqında Qanun",
    category: "Notariat hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/107",
    fallbackUrl: "https://e-qanun.az/framework/107",
    files: []
  },
  "banklar": {
    id: "banklar",
    frameworkId: 5825,
    name: "Banklar haqqında Azərbaycan Respublikasının Qanunu",
    shortName: "Banklar haqqında Qanun",
    category: "Bank hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/5825",
    fallbackUrl: "https://e-qanun.az/framework/5825",
    files: []
  }
};

export type LawMatchConfidence = 'explicit' | 'strong' | 'weak' | 'none';

export interface CandidateLawsResult {
  primary: StructuredLaw | null;
  candidates: StructuredLaw[];
  confidence: LawMatchConfidence;
}

const EXPLICIT_STATUTE_PATTERNS: Array<{ lawId: string; test: (norm: string) => boolean }> = [
  { lawId: "cinayet_prosessual", test: (n) => n.includes("cinayet prosessual") || n.includes("cinayet-prosessual") || /\bcpm\b/.test(n) },
  { lawId: "mulki_prosessual", test: (n) => n.includes("mulki prosessual") || /\bmpm\b/.test(n) },
  { lawId: "inzibati_prosessual", test: (n) => n.includes("inzibati prosessual") || /\bipm\b/.test(n) },
  { lawId: "cezalarin_icrasi", test: (n) => n.includes("cezalarin icrasi") || n.includes("mehkumlarin") },
  { lawId: "su", test: (n) => n.includes("su mecelle") || n.includes("su obyektleri") },
  { lawId: "mese", test: (n) => n.includes("mese mecelle") || n.includes("mese fondu") },
  { lawId: "ticaret_gemiciliyi", test: (n) => n.includes("ticaret gemiciliyi") },
  { lawId: "secki", test: (n) => n.includes("secki mecelle") },
  { lawId: "konstitusiya", test: (n) => n.includes("konstitusiya") || n.includes("esas qanun") },
  { lawId: "cinayet", test: (n) => n.includes("cinayet mecelle") || /\bcm\b/.test(n) },
  { lawId: "inzibati_xetalar", test: (n) => n.includes("inzibati xetalar mecelle") || /\bixm\b/.test(n) },
  { lawId: "mulki", test: (n) => n.includes("mulki mecelle") || /\bmm\b/.test(n) },
  { lawId: "aile", test: (n) => n.includes("aile mecelle") },
  { lawId: "emek", test: (n) => n.includes("emek mecelle") },
  { lawId: "vergi", test: (n) => n.includes("vergi mecelle") },
  { lawId: "gomruk", test: (n) => n.includes("gomruk mecelle") },
  { lawId: "miqrasiya", test: (n) => n.includes("miqrasiya mecelle") },
  { lawId: "menzil", test: (n) => n.includes("menzil mecelle") },
  { lawId: "torpaq", test: (n) => n.includes("torpaq mecelle") },
  { lawId: "yol_hereketi", test: (n) => n.includes("yol hereketi haqqinda") },
  { lawId: "notariat", test: (n) => n.includes("notariat haqqinda") || n.includes("notarius") },
  { lawId: "banklar", test: (n) => n.includes("banklar haqqinda") || n.includes("bank lisenziya") },
  { lawId: "istehlakci", test: (n) => n.includes("istehlakcilarin huquqlarinin mudafiesi") },
  { lawId: "mehkimeler", test: (n) => n.includes("mehkemeler ve hakimler") },
];

const TOPIC_ROUTING_RULES: Array<{ lawId: string; phrase: string; weight: number }> = [
  { lawId: "inzibati_xetalar", phrase: "inzibati xeta", weight: 6 },
  { lawId: "inzibati_xetalar", phrase: "inzibati tenbeh", weight: 6 },
  { lawId: "inzibati_xetalar", phrase: "tutun", weight: 5 },
  { lawId: "inzibati_xetalar", phrase: "siqaret", weight: 5 },
  { lawId: "inzibati_xetalar", phrase: "tullanti", weight: 4 },
  { lawId: "inzibati_xetalar", phrase: "qirmizi isiq", weight: 5 },
  { lawId: "inzibati_xetalar", phrase: "qirmizida", weight: 4 },
  { lawId: "inzibati_xetalar", phrase: "ses-kuy", weight: 5 },
  { lawId: "inzibati_xetalar", phrase: "ses sal", weight: 4 },
  { lawId: "inzibati_xetalar", phrase: "evakuator", weight: 4 },
  { lawId: "inzibati_xetalar", phrase: "xirda xuliqanliq", weight: 5 },
  { lawId: "inzibati_xetalar", phrase: "cerime", weight: 3 },
  { lawId: "inzibati_xetalar", phrase: "protokol", weight: 3 },
  { lawId: "cinayet", phrase: "qesden adam oldur", weight: 6 },
  { lawId: "cinayet", phrase: "deleduzluq", weight: 5 },
  { lawId: "cinayet", phrase: "aldatma", weight: 4 },
  { lawId: "cinayet", phrase: "etibardan sui", weight: 4 },
  { lawId: "cinayet", phrase: "ogurluq", weight: 5 },
  { lawId: "cinayet", phrase: "rusvet", weight: 5 },
  { lawId: "cinayet", phrase: "qesden", weight: 3 },
  { lawId: "cinayet", phrase: "xuliqanliq", weight: 3 },
  { lawId: "cinayet", phrase: "hebs", weight: 1 },
  { lawId: "cinayet", phrase: "mehkumluq", weight: 2 },
  { lawId: "cinayet", phrase: "cinayet", weight: 1 },
  { lawId: "yol_hereketi", phrase: "yol hereket", weight: 5 },
  { lawId: "yol_hereketi", phrase: "piyada", weight: 4 },
  { lawId: "yol_hereketi", phrase: "radar", weight: 4 },
  { lawId: "yol_hereketi", phrase: "svetafor", weight: 4 },
  { lawId: "yol_hereketi", phrase: "svetofor", weight: 4 },
  { lawId: "yol_hereketi", phrase: "dayanma durma", weight: 4 },
  { lawId: "yol_hereketi", phrase: "yol nisani", weight: 4 },
  { lawId: "yol_hereketi", phrase: "yol qezasi", weight: 4 },
  { lawId: "yol_hereketi", phrase: "suruculuk", weight: 3 },
  { lawId: "aile", phrase: "aliment", weight: 5 },
  { lawId: "aile", phrase: "bosanma", weight: 5 },
  { lawId: "aile", phrase: "nikah", weight: 5 },
  { lawId: "aile", phrase: "er-arvad", weight: 5 },
  { lawId: "aile", phrase: "er arvad", weight: 5 },
  { lawId: "aile", phrase: "aile", weight: 2 },
  { lawId: "emek", phrase: "isden cixarma", weight: 5 },
  { lawId: "emek", phrase: "isden cixarilma", weight: 5 },
  { lawId: "emek", phrase: "isden cixmaq", weight: 5 },
  { lawId: "emek", phrase: "oz erizesi", weight: 4 },
  { lawId: "emek", phrase: "isgoturen", weight: 5 },
  { lawId: "emek", phrase: "isegoturen", weight: 5 },
  { lawId: "emek", phrase: "mezuniyyet", weight: 4 },
  { lawId: "emek", phrase: "emek haqqi", weight: 4 },
  { lawId: "emek", phrase: "emekhaqqi", weight: 4 },
  { lawId: "emek", phrase: "is staji", weight: 4 },
  { lawId: "emek", phrase: "maas", weight: 3 },
  { lawId: "emek", phrase: "emek", weight: 2 },
  { lawId: "vergi", phrase: "edv", weight: 5 },
  { lawId: "vergi", phrase: "voen", weight: 5 },
  { lawId: "vergi", phrase: "dvx", weight: 4 },
  { lawId: "vergi", phrase: "maliyye sanksiyasi", weight: 5 },
  { lawId: "vergi", phrase: "gelir vergisi", weight: 5 },
  { lawId: "vergi", phrase: "sadelesdirilmis vergi", weight: 5 },
  { lawId: "vergi", phrase: "vergi", weight: 2 },
  { lawId: "vergi", phrase: "beyanname", weight: 2 },
  { lawId: "gomruk", phrase: "gomruk", weight: 5 },
  { lawId: "miqrasiya", phrase: "miqrasiya", weight: 5 },
  { lawId: "miqrasiya", phrase: "ecnebi", weight: 4 },
  { lawId: "miqrasiya", phrase: "muveqqeti yasamaq", weight: 5 },
  { lawId: "miqrasiya", phrase: "daimi yasamaq", weight: 5 },
  { lawId: "secki", phrase: "secki", weight: 4 },
  { lawId: "menzil", phrase: "evden cixarma", weight: 5 },
  { lawId: "menzil", phrase: "kirayeci", weight: 4 },
  { lawId: "menzil", phrase: "sosial kiraye", weight: 5 },
  { lawId: "menzil", phrase: "qonsu menzil", weight: 4 },
  { lawId: "menzil", phrase: "kiraye haqqi", weight: 3 },
  { lawId: "menzil", phrase: "ev sahibi", weight: 3 },
  { lawId: "menzil", phrase: "menzil", weight: 2 },
  { lawId: "istehlakci", phrase: "istehlakci", weight: 5 },
  { lawId: "istehlakci", phrase: "keyfiyyetsiz mal", weight: 5 },
  { lawId: "istehlakci", phrase: "mali qaytarmaq", weight: 4 },
  { lawId: "istehlakci", phrase: "mehsulu deyismek", weight: 4 },
  { lawId: "istehlakci", phrase: "14 gun", weight: 4 },
  { lawId: "istehlakci", phrase: "zemanet", weight: 3 },
  { lawId: "istehlakci", phrase: "qaytarilmasi", weight: 2 },
  { lawId: "torpaq", phrase: "torpaq sahesi", weight: 4 },
  { lawId: "torpaq", phrase: "torpaq payi", weight: 5 },
  { lawId: "torpaq", phrase: "torpaq mulkiyyeti", weight: 4 },
  { lawId: "sehersalma", phrase: "sehersalma", weight: 5 },
  { lawId: "sehersalma", phrase: "tikintiye icaze", weight: 5 },
  { lawId: "sehersalma", phrase: "tikinti obyekti", weight: 4 },
  { lawId: "sehersalma", phrase: "qanunsuz tikili", weight: 5 },
  { lawId: "tehsil", phrase: "tehsil haqqinda", weight: 5 },
  { lawId: "tehsil", phrase: "ali tehsil", weight: 4 },
  { lawId: "tehsil", phrase: "mekteb tehsil", weight: 4 },
  { lawId: "tehsil", phrase: "attestat", weight: 4 },
  { lawId: "tehsil", phrase: "diplom", weight: 4 },
  { lawId: "mulki_prosessual", phrase: "iddia erizesi", weight: 5 },
  { lawId: "mulki_prosessual", phrase: "aidiyyet", weight: 4 },
  { lawId: "mulki_prosessual", phrase: "yurisdiksiya", weight: 4 },
  { lawId: "mulki_prosessual", phrase: "iddia muddeti", weight: 3 },
  { lawId: "mulki", phrase: "esassiz varlanma", weight: 6 },
  { lawId: "mulki", phrase: "oferta", weight: 5 },
  { lawId: "mulki", phrase: "aksept", weight: 5 },
  { lawId: "mulki", phrase: "zamin", weight: 5 },
  { lawId: "mulki", phrase: "ipoteka", weight: 5 },
  { lawId: "mulki", phrase: "vereselik", weight: 5 },
  { lawId: "mulki", phrase: "avtomobil satisi", weight: 5 },
  { lawId: "mulki", phrase: "neqator", weight: 5 },
  { lawId: "mulki", phrase: "girisi bagla", weight: 4 },
  { lawId: "mulki", phrase: "darvaza", weight: 4 },
  { lawId: "mulki", phrase: "mulkiyyetcinin telebi", weight: 4 },
  { lawId: "mulki", phrase: "alqi-satqi", weight: 4 },
  { lawId: "mulki", phrase: "alqi satqi", weight: 4 },
  { lawId: "mulki", phrase: "etibarname", weight: 4 },
  { lawId: "mulki", phrase: "mulkiyyet huququ", weight: 3 },
  { lawId: "mulki", phrase: "qonsu", weight: 3 },
  { lawId: "mulki", phrase: "borc", weight: 2 },
  { lawId: "mulki", phrase: "muqavile", weight: 2 },
  { lawId: "mulki", phrase: "satilir", weight: 2 },
  { lawId: "mulki", phrase: "mulki", weight: 2 },
  { lawId: "mehkimeler", phrase: "mehkemeler ve hakimler", weight: 5 },
  { lawId: "mehkimeler", phrase: "hakimlerin", weight: 4 },
  { lawId: "mehkimeler", phrase: "mehkeme sistemi", weight: 4 },
  { lawId: "mehkimeler", phrase: "mehkeme qurulusu", weight: 4 },
];

export function findCandidateLawsByQuery(text: string): CandidateLawsResult {
  const norm = text
    .toLowerCase()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ə/g, 'e')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Avoid forcing a hardcoded Məcəllə when query clearly targets a specialized parliamentary Law in the 56,983 corpus
  if (
    norm.includes("emek pensiya") || norm.includes("pensiya") ||
    norm.includes("dovlet rusum") || norm.includes("rusumdan azad") ||
    norm.includes("icra sened") || norm.includes("konullu icra") || norm.includes("icra memur") || norm.includes("icra haqqinda") ||
    norm.includes("dasinmaz emlakin dovlet reyestr") || (norm.includes("dasinmaz emlak") && norm.includes("qeydiyyat") && !norm.includes("torpaq"))
  ) {
    return { primary: null, candidates: [], confidence: 'none' };
  }

  for (const exp of EXPLICIT_STATUTE_PATTERNS) {
    if (exp.test(norm)) {
      const primary = LAW_REGISTRY[exp.lawId];
      if (primary) {
        return { primary, candidates: [primary], confidence: 'explicit' };
      }
    }
  }

  const scores = new Map<string, number>();
  for (const rule of TOPIC_ROUTING_RULES) {
    if (norm.includes(rule.phrase)) {
      scores.set(rule.lawId, (scores.get(rule.lawId) ?? 0) + rule.weight);
    }
  }

  if (scores.size === 0) {
    return { primary: null, candidates: [], confidence: 'none' };
  }

  const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  const topScore = ranked[0][1];
  const minKeep = topScore >= 4 ? Math.max(2, Math.floor(topScore * 0.4)) : 1;
  const candidates = ranked
    .filter(([, score]) => score >= minKeep)
    .slice(0, 3)
    .map(([id]) => LAW_REGISTRY[id])
    .filter((l): l is StructuredLaw => Boolean(l));

  return {
    primary: candidates[0] ?? null,
    candidates,
    confidence: topScore >= 4 ? 'strong' : 'weak',
  };
}

export function findLawByQuery(text: string): StructuredLaw | null {
  return findCandidateLawsByQuery(text).primary;
}
