import { ALL_COURTS, findBestCourtMatch } from "./courts"

export type DocumentTypeId =
  | "contract"
  | "petition"
  | "appeal"
  | "cassation"
  | "motion"
  | "objection"
  | "qarar"

export interface DocumentTypeSpec {
  id: DocumentTypeId
  slug: string
  href: string
  title: string
  shortTitle: string
  description: string
  iconName:
    | "handshake"
    | "file-text"
    | "scale"
    | "landmark"
    | "hand"
    | "ban"
    | "gavel"
  accentClass: string
  badgeText?: string
  educationalOnly?: boolean
  requiresCourt: boolean
  defaultCourt?: string
  subtypeLabel?: string
  subtypeOptions?: string[]
  referenceLabel?: string
  referencePlaceholder?: string
  party1Label: string
  party1Placeholder: string
  party2Label: string
  party2Placeholder: string
  amountLabel: string
  amountPlaceholder: string
  factsLabel: string
  factsPlaceholder: string
  requestsLabel: string
  requestsPlaceholder: string
  systemInstruction: string
  documentHeading: string
}

export const DOCUMENT_TYPES: DocumentTypeSpec[] = [
  {
    id: "contract",
    slug: "create-contract",
    href: "/create-contract",
    title: "Müqavilə Tərtibatçısı",
    shortTitle: "Müqavilə",
    description: "Müxtəlif növ müqavilələri avtomatik tərtib edin.",
    iconName: "handshake",
    accentClass: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800/60",
    requiresCourt: false,
    subtypeLabel: "Müqavilənin növü",
    subtypeOptions: [
      "Borc müqaviləsi",
      "Alqı-satqı müqaviləsi",
      "İcarə (kirayə) müqaviləsi",
      "Xidmət göstərilməsi müqaviləsi",
      "Əmək müqaviləsi",
      "Podrat müqaviləsi",
      "Tərəfdaşlıq / Əməkdaşlıq müqaviləsi",
      "Digər mülki-hüquqi müqavilə",
    ],
    referenceLabel: "Müqavilənin müddəti və bağlanma yeri",
    referencePlaceholder: "Məs: Bakı şəhəri, 12 ay müddətinə",
    party1Label: "Birinci tərəf (Borcverən / İcarəyə verən / Sifarişçi)",
    party1Placeholder: "Ad, soyad, ata adı və ya şirkət adı, VÖEN/FİN, ünvan",
    party2Label: "İkinci tərəf (Borcalan / İcarəçi / İcraçı)",
    party2Placeholder: "Ad, soyad, ata adı və ya şirkət adı, VÖEN/FİN, ünvan",
    amountLabel: "Müqavilə qiyməti / Məbləğ",
    amountPlaceholder: "Məs: 3 500 AZN (faiz dərəcəsi və ödəniş qaydası)",
    factsLabel: "Müqavilənin predmeti və əsas şərtləri",
    factsPlaceholder:
      "Məs: Pul vəsaitinin köçürmə yolu ilə verilməsi, geri qaytarılma tarixi, tərəflərin öhdəlikləri və məsuliyyət şərtləri...",
    requestsLabel: "Əlavə şərtlər və mübahisələrin həlli qaydası",
    requestsPlaceholder:
      "Məs: Gecikməyə görə dəbbə pulu, vaxtından əvvəl ləğv şərtləri, mübahisələrin məhkəmə qaydasında həlli",
    documentHeading: "MÜQAVİLƏ",
    systemInstruction:
      "Sən Azərbaycan Respublikasının Mülki Məcəlləsi, Əmək Məcəlləsi və digər qüvvədə olan normativ aktlarına uyğun peşəkar müqavilə tərtibçisisən. Tərəflərin rekvizitləri, Müqavilənin predmeti, Tərəflərin hüquq və vəzifələri, Hesablaşma qaydası, Məsuliyyət, Fors-major, Mübahisələrin həlli, Yekun müddəalar və İmza hissələrindən ibarət tam hüquqi müqavilə hazırla.",
  },
  {
    id: "petition",
    slug: "create-petition",
    href: "/create-petition",
    title: "İddia Ərizəsi",
    shortTitle: "İddia Ərizəsi",
    description: "İddia ərizələrini süni intellektin köməyi ilə saniyələr ərzində formalaşdırın.",
    iconName: "file-text",
    accentClass: "text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-800/60",
    requiresCourt: true,
    referenceLabel: "İşin kateqoriyası / Dövlət rüsumu məlumatı",
    referencePlaceholder: "Məs: Mülki mübahisə — borc öhdəliyinin icrası",
    party1Label: "İddiaçı (Ad, soyad, ünvan, əlaqə)",
    party1Placeholder: "Məs: Əliyev Rəşad Kamran oğlu, Bakı şəh., +994...",
    party2Label: "Cavabdeh (Ad, soyad / Şirkət, ünvan)",
    party2Placeholder: "Məs: Məmmədov Tural Elçin oğlu, Bakı şəh.",
    amountLabel: "İddia qiyməti / Tələb olunan məbləğ",
    amountPlaceholder: "Məs: 5 000 AZN əsas borc və hesablanmış faizlər",
    factsLabel: "Faktiki hallar və sübutlar",
    factsPlaceholder:
      "Məs: Hansı tarixdə pul köçürülüb və ya öhdəlik yaranıb, hansı bank qəbzi, WhatsApp yazışması və ya sənədlər mövcuddur...",
    requestsLabel: "Məhkəmədən xahiş (İddia tələbi)",
    requestsPlaceholder:
      "Məs: Cavabdehdən əsas borcun, faizlərin və ödənilmiş dövlət rüsumunun tutulması barədə qətnamə çıxarılsın.",
    documentHeading: "İDDİA ƏRİZƏSİ",
    systemInstruction:
      "Sən Azərbaycan Respublikasının Mülki Prosessual Məcəlləsinin (MPM 149-150-ci maddələr) tələblərinə tam uyğun İddia Ərizəsi tərtib edən peşəkar vəkilsən. Məhkəmənin adı, İddiaçı və Cavabdeh məlumatları, İddia qiyməti, Faktiki hallar, Təqdim olunan qanunvericilik maddələrinə əsaslanan Hüquqi əsaslandırma, Xahiş (tələblər), Əlavə olunan sənədlərin siyahısı, Tarix və İmza hissələrini tam formalaşdır.",
  },
  {
    id: "appeal",
    slug: "create-appeal",
    href: "/create-appeal",
    title: "Apellyasiya Şikayəti",
    shortTitle: "Apellyasiya",
    description: "Məhkəmə qərarlarına qarşı əsaslandırılmış apellyasiya şikayətləri hazırlayın.",
    iconName: "scale",
    accentClass: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/50 dark:border-blue-800/60",
    requiresCourt: true,
    defaultCourt: "Bakı Apellyasiya Məhkəməsinə",
    referenceLabel: "Birinci instansiya qətnaməsi (Məhkəmə, tarix, iş №)",
    referencePlaceholder: "Məs: Nəsimi Rayon Məhkəməsinin 12.02.2026-cı il tarixli, 2(006)-1234/2026 saylı qətnaməsi",
    party1Label: "Apellyasiya şikayəti verən şəxs",
    party1Placeholder: "Ad, soyad, prosessual status (İddiaçı/Cavabdeh), ünvan, əlaqə",
    party2Label: "Digər tərəf (Qarşı tərəf)",
    party2Placeholder: "Ad, soyad və ya qurum, ünvan",
    amountLabel: "Mübahisə məbləği / Dövlət rüsumu",
    amountPlaceholder: "Məs: 8 200 AZN",
    factsLabel: "Qətnamə ilə razılaşmama səbəbləri və pozulmuş normalar",
    factsPlaceholder:
      "Birinci instansiya məhkəməsinin hansı sübutları düzgün qiymətləndirmədiyini və ya hansı maddələri yanlış tətbiq etdiyini yazın...",
    requestsLabel: "Apellyasiya instansiyası məhkəməsindən xahiş",
    requestsPlaceholder:
      "Məs: Birinci instansiya məhkəməsinin qətnaməsi ləğv edilsin və iddia tələbinin təmin edilməsi barədə yeni qətnamə qəbul edilsin.",
    documentHeading: "APELLYASİYA ŞİKAYƏTİ",
    systemInstruction:
      "Sən Azərbaycan Respublikasının Mülki Prosessual Məcəlləsinin (MPM 357-364-cü maddələr) və ya İnzibati Prosessual Məcəllənin tələblərinə uyğun Apellyasiya Şikayəti tərtib edən peşəkar hüquqşünassan. Apellyasiya məhkəməsinin adı (birinci instansiya məhkəməsi vasitəsilə), şikayətçinin statusu, şikayət verilən qətnamənin rekvizitləri, işin faktiki halları, maddi və prosessual hüquq normalarının pozulmasının detallı hüquqi təhlili, xahiş hissəsi, əlavələr və imza bölmələrini yaz.",
  },
  {
    id: "cassation",
    slug: "create-cassation",
    href: "/create-cassation",
    title: "Kassasiya Şikayəti",
    shortTitle: "Kassasiya",
    description: "Ali Məhkəməyə təqdim edilməli olan kassasiya şikayətlərini tərtib edin.",
    iconName: "landmark",
    accentClass: "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/50 dark:border-violet-800/60",
    requiresCourt: true,
    defaultCourt: "Azərbaycan Respublikasının Ali Məhkəməsinə",
    referenceLabel: "Şikayət verilən apellyasiya qərarı (Məhkəmə, tarix, iş №)",
    referencePlaceholder: "Məs: Bakı Apellyasiya Məhkəməsinin 05.03.2026-cı il tarixli qətnaməsi",
    party1Label: "Kassasiya şikayəti verən şəxs (Vəkil məlumatları daxil)",
    party1Placeholder: "Ad, soyad, prosessual status, vəkilin S.A.A. və order məlumatı",
    party2Label: "Digər tərəf (Qarşı tərəf)",
    party2Placeholder: "Ad, soyad və ya qurum, ünvan",
    amountLabel: "Mübahisə məbləği / Kassasiya rüsumu",
    amountPlaceholder: "Məs: 15 000 AZN",
    factsLabel: "Maddi və prosessual hüquq normalarının pozulması əsasları",
    factsPlaceholder:
      "Apellyasiya məhkəməsinin maddi və prosessual hüquq normalarını hansı hissədə pozduğunu və ya Ali Məhkəmənin vahid təcrübəsindən kənara çıxdığını qeyd edin...",
    requestsLabel: "Ali Məhkəmədən xahiş",
    requestsPlaceholder:
      "Məs: Apellyasiya məhkəməsinin qətnaməsi ləğv edilsin və iş yenidən baxılması üçün apellyasiya instansiyası məhkəməsinə göndərilsin.",
    documentHeading: "KASSASİYA ŞİKAYƏTİ",
    systemInstruction:
      "Sən Azərbaycan Respublikasının MPM 402-409-cu maddələrinə uyğun Kassasiya Şikayəti hazırlayan təcrübəli vəkilsən. Diqqət: MPM-ə əsasən mülki işlər üzrə kassasiya şikayətində vəkil iştirakının zəruriliyini nəzərə alaraq vəkil imza/order yerini daxil et, şikayət verilən apellyasiya aktının rekvizitlərini, işin hallarını, maddi və prosessual pozuntuların dəqiq hüquqi əsaslandırmasını, MPM 416-418-ci maddələr kontekstində xahiş hissəsini tam hazırla.",
  },
  {
    id: "motion",
    slug: "create-motion",
    href: "/create-motion",
    title: "Vəsatət Yaradıcısı",
    shortTitle: "Vəsatət",
    description: "Məhkəmə vəsatətlərini asanlıqla hazırlayın.",
    iconName: "hand",
    accentClass: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800/60",
    requiresCourt: true,
    subtypeLabel: "Vəsatətin növü",
    subtypeOptions: [
      "Sübutların tələb edilməsi barədə vəsatət",
      "İddianın təmin edilməsi (həbs qoyulması) barədə vəsatət",
      "Prosessual müddətin bərpası barədə vəsatət",
      "Ekspertiza təyin edilməsi barədə vəsatət",
      "Şahidin dindirilməsi barədə vəsatət",
      "Məhkəmə iclasının təxirə salınması barədə vəsatət",
      "Dövlət rüsumundan azad etmə / möhlət verilməsi barədə vəsatət",
      "Digər prosessual vəsatət",
    ],
    referenceLabel: "Baxılan işin nömrəsi və hakim (əgər məlumdursa)",
    referencePlaceholder: "Məs: İş № 2(006)-450/2026",
    party1Label: "Vəsatət verən şəxs",
    party1Placeholder: "Ad, soyad, iş üzrə status (İddiaçı / Cavabdeh / Nümayəndə)",
    party2Label: "İş üzrə digər tərəf",
    party2Placeholder: "Ad, soyad / Şirkət adı",
    amountLabel: "Əlaqəli məbləğ / Sübut göstəricisi (əgər varsa)",
    amountPlaceholder: "Məs: Bank çıxarışı üzrə 4 000 AZN köçürmə",
    factsLabel: "Vəsatətin əsaslandırılması",
    factsPlaceholder:
      "Nə üçün bu vəsatətin təmin olunmasının işin ədalətli həlli üçün zəruri olduğunu və müvafiq sübutların özünüz tərəfindən əldə edilə bilməmə səbəblərini izah edin...",
    requestsLabel: "Məhkəmədən xahiş",
    requestsPlaceholder:
      "Məs: Müvafiq bankdan hesab çıxarışlarının tələb edilməsi barədə qərardad qəbul edilsin.",
    documentHeading: "VƏSATƏT",
    systemInstruction:
      "Sən Azərbaycan Respublikasının Mülki Prosessual Məcəlləsinə uyğun rəsmi məhkəmə Vəsatəti hazırlayan peşəkar hüquqşünassan. Məhkəmənin adı, iş nömrəsi, vəsatət verən şəxsin statusu, vəsatətin predmeti, faktiki və prosessual hüquqi əsaslandırma, konkret xahiş bəndləri, əlavələr və imza hissəsini tam tərtib et.",
  },
  {
    id: "objection",
    slug: "create-objection",
    href: "/create-objection",
    title: "Etiraz Yaradıcısı",
    shortTitle: "Etiraz",
    description: "Qərarlara etiraz ərizələrini generasiya edin.",
    iconName: "ban",
    accentClass: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800/60",
    requiresCourt: true,
    subtypeLabel: "Etirazın növü",
    subtypeOptions: [
      "Məhkəmə əmrinə etiraz ərizəsi",
      "İddia ərizəsinə dair etiraz (cavab)",
      "Qiyabi qətnamənin ləğvi / etiraz ərizəsi",
      "İnzibati orqanın qərarına / cəriməyə etiraz",
      "İcra sənədinə / icra hərəkətinə etiraz",
      "Digər qərara etiraz ərizəsi",
    ],
    referenceLabel: "Etiraz edilən sənəd / qərar (nömrə, tarix)",
    referencePlaceholder: "Məs: 01.03.2026-cı il tarixli məhkəmə əmri / inzibati protokol",
    party1Label: "Etiraz verən şəxs",
    party1Placeholder: "Ad, soyad, ünvan, əlaqə telefonu",
    party2Label: "Qarşı tərəf / Qərarı qəbul edən orqan",
    party2Placeholder: "İddiaçının və ya səlahiyyətli orqanın adı",
    amountLabel: "Mübahisəli məbləğ / Cərimə məbləği",
    amountPlaceholder: "Məs: 1 200 AZN",
    factsLabel: "Etirazın dəlilləri və əsasları",
    factsPlaceholder:
      "Tələblə və ya qərarla hansı faktiki və hüquqi əsaslara görə razılaşmadığınızı qeyd edin...",
    requestsLabel: "Xahiş",
    requestsPlaceholder:
      "Məs: Verilmiş məhkəmə əmri (və ya qərar) ləğv edilsin / iddia əsassız olduğundan rədd edilsin.",
    documentHeading: "ETİRAZ ƏRİZƏSİ",
    systemInstruction:
      "Sən Azərbaycan Respublikasının qanunvericiliyinə (MPM, İXM, Mülki Məcəllə) uyğun rəsmi Etiraz Ərizəsi (və ya iddia ərizəsinə etiraz / məhkəmə əmrinə etiraz) hazırlayan peşəkar hüquqşünassan. Ünvanlandığı orqan, etiraz verən şəxsin rekvizitləri, etiraz edilən aktın/iddianın göstərilməsi, əsaslı dəlillər və normativ istinadlar, konkret xahiş hissəsi, əlavələr və imza bölməsini tam şəkildə yaz.",
  },
  {
    id: "qarar",
    slug: "create-qarar",
    href: "/create-qarar",
    title: "Qərar Layihəsinin yaradıcısı",
    shortTitle: "Qərar Layihəsi",
    description:
      "Yalnız təhsil məqsədilə — şablon əsasında qərar mətn nümunələri hazırlayın.",
    iconName: "gavel",
    accentClass: "text-slate-700 bg-slate-100 border-slate-300 dark:text-slate-200 dark:bg-slate-800/70 dark:border-slate-700",
    badgeText: "Təhsil məqsədli",
    educationalOnly: true,
    requiresCourt: true,
    defaultCourt: "Nümunə Birinci İnstansiya Məhkəməsi (Tədris Ssenarisi)",
    referenceLabel: "Tədris işi nömrəsi / İstiqamət",
    referencePlaceholder: "Məs: Təhsil nümunəsi № 01/2026 — Mülki mübahisə",
    party1Label: "İddiaçı (Tədris ssenarisi üzrə)",
    party1Placeholder: "Məs: Şərti iddiaçı — A. Vəliyev",
    party2Label: "Cavabdeh (Tədris ssenarisi üzrə)",
    party2Placeholder: "Məs: Şərti cavabdeh — B. Həsənov",
    amountLabel: "Mübahisə predmeti / Məbləğ",
    amountPlaceholder: "Məs: 3 000 AZN borc tələbi",
    factsLabel: "İşin halları və araşdırılacaq hüquqi məsələ",
    factsPlaceholder:
      "Təhsil məqsədli ssenaridə tərəflərin iddialarını, təqdim olunan sübutları və hüquqi sualı qeyd edin...",
    requestsLabel: "Layihənin nəticə istiqaməti",
    requestsPlaceholder:
      "Məs: İddianın qismən təmin edilməsi (və ya rədd edilməsi) üzrə əsaslandırma nümunəsi",
    documentHeading: "QƏRAR LAYİHƏSİ (YALNIZ TƏHSİL MƏQSƏDİLƏ NÜMUNƏ)",
    systemInstruction:
      "DİQQƏT: Bu sənəd YALNIZ TƏHSİL MƏQSƏDİLƏ hazırlanan şərti məhkəmə qərarı layihəsi nümunəsidir və rəsmi məhkəmə aktı hesab edilmir. Mətnin əvvəlində açıq şəkildə 'YALNIZ TƏHSİL MƏQSƏDİLƏ ŞABLON NÜMUNƏSİ' qeydini saxla. Azərbaycan Respublikasının MPM 220-ci maddəsinə uyğun klassik strukturu (Giriş hissəsi, Təsviri hissə, Əsaslandırıcı hissə, Nəticəvi hissə) öyrədici hüquqi şablon kimi tam formalaşdır.",
  },
]

export const DOCUMENT_TYPE_MAP: Record<DocumentTypeId, DocumentTypeSpec> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.id, d])
) as Record<DocumentTypeId, DocumentTypeSpec>

export interface LegalDocumentFormInput {
  docType: DocumentTypeId
  subtype?: string
  courtName?: string
  party1: string
  party2?: string
  amount?: string
  referenceInfo?: string
  facts: string
  requests?: string
  chatContext?: string
  legalArticles?: { title: string; articleNumber?: string; content: string }[]
}

export function buildDeterministicDocumentFallback(
  input: LegalDocumentFormInput,
  resolvedCourtName: string
): string {
  const spec = DOCUMENT_TYPE_MAP[input.docType] || DOCUMENT_TYPE_MAP.petition
  const today = new Date().toLocaleDateString("az-AZ")
  const party1 = input.party1.trim() || "[Birinci tərəf / Ərizəçi]"
  const party2 = input.party2?.trim() || "[İkinci tərəf / Qarşı tərəf]"
  const amount = input.amount?.trim() || "[Məbləğ göstərilməyib]"
  const refInfo = input.referenceInfo?.trim()
  const facts = input.facts.trim() || input.chatContext?.trim() || "[Faktiki hallar]"
  const requests = input.requests?.trim() || spec.requestsPlaceholder.replace(/^Məs:\s*/i, "")

  const normsBlock =
    input.legalArticles && input.legalArticles.length > 0
      ? input.legalArticles
          .slice(0, 4)
          .map(
            (a) =>
              `- **${a.title}**${a.articleNumber ? ` — Maddə ${a.articleNumber}` : ""}: ${a.content
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 260)}...`
          )
          .join("\n")
      : "- Azərbaycan Respublikasının Mülki Məcəlləsi və Mülki Prosessual Məcəlləsinin müvafiq normaları."

  if (input.docType === "contract") {
    const contractTitle = (input.subtype || "MÜQAVİLƏ").toUpperCase()
    return `[ƏRİZƏ]
## ${contractTitle}

**Bağlanma yeri və müddəti:** ${refInfo || "Bakı şəhəri"}  
**Tarix:** ${today}

### 1. Tərəflər
- **${spec.party1Label}:** ${party1}
- **${spec.party2Label}:** ${party2}

### 2. Müqavilənin predmeti və şərtləri
${facts}

### 3. Müqavilə qiyməti və ödəniş qaydası
Müqavilə üzrə razılaşdırılmış məbləğ / dəyər: **${amount}**. Tərəflər ödəniş və öhdəliklərin icrasını Azərbaycan Respublikasının Mülki Məcəlləsinin tələblərinə uyğun olaraq vaxtında və tam şəkildə yerinə yetirməyi öhdələrinə götürürlər.

### 4. Tərəflərin hüquq, vəzifə və məsuliyyəti
Tərəflərdən biri bu müqavilə üzrə öhdəliklərini lazımınca icra etmədikdə, Azərbaycan Respublikasının qüvvədə olan qanunvericiliyinə əsasən mülki-hüquqi məsuliyyət daşıyır. Mübahisələr ilkin olaraq danışıqlar yolu ilə, razılıq əldə edilmədikdə isə aidiyyəti məhkəmə qaydasında həll edilir.

### 5. Əlavə şərtlər
${requests}

### 6. Hüquqi istinadlar
${normsBlock}

### 7. Tərəflərin imzaları
- **Birinci tərəf:** _____________________ (${party1})
- **İkinci tərəf:** _____________________ (${party2})
- **Tarix:** ${today}`
  }

  const headerLines = [
    spec.educationalOnly
      ? "> **QEYD:** Yalnız təhsil məqsədilə şablon əsasında hazırlanmış qərar layihəsi nümunəsidir.\n"
      : "",
    `**${resolvedCourtName || spec.defaultCourt || "Aidiyyəti üzrə səlahiyyətli məhkəməyə"}**`,
    input.subtype ? `**Növ:** ${input.subtype}` : "",
    refInfo ? `**Əlaqəli məlumat / Rekvizit:** ${refInfo}` : "",
    `**${spec.party1Label}:** ${party1}`,
    `**${spec.party2Label}:** ${party2}`,
    input.amount?.trim() ? `**${spec.amountLabel}:** ${amount}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  if (input.docType === "qarar") {
    return `[ƏRİZƏ]
${headerLines}

## ${spec.documentHeading}

### I. Giriş və Təsviri Hissə
Təhsil ssenarisi üzrə tərəflər arasında yaranmış mübahisəyə baxılmışdır. ${facts}

### II. Əsaslandırıcı Hissə
İşin halları və tətbiq edilməli normativ hüquqi aktlar qiymətləndirilərək aşağıdakı hüquqi əsaslar nəzərə alınır:
${normsBlock}

### III. Nəticəvi Hissə (Layihə)
Yuxarıda göstərilənlərə və Azərbaycan Respublikasının qanunvericiliyinə əsasən:
1. ${requests}
2. Dövlət rüsumu və prosessual xərclər ümumi qaydaya uyğun bölüşdürülür.

*Bu mətn yalnız tədris və təhsil nümunəsi kimi formalaşdırılmışdır.* (${today})`
  }

  return `[ƏRİZƏ]
${headerLines}

## ${spec.documentHeading}

### İşin faktiki halları
${facts}

### Hüquqi əsaslandırma
Azərbaycan Respublikasının qüvvədə olan qanunvericiliyinə əsasən:
${normsBlock}

### Xahiş
Yuxarıda qeyd edilənləri və mövcud normativ hüquqi əsasları nəzərə alaraq:
1. ${requests}

### Əlavə olunan sənədlər
1. Şəxsiyyəti təsdiq edən sənədin surəti;
2. Tələbi və ya dəlilləri təsdiq edən yazılı sübutlar (müqavilə, bank köçürməsi, yazışmalar və s.);
3. Dövlət rüsumunun ödənilməsi barədə qəbz (tələb olunan hallarda).

**Tarix:** ${today}  
**İmza:** _____________________ (${party1})`
}

export function getSuggestedCourtOptions(docType: DocumentTypeId): string[] {
  if (docType === "cassation") {
    return ["Azərbaycan Respublikasının Ali Məhkəməsinə"]
  }
  const formatCourtTitle = (title: string) => (title.endsWith("i") ? `${title}nə` : title)
  if (docType === "appeal") {
    return ALL_COURTS.filter((c) => c.title.toLowerCase().includes("apellyasiya")).map((c) =>
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
  const combined = `${input.facts} ${input.referenceInfo || ""} ${input.party1} ${input.party2 || ""}`
  const matched = findBestCourtMatch(combined)
  if (matched) return matched.title.endsWith("i") ? `${matched.title}nə` : matched.title
  return "Bakı şəhəri üzrə aidiyyəti rayon məhkəməsinə"
}
