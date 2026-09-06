"use server";

export interface CalculationRequest {
  parentServiceCode: number;
  serviceCode: number;
  claimAmount?: number;
  page?: number;
}

export interface CalculationResponse {
  success: boolean;
  totalAmount: number;
  source: "courts.gov.az" | "fallback";
  error?: string;
  explanation?: string;
}

export async function calculateCourtFee(payload: CalculationRequest): Promise<CalculationResponse> {
  const { parentServiceCode, serviceCode, claimAmount = 0, page = 1 } = payload;

  // 1. Try official courts.gov.az API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch("https://courts.gov.az/api/v1/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        parentServiceCode: Number(parentServiceCode),
        serviceCode: Number(serviceCode),
        claimAmount: Number(claimAmount) || 0,
        page: Number(page) || 1,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.data?.calculate?.totalAmount !== undefined) {
        return {
          success: true,
          totalAmount: Number(data.data.calculate.totalAmount),
          source: "courts.gov.az",
        };
      }
    }
  } catch (err) {
    console.warn("courts.gov.az calculate API error or timeout, falling back to statutory calculation:", err);
  }

  // 2. Exact Legal Fallback according to "Dövlət rüsumu haqqında" Azərbaycan Respublikasının Qanunu (Maddə 8)
  try {
    const fallbackResult = calculateStatutoryFee(parentServiceCode, serviceCode, claimAmount, page);
    return {
      success: true,
      totalAmount: fallbackResult.amount,
      source: "fallback",
      explanation: fallbackResult.explanation,
    };
  } catch (err: any) {
    return {
      success: false,
      totalAmount: 0,
      source: "fallback",
      error: err?.message || "Hesablama zamanı xəta baş verdi.",
    };
  }
}

/**
 * Statutory calculation according to Law of Azerbaijan Republic "On State Duty", Article 8 & 9
 */
function calculateStatutoryFee(
  parentCode: number,
  subCode: number,
  claim: number,
  pages: number
): { amount: number; explanation: string } {
  // 14221900: Court record/decision copy request
  if (parentCode === 14221900 || subCode === 14221900) {
    const p = Math.max(1, Number(pages) || 1);
    const amount = p * 2;
    return {
      amount,
      explanation: `${p} səhifə x 2 AZN (hər səhifə üçün 2 manat)`,
    };
  }

  // 14221800: Complaint against court determination (qərardaddan şikayət)
  if (parentCode === 14221800 || subCode === 14221800) {
    return {
      amount: 50,
      explanation: "Qərardaddan şikayət verilməsinə görə sabit dövlət rüsumu: 50 AZN",
    };
  }

  // 14221500: Civil status acts (Vətəndaşlıq vəziyyəti aktları)
  if (parentCode === 14221500) {
    if (subCode === 14221500) return { amount: 10, explanation: "Nikahın qeydə alınması: 10 AZN" };
    if (subCode === 14221501) return { amount: 15, explanation: "Yetkinlik yaşına çatmamış uşaqları olmayan ər-arvadın razılığı ilə boşanma: 15 AZN" };
    if (subCode === 14221502) return { amount: 15, explanation: "Məhkəmə qətnaməsi əsasında nikahın pozulması: 15 AZN" };
    if (subCode === 14221503) return { amount: 2, explanation: "İtkin düşmüş və ya fəaliyyət qabiliyyəti olmayan şəxslə boşanma: 2 AZN" };
    if (subCode === 14221504) return { amount: 15, explanation: "Adın, ata adının, soyadın dəyişdirilməsi: 15 AZN" };
    if (subCode === 14221505) return { amount: 10, explanation: "Akt qeydlərində dəyişiklik və bərpa: 10 AZN" };
    if (subCode === 14221506) return { amount: 5, explanation: "Təkrar şəhadətnamələrin verilməsi: 5 AZN" };
    return { amount: 10, explanation: "Vətəndaşlıq vəziyyəti aktı üzrə rüsum" };
  }

  // 14221100: Statement of Claim (İddia ərizəsinin verilməsinə görə)
  if (parentCode === 14221100) {
    if (subCode === 14221102) return { amount: 30, explanation: "1.000 manatadək olan iddialar üzrə sabit: 30 AZN" };
    if (subCode === 14221103) {
      const amount = 30 + Math.max(0, (claim - 1000) * 0.01);
      return { amount: Math.round(amount * 100) / 100, explanation: "30 AZN + (1.000 AZN-dən artıq məbləğin 1%-i)" };
    }
    if (subCode === 14221104) {
      const amount = 120 + Math.max(0, (claim - 10000) * 0.005);
      return { amount: Math.round(amount * 100) / 100, explanation: "120 AZN + (10.000 AZN-dən artıq məbləğin 0.5%-i)" };
    }
    if (subCode === 14221105) {
      const amount = 570 + Math.max(0, (claim - 100000) * 0.002);
      return { amount: Math.round(amount * 100) / 100, explanation: "570 AZN + (100.000 AZN-dən artıq məbləğin 0.2%-i)" };
    }
    if (subCode === 14221106) {
      const amount = 2370 + Math.max(0, (claim - 1000000) * 0.001);
      return { amount: Math.round(amount * 100) / 100, explanation: "2370 AZN + (1.000.000 AZN-dən artıq məbləğin 0.1%-i)" };
    }
    if (subCode === 14221107) return { amount: 50, explanation: "Yaşayış sahəsi, pay torpağı və k/t torpaqları üzrə sabit: 50 AZN" };
    if (subCode === 14221108) return { amount: 100, explanation: "Qeyri-əmlak və qiymətləndirilməyən iddialar üzrə: 100 AZN" };
    if (subCode === 14221109) return { amount: 100, explanation: "Məhkəmə əmri verilməsi barədə ərizə: 100 AZN" };
    if (subCode === 14221110) return { amount: 50, explanation: "Xüsusi icraat qaydasında işlər üzrə: 50 AZN" };
  }

  // 14221200: Third-party independent claim (Üçüncü şəxsin müstəqil tələbi)
  if (parentCode === 14221200) {
    if (subCode === 14221208) return { amount: 30, explanation: "1.000 manatadək iddia üzrə: 30 AZN" };
    if (subCode === 14221209) {
      const amount = 30 + Math.max(0, (claim - 1000) * 0.01);
      return { amount: Math.round(amount * 100) / 100, explanation: "30 AZN + 1% (1.000-dən artıq)" };
    }
    if (subCode === 14221210) {
      const amount = 120 + Math.max(0, (claim - 10000) * 0.005);
      return { amount: Math.round(amount * 100) / 100, explanation: "120 AZN + 0.5% (10.000-dən artıq)" };
    }
    if (subCode === 14221211) {
      const amount = 570 + Math.max(0, (claim - 100000) * 0.002);
      return { amount: Math.round(amount * 100) / 100, explanation: "570 AZN + 0.2% (100.000-dən artıq)" };
    }
    if (subCode === 14221212) {
      const amount = 2370 + Math.max(0, (claim - 1000000) * 0.001);
      return { amount: Math.round(amount * 100) / 100, explanation: "2370 AZN + 0.1% (1.000.000-dan artıq)" };
    }
    if (subCode === 14221213) return { amount: 50, explanation: "Yaşayış evi / torpaqla bağlı müstəqil tələb: 50 AZN" };
    if (subCode === 14221214) return { amount: 100, explanation: "Qiymətləndirilməyən müstəqil tələb: 100 AZN" };
  }

  // 14221300: Interim measures & Arbitration (Müvəqqəti təminat / Arbitraj)
  if (parentCode === 14221300) {
    if (subCode === 14221301) return { amount: 100, explanation: "Müvəqqəti təminat tədbiri (qiymətləndirilməyən): 100 AZN" };
    if (subCode === 14221302) return { amount: 50, explanation: "Müvəqqəti təminat tədbiri (1.000 AZN-dək): 50 AZN" };
    if (subCode === 14221303) return { amount: 100, explanation: "Müvəqqəti təminat tədbiri (1.000 - 10.000 AZN): 100 AZN" };
    if (subCode === 14221304) return { amount: 200, explanation: "Müvəqqəti təminat tədbiri (10.000 - 100.000 AZN): 200 AZN" };
    if (subCode === 14221305) return { amount: 500, explanation: "Müvəqqəti təminat tədbiri (100.000 - 1.000.000 AZN): 500 AZN" };
    if (subCode === 14221306) return { amount: 1000, explanation: "Müvəqqəti təminat tədbiri (1.000.000 AZN-dən çox): 1000 AZN" };
    return { amount: 100, explanation: "Müvəqqəti təminat və ya arbitraj müraciəti: 100 AZN" };
  }

  // 14221400: Appeals, Cassation, Reopening (Apellyasiya, kassasiya, yeni açılmış hallar)
  if (parentCode === 14221400) {
    // Appeals & Cassation
    if (subCode === 14221415) return { amount: 30, explanation: "Apellyasiya / kassasiya (1.000 manatadək): 30 AZN" };
    if (subCode === 14221416) {
      const amount = 15 + Math.max(0, (claim - 1000) * 0.005);
      return { amount: Math.round(amount * 100) / 100, explanation: "İddia dərəcəsinin 50%-i (35 AZN orta)" };
    }
    if (subCode === 14221417) {
      const amount = 60 + Math.max(0, (claim - 10000) * 0.0025);
      return { amount: Math.round(amount * 100) / 100, explanation: "Apellyasiya / kassasiya (10.000 - 100.000 AZN)" };
    }
    if (subCode === 14221418) {
      const amount = 285 + Math.max(0, (claim - 100000) * 0.001);
      return { amount: Math.round(amount * 100) / 100, explanation: "Apellyasiya / kassasiya (100.000 - 1.000.000 AZN)" };
    }
    if (subCode === 14221419) {
      const amount = 1185 + Math.max(0, (claim - 1000000) * 0.0005);
      return { amount: Math.round(amount * 100) / 100, explanation: "Apellyasiya / kassasiya (1.000.000 AZN-dən çox)" };
    }
    if (subCode === 14221420) return { amount: 25, explanation: "Yaşayış evi və pay torpağı ilə bağlı şikayət: 25 AZN" };
    if (subCode === 14221421) return { amount: 50, explanation: "Qiymətləndirilməyən iddia üzrə şikayət: 50 AZN" };

    // New circumstances (Yeni açılmış hallar)
    if (subCode === 14221422) return { amount: 30, explanation: "Yeni açılmış hallar (1.000 manatadək): 30 AZN" };
    if (subCode === 14221423) return { amount: 60, explanation: "Yeni açılmış hallar (1.000 - 10.000 manat): 60 AZN" };
    if (subCode === 14221424) return { amount: 150, explanation: "Yeni açılmış hallar (10.000 - 100.000 manat): 150 AZN" };
    if (subCode === 14221425) return { amount: 400, explanation: "Yeni açılmış hallar (100.000 - 1.000.000 manat): 400 AZN" };
    if (subCode === 14221426) return { amount: 1000, explanation: "Yeni açılmış hallar (1.000.000 manatdan çox): 1000 AZN" };
    if (subCode === 14221427) return { amount: 50, explanation: "Yaşayış sahəsi / kənd təsərrüfatı torpağı: 50 AZN" };
    if (subCode === 14221428) return { amount: 50, explanation: "Qiymətləndirilməyən ərizə / məhkəmə əmri: 50 AZN" };
  }

  return { amount: 30, explanation: "Standart dövlət rüsumu dərəcəsi" };
}
