export interface LegalConcept {
  id: string;
  domain: string;
  primaryLawId: string;
  triggerPhrases: string[];
  expandedTerms: string[];
  priorityArticles: string[];
  forbiddenPhrases?: string[];
}

export const LEGAL_CONCEPTS: LegalConcept[] = [
  {
    id: "tax_vat_calculation",
    domain: "Vergi hüququ",
    primaryLawId: "vergi",
    triggerPhrases: [
      "edv", "edv-nin", "edv nin", "edv hesablanmasi", "elave deyer vergisi", "edv derecesi", 
      "edv hesablanma qaydasi", "vergi tutulan dovriyye", "evezlesdirilen edv", "budceye odenilmeli olan edv",
      "vergi mecellesinde edv"
    ],
    expandedTerms: [
      "elave deyer vergisi", "edv derecesi 18 faiz", "vergi tutulan dovriyyeden budceye odenilmeli olan edv",
      "evezlesdirilme", "vergi mecellesi madde 173", "vergi mecellesi madde 174", "vergi mecellesi madde 175",
      "edv-nin hesablanmasi ve odenilmesi", "gomruk borcu"
    ],
    priorityArticles: ["173", "174", "175", "159", "166"]
  },
  {
    id: "labor_termination",
    domain: "Əmək hüququ",
    primaryLawId: "emek",
    triggerPhrases: [
      "isden cixarma", "isden cixarilma", "isden cixmaq", "oz erizesi", "xeberdarliq etmeden", 
      "xeberdarliqsiz", "xitam", "muqavilenin legvi", "isden azad", "isden qovulma", "is yerinden cixarilma",
      "emek muqavilesine xitam", "esassiz cixarildiqda", "qanunsuz cixarildiqda", "hara sikayet etmeliyem",
      "isden esassiz cixarildiqda", "ise berpa", "emek mubahisesi", "emek mufettisliyi"
    ],
    expandedTerms: [
      "emek muqavilesine xitam", "iscinin tesebbusu ile xitam", "isegoturen terefinden xitam", 
      "emek muqavilesine xitam verilmesinin esaslari", "iscilerin teminatlari", "xeberdarliq muddetleri", 
      "emek vezifelerinin kobud sekilde pozulmasi", "sinaq muddeti", "iscinin teqsirli hereketleri", 
      "staj", "muddet", "xitam verilmesi qaydalari", "ferdi emek mubahiseleri", "ise berpa haqqinda teleb",
      "dovlet emek mufettisliyi xidmeti", "mehkemeye muraciet muddeti", "emek mecellesi madde 287",
      "emek mecellesi madde 288", "emek mecellesi madde 294", "emek mecellesi madde 300"
    ],
    priorityArticles: ["68", "69", "70", "71", "72", "73", "74", "76", "77", "79", "80", "84", "287", "288", "294", "296", "300", "303"],
    forbiddenPhrases: ["inzibati tenbeh", "protokol"]
  },
  {
    id: "family_property_division",
    domain: "Ailə hüququ",
    primaryLawId: "aile",
    triggerPhrases: [
      "emlakin bolunmesi", "emlak bolunmesi", "bosanma zamani emlak", "birge mulkiyyet", 
      "er arvadin emlaki", "er-arvadin emlaki", "emlak nece bolunur", "sexsi emlak", "umumi emlak",
      "bosanarken emlak", "bosanmada ev", "bosanmada masin"
    ],
    expandedTerms: [
      "er arvadin birge mulkiyyeti", "er arvadin umumi emlakinin bolunmesi", "paylarin mueyyen edilmesi",
      "er arvadin her birinin mulkiyyeti", "aile mecellesi madde 32", "aile mecellesi madde 36", 
      "aile mecellesi madde 37", "aile mecellesi madde 34", "birge nikah dovrunde elde edilmis"
    ],
    priorityArticles: ["32", "36", "37", "34", "31", "35"],
    forbiddenPhrases: ["soyad secmek", "madde 30", "madde 30."]
  },
  {
    id: "family_marriage_termination",
    domain: "Ailə hüququ",
    primaryLawId: "aile",
    triggerPhrases: ["nikaha xitam", "bosanma", "nikahin pozulmasi", "nikah"],
    expandedTerms: [
      "nikaha xitam verilmesi", "nikahin pozulmasi qaydasi", "vefaetme", "mehkeme qaydasinda bosanma",
      "qeydiyyat sobeleri", "yetkinlik yasina catmayan usaqlar", "aile mecellesi madde 19", "aile mecellesi madde 21"
    ],
    priorityArticles: ["19", "20", "21", "22", "23", "32", "36", "37"]
  },
  {
    id: "family_alimony",
    domain: "Ailə hüququ",
    primaryLawId: "aile",
    triggerPhrases: ["aliment", "ushaq pulu", "usaq ucun pul", "aliment meblegi", "alimentin tutulmasi"],
    expandedTerms: [
      "valideynlerin ushaqlari saxlamaq vezifesi", "alimentin meblegi", "sabit pul mebleginde",
      "mehkeme terefinden alimentin tutulmasi", "aliment odenilmesi haqqinda sazis"
    ],
    priorityArticles: ["76", "78", "75", "77", "79", "80", "81", "82", "83", "84"]
  },
  {
    id: "traffic_pedestrian_and_parking",
    domain: "Yol hərəkəti",
    primaryLawId: "yol_hereketi",
    triggerPhrases: ["piyadalarin", "piyada", "yol hereketi qaydalari", "dayanma durma", "surucu", "radar", "masin saxla"],
    expandedTerms: [
      "piyadalarin vezifeleri", "piyadalarin hereketi", "dayanma ve durmanin qadagan edildiyi yerler",
      "neqliyyat vasitelerinin duracaga aparilmasi", "yol hereketi tehlukesizliyi"
    ],
    priorityArticles: ["40", "52", "53", "84", "85", "37", "38"]
  },
  {
    id: "consumer_rights",
    domain: "İstehlakçı hüquqları",
    primaryLawId: "istehlakci",
    triggerPhrases: [
      "istehlakcinin", "istehlakci", "mali qaytarmaq", "mehsulu deyismek", "14 gun", 
      "qeyri erzaq mali", "zemanet", "qusur", "qusurli mal", "lazimi keyfiyyetli", "malin temiri"
    ],
    expandedTerms: [
      "lazimi keyfiyyetli qeyri erzaq malinin deyisdirilmesi", "istehlakcinin telebleri",
      "qusurli mal satildiqda istehlakcinin huquqlari", "zemanet muddeti", "temiri"
    ],
    priorityArticles: ["15", "7", "14", "8", "13", "12"]
  },
  {
    id: "construction_and_permits",
    domain: "Tikinti hüququ",
    primaryLawId: "sehersalma",
    triggerPhrases: ["sehersalma", "tikinti fealiyyeti", "tikintiye icaze", "tikinti obyektleri"],
    expandedTerms: [
      "tikinti fealiyyetine icaze", "tikintiye icazenin verilmesi", "tikinti obyektlerinin istismari",
      "sehersalma esaslari"
    ],
    priorityArticles: ["75", "80", "81", "82", "83", "84"]
  },
  {
    id: "property_movable_ownership",
    domain: "Mülki hüquq",
    primaryLawId: "mulki",
    triggerPhrases: ["dasinar esyalar", "dasinar esya", "mulkiyyet huququ hansi andan elde edilir", "mulkiyyet huququ elde"],
    expandedTerms: [
      "dasinar esyalara mulkiyyet huququnun elde edilmesi", "esyalarin tehvili", "mulkiyyet huququnun kecmesi ani"
    ],
    priorityArticles: ["178", "179", "180", "181", "182", "183"]
  },
  {
    id: "unjust_enrichment",
    domain: "Mülki hüquq",
    primaryLawId: "mulki",
    triggerPhrases: ["esassiz varlanma", "esassiz elde edilmis emlak", "esassiz varlanma neticesinde"],
    expandedTerms: [
      "esassiz varlanma neticesinde elde edilmis emlakin qaytarilmasi vezifesi", "esassiz elde edilenler"
    ],
    priorityArticles: ["1091", "1092", "1093", "1094"]
  },
  {
    id: "civil_loan_and_guarantee",
    domain: "Mülki hüquq",
    primaryLawId: "mulki",
    triggerPhrases: [
      "borc muqavilesi", "borc muqavilesinin formasi", "zaminlik muqavilesi", "zaminin mesuliyyeti", 
      "ofertanin qebul edilmesi", "aksept", "muqavilenin baglanmasi"
    ],
    expandedTerms: [
      "borc muqavilesi", "borc muqavilesinin baglanma qaydalari", "zaminin mesuliyyeti", "subsidiar mesuliyyet",
      "aksept", "oferta"
    ],
    priorityArticles: ["739", "740", "473", "470", "408", "405"]
  },
  {
    id: "housing_and_land",
    domain: "Mənzil & Torpaq",
    primaryLawId: "torpaq",
    triggerPhrases: ["torpaq sahesi uzerinde", "dovlet qeydiyyati", "torpaq mulkiyyeti"],
    expandedTerms: [
      "torpaq sahesi uzerinde mulkiyyet huququnun dovlet qeydiyyati", "torpaq qanunvericiliyi"
    ],
    priorityArticles: ["67", "68", "69"]
  },
  {
    id: "civil_housing_lease",
    domain: "Mülki hüquq",
    primaryLawId: "mulki",
    triggerPhrases: ["yasayis sahesinin kiraye muqavilesi", "kiraye muqavilesi nece baglanir"],
    expandedTerms: [
      "yasayis sahesinin kiraye muqavilesi", "kirayəyə verən və kirayəçi"
    ],
    priorityArticles: ["228", "700", "701", "702"]
  },
  {
    id: "civil_court_jurisdiction",
    domain: "Mülki proses",
    primaryLawId: "mulki_prosessual",
    triggerPhrases: ["erazi aidiyyeti", "iddia erizesinin verilmesi zamani", "aidiyyet necə mueyyen"],
    expandedTerms: [
      "erazi aidiyyeti", "iddianin cavabdehin yasayis yerine gore verilmesi", "mehkeme aidiyyeti"
    ],
    priorityArticles: ["35", "36", "37"]
  },
  {
    id: "administrative_violations_cigarette_and_protocol",
    domain: "İnzibati hüquq",
    primaryLawId: "inzibati_xetalar",
    triggerPhrases: [
      "siqaret kotuklerinin", "tullantilarin etraf muhite", "protokol hansi muddetde", 
      "inzibati tenbeh novleri", "inzibati xeta haqqinda protokol"
    ],
    expandedTerms: [
      "meiset tullantilarinin atilmasi", "etraf muhitin muhafizesi", "inzibati xeta haqqinda protokolun tertibi",
      "inzibati tenbeh novleri"
    ],
    priorityArticles: ["266", "100", "24", "22", "266-1", "212"]
  },
  {
    id: "criminal_homicide",
    domain: "Cinayət hüququ",
    primaryLawId: "cinayet",
    triggerPhrases: ["qesden adam oldurme", "adam oldurme cinayeti"],
    expandedTerms: [
      "qesden adam oldurme", "qesden adam oldurmeye gore ceza", "cinayet mecellesi madde 120"
    ],
    priorityArticles: ["120", "121", "122"]
  },
  {
    id: "tax_declaration_failure",
    domain: "Vergi hüququ",
    primaryLawId: "vergi",
    triggerPhrases: [
      "vergi beyannamesi", "vergi beyanname", "beyanname teqdim", "beyanname verilmedikde",
      "beyanname teqdim edilmedikde", "vergi hesabatini teqdim", "vergi hesabatini teqdim etmemek",
      "vergi hesabatı", "vergi hesabatı vaxtında", "vergi cerimesi", "vergi sanksiyasi",
      "vergi beyannamesi cerimesi", "maliyye sanksiyasi vergi", "dvx cerime", "dvx sanksiya",
      "hesabatin teqdim edilmemesi"
    ],
    expandedTerms: [
      "hesabatin ve diger melumatin teqdim edilmesi ile bagli huquqpozmalara gore maliyye sanksiyalari",
      "hesabat dovru uzre vergi tutulan ve ya vergiden azad edilen emeliyyatlar aparan",
      "vergi hesabatini esas olmadan mueyyen edilen muddetde teqdim edilmemesine gore",
      "40 manat mebleginde maliyye sanksiyasi tetbiq edilir",
      "vergi mecellesi madde 57.1", "vergi mecellesi 57",
      "budceye catasi vergi meblegi hesabat teqdim etmemekle yayindirildiqda",
      "azaldilmis ve ya yayindirilmis vergi mebleginin 50 faizi miqdarinda maliyye sanksiyasi",
      "vergi mecellesi madde 58.1", "vergi mecellesi 58", "dvx izahi"
    ],
    priorityArticles: ["57", "57.1", "58", "58.1", "16", "72"],
    forbiddenPhrases: ["inzibati xetalar mecellesi", "192.1", "493"]
  },
  {
    id: "tax_registration_and_income_tax",
    domain: "Vergi hüququ",
    primaryLawId: "vergi",
    triggerPhrases: ["vergi odeyicisi kimi ucota", "fiziki sexslerin gelir vergisinin dereceleri", "gelir vergisinin dereceleri"],
    expandedTerms: [
      "vergi odeyicilerinin ucota alinmasi qaydalari", "vergi mecellesi madde 33", 
      "fiziki sexslerin gelir vergisinin dereceleri", "vergi mecellesi madde 101"
    ],
    priorityArticles: ["33", "101", "34", "102"]
  },
  {
    id: "civil_inheritance_succession",
    domain: "Mülki hüquq",
    primaryLawId: "mulki",
    triggerPhrases: [
      "vereselik", "vereselik qaydalari", "miras", "miras emlak", "verese", "qanun uzre vereselik",
      "vesiyyetname", "vesiyyet uzre vereselik", "mirasin qebulu", "mirasdan imtina", 
      "vereselik sehadetnamesi", "mirasin acilmasi", "leyaqetsiz verese"
    ],
    expandedTerms: [
      "vereselik anlayisi", "vereseler", "qanun uzre vereseler", "vesiyyet anlayisi",
      "mirasin qebul edildiyi muddet", "vereselik sehadetnamesinin verildiyi muddet",
      "mirasin acilmasi", "mirasdan imtina", "mulki mecelle madde 1133", "mulki mecelle madde 1159"
    ],
    priorityArticles: ["1133", "1134", "1159", "1166", "1246", "1273", "1322"],
    forbiddenPhrases: ["tikintiye vereselik", "torpaq sahesinin qeydiyyati"]
  }
];
