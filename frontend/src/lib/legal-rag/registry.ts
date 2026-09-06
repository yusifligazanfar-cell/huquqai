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
    frameworkId: 46951,
    name: "Azərbaycan Respublikasının İnzibati Prosessual Məcəlləsi",
    shortName: "İnzibati Prosessual Məcəllə",
    category: "İnzibati proses",
    sourceUrl: "https://www.e-qanun.ai/results/46951",
    fallbackUrl: "https://e-qanun.az/framework/46951",
    files: ["eqanun_mega_46951_İstehlakçıların_hüquqlarının_müdafiəsi_haqqında_Qanun.txt", "eqanun_mega_46951_Cəzaların_İcrası_Məcəlləsi.txt"]
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
    frameworkId: 46953,
    name: "«Yol hərəkəti haqqında» Azərbaycan Respublikasının Qanunu",
    shortName: "Yol hərəkəti haqqında Qanun",
    category: "Yol hərəkəti",
    sourceUrl: "https://www.e-qanun.ai/results/46953",
    fallbackUrl: "https://e-qanun.az/framework/46953",
    files: ["eqanun_mega_46953_Yol_hərəkəti_haqqında_Qanun.txt"]
  },
  "istehlakci": {
    id: "istehlakci",
    frameworkId: 3289,
    name: "İstehlakçıların hüquqlarının müdafiəsi haqqında Azərbaycan Respublikasının Qanunu",
    shortName: "İstehlakçıların hüquqlarının müdafiəsi haqqında Qanun",
    category: "İstehlakçı hüquqları",
    sourceUrl: "https://www.e-qanun.ai/results/3289",
    fallbackUrl: "https://e-qanun.az/framework/3289",
    files: ["eqanun_mega_46951_İstehlakçıların_hüquqlarının_müdafiəsi_haqqında_Qanun.txt"]
  },
  "mehkimeler": {
    id: "mehkimeler",
    frameworkId: 448,
    name: "Məhkəmələr və hakimlər haqqında Azərbaycan Respublikasının Qanunu",
    shortName: "Məhkəmələr və hakimlər haqqında Qanun",
    category: "Məhkəmə quruluşu",
    sourceUrl: "https://www.e-qanun.ai/results/448",
    fallbackUrl: "https://e-qanun.az/framework/448",
    files: ["eqanun_mega_3933_Məhkəmələr_və_hakimlər_haqqında_qanun.txt"]
  },
  "sehersalma": {
    id: "sehersalma",
    frameworkId: 46955,
    name: "Azərbaycan Respublikasının Şəhərsalma və Tikinti Məcəlləsi",
    shortName: "Şəhərsalma və Tikinti Məcəlləsi",
    category: "Tikinti hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/46955",
    fallbackUrl: "https://e-qanun.az/framework/46955",
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
  "tehsil": {
    id: "tehsil",
    frameworkId: 18343,
    name: "Təhsil haqqında Azərbaycan Respublikasının Qanunu",
    shortName: "Təhsil haqqında Qanun",
    category: "Təhsil hüququ",
    sourceUrl: "https://www.e-qanun.ai/results/18343",
    fallbackUrl: "https://e-qanun.az/framework/18343",
    files: ["eqanun_mega_18343_Təhsil_haqqında_qanun.txt", "e_qanun_18343.txt"]
  }
};

export function findLawByQuery(text: string): StructuredLaw | null {
  const norm = text.toLowerCase().replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u');
  
  if (norm.includes("qonsu") || norm.includes("girisi bagla") || norm.includes("darvaza") || norm.includes("mulkiyyetcinin telebi") || norm.includes("neqator")) {
    return LAW_REGISTRY["mulki"];
  }
  if (norm.includes("konstitusiya") || norm.includes("esas qanun")) return LAW_REGISTRY["konstitusiya"];
  if (norm.includes("aile") || norm.includes("er-arvad") || norm.includes("nikah") || norm.includes("aliment") || norm.includes("bosanma")) return LAW_REGISTRY["aile"];
  if (norm.includes("emek") || norm.includes("isden cixarma") || norm.includes("isgöturen") || norm.includes("isegoturen") || norm.includes("mezuniyyet") || norm.includes("emek haqqi") || norm.includes("is staji")) return LAW_REGISTRY["emek"];
  if (norm.includes("cinayet prosessual") || norm.includes("cpm")) return LAW_REGISTRY["cinayet_prosessual"];
  if (norm.includes("cinayet") || norm.includes("deleduzluq") || norm.includes("ogurluq") || norm.includes("qesden oldurme") || norm.includes("xuliqanliq")) return LAW_REGISTRY["cinayet"];
  if (norm.includes("inzibati xetalar") || norm.includes("ixm") || norm.includes("cerime") || norm.includes("protokol") || norm.includes("inzibati tenbeh")) return LAW_REGISTRY["inzibati_xetalar"];
  if (norm.includes("mulki prosessual") || norm.includes("mpm") || norm.includes("iddia erizesi") || norm.includes("aidiyyet") || norm.includes("yurisdiksiya")) return LAW_REGISTRY["mulki_prosessual"];
  if (norm.includes("mulki") || norm.includes("alqi-satqi") || norm.includes("satilir") || norm.includes("borc") || norm.includes("zamin") || norm.includes("ipoteka") || norm.includes("vereselik") || norm.includes("muqavile") || norm.includes("avtomobil satisi")) return LAW_REGISTRY["mulki"];
  if (norm.includes("vergi") || norm.includes("voen") || norm.includes("edv") || norm.includes("gelir vergisi") || norm.includes("sadelesdirilmis vergi")) return LAW_REGISTRY["vergi"];
  if (norm.includes("yol hereketi") || norm.includes("suruculuk") || norm.includes("radar") || norm.includes("piyada") || norm.includes("yol qezasi") || norm.includes("dayanma durma")) return LAW_REGISTRY["yol_hereketi"];
  if (norm.includes("istehlakci") || norm.includes("qaytarilmasi") || norm.includes("zemanet") || norm.includes("keyfiyyetsiz mal")) return LAW_REGISTRY["istehlakci"];
  if (norm.includes("mehkeme") || norm.includes("hakim")) return LAW_REGISTRY["mehkimeler"];

  return null;
}
