import { ALL_COURTS, findBestCourtMatch } from "./courts"
import {
  cleanParagraphLines,
  type DocumentLayoutMode,
  EDUCATIONAL_DECISION_BANNER,
  type OfficialTemplateReference,
  type PartyBlock,
  PROFESSIONAL_REVIEW_NOTICE,
  type StructuredLegalDocument,
  toAzUpperCase,
  type VerifiedLegalSourceRef,
} from "./legal-document-schema"

export type CoreDocumentTypeId =
  | "contract"
  | "petition"
  | "appeal"
  | "cassation"
  | "motion"
  | "objection"
  | "qarar"

export type ExtendedDocumentTypeId =
  | "state-application"
  | "official-complaint"
  | "pretension"
  | "power-of-attorney"
  | "legal-opinion"
  | "settlement"
  | "enforcement-complaint"
  | "labor-document"
  | "admin-claim"
  | "constitutional-complaint"
  | "court-speech"
  | "attorney-inquiry"

export type DocumentTypeId = CoreDocumentTypeId | ExtendedDocumentTypeId

export type DocumentIconName =
  | "handshake"
  | "file-text"
  | "scale"
  | "landmark"
  | "hand"
  | "ban"
  | "gavel"
  | "building"
  | "shield-alert"
  | "mail-warning"
  | "scroll-text"
  | "book-open"
  | "file-check"
  | "briefcase"
  | "mic"
  | "badge-check"

export interface FieldVisibilityConfig {
  showCourtOrAddressee?: boolean
  showDisputedAct?: boolean
  showCaseNumber?: boolean
  showAdvocate?: boolean
  showMediation?: boolean
  showLegalViolation?: boolean
  showAmount?: boolean
  showParty2?: boolean
}

export interface DocumentTypeSpec {
  id: DocumentTypeId
  category: "core" | "extended"
  slug: string
  href: string
  title: string
  shortTitle: string
  description: string
  legalBasisSummary: string
  limitationNote?: string
  iconName: DocumentIconName
  accentClass: string
  badgeText?: string
  educationalOnly?: boolean
  layoutMode: DocumentLayoutMode
  requiresCourt: boolean
  defaultCourt?: string
  courtLabel?: string
  courtPlaceholder?: string
  subtypeLabel?: string
  subtypeOptions?: string[]
  referenceLabel?: string
  referencePlaceholder?: string
  party1RoleLabel: string
  party1Label: string
  party1Placeholder: string
  party2RoleLabel: string
  party2Label: string
  party2Placeholder: string
  amountLabel: string
  amountPlaceholder: string
  factsLabel: string
  factsPlaceholder: string
  requestsLabel: string
  requestsPlaceholder: string
  requestsHeading: string
  documentHeading: string
  defaultSubtitle: string
  signatureRoleLabel: string
  ragQueryBoost: string
  officialTemplateReference: OfficialTemplateReference
  fieldVisibility: FieldVisibilityConfig
  systemInstruction: string
}

export const DOCUMENT_TYPES: DocumentTypeSpec[] = [
  // ===================== 7 CORE GENERATORS =====================
  {
    id: "contract",
    category: "core",
    slug: "create-contract",
    href: "/create-contract",
    title: "Müqavilə Konstruktoru",
    shortTitle: "Müqavilə",
    description: "Alqı-satqı, icarə, xidmət, podrat, borc, NDA və digər müqavilələri tərtib edin.",
    legalBasisSummary: "AR Mülki Məcəlləsi (m. 389–445, 567–760), AR Əmək Məcəlləsi",
    limitationNote:
      "Əmək müqavilələri AR Əmək Məcəlləsinə əsasən ƏMAS elektron altsistemində elektron sənəd formasında bağlanmalıdır; buradakı mətn şərtlərin layihə razılaşdırılması üçündür.",
    iconName: "handshake",
    accentClass: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800/60",
    layoutMode: "contract-bilateral",
    requiresCourt: false,
    subtypeLabel: "Müqavilənin növü",
    subtypeOptions: [
      "Alqı-satqı müqaviləsi",
      "İcarə müqaviləsi",
      "Xidmət müqaviləsi",
      "Podrat müqaviləsi",
      "Borc müqaviləsi",
      "Əvəzsiz istifadə müqaviləsi",
      "Əmək müqaviləsi layihəsi (ƏMAS məlumatlı)",
      "Məxfilik müqaviləsi (NDA)",
      "Tərəfdaşlıq müqaviləsi",
      "Barışıq sazişi",
    ],
    referenceLabel: "Müqavilənin bağlanma yeri və müddəti",
    referencePlaceholder: "Məs: Bakı şəhəri, 12 ay müddətinə",
    party1RoleLabel: "Birinci Tərəf",
    party1Label: "Birinci tərəf (Satıcı / İcarəyə verən / Sifarişçi / Borcverən)",
    party1Placeholder: "Tam ad və ya şirkət adı",
    party2RoleLabel: "İkinci Tərəf",
    party2Label: "İkinci tərəf (Alıcı / İcarəçi / İcraçı / Borcalan)",
    party2Placeholder: "Tam ad və ya şirkət adı",
    amountLabel: "Müqavilə qiyməti / Məbləğ və ödəniş qaydası",
    amountPlaceholder: "Məs: 3 500 AZN (nağdsız bank köçürməsi ilə)",
    factsLabel: "Müqavilənin predmeti, əşya/xidmət təsviri və əsas şərtlər",
    factsPlaceholder:
      "Müqavilənin predmetini, tərəflərin əsas hüquq və vəzifələrini, təhvil-təslim müddətlərini yazın...",
    requestsLabel: "Məsuliyyət, ləğv şərtləri və mübahisələrin həlli qaydası",
    requestsPlaceholder:
      "Məs: Gecikməyə görə 0,1% dəbbə pulu, vaxtından əvvəl xitam üçün 15 gün əvvəldən xəbərdarlıq.",
    requestsHeading: "XÜSUSİ VƏ ƏLAVƏ ŞƏRTLƏR:",
    documentHeading: "MÜQAVİLƏ",
    defaultSubtitle: "Mülki-hüquqi öhdəliklər haqqında",
    signatureRoleLabel: "Tərəflər",
    ragQueryBoost: "Azərbaycan Respublikasının Mülki Məcəlləsi müqavilə öhdəlik alqı-satqı icarə xidmət borc",
    officialTemplateReference: {
      portalName: "e-Qanun / AR Mülki Məcəlləsi",
      url: "https://www.e-qanun.ai/results/46944",
      note: "Dövlət portallarında vahid məcburi blank yoxdur; struktur AR Mülki Məcəlləsinin 389–408 və müvafiq fəsillərinə əsasən formalaşdırılır.",
    },
    fieldVisibility: {
      showCourtOrAddressee: false,
      showAmount: true,
      showParty2: true,
    },
    systemInstruction:
      "Sən AR Mülki Məcəlləsinə uyğun rəsmi müqavilə hazırlayan peşəkar hüquqşünassan. Sənəddə MÜTLƏQ ayrıca bölmələr olmalıdır: 1. Müqavilənin predmeti; 2. Tərəflərin hüquq və öhdəlikləri; 3. Qiymət və hesablaşma qaydası; 4. Müddət və icra qaydası; 5. Tərəflərin məsuliyyəti və fors-major; 6. Mübahisələrin həlli; 7. Yekun müddəalar. Əgər əmək müqaviləsidirsə, ƏMAS elektron sistemində bağlanmalı olduğunu xatırlat.",
  },
  {
    id: "petition",
    category: "core",
    slug: "create-petition",
    href: "/create-petition",
    title: "İddia Ərizəsi Yaradıcısı",
    shortTitle: "İddia Ərizəsi",
    description: "Borc, aliment, nikah, əmlak, zərər, əmək, istehlakçı və mülkiyyət iddiaları hazırlayın.",
    legalBasisSummary: "AR MPM (m. 149, 150), Mediasiya haqqında Qanun, AR MM / Ailə / Əmək Məcəlləsi",
    iconName: "file-text",
    accentClass: "text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-800/60",
    layoutMode: "court-right-header",
    requiresCourt: true,
    courtLabel: "Müraciət edilən məhkəmə (MPM m. 149.2.1)",
    courtPlaceholder: "Məs: Bakı şəhəri Nəsimi Rayon Məhkəməsinə",
    subtypeLabel: "İddianın növü",
    subtypeOptions: [
      "Borcun tutulması",
      "Alimentin tutulması",
      "Nikahın pozulması",
      "Əmlak bölgüsü",
      "Mənəvi zərərin ödənilməsi",
      "Maddi zərərin ödənilməsi",
      "Əmək haqqının tutulması",
      "İşə bərpa",
      "Müqavilənin ləğvi",
      "Mülkiyyət hüququnun tanınması",
      "İstehlakçı hüquqlarının müdafiəsi",
    ],
    referenceLabel: "Mübahisənin predmeti / Mediasiya və pretenziya məlumatı",
    referencePlaceholder: "Məs: Borc öhdəliyinin icrası; Mediasiya tələb olunmur / İştirak təsdiq edilib",
    party1RoleLabel: "İddiaçı",
    party1Label: "İddiaçının ad, soyad, ata adı (və ya şirkət adı)",
    party1Placeholder: "Məs: Əliyev Rəşad Kamran oğlu",
    party2RoleLabel: "Cavabdeh",
    party2Label: "Cavabdehin ad, soyad, ata adı (və ya şirkət)",
    party2Placeholder: "Məs: Məmmədov Tural Elçin oğlu",
    amountLabel: "İddia qiyməti (AZN, tətbiq edildikdə)",
    amountPlaceholder: "Məs: 3 500 AZN (dövlət rüsumu ayrıca göstərilə bilər)",
    factsLabel: "Faktiki hallar (xronoloji ardıcıllıqla) və mövcud sübutlar",
    factsPlaceholder:
      "Tarix, bağlanmış əqd və ya baş vermiş pozuntu, bank qəbzləri, yazışmalar və xronologiyanı qeyd edin...",
    requestsLabel: "Məhkəmədən xahiş edilən tələblər",
    requestsPlaceholder:
      "Məs: Cavabdehdən 3 500 AZN əsas borcun və ödənilmiş dövlət rüsumunun tutularaq iddiaçıya ödənilməsi barədə qətnamə qəbul edilsin.",
    requestsHeading: "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:",
    documentHeading: "İDDİA ƏRİZƏSİ",
    defaultSubtitle: "Hüquq və qanuni mənafelərin müdafiəsi haqqında",
    signatureRoleLabel: "İddiaçı",
    ragQueryBoost: "Mülki Prosessual Məcəllə maddə 149 150 iddia ərizəsi mediasiya mülki məcəllə",
    officialTemplateReference: {
      portalName: "Vahid Məhkəmə Portalı & e-Qanun (MPM m. 149–150)",
      url: "https://www.e-qanun.ai/results/46945",
      note: "MPM-in 149–150-ci maddələrinin imperativ məzmun və əlavə tələblərinə uyğun hazırlanıb; elektron göndəriş e-mehkeme.gov.az üzərindən aparılır.",
    },
    fieldVisibility: {
      showCourtOrAddressee: true,
      showMediation: true,
      showAmount: true,
      showParty2: true,
    },
    systemInstruction:
      "Sən AR MPM-in 149 və 150-ci maddələrinə uyğun rəsmi İddia Ərizəsi hazırlayan vəkilsən. Üslub rəsmi olmalıdır ('Mən, [İddiaçı]...' ilə başla). Faktiki halları xronoloji ardıcıllıqla ver, ardınca ayrıca 'Hüquqi əsaslandırma' bölməsində qüvvədə olan konkret maddələri göstər. Mediasiya/pretenziya qeydini (ailə, əmək, kommersiya işlərində MPM 149.2.4-1) unutma. Tələbləri nömrəli siyahıda ver. YALNIZ istifadəçinin verdiyi əlavələri yaz.",
  },
  {
    id: "appeal",
    category: "core",
    slug: "create-appeal",
    href: "/create-appeal",
    title: "Apellyasiya Şikayəti Yaradıcısı",
    shortTitle: "Apellyasiya",
    description: "Birinci instansiya məhkəməsinin qətnamə və qərardadlarından apellyasiya şikayəti hazırlayın.",
    legalBasisSummary: "AR MPM (m. 357–364), AR İPM (m. 79–85)",
    iconName: "scale",
    accentClass: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/50 dark:border-blue-800/60",
    layoutMode: "court-right-header",
    requiresCourt: true,
    defaultCourt: "Bakı Apellyasiya Məhkəməsinə",
    courtLabel: "Apellyasiya instansiyası məhkəməsi (MPM m. 361.1.1)",
    courtPlaceholder: "Məs: Bakı Apellyasiya Məhkəməsinə",
    subtypeLabel: "Şikayətin növü",
    subtypeOptions: [
      "Məhkəmə qətnaməsindən apellyasiya şikayəti",
      "Məhkəmə qərardadından apellyasiya şikayəti",
      "Qətnamənin qismən ləğv edilməsi haqqında apellyasiya şikayəti",
    ],
    referenceLabel: "Şikayət verilən aktı qəbul edən birinci instansiya məhkəməsi",
    referencePlaceholder: "Məs: Nəsimi Rayon Məhkəməsinin mülki kollegiyası vasitəsilə",
    party1RoleLabel: "Apellyasiya şikayəti verən",
    party1Label: "Şikayət verən şəxs və prosessual statusu",
    party1Placeholder: "Məs: Əliyev Rəşad Kamran oğlu (İddiaçı)",
    party2RoleLabel: "Digər iş iştirakçısı",
    party2Label: "Digər tərəf (Cavabdeh / İddiaçı)",
    party2Placeholder: "Məs: Məmmədov Tural Elçin oğlu",
    amountLabel: "Mübahisə məbləği / Dövlət rüsumu",
    amountPlaceholder: "Məs: 8 200 AZN",
    factsLabel: "İşin halları və birinci instansiya qərarının mübahisələndirilən hissələri",
    factsPlaceholder:
      "Birinci instansiya məhkəməsinin hansı nəticəyə gəldiyini və qərarın hansı hissələri ilə razılaşmadığınızı yazın...",
    requestsLabel: "Apellyasiya instansiyası məhkəməsindən xahiş",
    requestsPlaceholder:
      "Məs: Birinci instansiya məhkəməsinin qətnaməsi ləğv edilsin və iddianın təmin edilməsi barədə yeni qətnamə qəbul edilsin.",
    requestsHeading: "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:",
    documentHeading: "APELLYASİYA ŞİKAYƏTİ",
    defaultSubtitle: "Məhkəmə qətnaməsindən şikayət verilməsi haqqında",
    signatureRoleLabel: "Apellyasiya şikayəti verən",
    ragQueryBoost: "Mülki Prosessual Məcəllə maddə 360 361 364 385 apellyasiya şikayəti",
    officialTemplateReference: {
      portalName: "e-Qanun (AR MPM m. 361)",
      url: "https://www.e-qanun.ai/results/46945",
      note: "MPM-in 361-ci maddəsinə əsasən mübahisələndirilən akt, məhkəmə, hissə, maddi-prosessual pozuntular və 361.4-cü maddə yeni sübut məhdudiyyəti nəzərə alınır.",
    },
    fieldVisibility: {
      showCourtOrAddressee: true,
      showDisputedAct: true,
      showCaseNumber: true,
      showLegalViolation: true,
      showAmount: true,
      showParty2: true,
    },
    systemInstruction:
      "Sən AR MPM-in 357–364-cü maddələrinə uyğun Apellyasiya Şikayəti tərtib edən vəkilsən. Birinci instansiya məhkəməsinin adı, işin nömrəsi, qətnamənin tarixi və nəticə hissəsi, mübahisələndirilən hissələr, maddi və prosessual hüquq normalarının pozulmasının ayrıca hüquqi təhlili və tələblər dəqiq göstərilməlidir. Yeni sübut yalnız MPM 361.4 əsaslandırması ilə qeyd oluna bilər.",
  },
  {
    id: "cassation",
    category: "core",
    slug: "create-cassation",
    href: "/create-cassation",
    title: "Kassasiya Şikayəti Yaradıcısı",
    shortTitle: "Kassasiya",
    description: "Ali Məhkəməyə təqdim edilməli olan kassasiya şikayətlərini MPM Əlavə 3 üzrə tərtib edin.",
    legalBasisSummary: "AR MPM (m. 402–418, Əlavə 3)",
    limitationNote:
      "MPM 407.2-yə əsasən faktiki halların yenidən qiymətləndirilməsinə yol verilmir; MPM 407.3–407.4-ə əsasən mülki işlər üzrə şikayət vəkil tərəfindən tərtib edilməli, imzalanmalı və order əlavə olunmalıdır.",
    iconName: "landmark",
    accentClass: "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/50 dark:border-violet-800/60",
    layoutMode: "court-right-header",
    requiresCourt: true,
    defaultCourt: "Azərbaycan Respublikasının Ali Məhkəməsinə",
    courtLabel: "Kassasiya instansiyası məhkəməsi",
    courtPlaceholder: "Azərbaycan Respublikasının Ali Məhkəməsinə",
    subtypeLabel: "Kassasiya şikayətinin növü",
    subtypeOptions: [
      "Apellyasiya qətnaməsindən kassasiya şikayəti (MPM Əlavə 3)",
      "Apellyasiya qərardadından kassasiya şikayəti",
    ],
    referenceLabel: "Hansı apellyasiya məhkəməsi vasitəsilə verilir",
    referencePlaceholder: "Məs: Bakı Apellyasiya Məhkəməsi vasitəsilə",
    party1RoleLabel: "Kassasiya şikayəti verən",
    party1Label: "Kassasiya şikayəti verən şəxs və prosessual statusu",
    party1Placeholder: "Məs: Əliyev Rəşad Kamran oğlu (İddiaçı)",
    party2RoleLabel: "İş üzrə digər tərəf",
    party2Label: "Digər tərəf",
    party2Placeholder: "Məs: Məmmədov Tural Elçin oğlu (Cavabdeh)",
    amountLabel: "Mübahisə məbləği / Kassasiya rüsumu",
    amountPlaceholder: "Məs: 15 000 AZN",
    factsLabel: "İşin mərhələləri və mübahisələndirilən apellyasiya aktının nəticəsi",
    factsPlaceholder:
      "Qısa prosessual gedişat və apellyasiya aktının mübahisələndirilən hissəsi (qeyd: MPM 407.2-yə görə yalnız hüquqi pozuntular əsas götürülür)...",
    requestsLabel: "Ali Məhkəmədən xahiş (MPM m. 417)",
    requestsPlaceholder:
      "Məs: Apellyasiya məhkəməsinin qətnaməsi ləğv edilsin və iş yenidən baxılması üçün apellyasiya instansiyası məhkəməsinə göndərilsin.",
    requestsHeading: "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:",
    documentHeading: "KASSASİYA ŞİKAYƏTİ",
    defaultSubtitle: "Maddi və prosessual hüquq normalarının pozulmasına dair",
    signatureRoleLabel: "Kassasiya şikayəti verən şəxs",
    ragQueryBoost: "Mülki Prosessual Məcəllə maddə 407 414 416 417 418 kassasiya şikayəti Ali Məhkəmə vəkil",
    officialTemplateReference: {
      portalName: "AR Ali Məhkəməsi & e-Qanun (MPM m. 407, Əlavə 3)",
      url: "https://www.e-qanun.ai/results/46945",
      note: "Ali Məhkəmənin saytında hazır yüklənən blank yoxdur; struktur MPM m. 407, MPM Əlavə 3 və e-mehkeme.gov.az elektron kassasiya tələblərinə uyğun qurulub.",
    },
    fieldVisibility: {
      showCourtOrAddressee: true,
      showDisputedAct: true,
      showCaseNumber: true,
      showAdvocate: true,
      showLegalViolation: true,
      showAmount: true,
      showParty2: true,
    },
    systemInstruction:
      "Sən AR Ali Məhkəməsinə MPM-in 407-ci maddəsi və Əlavə 3 əsasında Kassasiya Şikayəti hazırlayan vəkilsən. QƏTİ QAYDA (MPM 407.2): Faktiki halların yenidən qiymətləndirilməsi və ya sübutların yetərsizliyi barədə iddia YAZMA — yalnız maddi hüquq normalarının tətbiq edilməməsi / yanlış şərhi və prosessual hüquq normalarının pozulmasını əsaslandır! Məhkəmə iclası istənirsə MPM 414.1 əsaslarını göstər. Sonda həm şikayətçinin, həm də şikayəti tərtib etmiş vəkilin imza yerini mütləq qoy.",
  },
  {
    id: "motion",
    category: "core",
    slug: "create-motion",
    href: "/create-motion",
    title: "Vəsatət Yaradıcısı",
    shortTitle: "Vəsatət",
    description: "Sübut tələbi, ekspertiza, müddət bərpası, təminat, şahid və digər vəsatətlər hazırlayın.",
    legalBasisSummary: "AR MPM (m. 77, 97, 133, 157–158, 178, 184), AR CPM",
    iconName: "hand",
    accentClass: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800/60",
    layoutMode: "court-right-header",
    requiresCourt: true,
    courtLabel: "İşə baxan məhkəmə",
    courtPlaceholder: "Məs: Bakı şəhəri Yasamal Rayon Məhkəməsinə",
    subtypeLabel: "Vəsatətin növü",
    subtypeOptions: [
      "Sübutların tələb edilməsi barədə vəsatət",
      "Ekspertiza təyin edilməsi barədə vəsatət",
      "Məhkəmə iclasının təxirə salınması barədə vəsatət",
      "Prosessual müddətin bərpası barədə vəsatət",
      "İşə üçüncü şəxsin cəlb edilməsi barədə vəsatət",
      "Şahid çağırılması barədə vəsatət",
      "İddianın təmin edilməsi barədə vəsatət",
      "Sübutların təmin edilməsi barədə vəsatət",
    ],
    referenceLabel: "Hakim və icraat məlumatı",
    referencePlaceholder: "Məs: Hakim ..., Mülki icraat",
    party1RoleLabel: "Vəsatət verən",
    party1Label: "Vəsatət verən şəxs və prosessual statusu",
    party1Placeholder: "Məs: Əliyev Rəşad Kamran oğlu (İddiaçı)",
    party2RoleLabel: "İş üzrə digər tərəf",
    party2Label: "Digər tərəf",
    party2Placeholder: "Məs: Məmmədov Tural Elçin oğlu",
    amountLabel: "Əlaqəli məbləğ / Sübut və ya ekspertiza obyekti",
    amountPlaceholder: "Məs: Müqavilə üzrə imza nümunəsi / 4 000 AZN bank əməliyyatı",
    factsLabel: "Vəsatətin faktiki və hüquqi əsaslandırılması",
    factsPlaceholder:
      "Vəsatətin işin düzgün həlli üçün niyə zəruri olduğunu, müvafiq sübutu müstəqil əldə edə bilməmə səbəbini yazın...",
    requestsLabel: "Məhkəmədən xahiş edilən prosessual tədbir",
    requestsPlaceholder:
      "Məs: Müvafiq ekspertiza təyin edilməsi (və ya sənədlərin tələb olunması) barədə qərardad qəbul edilsin.",
    requestsHeading: "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:",
    documentHeading: "VƏSATƏT",
    defaultSubtitle: "Prosessual hərəkətin yerinə yetirilməsi haqqında",
    signatureRoleLabel: "Vəsatət verən şəxs",
    ragQueryBoost: "Mülki Prosessual Məcəllə vəsatət sübutların tələb edilməsi ekspertiza təmin etmə",
    officialTemplateReference: {
      portalName: "e-Qanun (AR MPM m. 77, 97, 157)",
      url: "https://www.e-qanun.ai/results/46945",
      note: "MPM-in sübutetmə, ekspertiza, prosessual müddətin bərpası və iddianın təmin edilməsi maddələrinə uyğun hazırlanır.",
    },
    fieldVisibility: {
      showCourtOrAddressee: true,
      showCaseNumber: true,
      showAmount: true,
      showParty2: true,
    },
    systemInstruction:
      "Sən AR MPM-ə uyğun məhkəmə Vəsatəti hazırlayan hüquqşünassan. İşin nömrəsini (əgər daxil edilibsə) və hakimi sağ yuxarıda qeyd et. Alt başlığı vəsatət növünə görə yaz (məsələn: 'Məhkəmə ekspertizasının təyin edilməsi haqqında'). Faktiki zərurəti və konkret prosessual normanı ayrıca göstər.",
  },
  {
    id: "objection",
    category: "core",
    slug: "create-objection",
    href: "/create-objection",
    title: "Etiraz Yaradıcısı",
    shortTitle: "Etiraz",
    description: "İddiaya, şikayətlərə, sübutlara, ekspert rəyinə və məhkəmə əmrinə etiraz hazırlayın.",
    legalBasisSummary: "AR MPM (m. 154, 281, 367, 412)",
    iconName: "ban",
    accentClass: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800/60",
    layoutMode: "court-right-header",
    requiresCourt: true,
    courtLabel: "Etirazın təqdim edildiyi məhkəmə / orqan",
    courtPlaceholder: "Məs: Bakı şəhəri Sabunçu Rayon Məhkəməsinə",
    subtypeLabel: "Etirazın növü",
    subtypeOptions: [
      "İddia ərizəsinə qarşı etiraz",
      "Apellyasiya şikayətinə qarşı etiraz",
      "Kassasiya şikayətinə qarşı etiraz",
      "Sübutlara qarşı etiraz",
      "Ekspert rəyinə qarşı etiraz",
      "Prosessual tələblərə qarşı etiraz",
      "Məhkəmə əmrinə etiraz ərizəsi",
    ],
    referenceLabel: "Etirazın aid olduğu iş və ya sənəd məlumatı",
    referencePlaceholder: "Məs: İddiaçının 10.02.2026-cı il tarixli iddiasına dair",
    party1RoleLabel: "Etiraz verən",
    party1Label: "Etiraz verən şəxs və prosessual statusu",
    party1Placeholder: "Məs: Məmmədov Tural Elçin oğlu (Cavabdeh)",
    party2RoleLabel: "Qarşı tərəf",
    party2Label: "Qarşı tərəf (İddiaçı / Şikayətçi)",
    party2Placeholder: "Məs: Əliyev Rəşad Kamran oğlu",
    amountLabel: "Mübahisəli məbləğ / Tələb həcmi",
    amountPlaceholder: "Məs: 5 000 AZN",
    factsLabel: "Qarşı tərəfin arqumentləri və onlardakı faktiki/hüquqi ziddiyyətlər",
    factsPlaceholder:
      "Qarşı tərəfin hansı iddiasının və ya sübutunun həqiqətə və ya qanuna uyğun olmadığını bənd-bənd qeyd edin...",
    requestsLabel: "Məhkəmədən xahiş",
    requestsPlaceholder:
      "Məs: İddia tələbi əsassız və sübutsuz olduğundan tam rədd edilsin (və ya verilmiş şikayət təmin edilməsin).",
    requestsHeading: "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:",
    documentHeading: "ETİRAZ ƏRİZƏSİ",
    defaultSubtitle: "Tələblərə qarşı hüquqi mövqe haqqında",
    signatureRoleLabel: "Etiraz verən şəxs",
    ragQueryBoost: "Mülki Prosessual Məcəllə etiraz iddia ərizəsinə etiraz apellyasiya kassasiya sübutlara",
    officialTemplateReference: {
      portalName: "e-Qanun (AR MPM m. 154, 367, 412)",
      url: "https://www.e-qanun.ai/results/46945",
      note: "MPM üzrə qarşı tərəfin yazılı etiraz (cavab) hüququ və sübutların yolverilməzliyi qaydalarına əsasən formalaşdırılır.",
    },
    fieldVisibility: {
      showCourtOrAddressee: true,
      showDisputedAct: true,
      showCaseNumber: true,
      showLegalViolation: true,
      showAmount: true,
      showParty2: true,
    },
    systemInstruction:
      "Sən AR MPM-ə uyğun peşəkar Etiraz Ərizəsi hazırlayan hüquqşünassan. Qarşı tərəfin mövqeyini sistemli analiz et: əvvəl qarşı tərəfin arqumentini qısa xülasə et, sonra faktiki ziddiyyətləri və tətbiq edilə bilməyən/pozulmuş hüquq normalarını ayrıca göstər.",
  },
  {
    id: "qarar",
    category: "core",
    slug: "create-qarar",
    href: "/create-qarar",
    title: "Qərar Layihəsinin Yaradıcısı",
    shortTitle: "Qərar Layihəsi",
    description: "Yalnız tədris, hüquqi araşdırma və məhkəmə simulyasiyası üçün nümunə qərar mətnləri hazırlayın.",
    legalBasisSummary: "AR MPM (m. 216–220) — Yalnız tədris və simulyasiya modeli",
    limitationNote: EDUCATIONAL_DECISION_BANNER,
    iconName: "gavel",
    accentClass: "text-slate-700 bg-slate-100 border-slate-300 dark:text-slate-200 dark:bg-slate-800/70 dark:border-slate-700",
    badgeText: "Tədris məqsədli",
    educationalOnly: true,
    layoutMode: "court-right-header",
    requiresCourt: true,
    defaultCourt: "Şərti Birinci İnstansiya Məhkəməsi (Tədris Simulyasiyası)",
    courtLabel: "Şərti məhkəmə adı (Tədris ssenarisi üçün)",
    courtPlaceholder: "Şərti Birinci İnstansiya Məhkəməsi (Tədris Simulyasiyası)",
    referenceLabel: "Tədris ssenarisi / Simulyasiya iş №",
    referencePlaceholder: "Məs: Tədris nümunəsi № 01/2026",
    party1RoleLabel: "Şərti İddiaçı",
    party1Label: "Şərti iddiaçı (Tədris məqsədli)",
    party1Placeholder: "Məs: Şərti tərəf — A. Vəliyev",
    party2RoleLabel: "Şərti Cavabdeh",
    party2Label: "Şərti cavabdeh (Tədris məqsədli)",
    party2Placeholder: "Məs: Şərti tərəf — B. Həsənov",
    amountLabel: "Mübahisə məbləği / Predmet",
    amountPlaceholder: "Məs: 3 000 AZN",
    factsLabel: "Tədris kazusunun halları, tərəf mövqeləri və sübutlar",
    factsPlaceholder:
      "Simulyasiya edilən işin faktiki hallarını, tərəflərin dəlillərini və qiymətləndiriləcək məsələni yazın...",
    requestsLabel: "Layihənin öyrədici nəticə istiqaməti",
    requestsPlaceholder:
      "Məs: Tələbin təmin edilməsi (və ya qismən rədd edilməsi) üzrə hüquqi əsaslandırma nümunəsi",
    requestsHeading: "NƏTİCƏ HİSSƏSİ (TƏDRİS LAYİHƏSİ):",
    documentHeading: "QƏRAR LAYİHƏSİ (TƏDRİS NÜMUNƏSİ)",
    defaultSubtitle: "Tədris və hüquqi araşdırma məqsədli nümunə",
    signatureRoleLabel: "Hazırlayan (Tədris iştirakçısı)",
    ragQueryBoost: "Mülki Prosessual Məcəllə maddə 220 qətnamə məzmunu giriş təsviri əsaslandırıcı nəticə",
    officialTemplateReference: {
      portalName: "e-Qanun (AR MPM m. 220)",
      url: "https://www.e-qanun.ai/results/46945",
      note: "Yalnız tədris məqsədilə MPM 220-nin dördhissəli strukturunu öyrətmək üçün nəzərdə tutulub; rəsmi məhkəmə aktı təəssüratı yaratmamalıdır.",
    },
    fieldVisibility: {
      showCourtOrAddressee: true,
      showAmount: true,
      showParty2: true,
    },
    systemInstruction: `DİQQƏT: Bu sənəd rəsmi məhkəmə qərarı DEYİL. Yalnız təhsil/tədris məqsədlidir! Real hakim adı və ya rəsmi məhkəmə qərarı təəssüratı YARATMA.
Mütləq disclaimerBanner sahəsinə "${EDUCATIONAL_DECISION_BANNER}" yaz.
Struktur MPM 220-yə uyğun dörd bölmədən ibarət olsun: I. GİRİŞ HİSSƏSİ (tədris konteksti), II. TƏSVİRİ HİSSƏ, III. ƏSASLANDIRICI HİSSƏ, IV. NƏTİCƏ HİSSƏSİ (tədris layihəsi).`,
  },

  // ===================== 12 NEW GENERATORS (SECTION 4) =====================
  {
    id: "state-application",
    category: "extended",
    slug: "state-application",
    href: "/create/state-application",
    title: "Dövlət Orqanlarına Müraciət Ərizəsi",
    shortTitle: "Dövlət Müraciəti",
    description: "Nazirlik, icra hakimiyyəti və dövlət qurumlarına rəsmi müraciət və sorğu ərizələri.",
    legalBasisSummary: "AR Konstitusiyası m. 57, Vətəndaşların müraciətləri haqqında Qanun m. 6",
    iconName: "building",
    accentClass: "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/50 dark:border-sky-800/60",
    layoutMode: "formal-address",
    requiresCourt: true,
    courtLabel: "Müraciət edilən dövlət orqanı / vəzifəli şəxs (Qanun m. 6.3.1)",
    courtPlaceholder: "Məs: Azərbaycan Respublikasının Ədliyyə Nazirliyinə / İcra Hakimiyyətinə",
    referenceLabel: "Məsələnin mövzusu / əvvəlki qeydiyyat № (varsa)",
    referencePlaceholder: "Məs: Arayışın / rəsmi məlumatın verilməsi barədə",
    party1RoleLabel: "Müraciət edən",
    party1Label: "Müraciət edən şəxs (Qanun m. 6.3.2 — anonimlik yolverilməzdir)",
    party1Placeholder: "Ad, soyad, ata adı",
    party2RoleLabel: "Aidiyyəti qurum / şöbə",
    party2Label: "Aidiyyəti struktur bölmə (istəyə bağlı)",
    party2Placeholder: "Məs: Qeydiyyat idarəsi",
    amountLabel: "Əlaqəli ödəniş / Dövlət rüsumu (varsa)",
    amountPlaceholder: "Məs: Tələb olunmur",
    factsLabel: "Müraciətin məzmunu və faktiki hallar",
    factsPlaceholder: "Dövlət qurumundan hansı məsələnin araşdırılmasını və ya hansı sənədin verilməsini istədiyinizi izah edin...",
    requestsLabel: "Xahiş",
    requestsPlaceholder: "Məs: Qeyd olunan məsələnin araşdırılması və qanunla müəyyən edilmiş müddətdə yazılı cavab verilməsi.",
    requestsHeading: "XAHİŞ EDİRƏM:",
    documentHeading: "ƏRİZƏ",
    defaultSubtitle: "Rəsmi müraciət edilməsi haqqında",
    signatureRoleLabel: "Müraciət edən şəxs",
    ragQueryBoost: "Vətəndaşların müraciətləri haqqında Qanun maddə 6 Konstitusiya maddə 57 dövlət orqanına müraciət",
    officialTemplateReference: {
      portalName: "e-Qanun (Vətəndaşların müraciətləri haqqında Qanun m. 6)",
      url: "https://www.e-qanun.ai/results/31281",
      note: "Qanunun 6.3 və 6.5-ci maddələrinə əsasən müraciətdə ad/soyad/ünvan (əlaqə), tarix və imza mütləqdir, əks halda anonim sayılır.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showParty2: false, showAmount: false },
    systemInstruction:
      "Sən 'Vətəndaşların müraciətləri haqqında' Qanunun 6-cı maddəsinə və Kargüzarlıq Təlimatına uyğun rəsmi Ərizə tərtib edirsən. Sağ yuxarı hissədə dövlət orqanının adı və müraciət edənin identifikasiya rekvizitləri göstərilməlidir (anonim olmaması üçün).",
  },
  {
    id: "official-complaint",
    category: "extended",
    slug: "official-complaint",
    href: "/create/official-complaint",
    title: "Rəsmi Şikayət Ərizəsi",
    shortTitle: "Rəsmi Şikayət",
    description: "Vəzifəli şəxslərin hərəkət/hərəkətsizliyinə və ya inzibati aktlara qarşı yuxarı orqana şikayət.",
    legalBasisSummary: "Vətəndaşların müraciətləri haqqında Qanun, İnzibati icraat haqqında Qanun m. 71–73",
    iconName: "shield-alert",
    accentClass: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/50 dark:border-red-800/60",
    layoutMode: "formal-address",
    requiresCourt: true,
    courtLabel: "Şikayət verilən yuxarı səlahiyyətli orqan / rəhbər",
    courtPlaceholder: "Məs: Müvafiq Nazirliyin Rəhbərliyinə / Apellyasiya Şurasına",
    referenceLabel: "Şikayət olunan qərar / hərəkət və ya qurum",
    referencePlaceholder: "Məs: 02.03.2026-cı il tarixli imtina məktubu",
    party1RoleLabel: "Şikayətçi",
    party1Label: "Şikayətçi (Ad, soyad, ata adı)",
    party1Placeholder: "Məs: Əliyev Rəşad Kamran oğlu",
    party2RoleLabel: "Şikayət edilən orqan / vəzifəli şəxs",
    party2Label: "Hərəkətindən/qərarından şikayət edilən qurum",
    party2Placeholder: "Məs: ... rayonu üzrə yerli bölmə",
    amountLabel: "Zərər / İmtina məbləği (varsa)",
    amountPlaceholder: "Məs: Hüquqi xarakterli şikayət",
    factsLabel: "Pozuntu halları və hüquqlarınızın pozulması təfərrüatı",
    factsPlaceholder: "Hansı qərarın, imtinanın və ya hərəkətsizliyin qanunvericiliyə zidd olduğunu xronoloji yazın...",
    requestsLabel: "Tələblər",
    requestsPlaceholder: "Məs: Qanunsuz qərarın ləğvi, xidməti yoxlama aparılması və hüququn bərpa olunması.",
    requestsHeading: "XAHİŞ EDİRƏM:",
    documentHeading: "ŞİKAYƏT ƏRİZƏSİ",
    defaultSubtitle: "Qanunsuz qərar və hərəkətlərdən şikayət haqqında",
    signatureRoleLabel: "Şikayətçi",
    ragQueryBoost: "İnzibati icraat haqqında Qanun maddə 71 72 73 inzibati şikayət vətəndaşların müraciətləri",
    officialTemplateReference: {
      portalName: "e-Qanun (İnzibati icraat haqqında Qanun m. 71–73)",
      url: "https://www.e-qanun.ai/results/11254",
      note: "İnzibati aktlardan yuxarı inzibati orqana 30 gün müddətində şikayət verilməsi qaydalarına uyğun qurulur.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showDisputedAct: true, showParty2: true },
    systemInstruction:
      "Sən AR 'İnzibati icraat haqqında' Qanunun 71–73-cü maddələri və 'Vətəndaşların müraciətləri haqqında' Qanuna uyğun Rəsmi Şikayət Ərizəsi tərtib edirsən. Mübahisələndirilən hərəkəti/aktı, konkret pozulmuş normaları və yuxarı orqandan gözlənilən qərarı dəqiq yaz.",
  },
  {
    id: "pretension",
    category: "extended",
    slug: "pretension",
    href: "/create/pretension",
    title: "Pretenziya Məktubu",
    shortTitle: "Pretenziya",
    description: "Məhkəməyə müraciətdən əvvəl qarşı tərəfə rəsmi xəbərdarlıq və tələb (pretenziya) məktubu.",
    legalBasisSummary: "AR Mülki Məcəlləsi (m. 385, 442, 445), AR MPM (m. 149.2.4, 150.1.6)",
    iconName: "mail-warning",
    accentClass: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/50 dark:border-orange-800/60",
    layoutMode: "formal-address",
    requiresCourt: true,
    courtLabel: "Pretenziyanın ünvanlandığı qarşı tərəf (Şirkət / Şəxs)",
    courtPlaceholder: "Məs: \"ABC Ticarət\" MMC-nin Direktoruna",
    referenceLabel: "Əlaqəli müqavilə / sifariş / hesab-faktura",
    referencePlaceholder: "Məs: 10.01.2026-cı il tarixli № 15 Xidmət müqaviləsi",
    party1RoleLabel: "Pretenziya göndərən",
    party1Label: "Pretenziyanı göndərən tərəf",
    party1Placeholder: "Ad, soyad / Şirkət adı",
    party2RoleLabel: "Ünvanlanan tərəf",
    party2Label: "Qarşı tərəf (Ünvanlanan)",
    party2Placeholder: "Şirkət və ya fiziki şəxsin adı",
    amountLabel: "Tələb olunan məbləğ (əsas borc + dəbbə pulu/zərər)",
    amountPlaceholder: "Məs: 6 400 AZN",
    factsLabel: "Öhdəliyin pozulması halları və hesablamalar",
    factsPlaceholder: "Müqavilə öhdəliyinin hansı bəndinin pozulduğunu, gecikmə günlərini və məbləğin hesablanmasını yazın...",
    requestsLabel: "İcra üçün müəyyən edilən müddət və tələblər",
    requestsPlaceholder:
      "Məs: Bu pretenziya alındığı gündən 10 təqvim günü ərzində borc ödənilmədikdə, məhkəmə qaydasında məcburi tutulma və məhkəmə xərcləri tələb olunacaqdır.",
    requestsHeading: "TƏLƏB EDİRİK (XƏBƏRDARLIQ):",
    documentHeading: "PRETENZİYA MƏKTUBU",
    defaultSubtitle: "Mübahisənin məhkəməyəqədər nizama salınması haqqında",
    signatureRoleLabel: "Pretenziya göndərən",
    ragQueryBoost: "Mülki Məcəllə öhdəliyin icra edilməməsi pretenziya dəbbə pulu zərər MPM 149",
    officialTemplateReference: {
      portalName: "e-Qanun (AR Mülki Məcəlləsi & MPM m. 149.2.4)",
      url: "https://www.e-qanun.ai/results/46944",
      note: "Kommersiya və müqavilə mübahisələrində məhkəməyəqədər (pretenziya) qaydaya əməl olunduğunu sübut etmək üçün rəsmi bildiriş qaydası.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showAmount: true, showParty2: true },
    systemInstruction:
      "Sən kommersiya və mülki mübahisələr üzrə rəsmi Pretenziya Məktubu hazırlayırsan. Qarşı tərəfə konkret öhdəlik pozuntusunu, məbləği, qanunvericilik əsaslarını və məhkəməyə müraciətdən əvvəl könüllü icra müddətini (MPM 149.2.4, 150.1.6 baxımından sübut dəyərini nəzərə alaraq) aydın ifadə et.",
  },
  {
    id: "power-of-attorney",
    category: "extended",
    slug: "power-of-attorney",
    href: "/create/power-of-attorney",
    title: "Etibarnamə",
    shortTitle: "Etibarnamə",
    description: "Təmsilçilik, sənəd alınması və əqdlər üzrə etibarnamə layihəsi hazırlayın.",
    legalBasisSummary: "AR Mülki Məcəlləsi (m. 362–365), Notariat haqqında Qanun",
    limitationNote:
      "AR Mülki Məcəlləsinin 362.2-ci maddəsinə əsasən notarial forma tələb edən əqdlər (daşınmaz əmlak, nəqliyyat vasitəsi, məhkəmə/bank əməliyyatlarının bir çoxu) üçün etibarnamə MÜTLƏQ notariat qaydasında təsdiqlənməlidir (notarius.az).",
    iconName: "scroll-text",
    accentClass: "text-teal-700 bg-teal-50 border-teal-200 dark:text-teal-300 dark:bg-teal-950/50 dark:border-teal-800/60",
    layoutMode: "formal-address",
    requiresCourt: false,
    subtypeLabel: "Etibarnamənin növü",
    subtypeOptions: [
      "Məhkəmə və dövlət orqanlarında təmsilçilik etibarnaməsi (MPM m. 70)",
      "Ümumi inzibati işlər / sənəd alınması etibarnaməsi",
      "Şirkət adından müqavilə və təhvil-təslim etibarnaməsi",
    ],
    referenceLabel: "Etibarlılıq müddəti və əlavə səlahiyyətlər (MM m. 363)",
    referencePlaceholder: "Məs: 1 (bir) il müddətinə, başqasına etibar etmək hüququ olmadan",
    party1RoleLabel: "Etibar edən (Təmsil edilən)",
    party1Label: "Etibar edən şəxs / Hüquqi şəxs",
    party1Placeholder: "Ad, soyad, ata adı (və ya direktor/şirkət)",
    party2RoleLabel: "Etibar edilən (Təmsilçi)",
    party2Label: "Etibar edilən nümayəndə",
    party2Placeholder: "Ad, soyad, ata adı (FİN / Ünvan əlavə bölmədə)",
    amountLabel: "Əhatə olunan əməliyyat hüdudu (varsa)",
    amountPlaceholder: "Məs: Bütün prosessual əməliyyatlar üzrə",
    factsLabel: "Verilən konkret səlahiyyətlərin siyahısı",
    factsPlaceholder:
      "Məs: Məhkəmələrdə iş materialları ilə tanış olmaq, iddia ərizəsi və şikayətlər imzalamaq, sənədlər təqdim etmək və almaq...",
    requestsLabel: "Məhdudiyyətlər / başqasına etibar hüququ",
    requestsPlaceholder: "Məs: Etibarnamə üzrə səlahiyyətlər başqa şəxsə ötürülə bilməz (MM m. 364).",
    requestsHeading: "SƏLAHİYYƏT HƏDDİ:",
    documentHeading: "ETİBARNAMƏ",
    defaultSubtitle: "Təmsilçilik səlahiyyətlərinin verilməsi haqqında",
    signatureRoleLabel: "Etibar edən",
    ragQueryBoost: "Mülki Məcəllə maddə 362 363 364 etibarnamə notariat təmsilçilik",
    officialTemplateReference: {
      portalName: "e-Qanun (AR Mülki Məcəlləsi m. 362–365)",
      url: "https://www.e-qanun.ai/results/46944",
      note: "MM 362.2-yə əsasən notarial təsdiq tələb olunan əqdlər üzrə etibarnamələr Notariat qaydasında təsdiqləndikdən sonra hüquqi qüvvəyə minir.",
    },
    fieldVisibility: { showCourtOrAddressee: false, showParty2: true, showAmount: false },
    systemInstruction:
      "Sən AR Mülki Məcəlləsinin 362–365-ci maddələrinə uyğun Etibarnamə layihəsi hazırlayırsan. Verilmə yeri, tarixi, Etibar edən və Etibar edilən şəxslərin tam rekvizitləri, verilən səlahiyyətlərin dəqiq siyahısı (məhkəmə etibarnaməsində MPM m. 70 xüsusi səlahiyyətlərini ayır), etibarlılıq müddəti (MM m. 363) və imza yerini daxil et. Notarial təsdiq zərurətini aydın qeyd et.",
  },
  {
    id: "legal-opinion",
    category: "extended",
    slug: "legal-opinion",
    href: "/create/legal-opinion",
    title: "Hüquqi Rəy",
    shortTitle: "Hüquqi Rəy",
    description: "Müqavilə, mübahisə və ya hüquqi risklər barədə əsaslandırılmış hüquqi rəy (Legal Opinion).",
    legalBasisSummary: "Müvafiq normativ hüquqi aktlar və prosessual qanunvericilik",
    iconName: "book-open",
    accentClass: "text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/50 dark:border-cyan-800/60",
    layoutMode: "opinion",
    requiresCourt: true,
    courtLabel: "Rəy təqdim edilən sifarişçi / rəhbərlik",
    courtPlaceholder: "Məs: Müştəri / Şirkət Rəhbərliyinə",
    referenceLabel: "Tədqiq edilən məsələ / Sənəd",
    referencePlaceholder: "Məs: İcarə müqaviləsinə vaxtından əvvəl xitam verilməsinin hüquqi riskləri",
    party1RoleLabel: "Rəyi hazırlayan",
    party1Label: "Rəyi hazırlayan hüquqşünas / şöbə",
    party1Placeholder: "Məs: Hüquq məsləhətçisi",
    party2RoleLabel: "Sifarişçi",
    party2Label: "Rəy sifarişçisi",
    party2Placeholder: "Məs: \"XYZ\" MMC",
    amountLabel: "Potensial maliyyə riski / Məbləğ",
    amountPlaceholder: "Məs: 25 000 AZN müqavilə dəyəri",
    factsLabel: "Araşdırılan faktlar və qoyulan hüquqi suallar",
    factsPlaceholder: "Faktiki vəziyyəti, mövcud sənədləri və cavab axtarılan konkret hüquqi sualları yazın...",
    requestsLabel: "Tövsiyə edilən hərəkət istiqamətləri",
    requestsPlaceholder: "Məs: Pretenziya göndərilməsi, danışıqlar və ya məhkəmə perspektivinin qiymətləndirilməsi.",
    requestsHeading: "HÜQUQİ NƏTİCƏ VƏ TÖVSİYƏLƏR:",
    documentHeading: "HÜQUQİ RƏY",
    defaultSubtitle: "Hüquqi analiz və risklərin qiymətləndirilməsi haqqında",
    signatureRoleLabel: "Rəyi hazırlayan",
    ragQueryBoost: "hüquqi əsaslandırma mübahisə müqavilə məsuliyyət Mülki Məcəllə",
    officialTemplateReference: {
      portalName: "e-Qanun.ai Rəsmi Qanunvericilik Bazası",
      url: "https://www.e-qanun.ai",
      note: "Dövlət blankı olmayan konsultativ sənəddir; strukturu 1) Sualın qoyuluşu, 2) Faktlar, 3) Tətbiq edilən normalar, 4) Risklər və Nəticə hissələrindən ibarətdir.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showAmount: true, showParty2: true },
    systemInstruction:
      "Sən peşəkar hüquq məsləhətçisisən. Hüquqi Rəyi 4 dəqiq hissədə qur: 1. Tədqiqatın predmeti və suallar; 2. Təqdim edilmiş faktiki hallar; 3. Tətbiq edilən qanunvericilik normaları və hüquqi təhlil (mübahisəli hallarda qeyri-müəyyənliyi və alternativ şərhləri açıq göstər); 4. Risk qiymətləndirməsi və tövsiyələr.",
  },
  {
    id: "settlement",
    category: "extended",
    slug: "settlement",
    href: "/create/settlement",
    title: "Barışıq Sazişi",
    shortTitle: "Barışıq Sazişi",
    description: "Məhkəmə icraatında (MPM m. 191) və ya mediasiyada tərəflər arasında barışıq sazişi.",
    legalBasisSummary: "AR MPM (m. 191), Mediasiya haqqında Qanun (m. 33–34), AR Mülki Məcəlləsi",
    iconName: "file-check",
    accentClass: "text-lime-700 bg-lime-50 border-lime-200 dark:text-lime-300 dark:bg-lime-950/50 dark:border-lime-800/60",
    layoutMode: "contract-bilateral",
    requiresCourt: true,
    courtLabel: "Təsdiq edən məhkəmə / Mediasiya təşkilatı (varsa)",
    courtPlaceholder: "Məs: Yasamal Rayon Məhkəməsinin təsdiqinə (İş № ...) / Mediasiya şurası",
    referenceLabel: "İşin nömrəsi və ya mediasiya prosesi məlumatı",
    referencePlaceholder: "Məs: İş № 2(004)-112/2026 üzrə qarşılıqlı güzəşt",
    party1RoleLabel: "İddiaçı (Birinci Tərəf)",
    party1Label: "Birinci tərəf (İddiaçı / Tələbkar)",
    party1Placeholder: "Tam ad və ya şirkət adı",
    party2RoleLabel: "Cavabdeh (İkinci Tərəf)",
    party2Label: "İkinci tərəf (Cavabdeh / Borclu)",
    party2Placeholder: "Tam ad və ya şirkət adı",
    amountLabel: "Razılaşdırılan ödəniş məbləği və qrafiki",
    amountPlaceholder: "Məs: 2 500 AZN — 2 bərabər hissədə",
    factsLabel: "Mübahisənin mahiyyəti və tərəflərin qarşılıqlı güzəşt şərtləri",
    factsPlaceholder:
      "Hansı məbləğin və ya öhdəliyin hansı müddətdə icra olunacağını, məhkəmə rüsumunun bölüşdürülməsini qeyd edin...",
    requestsLabel: "Məhkəməyə xahiş / İcra edilmədikdə hüquqi nəticələr",
    requestsPlaceholder:
      "Məs: Barışıq sazişinin məhkəmə tərəfindən təsdiq edilməsi və iş üzrə icraata xitam verilməsi (MPM m. 261.0.5).",
    requestsHeading: "SAZİŞİN TƏSDİQİ VƏ HÜQUQİ NƏTİCƏLƏR:",
    documentHeading: "BARIŞIQ SAZİŞİ",
    defaultSubtitle: "Mübahisənin qarşılıqlı razılıqla həlli haqqında",
    signatureRoleLabel: "Tərəflər",
    ragQueryBoost: "Mülki Prosessual Məcəllə maddə 191 261 barışıq sazişi Mediasiya haqqında Qanun",
    officialTemplateReference: {
      portalName: "e-Qanun (MPM m. 191 & Mediasiya Qanunu)",
      url: "https://www.e-qanun.ai/results/41828",
      note: "MPM 191-ə görə barışıq sazişinin təsdiqi barədə qərardad məcburi icra qüvvəsinə malikdir və eyni predmet üzrə təkrar iddianı istisna edir.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showCaseNumber: true, showAmount: true, showParty2: true },
    systemInstruction:
      "Sən AR MPM-in 191-ci maddəsi və 'Mediasiya haqqında' Qanuna uyğun Barışıq Sazişi hazırlayırsan. Qarşılıqlı güzəşt şərtlərini, dəqiq ödəniş/icra tarixlərini, bank rekvizitləri üçün yeri, məhkəmə xərclərinin bölüşdürülməsini, könüllü icra edilmədikdə icra vərəqəsi verilməsi qaydasını və iki tərəfin imzasını mütləq daxil et.",
  },
  {
    id: "enforcement-complaint",
    category: "extended",
    slug: "enforcement-complaint",
    href: "/create/enforcement-complaint",
    title: "İcra Məmurunun Hərəkətlərindən Şikayət",
    shortTitle: "İcra Şikayəti",
    description: "İcra məmurunun hərəkət, hərəkətsizlik və ya qərarından məhkəmə/yuxarı icra orqanına şikayət.",
    legalBasisSummary: "İcra haqqında Qanun m. 87, AR MPM m. 448, AR İPM",
    iconName: "shield-alert",
    accentClass: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200 dark:text-fuchsia-300 dark:bg-fuchsia-950/50 dark:border-fuchsia-800/60",
    layoutMode: "court-right-header",
    requiresCourt: true,
    courtLabel: "Şikayətin verildiyi məhkəmə / İcra xidməti rəhbərliyi",
    courtPlaceholder: "Məs: Bakı İnzibati Məhkəməsinə / Rayon Məhkəməsinə",
    referenceLabel: "İcra vərəqəsi və icra icraatının №, tarixi",
    referencePlaceholder: "Məs: İcra sənədi № 2(006)-500/2025, Nəsimi rayon icra şöbəsi",
    party1RoleLabel: "Şikayətçi (Tələbkar / Borclu)",
    party1Label: "Şikayət verən şəxs və icraatdakı statusu",
    party1Placeholder: "Məs: Əliyev Rəşad Kamran oğlu (Tələbkar)",
    party2RoleLabel: "Cavabdeh (İcra şöbəsi / Məmur)",
    party2Label: "Hərəkətindən şikayət edilən icra şöbəsi və icra məmuru",
    party2Placeholder: "Məs: ... Rayon İcra və Probasiya Şöbəsi",
    amountLabel: "İcra tələbinin məbləği",
    amountPlaceholder: "Məs: 4 500 AZN",
    factsLabel: "İcra məmurunun hərəkətsizliyi / qanunsuz hərəkəti və müddət pozuntuları",
    factsPlaceholder:
      "İcra vərəqəsinin təqdim edildiyi tarixi, icra məmurunun hansı məcburi icra tədbirlərini görmədiyini və ya qanunsuz qərarını yazın...",
    requestsLabel: "Məhkəmədən xahiş",
    requestsPlaceholder:
      "Məs: İcra məmurunun hərəkətsizliyi qanunsuz hesab edilsin və icra tədbirlərinin görülməsi öhdəliyi qoyulsun.",
    requestsHeading: "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:",
    documentHeading: "ŞİKAYƏT ƏRİZƏSİ",
    defaultSubtitle: "İcra məmurunun hərəkətlərindən (hərəkətsizliyindən) şikayət haqqında",
    signatureRoleLabel: "Şikayətçi",
    ragQueryBoost: "İcra haqqında Qanun icra məmurunun hərəkətlərindən şikayət MPM 448 İnzibati Məhkəmə",
    officialTemplateReference: {
      portalName: "e-Qanun (AR MPM & İcra Qanunvericiliyi)",
      url: "https://www.e-qanun.ai/results/46945",
      note: "İcra məmurunun hərəkət/hərəkətsizliyindən 10 gün müddətində şikayət verilməsi və icra hərəkətlərinin mübahisələndirilməsi qaydasına uyğun.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showDisputedAct: true, showCaseNumber: true, showParty2: true, showAmount: true },
    systemInstruction:
      "Sən icra məmurunun hərəkət və ya hərəkətsizliyindən rəsmi Şikayət Ərizəsi hazırlayırsan. İcra sənədinin tarixini, icra şöbəsini, hansı icra tədbirlərinin pozulduğunu (sorğuların göndərilməməsi, əmlaka həbs qoyulmaması və ya qanunsuz qərar) xronoloji göstər.",
  },
  {
    id: "labor-document",
    category: "extended",
    slug: "labor-document",
    href: "/create/labor-document",
    title: "Əmək Münasibətləri üzrə Sənədlər",
    shortTitle: "Əmək Sənədləri",
    description: "İşə qəbul, məzuniyyət, işdən azad olunma ərizələri, izahat və kadr əmri layihələri.",
    legalBasisSummary: "AR Əmək Məcəlləsi (m. 43–77, 110–144, 186–190)",
    limitationNote:
      "Əmək müqaviləsinin bağlanması, dəyişdirilməsi və xitamı AR Əmək Məcəlləsinə əsasən ƏMAS altsistemində elektron rəsmiləşdirilir; daxili ərizə/izahat və əmr layihələri şirkətdaxili kargüzarlıq üçündür.",
    iconName: "briefcase",
    accentClass: "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800/60",
    layoutMode: "formal-address",
    requiresCourt: true,
    courtLabel: "İşəgötürən qurumun adı və rəhbəri",
    courtPlaceholder: "Məs: \"ABC Holdinq\" MMC-nin Direktoru cənab ...-ə",
    subtypeLabel: "Kadr sənədinin növü",
    subtypeOptions: [
      "Öz xahişi ilə işdən azad olunma ərizəsi (ƏM m. 69)",
      "Əmək məzuniyyəti ərizəsi (ƏM m. 113–133)",
      "Öz hesabına (ödənişsiz) məzuniyyət ərizəsi (ƏM m. 128–130)",
      "İşə qəbul barədə ərizə",
      "İntizam məsələsi üzrə yazılı izahat (ƏM m. 187)",
      "Əmək münasibətinə xitam verilməsi barədə əmr layihəsi",
    ],
    referenceLabel: "İşçinin vəzifəsi, şöbəsi və tarix",
    referencePlaceholder: "Məs: Satış şöbəsinin baş mütəxəssisi, 20.11.2026-cı ildən",
    party1RoleLabel: "İşçi (Ərizəçi)",
    party1Label: "İşçinin adı, soyadı, ata adı",
    party1Placeholder: "Məs: Həsənov Murad İlham oğlu",
    party2RoleLabel: "İşəgötürən",
    party2Label: "İşəgötürən təşkilat (istəyə bağlı)",
    party2Placeholder: "Məs: \"ABC\" MMC",
    amountLabel: "Məzuniyyət günü / Məlumat (varsa)",
    amountPlaceholder: "Məs: 14 təqvim günü",
    factsLabel: "Ərizənin / izahatın və ya əmrin əsas məzmunu",
    factsPlaceholder: "Tarixləri, səbəbləri (məs: ƏM 69-cu maddəyə əsasən 1 təqvim ayı öncədən xəbərdarlıqla) yazın...",
    requestsLabel: "Xahiş / Sərəncam hissəsi",
    requestsPlaceholder: "Məs: Qeyd olunan tarixdən öz xahişimlə əmək müqaviləmə xitam verilməsini və son haqq-hesabın ödənilməsini xahiş edirəm.",
    requestsHeading: "XAHİŞ EDİRƏM:",
    documentHeading: "ƏRİZƏ",
    defaultSubtitle: "Əmək münasibətləri üzrə müraciət",
    signatureRoleLabel: "İşçi",
    ragQueryBoost: "Əmək Məcəlləsi maddə 69 70 113 187 işdən azad məzuniyyət izahat əmr",
    officialTemplateReference: {
      portalName: "e-Qanun (AR Əmək Məcəlləsi)",
      url: "https://www.e-qanun.ai/results/46943",
      note: "AR Əmək Məcəlləsinin 69, 70, 113–130 və 187-ci maddələrinə uyğun kadr sənədi strukturu.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showParty2: false, showAmount: false },
    systemInstruction:
      "Sən AR Əmək Məcəlləsinə uyğun rəsmi kadr/əmək sənədi tərtib edirsən. Ərizədirsə sağ yuxarıda işəgötürən rəhbərin adı və işçinin ad/vəzifəsi, mərkəzdə 'ƏRİZƏ' (və ya 'İZAHAT', 'ƏMR № ___'), rəsmi mətn (məs: 'Mən, ...') və sonunda işçi imzası olsun.",
  },
  {
    id: "admin-claim",
    category: "extended",
    slug: "admin-claim",
    href: "/create/admin-claim",
    title: "İnzibati İddia Ərizəsi",
    shortTitle: "İnzibati İddia",
    description: "Dövlət/bələdiyyə orqanının inzibati aktına və ya hərəkətsizliyinə qarşı İnzibati Məhkəməyə iddia.",
    legalBasisSummary: "AR İnzibati Prosessual Məcəlləsi (m. 32–38), İnzibati icraat haqqında Qanun",
    limitationNote:
      "İPM-in 38-ci maddəsinə əsasən mübahisələndirmə və məcburetmə iddiaları bir qayda olaraq aktın/imtina məlumatının təqdim edildiyi tarixdən 30 gün müddətində qaldırılmalıdır.",
    iconName: "landmark",
    accentClass: "text-blue-800 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/50 dark:border-blue-800/60",
    layoutMode: "court-right-header",
    requiresCourt: true,
    defaultCourt: "Bakı İnzibati Məhkəməsinə",
    courtLabel: "İnzibati məhkəmə (İPM m. 8–10)",
    courtPlaceholder: "Məs: Bakı İnzibati Məhkəməsinə",
    subtypeLabel: "İnzibati iddianın növü (İPM m. 32–35)",
    subtypeOptions: [
      "Mübahisələndirmə haqqında iddia (İPM m. 32 — aktın ləğvi)",
      "Məcburetmə haqqında iddia (İPM m. 33 — aktın qəbuluna məcbur etmə)",
      "Öhdəliyin icrası haqqında iddia (İPM m. 34 — hərəkətin edilməsi)",
      "Müəyyən etmə haqqında iddia (İPM m. 35)",
    ],
    referenceLabel: "İddia müddəti və inzibati şikayət mərhələsi (İPM m. 38)",
    referencePlaceholder: "Məs: Akt 01.03.2026-da təqdim edilib, 30 günlük müddət gözlənilir",
    party1RoleLabel: "İddiaçı",
    party1Label: "İddiaçının ad, soyad, ata adı (və ya hüquqi şəxs)",
    party1Placeholder: "Məs: Əliyev Rəşad Kamran oğlu",
    party2RoleLabel: "Cavabdeh (İnzibati orqan)",
    party2Label: "Cavabdeh dövlət orqanı və ya bələdiyyə",
    party2Placeholder: "Məs: ... İcra Hakimiyyəti / Dövlət Xidməti",
    amountLabel: "Dəymiş zərər / Tələb olunan təzminat (varsa)",
    amountPlaceholder: "Məs: Tələb edilmir (aktın ləğvi)",
    factsLabel: "İnzibati aktın / imtinanın mahiyyəti və qanunsuzluq əsasları",
    factsPlaceholder:
      "İnzibati orqanın hansı aktı qəbul etdiyini, sizin iştirak və dinlənilmə hüququnuzun pozulmasını və maddi qanun pozuntularını yazın...",
    requestsLabel: "İnzibati məhkəmədən xahiş",
    requestsPlaceholder:
      "Məs: Cavabdehin ... tarixli inzibati aktı ləğv edilsin (və ya müvafiq inzibati aktı qəbul etmək öhdəliyi qoyulsun).",
    requestsHeading: "MƏHKƏMƏDƏN XAHİŞ EDİRƏM:",
    documentHeading: "İNZİBATİ İDDİA ƏRİZƏSİ",
    defaultSubtitle: "İnzibati aktın mübahisələndirilməsi haqqında",
    signatureRoleLabel: "İddiaçı",
    ragQueryBoost: "İnzibati Prosessual Məcəllə maddə 32 33 34 38 mübahisələndirmə inzibati akt İnzibati icraat",
    officialTemplateReference: {
      portalName: "e-Qanun (AR İnzibati Prosessual Məcəlləsi m. 32–38)",
      url: "https://www.e-qanun.ai/results/46956",
      note: "İPM-in 32–38-ci maddələri və İnzibati icraat haqqında Qanunun qanunçuluq/mütənasiblik prinsiplərinə uyğun qurulur.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showDisputedAct: true, showLegalViolation: true, showParty2: true, showAmount: true },
    systemInstruction:
      "Sən AR İnzibati Prosessual Məcəlləsinə (İPM m. 32–38) uyğun İnzibati İddia Ərizəsi hazırlayırsan. Mütləq İPM üzrə iddianın növünü, 30 günlük müddətə (İPM m. 38) əməl olunduğunu və 'İnzibati icraat haqqında' Qanunun prosedur/maddi pozuntularını göstər.",
  },
  {
    id: "constitutional-complaint",
    category: "extended",
    slug: "constitutional-complaint",
    href: "/create/constitutional-complaint",
    title: "Konstitusiya Şikayəti",
    shortTitle: "Konstitusiya Şikayəti",
    description: "Ali Məhkəmənin yekun qərarı ilə pozulmuş konstitusion hüquqların bərpası üçün fərdi şikayət.",
    legalBasisSummary: "AR Konstitusiyası m. 130 V, Konstitusiya Məhkəməsi haqqında Qanun m. 34",
    limitationNote:
      "Qanunun 34.4-cü maddəsinə əsasən Ali Məhkəmənin qərarının qüvvəyə mindiyi gündən 6 ay (məhkəməyə müraciət hüququnun pozulduğu andan 3 ay) ərzində verilir və 34.3-ə görə işin faktiki halları yoxlanılmır.",
    iconName: "landmark",
    accentClass: "text-purple-800 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-950/50 dark:border-purple-800/60",
    layoutMode: "court-right-header",
    requiresCourt: true,
    defaultCourt: "Azərbaycan Respublikasının Konstitusiya Məhkəməsinə",
    courtLabel: "Müraciət edilən məhkəmə",
    courtPlaceholder: "Azərbaycan Respublikasının Konstitusiya Məhkəməsinə",
    referenceLabel: "Mübahisələndirilən Ali Məhkəmə qərarının tarixi və № (6 ay müddəti)",
    referencePlaceholder: "Məs: AR Ali Məhkəməsinin 05.02.2026-cı il tarixli qərarı",
    party1RoleLabel: "Şikayətçi",
    party1Label: "Şikayətçinin ad, soyad, ata adı (vəkil nümayəndəsi varsa)",
    party1Placeholder: "Məs: Əliyev Rəşad Kamran oğlu",
    party2RoleLabel: "Qarşı tərəf (Normativ aktı qəbul edən / İş iştirakçısı)",
    party2Label: "Digər tərəf (istəyə bağlı)",
    party2Placeholder: "Məs: İş üzrə digər tərəf",
    amountLabel: "Şikayətin əsaslandığı Konstitusiya maddələri",
    amountPlaceholder: "Məs: AR Konstitusiyasının 29, 60, 61, 149-cu maddələri",
    factsLabel: "Məhkəmə instansiyalarının tükənməsi və konstitusion hüququn pozulma mahiyyəti",
    factsPlaceholder:
      "Bütün məhkəmə instansiyalarının keçildiyini, Ali Məhkəmənin qərarının Konstitusiyaya və ya qanuna uyğun olmayan hansı normativ akta əsaslandığını yazın...",
    requestsLabel: "Konstitusiya Məhkəməsindən xahiş",
    requestsPlaceholder:
      "Məs: Mübahisələndirilən məhkəmə aktının Azərbaycan Respublikasının Konstitusiyasına uyğun olmayan hesab edilməsi və işə yenidən baxılması.",
    requestsHeading: "KONSTİTUSİYA MƏHKƏMƏSİNDƏN XAHİŞ EDİRƏM:",
    documentHeading: "FƏRDİ KONSTİTUSİYA ŞİKAYƏTİ",
    defaultSubtitle: "Pozulmuş konstitusion hüquq və azadlıqların bərpası haqqında",
    signatureRoleLabel: "Şikayətçi",
    ragQueryBoost: "Konstitusiya Məhkəməsi haqqında Qanun maddə 34 34.4 altı ay Konstitusiya 130",
    officialTemplateReference: {
      portalName: "e-Qanun (Konstitusiya Məhkəməsi haqqında Qanun m. 34)",
      url: "https://www.e-qanun.ai/results/5404",
      note: "Qanunun 34-cü maddəsinə görə şikayət faktların yenidən yoxlanılmasına yönələ bilməz, məhkəmə müdafiə vasitələrinin tükənməsi mütləqdir.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showDisputedAct: true, showAdvocate: true, showLegalViolation: true },
    systemInstruction:
      "Sən 'Konstitusiya Məhkəməsi haqqında' Qanunun 34-cü maddəsinə uyğun Fərdi Konstitusiya Şikayəti hazırlayırsan. Qanunun 34.3-cü maddəsinə görə faktların yoxlanılmasına yol verilmədiyini nəzərə al; 6 aylıq müddəti, məhkəmə instansiyalarının tükəndiyini və Konstitusiyanın hansı maddələrinin pozulduğunu dəqiq əsaslandır.",
  },
  {
    id: "court-speech",
    category: "extended",
    slug: "court-speech",
    href: "/create/court-speech",
    title: "Məhkəmə Çıxışı və Nitqi",
    shortTitle: "Məhkəmə Nitqi",
    description: "Məhkəmə mübahisələri (MPM m. 206–209) və ya cinayət prosesi üçün əsaslandırılmış yekun nitq.",
    legalBasisSummary: "AR MPM (m. 206–209), AR CPM (m. 340–345)",
    iconName: "mic",
    accentClass: "text-indigo-800 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-800/60",
    layoutMode: "speech",
    requiresCourt: true,
    courtLabel: "Çıxış edilən məhkəmə",
    courtPlaceholder: "Məs: Bakı şəhəri Nəsimi Rayon Məhkəməsində",
    subtypeLabel: "Çıxışın mərhələsi",
    subtypeOptions: [
      "Mülki işdə iddiaçının / nümayəndənin məhkəmə mübahisəsi çıxışı",
      "Mülki işdə cavabdehin / nümayəndənin yekun çıxışı",
      "Cinayət prosesində müdafiə nitqi",
      "Replika nitqi",
    ],
    referenceLabel: "İşin nömrəsi və baxılan predmet",
    referencePlaceholder: "Məs: İş № 2(006)-450/2026 — Borcun tutulması",
    party1RoleLabel: "Çıxış edən tərəf",
    party1Label: "Çıxış edən şəxs / vəkil",
    party1Placeholder: "Məs: İddiaçının nümayəndəsi — Vəkil ...",
    party2RoleLabel: "Digər tərəf",
    party2Label: "Qarşı tərəf",
    party2Placeholder: "Məs: Cavabdeh",
    amountLabel: "Mübahisə predmeti",
    amountPlaceholder: "Məs: 5 000 AZN tələb",
    factsLabel: "Məhkəmə istintaqında təsdiqlənmiş sübutlar və qarşı tərəfin zəif arqumentləri",
    factsPlaceholder:
      "Məhkəmə iclasında araşdırılan yazılı sübutları, şahid ifadələrini, ekspert rəyini və əsas tezislərinizi yazın...",
    requestsLabel: "Məhkəməyə yekun çağırış",
    requestsPlaceholder: "Məs: Məhkəmədən xahiş edirəm ki, iddia tələbi tam təmin edilsin.",
    requestsHeading: "YEKUN MÖVQE VƏ ÇAĞIRIŞ:",
    documentHeading: "MƏHKƏMƏ MÜBAHİSƏLƏRİNDƏ YEKUN ÇIXIŞ",
    defaultSubtitle: "Tərəfin hüquqi mövqeyi və sübutların qiymətləndirilməsi",
    signatureRoleLabel: "Çıxış edən",
    ragQueryBoost: "Mülki Prosessual Məcəllə məhkəmə mübahisələri sübutların qiymətləndirilməsi çıxış",
    officialTemplateReference: {
      portalName: "e-Qanun (AR MPM m. 206–209 / CPM m. 340)",
      url: "https://www.e-qanun.ai/results/46945",
      note: "Məhkəmə mübahisələrində çıxışın rəsmi xitab, sübut analizi, hüquqi tövsif və yekun tələb strukturu.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showCaseNumber: true, showParty2: true },
    systemInstruction:
      "Sən məhkəmə zalında şifahi/yazılı təqdim edilən peşəkar Məhkəmə Çıxışı və Nitqi yazırsan. 'Möhtərəm Hakim!' rəsmi xitabı ilə başla, araşdırılmış sübutları sistemli təhlil et, qüvvədə olan normalara istinad et və güclü, ədəbi-hüquqi yekun mövqe ilə bitir.",
  },
  {
    id: "attorney-inquiry",
    category: "extended",
    slug: "attorney-inquiry",
    href: "/create/attorney-inquiry",
    title: "Vəkil Sorğusu",
    shortTitle: "Vəkil Sorğusu",
    description: "Vəkilin order əsasında idarə, müəssisə və təşkilatlardan rəsmi məlumat/sənəd sorğusu.",
    legalBasisSummary: "Vəkillər və vəkillik fəaliyyəti haqqında Qanun (m. 7, 16, 20)",
    limitationNote:
      "Vəkil sorğusu yalnız AR Vəkillər Kollegiyasının üzvü olan vəkil tərəfindən müvafiq order əsasında göndərildikdə qanuni hüquqi qüvvəyə malikdir.",
    iconName: "badge-check",
    accentClass: "text-slate-800 bg-slate-100 border-slate-300 dark:text-slate-200 dark:bg-slate-800/70 dark:border-slate-700",
    layoutMode: "formal-address",
    requiresCourt: true,
    courtLabel: "Sorğunun ünvanlandığı dövlət orqanı / təşkilat / bank",
    courtPlaceholder: "Məs: Azərbaycan Respublikası Əmlak Məsələləri Dövlət Xidmətinə",
    referenceLabel: "Hüquqi yardım müqaviləsi və Order № / Vəkil Bürosu",
    referencePlaceholder: "Məs: ... saylı Vəkil Bürosu, Order № 001234",
    party1RoleLabel: "Vəkil (Sorğu verən)",
    party1Label: "Vəkilin ad, soyad, ata adı",
    party1Placeholder: "Məs: Vəkil Həsənov Elvin Məmməd oğlu",
    party2RoleLabel: "Müvəkkil (Müdafiə olunan şəxs)",
    party2Label: "Hüquqi yardım göstərilən şəxs (Müvəkkil)",
    party2Placeholder: "Məs: Əliyev Rəşad Kamran oğlu",
    amountLabel: "Sorğu № (varsa)",
    amountPlaceholder: "Məs: Çıxış № ___",
    factsLabel: "Sorğu edilən məlumat və ya sənədlərin dəqiq siyahısı",
    factsPlaceholder:
      "Müvəkkilin mənafeyi üçün zəruri olan arayış, əmr surəti, qeydiyyat məlumatı və ya çıxarışın verilməsi səbəbini qeyd edin...",
    requestsLabel: "Sorğu tələbi və cavab müddəti",
    requestsPlaceholder:
      "Məs: Qanunvericiliklə müəyyən edilmiş müddətdə sorğu edilən sənədlərin təsdiq edilmiş surətinin təqdim edilməsini xahiş edirəm.",
    requestsHeading: "XAHİŞ EDİRƏM:",
    documentHeading: "VƏKİL SORĞUSU",
    defaultSubtitle: "Hüquqi yardımın göstərilməsi ilə bağlı məlumat alınması haqqında",
    signatureRoleLabel: "Vəkil",
    ragQueryBoost: "Vəkillər və vəkillik fəaliyyəti haqqında Qanun maddə 7 vəkil sorğusu order yardım",
    officialTemplateReference: {
      portalName: "e-Qanun (Vəkillər və vəkillik fəaliyyəti haqqında Qanun m. 7)",
      url: "https://www.e-qanun.ai/results/257",
      note: "Qanunun 7-ci maddəsi I hissəsinə əsasən təşkilati formasından asılı olmayaraq idarə, müəssisə və təşkilatlar vəkillərə öz peşə borclarını yerinə yetirərkən yardım etməyə borcludurlar.",
    },
    fieldVisibility: { showCourtOrAddressee: true, showAdvocate: true, showParty2: true },
    systemInstruction:
      "Sən 'Vəkillər və vəkillik fəaliyyəti haqqında' AR Qanununun 7-ci maddəsinə əsasən rəsmi Vəkil Sorğusu hazırlayırsan. Vəkilin adı, Vəkillər Kollegiyası üzvlüyü, Order rekvizitləri, müvəkkilin məlumatı və sorğu edilən konkret sənədlər aydın göstərilməlidir; əlavədə Order surəti yalnız istifadəçi qeyd edibsə və ya standart vəkil sorğusu orderinə istinad edilirsə yazılmalıdır.",
  },
]

export const CORE_DOCUMENT_TYPES = DOCUMENT_TYPES.filter((d) => d.category === "core")
export const EXTENDED_DOCUMENT_TYPES = DOCUMENT_TYPES.filter((d) => d.category === "extended")

export const DOCUMENT_TYPE_MAP: Record<DocumentTypeId, DocumentTypeSpec> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.id, d])
) as Record<DocumentTypeId, DocumentTypeSpec>

export function getDocumentSpecBySlug(slug: string): DocumentTypeSpec | undefined {
  return DOCUMENT_TYPES.find((d) => d.slug === slug || d.id === slug)
}

export interface LegalDocumentFormInput {
  docType: DocumentTypeId
  subtype?: string
  courtName?: string
  referenceInfo?: string
  caseNumber?: string
  disputedActInfo?: string
  mediationInfo?: string
  legalViolationInfo?: string
  advocateInfo?: string
  party1: string
  party1Id?: string
  party1Address?: string
  party1Phone?: string
  party1Email?: string
  party2?: string
  party2Id?: string
  party2Address?: string
  amount?: string
  facts: string
  requests?: string
  attachmentsText?: string
  chatContext?: string
  legalArticles?: { title: string; articleNumber?: string; content: string; url?: string }[]
}

export function getSuggestedCourtOptions(docType: DocumentTypeId): string[] {
  if (docType === "cassation") {
    return ["Azərbaycan Respublikasının Ali Məhkəməsinə"]
  }
  if (docType === "constitutional-complaint") {
    return ["Azərbaycan Respublikasının Konstitusiya Məhkəməsinə"]
  }
  const formatCourtTitle = (title: string) => (title.endsWith("i") ? `${title}nə` : title)
  if (docType === "appeal") {
    return ALL_COURTS.filter((c) => c.title.toLowerCase().includes("apellyasiya")).map((c) =>
      formatCourtTitle(c.title)
    )
  }
  if (docType === "admin-claim") {
    return ALL_COURTS.filter((c) => c.title.toLowerCase().includes("inzibati")).map((c) =>
      formatCourtTitle(c.title)
    )
  }
  return ALL_COURTS.map((c) => formatCourtTitle(c.title))
}

export function resolveTargetCourt(input: LegalDocumentFormInput): string {
  if (input.courtName?.trim()) return input.courtName.trim()
  const spec = DOCUMENT_TYPE_MAP[input.docType]
  if (spec?.defaultCourt) return spec.defaultCourt
  if (!spec?.requiresCourt) return ""
  const combined = `${input.facts} ${input.referenceInfo || ""} ${input.party1} ${input.party2 || ""} ${input.party1Address || ""}`
  const matched = findBestCourtMatch(combined)
  if (matched) return matched.title.endsWith("i") ? `${matched.title}nə` : matched.title
  return "Bakı şəhəri üzrə aidiyyəti məhkəməyə / orqana"
}

export function checkMissingDocumentRequirements(input: LegalDocumentFormInput): string[] {
  const warnings: string[] = []
  const spec = DOCUMENT_TYPE_MAP[input.docType]
  if (!spec) return warnings

  if (spec.requiresCourt && !input.party1Address?.trim()) {
    warnings.push(
      "Müraciət edən tərəfin dəqiq qeydiyyat/faktiki ünvanı və əlaqə telefonu daxil edilməyib (MPM m. 149.2.2 / Vətəndaşların müraciətləri haqqında Qanun m. 6.3.2)."
    )
  }

  if (["petition", "appeal", "cassation", "admin-claim", "contract", "settlement"].includes(spec.id)) {
    if (!input.party1Id?.trim()) {
      warnings.push("FİN kod və ya VÖEN məlumatı qeyd olunmayıb — rəsmi təqdimatda tələb oluna bilər.")
    }
    if (spec.fieldVisibility.showParty2 && !input.party2?.trim()) {
      warnings.push("Qarşı tərəfin (cavabdehin / ikinci tərəfin) adı və rekvizitləri qeyd olunmayıb.")
    }
  }

  if (spec.id === "petition") {
    const subLower = (input.subtype || "").toLowerCase()
    const needsMediation =
      subLower.includes("aliment") ||
      subLower.includes("nikah") ||
      subLower.includes("əmlak") ||
      subLower.includes("əmək") ||
      subLower.includes("işə bərpa") ||
      subLower.includes("kommersiya")
    if (needsMediation && !input.mediationInfo?.trim()) {
      warnings.push(
        "Ailə, əmək və kommersiya mübahisələrində məhkəmədən əvvəl ilkin mediasiya sessiyasında iştirak sənədi (Mediasiya arayışı — MPM m. 149.2.4-1, 150.1.7) tələb olunur."
      )
    }
  }

  if (spec.id === "cassation") {
    if (!input.advocateInfo?.trim()) {
      warnings.push(
        "MPM-in 407.3–407.4-cü maddələrinə əsasən mülki işlər üzrə kassasiya şikayəti vəkil tərəfindən imzalanmalı və vəkilin orderi əlavə edilməlidir."
      )
    }
    if (!input.disputedActInfo?.trim()) {
      warnings.push("Şikayət verilən apellyasiya aktının qəbul tarixi və iş nömrəsi göstərilməyib (MPM m. 407.1.3).")
    }
  }

  if (spec.id === "appeal" && !input.disputedActInfo?.trim()) {
    warnings.push("Mübahisələndirilən birinci instansiya qətnaməsinin tarixi və iş nömrəsi qeyd olunmayıb (MPM m. 361.1.3).")
  }

  if (spec.id === "power-of-attorney") {
    warnings.push(
      "Qeyd: AR Mülki Məcəlləsinin 362.2-ci maddəsinə əsasən notarial forma tələb edən əqdlər üçün etibarnamə notariat qaydasında təsdiqlənməlidir."
    )
  }

  if (spec.id === "constitutional-complaint" && !input.disputedActInfo?.trim()) {
    warnings.push("Ali Məhkəmənin yekun qərarının tarixi qeyd olunmayıb (6 aylıq şikayət müddəti — Qanun m. 34.4.1).")
  }

  return warnings
}

export function buildPartyBlocks(input: LegalDocumentFormInput, spec: DocumentTypeSpec): PartyBlock[] {
  const p1Details: string[] = []
  if (input.party1Id?.trim()) p1Details.push(`FİN / VÖEN: ${input.party1Id.trim()}`)
  if (input.party1Address?.trim()) p1Details.push(`Ünvan: ${input.party1Address.trim()}`)
  if (input.party1Phone?.trim()) p1Details.push(`Telefon: ${input.party1Phone.trim()}`)
  if (input.party1Email?.trim()) p1Details.push(`E-poçt: ${input.party1Email.trim()}`)

  const blocks: PartyBlock[] = [
    {
      roleLabel: spec.party1RoleLabel,
      name: input.party1.trim(),
      details: p1Details,
    },
  ]

  if (input.party2?.trim()) {
    const p2Details: string[] = []
    if (input.party2Id?.trim()) p2Details.push(`VÖEN / FİN: ${input.party2Id.trim()}`)
    if (input.party2Address?.trim()) p2Details.push(`Ünvan: ${input.party2Address.trim()}`)
    blocks.push({
      roleLabel: spec.party2RoleLabel,
      name: input.party2.trim(),
      details: p2Details,
    })
  }

  if (input.advocateInfo?.trim()) {
    blocks.push({
      roleLabel: "Vəkil / Nümayəndə",
      name: input.advocateInfo.trim(),
    })
  }

  return blocks
}

export function parseAttachmentsList(attachmentsText?: string): string[] {
  if (!attachmentsText?.trim()) return []
  return attachmentsText
    .split(/\r?\n|;/)
    .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean)
}

export function buildDeterministicStructuredDoc(
  input: LegalDocumentFormInput,
  resolvedCourtName: string,
  verifiedSources: VerifiedLegalSourceRef[]
): StructuredLegalDocument {
  const spec = DOCUMENT_TYPE_MAP[input.docType] || DOCUMENT_TYPE_MAP.petition
  const today = new Date().toLocaleDateString("az-AZ")
  const parties = buildPartyBlocks(input, spec)
  const attachments = parseAttachmentsList(input.attachmentsText)
  const warnings = checkMissingDocumentRequirements(input)
  const factsParagraphs = cleanParagraphLines(input.facts)
  const requests = input.requests?.trim()
    ? input.requests
        .split(/\r?\n/)
        .map((r) => r.replace(/^\d+[.)]\s*/, "").trim())
        .filter(Boolean)
    : [spec.requestsPlaceholder.replace(/^Məs:\s*/i, "")]

  const topRightCaseMeta: string[] = []
  if (input.caseNumber?.trim()) topRightCaseMeta.push(`İş №: ${input.caseNumber.trim()}`)
  if (input.disputedActInfo?.trim()) topRightCaseMeta.push(`Mübahisələndirilən akt: ${input.disputedActInfo.trim()}`)
  if (input.amount?.trim() && spec.layoutMode !== "contract-bilateral") {
    topRightCaseMeta.push(`${spec.amountLabel}: ${input.amount.trim()}`)
  }
  if (input.mediationInfo?.trim()) topRightCaseMeta.push(`Mediasiya / pretenziya: ${input.mediationInfo.trim()}`)

  const normsSummary =
    verifiedSources.length > 0
      ? verifiedSources
          .slice(0, 4)
          .map((s) => `${s.title}${s.articleNumber ? ` (Maddə ${s.articleNumber})` : ""}`)
          .join("; ")
      : spec.legalBasisSummary

  if (spec.layoutMode === "contract-bilateral") {
    const titleUpper = toAzUpperCase(input.subtype || spec.documentHeading)
    const place = input.referenceInfo?.trim() || "Bakı şəhəri"
    return {
      version: "1.0",
      docType: spec.id,
      layoutMode: "contract-bilateral",
      disclaimerBanner: spec.educationalOnly ? EDUCATIONAL_DECISION_BANNER : undefined,
      topRightParties: parties,
      title: titleUpper,
      subtitle: input.referenceInfo?.trim() || spec.defaultSubtitle,
      dateLocationLine: `${place} — ${today}`,
      openingLine: `Bir tərəfdən ${input.party1.trim()} (bundan sonra “${spec.party1RoleLabel}” adlandırılacaq), digər tərəfdən ${
        input.party2?.trim() || "[İkinci tərəfin adı]"
      } (bundan sonra “${spec.party2RoleLabel}” adlandırılacaq) Azərbaycan Respublikasının qüvvədə olan qanunvericiliyinə uyğun olaraq bu müqaviləni aşağıdakı şərtlərlə bağlayırlar:`,
      sections: [
        {
          heading: "1. Müqavilənin predmeti",
          paragraphs: factsParagraphs,
        },
        {
          heading: "2. Tərəflərin hüquq və öhdəlikləri",
          paragraphs: [
            "Tərəflər üzərlərinə götürdükləri öhdəlikləri vicdanla, lazımi qaydada və müəyyən edilmiş müddətdə icra etməyə borcludurlar. Öhdəliklərin birtərəfli qaydada icrasından imtinaya qanunla və bu müqavilə ilə nəzərdə tutulmuş hallar istisna olmaqla yol verilmir.",
          ],
        },
        {
          heading: "3. Müqavilə qiyməti və ödəniş qaydası",
          paragraphs: [
            input.amount?.trim()
              ? `Bu müqavilə üzrə razılaşdırılmış qiymət (məbləğ) və hesablaşma şərti: ${input.amount.trim()}.`
              : "Hesablaşma və maliyyə öhdəlikləri tərəflərin qarşılıqlı razılaşdırdığı qaydada həyata keçirilir.",
          ],
        },
        {
          heading: "4. Müddət, məsuliyyət və fors-major",
          paragraphs: [
            input.requests?.trim() ||
              "Öhdəliklərin icra edilməməsinə və ya lazımınca icra edilməməsinə görə tərəflər Azərbaycan Respublikasının Mülki Məcəlləsinə əsasən məsuliyyət daşıyırlar. Qarşısıalınmaz qüvvə (fors-major) halları öhdəliyin icra müddətini müvafiq dövrə qədər uzadır.",
          ],
        },
        {
          heading: "5. Mübahisələrin həlli və yekun müddəalar",
          paragraphs: [
            `Bu müqavilədən irəli gələn mübahisələr danışıqlar yolu ilə, razılıq əldə edilmədikdə isə Azərbaycan Respublikasının səlahiyyətli məhkəmələrində (${normsSummary}) həll edilir.`,
          ],
        },
      ],
      requestsHeading: undefined,
      requests: [],
      attachments,
      signatures: [
        { role: spec.party1RoleLabel, name: input.party1.trim() },
        { role: spec.party2RoleLabel, name: input.party2?.trim() || "____________________" },
      ],
      dateLine: today,
      missingInfoWarnings: warnings,
      legalSources: verifiedSources,
      officialTemplateReference: spec.officialTemplateReference,
      professionalReviewNotice: PROFESSIONAL_REVIEW_NOTICE,
    }
  }

  const sections =
    spec.id === "qarar"
      ? [
          {
            heading: "I. GİRİŞ HİSSƏSİ",
            paragraphs: [
              `Tədris simulyasiyası üzrə ${resolvedCourtName || spec.defaultCourt} tərəfindən ${input.party1.trim()}${
                input.party2?.trim() ? ` və ${input.party2.trim()} arasında` : " tərəfindən qaldırılmış"
              } mübahisəyə baxılmışdır.`,
            ],
          },
          {
            heading: "II. TƏSVİRİ HİSSƏ",
            paragraphs: factsParagraphs,
          },
          {
            heading: "III. ƏSASLANDIRICI HİSSƏ",
            paragraphs: [
              `Tədris ssenarisinin halları qiymətləndirilərək tətbiq edilən hüquqi əsaslar nəzərdən keçirilmişdir: ${normsSummary}.`,
              ...(input.legalViolationInfo?.trim() ? cleanParagraphLines(input.legalViolationInfo) : []),
            ],
          },
        ]
      : [
          {
            heading: "Faktiki hallar",
            paragraphs: factsParagraphs,
          },
          ...(input.legalViolationInfo?.trim()
            ? [
                {
                  heading: "Maddi və prosessual hüquq normalarının pozulması",
                  paragraphs: cleanParagraphLines(input.legalViolationInfo),
                },
              ]
            : []),
          {
            heading: "Hüquqi əsaslandırma",
            paragraphs: [
              `Qeyd edilən hallar Azərbaycan Respublikasının qüvvədə olan qanunvericiliyinə (${normsSummary}) əsasən qiymətləndirilməlidir.`,
            ],
          },
        ]

  const signatures = [{ role: spec.signatureRoleLabel, name: input.party1.trim() }]
  if (spec.id === "cassation") {
    signatures.push({
      role: "Şikayəti tərtib edən vəkil",
      name: input.advocateInfo?.trim() || "____________________ (Order № ____)",
    })
  }

  return {
    version: "1.0",
    docType: spec.id,
    layoutMode: spec.layoutMode,
    disclaimerBanner: spec.educationalOnly ? EDUCATIONAL_DECISION_BANNER : undefined,
    topRightAddressee: spec.requiresCourt ? resolvedCourtName : undefined,
    topRightCaseMeta,
    topRightParties: parties,
    title: spec.documentHeading,
    subtitle: input.subtype?.trim() || spec.defaultSubtitle,
    openingLine:
      spec.layoutMode === "speech"
        ? "Möhtərəm Hakim! İşin materiallarının tədqiqi nəticəsində mövqeyimizi məhkəmənin diqqətinə çatdırırıq."
        : spec.id === "qarar"
        ? undefined
        : `Mən, ${input.party1.trim()}, aşağıdakıları bildirirəm:`,
    sections,
    requestsHeading: spec.requestsHeading,
    requests,
    attachments,
    signatures,
    dateLine: today,
    missingInfoWarnings: warnings,
    legalSources: verifiedSources,
    officialTemplateReference: spec.officialTemplateReference,
    professionalReviewNotice: PROFESSIONAL_REVIEW_NOTICE,
  }
}
