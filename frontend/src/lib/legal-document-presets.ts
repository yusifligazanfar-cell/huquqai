import type { DocumentTypeId, LegalDocumentFormInput } from "./legal-documents"

export const DOCUMENT_SAMPLE_PRESETS: Record<DocumentTypeId, Partial<LegalDocumentFormInput>> = {
  contract: {
    subtype: "Borc müqaviləsi",
    referenceInfo: "Bakı şəhəri, 12 ay müddətinə",
    party1: "Əliyev Rəşad Kamran oğlu",
    party1Id: "1AB2C3D",
    party1Address: "Bakı şəhəri, Nəsimi rayonu, Cavadxan küç. 18",
    party1Phone: "+994 50 310 22 11",
    party2: "Məmmədov Tural Elçin oğlu",
    party2Id: "5EF6G7H",
    party2Address: "Bakı şəhəri, Yasamal rayonu, Şərifzadə küç. 42",
    amount: "4 000 (dörd min) AZN — nağdsız bank köçürməsi ilə",
    facts:
      "Borcverən tərəfindən 4 000 AZN məbləğində pul vəsaiti müqavilə imzalandığı gün bank köçürməsi ilə borcalana təqdim edilir. Borcalan məbləği 12 ay müddətində bərabər aylıq ödənişlərlə geri qaytarmağı öhdəsinə götürür.",
    requests:
      "Ödəniş gecikdirildiyi halda hər gecikdirilən gün üçün 0,1% dəbbə pulu hesablanır; mübahisələr danışıqlar və məhkəmə qaydasında həll edilir.",
  },
  petition: {
    subtype: "Borcun tutulması",
    courtName: "Bakı şəhəri Nəsimi Rayon Məhkəməsinə",
    referenceInfo: "Mülki mübahisə — borc öhdəliyinin icrası",
    mediationInfo: "Tələb olunmur / Mülki pul borcu mübahisəsi",
    party1: "Əliyev Rəşad Kamran oğlu",
    party1Id: "1AB2C3D",
    party1Address: "Bakı şəhəri, Nəsimi rayonu, Azadlıq pr. 88",
    party1Phone: "+994 50 310 22 11",
    party1Email: "rashad.aliyev@example.az",
    party2: "Məmmədov Tural Elçin oğlu",
    party2Id: "5EF6G7H",
    party2Address: "Bakı şəhəri, Nəsimi rayonu, Rəşid Behbudov küç. 24",
    amount: "3 500 AZN əsas borc",
    facts:
      "15.01.2026-cı il tarixində cavabdehin bank hesabına 3 500 AZN məbləğində borc pul köçürmüşəm. Cavabdeh pulu 15.03.2026-cı il tarixinədək qaytaracağını elektron yazışmalarda təsdiq etsə də, ödəniş müddəti bitdikdən sonra öhdəliyini icra etməmişdir.",
    requests:
      "Cavabdeh Məmmədov Tural Elçin oğlundan 3 500 (üç min beş yüz) AZN əsas borc məbləğinin və ödənilmiş dövlət rüsumunun tutularaq iddiaçıya ödənilməsi barədə qətnamə qəbul edilsin.",
    attachmentsText:
      "Dövlət rüsumunun ödənilməsi barədə qəbz\nBank köçürməsi qəbzi (15.01.2026)\nNotarial və ya təsdiq olunmuş WhatsApp yazışmalarının surəti\nİddiaçının şəxsiyyət vəsiqəsinin surəti",
  },
  appeal: {
    subtype: "Məhkəmə qətnaməsindən apellyasiya şikayəti",
    courtName: "Bakı Apellyasiya Məhkəməsinə",
    referenceInfo: "Bakı şəhəri Nəsimi Rayon Məhkəməsi vasitəsilə",
    caseNumber: "2(006)-912/2026",
    disputedActInfo: "Nəsimi Rayon Məhkəməsinin 20.02.2026-cı il tarixli qətnaməsi (iddianın rədd edilməsi)",
    party1: "Əliyev Rəşad Kamran oğlu (İddiaçı)",
    party1Id: "1AB2C3D",
    party1Address: "Bakı şəhəri, Nəsimi rayonu, Azadlıq pr. 88",
    party1Phone: "+994 50 310 22 11",
    party2: "Məmmədov Tural Elçin oğlu (Cavabdeh)",
    party2Address: "Bakı şəhəri, Nəsimi rayonu, R. Behbudov küç. 24",
    amount: "5 000 AZN",
    facts:
      "Birinci instansiya məhkəməsi cavabdehin hesabına köçürülmüş 5 000 AZN borcun mövcudluğunu təsdiq edən bank çıxarışına və yazılı etirafa baxmayaraq iddianı rədd etmişdir.",
    legalViolationInfo:
      "Məhkəmə AR Mülki Məcəlləsinin 739-cu maddəsini yanlış tətbiq etmiş, MPM-in 88 və 217-ci maddələrini pozaraq təqdim olunmuş yazılı sübutlara hüquqi qiymət verməmişdir.",
    requests:
      "Bakı şəhəri Nəsimi Rayon Məhkəməsinin 20.02.2026-cı il tarixli qətnaməsi ləğv edilsin və iddianın təmin edilməsi barədə yeni qətnamə qəbul edilsin.",
    attachmentsText:
      "Dövlət rüsumunun ödənilməsi barədə qəbz\nApellyasiya şikayətinin qarşı tərəflər üçün surətləri",
  },
  cassation: {
    subtype: "Apellyasiya qətnaməsindən kassasiya şikayəti (MPM Əlavə 3)",
    courtName: "Azərbaycan Respublikasının Ali Məhkəməsinə",
    referenceInfo: "Bakı Apellyasiya Məhkəməsi vasitəsilə",
    caseNumber: "2(103)-1450/2026",
    disputedActInfo: "Bakı Apellyasiya Məhkəməsinin 10.04.2026-cı il tarixli qətnaməsi",
    advocateInfo: "Vəkil Həsənov Elvin Məmməd oğlu (AR Vəkillər Kollegiyası, Order № 004512)",
    party1: "Əliyev Rəşad Kamran oğlu (İddiaçı)",
    party1Id: "1AB2C3D",
    party1Address: "Bakı şəhəri, Nəsimi rayonu, Azadlıq pr. 88",
    party1Phone: "+994 50 310 22 11",
    party2: "Məmmədov Tural Elçin oğlu (Cavabdeh)",
    party2Address: "Bakı şəhəri, Nəsimi rayonu, R. Behbudov küç. 24",
    amount: "12 000 AZN",
    facts:
      "Bakı Apellyasiya Məhkəməsinin 10.04.2026-cı il tarixli qətnaməsi ilə birinci instansiya qətnaməsi qüvvədə saxlanılmışdır. Qətnamə maddi və prosessual hüquq normalarının pozulması ilə qəbul edilmişdir.",
    legalViolationInfo:
      "Apellyasiya məhkəməsi AR Mülki Məcəlləsinin 385 və 739.1-ci maddələrinin tətbiqi zamanı hüquq normasını yanlış şərh etmiş, MPM-in 217 və 385-ci maddələrinin prosessual tələblərini pozmuşdur (MPM 414.1 üzrə vahid məhkəmə təcrübəsindən kənaraçıxma).",
    requests:
      "Bakı Apellyasiya Məhkəməsinin 10.04.2026-cı il tarixli qətnaməsi ləğv edilsin və iş yenidən baxılması üçün apellyasiya instansiyası məhkəməsinə göndərilsin.",
    attachmentsText:
      "Vəkilin orderi (əsli)\nDövlət rüsumunun ödənilməsi haqqında sənəd",
  },
  motion: {
    subtype: "Sübutların tələb edilməsi barədə vəsatət",
    courtName: "Bakı şəhəri Yasamal Rayon Məhkəməsinə",
    caseNumber: "2(004)-318/2026",
    referenceInfo: "Hakim ..., Mülki icraat",
    party1: "Əliyev Rəşad Kamran oğlu (İddiaçı)",
    party1Address: "Bakı şəhəri, Yasamal rayonu",
    party1Phone: "+994 50 310 22 11",
    party2: "Məmmədov Tural Elçin oğlu (Cavabdeh)",
    amount: "2 800 AZN bank əməliyyatı çıxarışı",
    facts:
      "İşin ədalətli həlli üçün cavabdehin bank hesabına daxil olmuş vəsaitin təyinatını təsdiq edən rəsmi bank çıxarışının əldə edilməsi zəruridir. Bank sirri rejiminə görə həmin sənədi müstəqil şəkildə əldə etmək mümkün olmamışdır (MPM m. 77–78).",
    requests:
      "Müvafiq bankdan 01.01.2026–01.03.2026-cı il tarixləri üzrə hesab çıxarışının tələb edilməsi barədə qərardad qəbul edilsin.",
    attachmentsText: "Banka göndərilmiş sorğu məktubunun və imtina cavabının surəti",
  },
  objection: {
    subtype: "İddia ərizəsinə qarşı etiraz",
    courtName: "Bakı şəhəri Sabunçu Rayon Məhkəməsinə",
    caseNumber: "2(008)-241/2026",
    disputedActInfo: "İddiaçının 04.03.2026-cı il tarixli iddia ərizəsi",
    party1: "Məmmədov Tural Elçin oğlu (Cavabdeh)",
    party1Address: "Bakı şəhəri, Sabunçu rayonu",
    party1Phone: "+994 55 410 11 22",
    party2: "\"ABC Kredit\" MMC (İddiaçı)",
    amount: "1 450 AZN",
    facts:
      "İddiaçı əsas borc və hesablanmış faizlər üzrə 1 450 AZN tələb irəli sürmüşdür. Lakin əsas məbləğin 1 100 AZN hissəsi 12.02.2026-cı il tarixində ödənilmişdir və bunu təsdiq edən ödəniş tapşırığı mövcuddur.",
    legalViolationInfo:
      "İddiaçının müqavilədə nəzərdə tutulmayan cərimə faizlərini hesablaması Mülki Məcəllənin 462 və 467-ci maddələrinin ədalətli azaldılma prinsiplərinə ziddir.",
    requests:
      "İddia ərizəsi artıq ödənilmiş məbləğ və əsassız dəbbə pulu hissəsində rədd edilsin.",
    attachmentsText: "12.02.2026-cı il tarixli bank ödəniş qəbzinin surəti",
  },
  qarar: {
    courtName: "Şərti Birinci İnstansiya Məhkəməsi (Tədris Simulyasiyası)",
    referenceInfo: "Tədris kazusu № 01/2026 — Mülki mübahisə",
    party1: "Şərti İddiaçı — A. Vəliyev",
    party2: "Şərti Cavabdeh — B. Həsənov",
    amount: "3 000 AZN",
    facts:
      "Tədris ssenarisində iddiaçı yazılı müqavilə bağlanmadan bank kartı ilə 3 000 AZN borc vermiş, bank köçürməsi və elektron mesajlaşma sübutlarını təqdim etmişdir. Cavabdeh vəsaitin alınmasını təsdiq etsə də qaytarmaqdan yayınır.",
    requests:
      "MPM-in 220-ci maddəsinə uyğun tədris məqsədli qiymətləndirmə: iddianın təmin edilməsi istiqamətində nümunə əsaslandırma.",
  },
  "state-application": {
    courtName: "Azərbaycan Respublikasının Əmək və Əhalinin Sosial Müdafiəsi Nazirliyinə",
    referenceInfo: "Sosial sığorta stajı məlumatının dəqiqləşdirilməsi barədə",
    party1: "Qasımov Samir Vaqif oğlu",
    party1Id: "2CD3E4F",
    party1Address: "Sumqayıt şəhəri, 9-cu mkr, ev 12, mən. 45",
    party1Phone: "+994 50 512 34 56",
    facts:
      "2018–2023-cü illər ərzində müəssisədə əmək müqaviləsi əsasında işləsəm də, elektron portalda müvafiq dövr üzrə sosial sığorta stajı tam əks olunmamışdır.",
    requests:
      "Müvafiq dövr üzrə fərdi uçot məlumatlarının yoxlanılması və rəsmi yazılı cavabın təqdim edilməsini xahiş edirəm.",
    attachmentsText: "Əmək kitabçasının müvafiq səhifələrinin surəti",
  },
  "official-complaint": {
    courtName: "Dövlət Vergi Xidmətinin Rəhbərliyinə",
    disputedActInfo: "02.03.2026-cı il tarixli qərar (inzibati tədbir)",
    party1: "\"Delta Servis\" MMC (Direktor: Əhmədov V.)",
    party1Id: "1401234561",
    party1Address: "Bakı şəhəri, Nərimanov rayonu, Ağa Nemətulla küç. 15",
    party2: "Bakı şəhəri Lokal Gəlirlər Baş İdarəsi",
    facts:
      "Şirkət tərəfindən təqdim edilmiş elektron bəyannamə üzrə düzəlişlər təsdiqləyici sənədlərlə təqdim olunduğu halda əlavə maliyyə sanksiyası tətbiq edilmişdir.",
    requests:
      "02.03.2026-cı il tarixli qərarın yuxarı inzibati orqan tərəfindən ləğv edilməsi və işə yenidən baxılması barədə qərar qəbul edilsin.",
  },
  pretension: {
    courtName: "\"Omega Tikinti\" MMC-nin Direktoruna",
    referenceInfo: "10.01.2026-cı il tarixli № 15 Podrat müqaviləsi",
    party1: "\"Beta Təchizat\" MMC",
    party1Id: "1509876541",
    party1Address: "Bakı şəhəri, Xətai rayonu, Xocalı pr. 37",
    party1Phone: "+994 51 777 88 99",
    party2: "\"Omega Tikinti\" MMC",
    amount: "8 400 AZN",
    facts:
      "Podrat müqaviləsinin 3-cü bəndinə əsasən inşaat materialları 20.01.2026-cı il tarixli təhvil-təslim aktı ilə təhvil verilmiş, lakin 8 400 AZN dəyərində ödəniş razılaşdırılmış 10 bank günü ərzində ödənilməmişdir.",
    requests:
      "Bu pretenziya məktubu alındıqdan sonra 10 təqvim günü ərzində 8 400 AZN borcun ödənilməsini tələb edirik; əks halda Bakı Kommersiya Məhkəməsində iddia qaldırılacaqdır.",
    attachmentsText: "20.01.2026-cı il tarixli Təhvil-Təslim Aktının surəti\nElektron qaimə-fakturaların surəti",
  },
  "power-of-attorney": {
    subtype: "Məhkəmə və dövlət orqanlarında təmsilçilik etibarnaməsi (MPM m. 70)",
    referenceInfo: "1 (bir) il müddətinə, başqasına etibar etmək hüququ olmadan",
    party1: "Əliyev Rəşad Kamran oğlu",
    party1Id: "1AB2C3D",
    party1Address: "Bakı şəhəri, Nəsimi rayonu",
    party2: "Vəkil Məmmədova Nigar Aydın qızı",
    party2Address: "Bakı şəhəri, Yasamal rayonu",
    facts:
      "Azərbaycan Respublikasının bütün birinci, apellyasiya və kassasiya instansiyası məhkəmələrində, dövlət və bələdiyyə orqanlarında nümayəndəm qismində çıxış etmək, iş materialları ilə tanış olmaq, iddia ərizələri və vəsatətlər vermək, qətnamələri almaq.",
    requests: "Bu etibarnamə verilən gündən 1 il müddətində qüvvədədir (notarial təsdiq edildikdən sonra).",
  },
  "legal-opinion": {
    courtName: "\"Alpha Logistics\" MMC-nin Rəhbərliyinə",
    referenceInfo: "Müqaviləyə birtərəfli xitamın hüquqi nəticələrinin təhlili",
    party1: "Hüquq Məsləhətçisi",
    party2: "\"Alpha Logistics\" MMC",
    amount: "25 000 AZN müqavilə öhdəliyi",
    facts:
      "Tərəfdaş şirkət 6 ay əvvəldən xəbərdarlıq tələbinə riayət etmədən uzunmüddətli daşıma müqaviləsini birtərəfli ləğv etməklə bağlı bildiriş göndərmişdir. Müqavilədə vaxtından əvvəl xitam halı üçün əvvəlcədən 30 günlük bildiriş müddəti göstərilmişdir.",
    requests:
      "1) Birtərəfli imtinanın qanunsuz hesab edilməsi barədə pretenziya göndərilməsi; 2) Əldən çıxmış fayda və dəymiş real zərərin hesablanıb sənədləşdirilməsi.",
  },
  settlement: {
    courtName: "Bakı şəhəri Yasamal Rayon Məhkəməsinin təsdiqinə",
    caseNumber: "2(004)-112/2026",
    party1: "İddiaçı — Əliyev Rəşad Kamran oğlu",
    party1Id: "1AB2C3D",
    party2: "Cavabdeh — Məmmədov Tural Elçin oğlu",
    party2Id: "5EF6G7H",
    amount: "2 500 AZN (iki bərabər ödənişlə)",
    facts:
      "İddiaçı əvvəlki 3 500 AZN tələbindən qarşılıqlı güzəşt qaydasında 1 000 AZN hissəsindən imtina edir, cavabdeh isə 2 500 AZN məbləğini 20.12.2026 və 20.01.2027-ci il tarixlərinədək iki hissədə ödəməyi öhdəsinə götürür.",
    requests:
      "MPM-in 191-ci maddəsinə əsasən bu barışıq sazişi təsdiq edilsin və iş üzrə icraata xitam verilsin.",
  },
  "enforcement-complaint": {
    courtName: "Bakı İnzibati Məhkəməsinə",
    caseNumber: "İcra № 2(006)-500/2025",
    disputedActInfo: "Nəsimi Rayon İcra və Probasiya Şöbəsinin icra məmurunun hərəkətsizliyi",
    party1: "Əliyev Rəşad Kamran oğlu (Tələbkar)",
    party1Address: "Bakı şəhəri, Nəsimi rayonu",
    party2: "Nəsimi Rayon İcra və Probasiya Şöbəsi",
    amount: "4 500 AZN icra tələbi",
    facts:
      "Qanuni qüvvəyə minmiş qətnamə üzrə icra vərəqəsi 3 ay əvvəl icra şöbəsinə təqdim edilsə də, icra məmuru tərəfindən borclunun bank hesablarına və əmlakına sorğu göndərilməmiş, icraya başlamaq barədə heç bir tədbir görülməmişdir.",
    requests:
      "İcra məmurunun hərəkətsizliyi qanunsuz hesab edilsin və qanunla nəzərdə tutulmuş məcburi icra tədbirlərinin dərhal həyata keçirilməsi öhdəliyi qoyulsun.",
    attachmentsText: "İcra şöbəsinə verilmiş qəbul qəbzi\nQanuni qüvvəyə minmiş məhkəmə qətnaməsinin surəti",
  },
  "labor-document": {
    subtype: "Öz xahişi ilə işdən azad olunma ərizəsi (ƏM m. 69)",
    courtName: "\"AzTexnika\" MMC-nin Direktoru cənab R. Quliyevə",
    referenceInfo: "Satış şöbəsinin baş mütəxəssisi — 20.12.2026-cı ildən",
    party1: "Həsənov Murad İlham oğlu",
    party1Id: "3BC4D5E",
    party1Phone: "+994 50 611 22 33",
    facts:
      "AR Əmək Məcəlləsinin 69.1-ci maddəsinə əsasən 1 təqvim ayı əvvəldən xəbərdarlıq etməklə 20.12.2026-cı il tarixindən etibarən öz xahişimlə işdən azad olunmaq istəyirəm.",
    requests:
      "20.12.2026-cı il tarixindən əmək müqaviləmə xitam verilməsi, istifadə edilməmiş məzuniyyət günlərinə görə kompensasiya və son haqq-hesabın ödənilməsi barədə əmr verilməsini xahiş edirəm.",
  },
  "admin-claim": {
    subtype: "Mübahisələndirmə haqqında iddia (İPM m. 32 — aktın ləğvi)",
    courtName: "Bakı İnzibati Məhkəməsinə",
    disputedActInfo: "01.11.2026-cı il tarixli № 45 İnzibati akt (icazənin ləğvi)",
    party1: "\"Kaspian İnşaat\" MMC",
    party1Id: "1304455661",
    party1Address: "Bakı şəhəri, Səbail rayonu, Neftçilər pr. 24",
    party2: "Müvafiq Dövlət Şəhərsalma Qurumu",
    facts:
      "Cavabdeh inzibati orqan şirkətimizin dinlənilmə hüququnu təmin etmədən və heç bir xəbərdarlıq göndərmədən verilmiş rəsmi tikinti icazəsini 01.11.2026-cı il tarixli qərarı ilə ləğv etmişdir.",
    legalViolationInfo:
      "İnzibati icraat haqqında Qanunun 14, 15 və 61-ci maddələrinin prosedur və əsaslandırma tələbləri kobud şəkildə pozulmuşdur; İPM-in 38.1-ci maddəsinin 30 günlük müddətinə əməl olunmuşdur.",
    requests:
      "Cavabdehin 01.11.2026-cı il tarixli № 45 inzibati aktı qanunsuz olduğundan tam ləğv edilsin.",
    attachmentsText: "01.11.2026-cı il tarixli inzibati aktın surəti\nDövlət rüsumunun ödəniş qəbzi",
  },
  "constitutional-complaint": {
    courtName: "Azərbaycan Respublikasının Konstitusiya Məhkəməsinə",
    disputedActInfo: "AR Ali Məhkəməsinin Mülki Kollegiyasının 15.08.2026-cı il tarixli qərarı",
    advocateInfo: "Vəkil Kərimov Aydın Cəfər oğlu (Order № 009123)",
    party1: "Əliyev Rəşad Kamran oğlu",
    party1Id: "1AB2C3D",
    party1Address: "Bakı şəhəri, Nəsimi rayonu",
    amount: "AR Konstitusiyası m. 29 (Mülkiyyət hüququ), m. 60 (Məhkəmə müdafiəsi)",
    facts:
      "Məhkəmə müdafiəsi vasitələri tam tükənmiş, AR Ali Məhkəməsinin 15.08.2026-cı il tarixli qərarı qüvvəyə minmişdir (6 aylıq şikayət müddəti ərzində müraciət edilir).",
    legalViolationInfo:
      "Ali Məhkəmə tərəfindən tətbiq edilmiş qanunvericilik norması mülkiyyət hüququnun müdafiəsi və ədalətli məhkəmə araşdırması baxımından Konstitusiyanın 29 və 60-cı maddələrinin hüquqi mövqelərinə uyğun gəlməmişdir (Qanun m. 34.2).",
    requests:
      "Mübahisələndirilən Ali Məhkəmə aktının Azərbaycan Respublikası Konstitusiyasının 29 və 60-cı maddələrinə uyğun olmayan hesab edilməsi və işə qanunvericiliyə uyğun yenidən baxılması.",
    attachmentsText: "Ali Məhkəmənin 15.08.2026-cı il tarixli qərarının təsdiq edilmiş surəti\nVəkilin orderi",
  },
  "court-speech": {
    subtype: "Mülki işdə iddiaçının / nümayəndənin məhkəmə mübahisəsi çıxışı",
    courtName: "Bakı şəhəri Nəsimi Rayon Məhkəməsi",
    caseNumber: "2(006)-450/2026",
    party1: "İddiaçı nümayəndəsi — Vəkil Həsənov E.",
    party2: "Cavabdeh — Məmmədov T.",
    amount: "5 000 AZN borc tələbi",
    facts:
      "Məhkəmə iclasında tədqiq edilmiş bank çıxarışı, tərəflər arasında təsdiq edilmiş yazışma protokolu və cavabdehin ziddiyyətli izahatları öhdəliyin yaranmasını və icra olunmadığını tam sübuta yetirir.",
    requests:
      "Möhtərəm Hakim, məhkəmə istintaqı zamanı təsdiq edilmiş yazılı sübutları rəhbər tutaraq iddiamızın tam təmin olunmasını xahiş edirəm.",
  },
  "attorney-inquiry": {
    courtName: "Azərbaycan Respublikası Əmlak Məsələləri Dövlət Xidmətinə",
    referenceInfo: "Bakı şəhəri 1 saylı Vəkil Bürosu, Order № 003344",
    advocateInfo: "Vəkil Həsənov Elvin Məmməd oğlu (Vəkillər Kollegiyasının üzvü)",
    party1: "Vəkil Həsənov Elvin Məmməd oğlu",
    party1Address: "Bakı şəhəri, Xətai rayonu, Xocalı pr. 10",
    party1Phone: "+994 50 200 10 20",
    party2: "Müvəkkil — Əliyev Rəşad Kamran oğlu",
    facts:
      "Bakı şəhəri Nəsimi Rayon Məhkəməsinin icraatında olan mülki iş üzrə müvəkkilə hüquqi yardımın göstərilməsi ilə bağlı Bakı şəhəri, Nəsimi rayonu üzrə qeyd olunan daşınmaz əmlak obyektinin 2020–2026-cı illər dövründəki mülkiyyət keçidi məlumatlarının əldə edilməsi zərurəti yaranmışdır.",
    requests:
      "\"Vəkillər və vəkillik fəaliyyəti haqqında\" Qanunun 7-ci maddəsinə əsasən müvafiq reyestr çıxarışının və məlumatın qanunvericiliklə müəyyən edilmiş müddətdə vəkil büromuza təqdim edilməsini xahiş edirəm.",
    attachmentsText: "Vəkilin orderinin surəti",
  },
}
