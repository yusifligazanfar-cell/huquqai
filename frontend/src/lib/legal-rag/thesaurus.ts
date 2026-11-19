export interface LegalConcept {
  id: string;
  domain: string;
  primaryLawId: string;
  primaryDocId?: string;
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
    id: "labor_unfair_dismissal_complaint",
    domain: "Əmək hüququ",
    primaryLawId: "emek",
    triggerPhrases: [
      "esassiz cixaril", "qanunsuz cixaril", "esassiz isden", "qanunsuz isden",
      "hara sikayet", "hansi muddetde sikayet", "ise berpa", "emek mubahis",
      "emek mufettisliyi", "isden esassiz", "isden qanunsuz", "isden cixarildi"
    ],
    expandedTerms: [
      "ferdi emek mubahiselerine baxan orqanlar", "ferdi emek mubahiselerinin hellinde iddia muddetleri",
      "emek muqavilesinin legv edilmesi qaydalarina emel olunmamasinin huquqi neticeleri",
      "1 teqvim ayi erzin", "dovlet emek mufettisliyi", "mehkeme", "ise berpa",
      "emek mecellesi madde 296", "emek mecellesi madde 294", "emek mecellesi madde 300"
    ],
    priorityArticles: ["296", "294", "300", "288", "287", "289", "70"],
    forbiddenPhrases: ["inzibati tenbeh", "protokol"]
  },
  {
    id: "labor_termination",
    domain: "Əmək hüququ",
    primaryLawId: "emek",
    primaryDocId: "46943",
    triggerPhrases: [
      "isden cixarma", "isden cixarilma", "isden cixmaq", "oz erizesi", "xeberdarliq etmeden",
      "xeberdarliqsiz", "is muqavilesine xitam", "muqavilenin legvi", "isden azad", "isden qovulma", "is yerinden cixarilma",
      "emek muqavilesine xitam", "emek muqavilesi legv", "emek muqavilesinin legv", "emek muqavilesi xitam"
    ],
    expandedTerms: [
      "emek muqavilesine xitam", "iscinin tesebbusu ile xitam", "isegoturen terefinden xitam",
      "emek muqavilesine xitam verilmesinin esaslari", "iscilerin teminatlari", "xeberdarliq muddetleri",
      "emek vezifelerinin kobud sekilde pozulmasi", "sinaq muddeti", "iscinin teqsirli hereketleri",
      "staj", "muddet", "xitam verilmesi qaydalari", "emek mecellesi madde 68", "emek mecellesi madde 69", "emek mecellesi madde 70",
      "emek mecellesi madde 294", "emek mecellesi madde 296", "emek mecellesi madde 300"
    ],
    priorityArticles: ["68", "69", "70", "71", "72", "73", "74", "76", "77", "79", "80", "84", "294", "296", "300"],
    forbiddenPhrases: ["inzibati tenbeh", "protokol"]
  },
  {
    id: "family_property_division",
    domain: "Ailə hüququ",
    primaryLawId: "aile",
    triggerPhrases: [
      "emlakin bolunmesi", "emlak bolunmesi", "bosanma zamani emlak", "birge mulkiyyet",
      "birge emlak", "bosanan zaman", "bosandiqda", "umumi birge",
      "er arvadin emlaki", "er-arvadin emlaki", "emlak nece bolunur", "sexsi emlak", "umumi emlak",
      "bosanarken emlak", "bosanmada ev", "bosanmada masin"
    ],
    expandedTerms: [
      "er arvadin birge mulkiyyeti", "er arvadin umumi emlakinin bolunmesi", "paylarin mueyyen edilmesi",
      "beraber paylar", "er arvadin her birinin mulkiyyeti", "aile mecellesi madde 32", "aile mecellesi madde 36",
      "aile mecellesi madde 37", "aile mecellesi madde 34", "birge nikah dovrunde elde edilmis"
    ],
    priorityArticles: ["32", "37", "36", "34", "35", "33"],
    forbiddenPhrases: ["soyad secmek", "madde 30", "madde 30."]
  },
  {
    id: "family_marriage_age_conditions",
    domain: "Ailə hüququ",
    primaryLawId: "aile",
    triggerPhrases: [
      "nikah yasi", "nikah yasini", "nikahin yasi", "evlenme yasi", "evlenmek yasi",
      "nikah yasinin azaldilmasi", "nikaha daxil olmaq", "nikahin baglanma sertleri", "qohum nikah"
    ],
    expandedTerms: [
      "nikahin yasi", "18 yas", "nikahin baglanma sertleri", "nikahin baglanmasina mane olan hallar",
      "aile mecellesi madde 10", "aile mecellesi madde 11", "aile mecellesi madde 12"
    ],
    priorityArticles: ["10", "11", "12", "13"]
  },
  {
    id: "family_marriage_termination",
    domain: "Ailə hüququ",
    primaryLawId: "aile",
    triggerPhrases: ["nikaha xitam", "bosanma", "bosanmaq", "nikahin pozulmasi"],
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
    triggerPhrases: [
      "aliment", "ushaq pulu", "usaq ucun pul", "aliment meblegi", "alimentin tutulmasi",
      "yetkinlik yasina catmayan usaq", "usaqlarini saxlamaq vezifesi", "valideynlerin usaq"
    ],
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
    triggerPhrases: ["torpaq sahesi uzerinde", "torpaq mulkiyyeti", "torpaq dovlet qeydiyyati"],
    expandedTerms: [
      "torpaq sahesi uzerinde mulkiyyet huququnun dovlet qeydiyyati", "torpaq qanunvericiliyi"
    ],
    priorityArticles: ["67", "68", "69"]
  },
  {
    id: "real_estate_state_registry",
    domain: "Daşınmaz əmlak hüququ",
    primaryLawId: "eqanun_5456",
    primaryDocId: "5456",
    triggerPhrases: ["dasinmaz emlakin dovlet reyestri", "dasinmaz emlak uzerinde huquqlarin dovlet qeydiyyati", "cixaris", "reyestr qeydiyyati"],
    expandedTerms: [
      "dasinmaz emlakin dovlet reyestri haqqinda", "mulkiyyet huququnun dovlet qeydiyyati muddeti"
    ],
    priorityArticles: ["8", "9", "10", "11", "12", "15"]
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
    triggerPhrases: ["erazi aidiyyeti", "iddia erizesinin verilmesi zamani", "aidiyyeti nece mueyyen"],
    expandedTerms: [
      "erazi aidiyyeti", "iddianin cavabdehin oldugu yere gore verilmesi", "mehkeme aidiyyeti"
    ],
    priorityArticles: ["35", "36", "37"]
  },
  {
    id: "administrative_violations_cigarette_and_protocol",
    domain: "İnzibati hüquq",
    primaryLawId: "inzibati_xetalar",
    triggerPhrases: [
      "siqaret", "siqareti yere", "siqaret kotuklerinin", "siqaret kotuyu",
      "tutun cekme", "tutun memulat", "tullantilarin etraf muhite",
      "tullantisinin atilmasi", "tullantilarinin atilmasi",
      "protokol hansi muddetde", "inzibati tenbeh novleri", "inzibati xeta haqqinda protokol"
    ],
    expandedTerms: [
      "tutun memulatlari tullantilarinin etraf muhite atilmasi",
      "tutun memulatinin istehlakina dair mehdudiyyetler",
      "meiset tullantilarinin atilmasi",
      "etraf muhitin muhafizesi", "inzibati xeta haqqinda protokolun tertibi",
      "esas ve elave inzibati tenbehler", "inzibati tenbeh novleri"
    ],
    priorityArticles: ["212", "266", "23", "24", "22", "100", "266-1"]
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
    id: "criminal_fraud_and_theft",
    domain: "Cinayət hüququ",
    primaryLawId: "cinayet",
    primaryDocId: "46947",
    triggerPhrases: [
      "deleduzluq", "aldatma ve ya etibardan", "etibardan sui-istifade", "etibardan sui istifade",
      "ogurluq", "gizli olaraq talama", "ozgenin emlakini gizli"
    ],
    expandedTerms: [
      "deleduzluq yəni etibardan sui-istifade", "ogurluq ozgenin emlakini gizli olaraq talama",
      "ele kecirme", "cinayet mecellesi madde 178", "cinayet mecellesi madde 177"
    ],
    priorityArticles: ["178", "177", "179"]
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
      "vereselik sehadetnamesi", "mirasin acilmasi", "miras ne vaxt acilir", "ne vaxt acilir",
      "mirasin acildigi vaxt", "leyaqetsiz verese"
    ],
    expandedTerms: [
      "mirasin acilmasi", "mirasin acildigi vaxt", "miras qoyanın olduyu gun",
      "vereselik anlayisi", "vereseler", "qanun uzre vereseler", "vesiyyet anlayisi",
      "mirasin qebul edildiyi muddet", "vereselik sehadetnamesinin verildiyi muddet",
      "mirasdan imtina", "mulki mecelle madde 1145", "mulki mecelle madde 1146", "mulki mecelle madde 1159"
    ],
    priorityArticles: ["1145", "1146", "1147", "1159", "1243", "1246", "1322", "1133", "1134"],
    forbiddenPhrases: ["tikintiye vereselik", "torpaq sahesinin qeydiyyati"]
  },
  {
    id: "insurance_and_unemployment",
    domain: "İşsizlikdən sığorta",
    primaryLawId: "emek",
    triggerPhrases: [
      "issizlikden sigorta", "issizlikden sigorta odenisi", "issizlik odenisi"
    ],
    expandedTerms: [
      "issizlikden sigorta haqqinda", "issizlikden sigorta odenisi teyin edilmesi",
      "sigorta odenisinin muddeti"
    ],
    priorityArticles: ["13", "14", "15", "16", "17"]
  },
  {
    id: "traffic_alcohol_driving",
    domain: "Yol hərəkəti & İnzibati",
    primaryLawId: "inzibati_xetalar",
    primaryDocId: "46960",
    triggerPhrases: [
      "alkoqol", "alkoqollu", "icki", "serxos", "spirtli icki", "ickili", "serxos halda"
    ],
    expandedTerms: [
      "neqliyyat vasitesini idare etmek huququ olan sexs terefinden alkoqoldan istifade olunmasi neticesinde serxos veziyyetde idare edilmesi",
      "dord yuz manat mebleginde cerime", "inzibati xetalar mecellesi 333", "madde 333.1"
    ],
    priorityArticles: ["333.1", "333", "334"]
  },
  {
    id: "traffic_speed_and_license_fines",
    domain: "Yol hərəkəti & İnzibati",
    primaryLawId: "inzibati_xetalar",
    primaryDocId: "46960",
    triggerPhrases: [
      "suret heddi", "radara dusmek", "avtomobil idare etmek", "suruculuk huququndan mehrum"
    ],
    expandedTerms: [
      "yolda mueyyen edilmis hereket suretini asma", "inzibati xetalar mecellesi 328", "yol hereketi qaydalari"
    ],
    priorityArticles: ["328", "327", "332", "333"]
  },
  {
    id: "customs_declaration",
    domain: "Gömrük hüququ",
    primaryLawId: "gomruk",
    primaryDocId: "46957",
    triggerPhrases: [
      "gomruk beyannamesi", "gomruk borcu", "gomruk resmilesdirilmesi", "gomruk mecellesi", "gomruk nezareti"
    ],
    expandedTerms: [
      "gomruk beyannamesinin verilmesi muddeti", "gomruk mecellesi", "mallarin beyan edilmesi"
    ],
    priorityArticles: ["149", "150", "151", "152", "153", "154", "155"]
  },
  {
    id: "migration_residence",
    domain: "Miqrasiya hüququ",
    primaryLawId: "miqrasiya",
    primaryDocId: "46959",
    triggerPhrases: [
      "ecnebilerin", "ecnebi", "muveqqeti yasamaq icazesi", "daimi yasamaq icazesi",
      "is icazesi", "miqrasiya mecellesi", "viza muddeti"
    ],
    expandedTerms: [
      "muveqqeti yasamaq ucun icazenin verilmesi hallari", "miqrasiya mecellesi", "ecnebilerin qeydiyyati"
    ],
    priorityArticles: ["45", "46", "47", "48", "52", "64"]
  },
  {
    id: "labor_pensions",
    domain: "Sosial təminat və pensiya hüququ",
    primaryLawId: "eqanun_11566",
    primaryDocId: "11566",
    triggerPhrases: [
      "emek pensiyasi", "emek pensiyalari", "yasa gore pensiya", "pensiya yasi", "pensiya staji", "sosial sigorta staji"
    ],
    expandedTerms: [
      "emek pensiyalari haqqinda", "yasa gore emek pensiyasi teyin edilmesi sertleri", "sigorta staji"
    ],
    priorityArticles: ["7", "8", "9", "10", "11", "12"]
  },
  {
    id: "state_duty_fees",
    domain: "Maliyyə və dövlət rüsumu hüququ",
    primaryLawId: "eqanun_2860",
    primaryDocId: "2860",
    triggerPhrases: [
      "dovlet rusumu", "rusumdan azad", "mehkeme rusumu", "notariat rusumu"
    ],
    expandedTerms: [
      "dovlet rusumu haqqinda", "dovlet rusumunun odenilmesinden azad olunma", "mehkemeye verilen iddia erizelerine gore dovlet rusumu"
    ],
    priorityArticles: ["8", "9", "10", "4"]
  },
  {
    id: "enforcement_proceedings",
    domain: "İcra hüququ",
    primaryLawId: "eqanun_1406",
    primaryDocId: "1406",
    triggerPhrases: [
      "icra senedi", "konullu icra", "icra memuru", "mecburi icra", "icra haqqinda"
    ],
    expandedTerms: [
      "icra senedleri uzre icraata baslanilmasi", "konullu icra ucun muddet", "icra haqqinda"
    ],
    priorityArticles: ["8", "9", "10", "43", "45"]
  },
  {
    id: "banking_licensing",
    domain: "Bank hüququ",
    primaryLawId: "eqanun_5825",
    primaryDocId: "5825",
    triggerPhrases: [
      "bank lisenziyasi", "banklar haqqinda", "kredit teskilati", "bank faliyyeti"
    ],
    expandedTerms: [
      "banklar haqqinda", "bank lisenziyasinin verilmesi", "nizamname kapitali"
    ],
    priorityArticles: ["6", "7", "8", "9", "10", "11"]
  },
  {
    id: "notary_actions",
    domain: "Notariat hüququ",
    primaryLawId: "notariat",
    primaryDocId: "107",
    triggerPhrases: [
      "notarius", "notariat", "notarial tesdiq", "notariat haqqinda"
    ],
    expandedTerms: [
      "notariat haqqinda", "notariat hereketlerinin aparilmasi", "vesiyyetnamenin tesdiqi"
    ],
    priorityArticles: ["47", "17", "34", "35", "36", "46"]
  },
  {
    id: "administrative_traffic_fines",
    domain: "İnzibati hüquq",
    primaryLawId: "inzibati_xetalar",
    primaryDocId: "46960",
    triggerPhrases: [
      "qirmizi isiq", "qirmizi isiqda", "qirmizida", "svetoforun", "svetafor", "yol qaydasini pozma",
      "cerime meydancasi", "evakuator"
    ],
    expandedTerms: [
      "svetoforun ve ya nizamlayicinin qadaganedici isaresi",
      "yuz manat mebleginde cerime", "madde 327.2",
      "neqliyyat vasitelerinin suruculeri terefinden yol hereketi qaydalarinin pozulmasi",
      "dayanma ve ya durma qaydalarinin pozulmasi"
    ],
    priorityArticles: ["327.2", "327", "346", "328", "338"]
  },
  {
    id: "administrative_noise_violation",
    domain: "İnzibati hüquq",
    primaryLawId: "inzibati_xetalar",
    primaryDocId: "46960",
    triggerPhrases: [
      "gece ses", "ses-kuy", "ses kuy", "ses sal", "yuksek ses"
    ],
    expandedTerms: [
      "meiset ses-kuyune qarsi mubarize qaydalarinin pozulmasi",
      "gece vaxti ses-kuy"
    ],
    priorityArticles: ["521", "522"]
  },
  {
    id: "criminal_embezzlement_and_official_crimes",
    domain: "Cinayət hüququ",
    primaryLawId: "cinayet",
    primaryDocId: "46947",
    triggerPhrases: [
      "menimseme", "menimsemekde", "menimseyib", "israf etme", "cinayet terkibinin elametleri",
      "cinayet terkibi", "emelin huquqi tovsifi", "huquqi tovsif", "saxta xidmet muqavile",
      "vezife selahiyyetlerinden sui-istifade", "vezife saxtakarligi", "qulluq movqeyinden istifade"
    ],
    expandedTerms: [
      "menimseme ve ya israf etme teqsirkara etibar edilmis ozge emlakini talama",
      "qulluq movqeyinden istifade etmekle kulli miqdarda",
      "vezife selahiyyetlerinden sui-istifade vezife saxtakarligi",
      "resmi senedleri saxtalasdirma",
      "cinayet mecellesi madde 179", "cinayet mecellesi madde 308", "cinayet mecellesi madde 313"
    ],
    priorityArticles: ["179", "177", "308", "313", "320", "178"]
  },
  {
    id: "criminal_procedure_search_and_evidence",
    domain: "Cinayət-prosessual hüquq",
    primaryLawId: "cinayet_prosessual",
    primaryDocId: "46950",
    triggerPhrases: [
      "sexsi axtaris", "mehkeme qerari olmadan", "whatsapp yazismalari", "sexsi yazismalarin",
      "subut kimi istifade oluna bilmez", "subutlarin mumkunluyu", "vekilinin istiraki olmadan ifade"
    ],
    expandedTerms: [
      "subutlarin mumkunluyu qanunsuz elde edilmis subutlar",
      "mehkeme qerari esasinda aparilan istintaq hereketleri",
      "sexsi axtaris ve goturme", "sahidin huquqlari vekil",
      "cinayet prosessual mecellesi madde 125", "cinayet prosessual mecellesi madde 177"
    ],
    priorityArticles: ["125", "177", "242", "95", "85"]
  },
  {
    id: "criminal_defamation_insult_and_social_media",
    domain: "Cinayət hüququ",
    primaryLawId: "cinayet",
    primaryDocId: "46947",
    triggerPhrases: [
      "tehqir", "bohtan", "sosial sebeke", "sosial sebekede", "internetde tehqir",
      "saxta profil", "saxta hesab", "seref ve leyaqet", "serefini", "leyaqetini",
      "nalayiq formada", "soyus", "alcaltma", "defamasiya"
    ],
    expandedTerms: [
      "tehqir kutlevi cixislarda internet informasiya ehtiyatinda sexsiyyetin seref ve leyaqetini nalayiq formada qesden alcaltma",
      "internet informasiya ehtiyatinda saxta istifadeci adlar profil ve ya hesablardan istifade ederek bohtan atma ve ya tehqir etme",
      "bohtan yalan oldugunu bile-bile seref ve leyaqetini lekeleyen",
      "xususi ittiham qaydasinda cinayet teqibi",
      "cinayet mecellesi madde 148", "cinayet mecellesi madde 148-1", "cinayet mecellesi madde 147"
    ],
    priorityArticles: ["148", "148.1", "147", "510", "23", "37"]
  },
  {
    id: "criminal_hooliganism_and_public_order",
    domain: "Cinayət və İnzibati xətalar hüququ",
    primaryLawId: "cinayet",
    primaryDocId: "46947",
    triggerPhrases: [
      "xuliqanliq", "xirda xuliqanliq", "ictimai qaydani pozan", "ictimai meneviyyati tehqir",
      "exlaqsiz ifadeler", "cemiyyete aciqca hormetsizlik"
    ],
    expandedTerms: [
      "xuliqanliq ictimai qaydani kobud suretde pozan",
      "xirda xuliqanliq internet informasiya ehtiyatinda",
      "cinayet mecellesi madde 221", "inzibati xetalar mecellesi madde 510"
    ],
    priorityArticles: ["221", "510"]
  },
  {
    id: "criminal_threat_blackmail_extortion",
    domain: "Cinayət hüququ",
    primaryLawId: "cinayet",
    primaryDocId: "46947",
    triggerPhrases: [
      "hede-qorxu", "hede qorxu", "santaj", "oldermekle hedeleme", "zorakiliq tetbiq etmekle hedeleme"
    ],
    expandedTerms: [
      "oldurmekle ve ya saglamliga agir zerer vurmaqla hedeleme",
      "hede-qorxu ile teleb etme rusvetraya",
      "cinayet mecellesi madde 134", "cinayet mecellesi madde 182"
    ],
    priorityArticles: ["134", "182"]
  },
  {
    id: "criminal_privacy_and_cybercrime",
    domain: "Cinayət hüququ",
    primaryLawId: "cinayet",
    primaryDocId: "46947",
    triggerPhrases: [
      "sexsi heyatin toxunulmazligi", "gizli cekilis", "gizli ses yazisi", "hesaba qanunsuz giris",
      "komputer sistemine qanunsuz daxil olma", "sexsi sirr", "aile heyatinin sirri"
    ],
    expandedTerms: [
      "sexsi heyatin toxunulmazligini pozma sexsi ve aile heyatinin sirri",
      "komputer sistemine qanunsuz daxil olma",
      "cinayet mecellesi madde 156", "cinayet mecellesi madde 271"
    ],
    priorityArticles: ["156", "271", "272", "273"]
  },
  {
    id: "criminal_theft_and_petty_theft",
    domain: "Cinayət və İnzibati xətalar hüququ",
    primaryLawId: "cinayet",
    primaryDocId: "46947",
    triggerPhrases: [
      "ogurlan", "ogurluq", "ogurlayib", "ogurlanib", "cibgirlik", "xirda talama"
    ],
    expandedTerms: [
      "ogurluq ozgenin emlakini gizli olaraq talama",
      "xirda talama ogurlama yolu ile ozgesinin emlakini talama",
      "toredilmis cinayetler haqqinda melumatlara baxilmasi",
      "cinayet mecellesi madde 177", "inzibati xetalar mecellesi madde 227"
    ],
    priorityArticles: ["177", "227", "207", "37"]
  }
];
