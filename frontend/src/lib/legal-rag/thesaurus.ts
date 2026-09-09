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
    id: "labor_termination",
    domain: "Əmək hüququ",
    primaryLawId: "emek",
    triggerPhrases: [
      "isden cixarma", "isden cixarilma", "isden cixmaq", "oz erizesi", "xeberdarliq etmeden", 
      "xeberdarliqsiz", "xitam", "muqavilenin legvi", "isden azad", "isden qovulma", "is yerinden cixarilma",
      "emek muqavilesine xitam"
    ],
    expandedTerms: [
      "emek muqavilesine xitam", "iscinin tesebbusu ile xitam", "isegoturen terefinden xitam", 
      "emek muqavilesine xitam verilmesinin esaslari", "iscilerin teminatlari", "xeberdarliq muddetleri", 
      "emek vezifelerinin kobud sekilde pozulmasi", "sinaq muddeti", "iscinin teqsirli hereketleri", 
      "staj", "muddet", "xitam verilmesi qaydalari"
    ],
    priorityArticles: ["70", "77", "72", "68", "69", "71", "73", "74", "76", "79", "80", "84"],
    forbiddenPhrases: ["inzibati tenbeh", "protokol"]
  },
  {
    id: "family_marriage_termination",
    domain: "Ailə hüququ",
    primaryLawId: "aile",
    triggerPhrases: ["nikaha xitam", "bosanma", "nikahin pozulmasi", "nikah", "er-arvad", "er ve arvad"],
    expandedTerms: [
      "nikaha xitam verilmesi", "nikahin pozulmasi qaydasi", "vefaetme", "mehkeme qaydasinda bosanma",
      "qeydiyyat sobeleri", "yetkinlik yasina catmayan usaqlar", "er-arvadin emlaki"
    ],
    priorityArticles: ["19", "20", "21", "22", "23", "32", "33", "34", "35", "36", "37"]
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
    priorityArticles: ["75", "76", "77", "78", "79", "80", "81", "82", "83", "84"]
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
      "qeyri erzaq mali", "zemanet", "qusur", "qusurli mal", "lazimi keyfiyyetli"
    ],
    expandedTerms: [
      "lazimi keyfiyyetli qeyri erzaq malinin deyisdirilmesi", "istehlakcinin telebleri",
      "qusurli mal satildiqda istehlakcinin huquqlari", "zemanet muddeti", "temiri"
    ],
    priorityArticles: ["15", "7", "8", "14", "13", "12"]
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
    id: "property_neighbor_obstruction",
    domain: "Mülki hüquq",
    primaryLawId: "mulki",
    triggerPhrases: ["qonsu", "girisi bagla", "darvaza", "masin saxlayir", "qarshisinda avtomobil", "heyete giris", "maneə"],
    expandedTerms: [
      "qonsuluq huququ", "mulkiyyetcinin telebi", "mulkiyyet huququnun toxunulmazligi",
      "emlakdan istifadeye maneenin aradan qaldirilmasi", "neqator iddia", "qonsu torpaq saheleri"
    ],
    priorityArticles: ["157", "168", "169", "170", "171", "172"],
    forbiddenPhrases: ["qeyyum", "himaye"]
  },
  {
    id: "civil_vehicle_double_sale",
    domain: "Mülki hüquq",
    primaryLawId: "mulki",
    triggerPhrases: ["avtomobil satisi", "masin satilir", "pul odenilir", "basqasina satilir", "sifahi razilasma", "alqi-satqi"],
    expandedTerms: [
      "alqi-satqi muqavilesi", "saticinin vezifesi", "alincinin huquqlari", "esyanin tehvili",
      "mulkiyyet huququnun kecmesi", "vicdanli elde eden", "esassiz varlanma", "zererin evezinin odenilmesi"
    ],
    priorityArticles: ["573", "572", "574", "178", "182", "405", "406", "442", "445", "1091", "21"]
  },
  {
    id: "labor_salary_delay",
    domain: "Əmək hüququ",
    primaryLawId: "emek",
    triggerPhrases: [
      "maas gecikdiril", "emek haqqi gecikir", "maas verilmir", "maasimi alabilmirem", "emekhaqqi odenilmir",
      "maasini vaxtinda", "maas vaxtinda", "emek haqqi vaxtinda", "maas odemir", "maasini odemirse",
      "maasimi odemir", "maas gecikir", "emek haqqinin odenilmesi", "emek haqqini odemirse"
    ],
    expandedTerms: ["emek haqqinin odenilmesi muddetleri", "odenilmesinin gecikdirilmesine gore isegoturenin mesuliyyeti", "faiz", "her gecikdirilen gun", "azı bir faizi"],
    priorityArticles: ["172", "173", "174", "178", "179", "154", "157"]
  },
  {
    id: "labor_vacation",
    domain: "Əmək hüququ",
    primaryLawId: "emek",
    triggerPhrases: ["mezuniyyet", "otpusk", "emek mezuniyyeti", "esas mezuniyyet", "odenissiz mezuniyyet"],
    expandedTerms: ["mezuniyyet huququ", "esas ve elave mezuniyyetler", "mezuniyyet muddetleri", "is iline gore mezuniyyet"],
    priorityArticles: ["112", "113", "114", "115", "116", "117", "128", "131"]
  },
  {
    id: "tobacco_littering",
    domain: "İnzibati hüquq",
    primaryLawId: "inzibati_xetalar",
    triggerPhrases: [
      "siqaret atmaq", "siqareti yere atmaq", "siqaret tullamaq", "siqareti tullamaq", "yere atmaq",
      "siqaret kotuyu", "kotuk", "kotuyu yere atmaq", "tutun tullantisi", "tutun tullantilari",
      "siqareti yere", "siqaret atilmasi", "zibil atmaq"
    ],
    expandedTerms: [
      "tutun memulatlari tullantilarinin etraf muhite atilmasina gore",
      "etraf muhite atilmasina gore uc yuz manat mebleginde cerime edilir",
      "tutun memulatlari tullantilarinin etraf muhite atilmasi",
      "tutun memulatinin istehlakina dair mehdudiyyetler"
    ],
    priorityArticles: ["212", "212-1", "352"]
  },
  {
    id: "tobacco_smoking_prohibited",
    domain: "İnzibati hüquq",
    primaryLawId: "inzibati_xetalar",
    triggerPhrases: [
      "siqaret cekmek", "siqaret icmek", "tutun cekmek", "qadagan olunmus yerde siqaret",
      "elektron siqaret", "veyp", "qelyan", "qapali yerde siqaret"
    ],
    expandedTerms: [
      "qadağan edilmiş digər yerlərdə tütün çəkməyə görə",
      "tütün məmulatının istehlakına dair məhdudiyyətlər",
      "tütün çəkmək üçün xüsusi ayrılmış yerlər",
      "elektron siqaretlərin istifadəsi"
    ],
    priorityArticles: ["212", "212-1", "299", "305", "306", "318", "322"]
  },
  {
    id: "apartment_lease_eviction",
    domain: "Mənzil hüququ",
    primaryLawId: "menzil",
    triggerPhrases: [
      "kirayeci", "kiraye haqqi", "ev sahibi", "evden cixarma", "menzilden cixarma", "mehkeme qerari olmadan",
      "kirayeni odemir", "kiraye pulunu vermir", "kirayeci pulu odemir", "kirayecini evden cixarmaq",
      "alti ay", "6 ay", "alti aydan cox", "alti aydan artiq", "haqq odemedikde"
    ],
    expandedTerms: [
      "kirayeci ve onunla birlikde yasayan aile uzvleri",
      "uzrlu sebebler olmadan alti aydan artiq muddetde yasayis sahesine ve kommunal xidmetlere gore haqq odemedikde",
      "mehkeme qaydasinda cixarila bilerler",
      "yasayis sahesinden mehkeme qaydasinda cixarilma",
      "kiraye muqavilesinin legvi",
      "mehkeme qerari olmadan yasayis sahesinden cixarilmanin yolverilmezliyi",
      "kirayecinin huquqlari"
    ],
    priorityArticles: ["89", "90", "88", "82", "30", "1"]
  },
  {
    id: "minimum_wage",
    domain: "Əmək hüququ",
    primaryLawId: "emek",
    triggerPhrases: [
      "minimum emek haqqi", "minimum ayliq emekhaqqi", "minimum maas", "minimum emekhaqqi", "en az maas",
      "minimum emek haqqinin meblegi", "minimum emek haqqi necedir"
    ],
    expandedTerms: [
      "minimum emek haqqi", "minimum ayliq emekhaqqinin meblegi", "emekhaqqinin minimum heddi",
      "isegoturen terefinden minimum emekhaqqindan az olmamaq serti", "345 manat", "serencam",
      "ehalinin sosial rifahinin yaxsilasdirilmasi sahesinde elave tedbirler haqqinda"
    ],
    priorityArticles: ["155", "156", "154", "157"]
  }
];


