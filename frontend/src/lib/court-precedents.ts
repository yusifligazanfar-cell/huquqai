import courtActsData from "@/data/court_acts_150.json"
import { normalizeAz } from "@/lib/legal-rag"

export interface CourtAct {
  decisionId: number;
  topic: string;
  result: string;
  court: string;
  judge: string;
  caseNo: string;
}

const COURT_ACTS: CourtAct[] = courtActsData as CourtAct[];

/**
 * Keyword-based semantic matching to find a highly relevant court precedent
 * from the 150 court acts database.
 */
export function findRelevantCourtAct(query: string, aiResponseContent?: string): CourtAct | null {
  const combinedText = normalizeAz(`${query} ${aiResponseContent || ""}`.toLowerCase());

  let bestMatch: CourtAct | null = null;
  let highestScore = 0;

  for (const act of COURT_ACTS) {
    if (!act.topic) continue;
    const topicNorm = normalizeAz(act.topic.toLowerCase());

    let score = 0;

    // Credit & Loan agreements
    if ((combinedText.includes("kredit") || combinedText.includes("bank borc") || combinedText.includes("faiz") || combinedText.includes("ipoteka")) && topicNorm.includes("kredit")) {
      score += 15;
    }

    // Purchase & Sale / Consumer goods
    if ((combinedText.includes("alqi satqi") || combinedText.includes("malin qaytarilmasi") || combinedText.includes("mehsul") || combinedText.includes("zemanet")) && topicNorm.includes("alqi-satqi")) {
      score += 15;
    }

    // Rent / Lease & Land lease
    if ((combinedText.includes("icare") || combinedText.includes("kiraye") || combinedText.includes("torpaq icare")) && topicNorm.includes("icare")) {
      score += 15;
    }

    // Illegal construction / demolition
    if ((combinedText.includes("qanunsuz tikili") || combinedText.includes("sokulme") || combinedText.includes("tikinti") || combinedText.includes("icazesiz")) && topicNorm.includes("qanunsuz tikili")) {
      score += 15;
    }

    // Tax / Travel ban / Border restriction
    if ((combinedText.includes("vergi") || combinedText.includes("olkeden getmek") || combinedText.includes("serhed") || combinedText.includes("mehdudlasdirma") || combinedText.includes("stop")) && (topicNorm.includes("vergi") || topicNorm.includes("olkeden getmek"))) {
      score += 15;
    }

    // Material damage / Tort
    if ((combinedText.includes("maddi ziyan") || combinedText.includes("qeza") || combinedText.includes("zerer") || combinedText.includes("vurulmus ziyan") || combinedText.includes("kompensasiya")) && (topicNorm.includes("maddi ziyan") || topicNorm.includes("delikt"))) {
      score += 15;
    }

    // Family / Divorce / Property division / Alimony
    if ((combinedText.includes("bosanma") || combinedText.includes("er-arvad") || combinedText.includes("nikah") || combinedText.includes("aliment") || combinedText.includes("emlak bolgusu")) && topicNorm.includes("aile")) {
      score += 15;
    }

    // Civil status records
    if ((combinedText.includes("vetendasliq veziyyeti") || combinedText.includes("dogum") || combinedText.includes("soyad") || combinedText.includes("akt qeydi") || combinedText.includes("olum haqqinda")) && topicNorm.includes("vetendasliq veziyyeti")) {
      score += 15;
    }

    // Contract invalidation / cancellation
    if ((combinedText.includes("legv") || combinedText.includes("etibarsiz") || combinedText.includes("muqavilenin legvi")) && topicNorm.includes("etibarsiz")) {
      score += 12;
    }

    // Word tokens intersection
    const topicWords = topicNorm.split(/[\s,.-]+/).filter(w => w.length > 4);
    for (const tw of topicWords) {
      if (combinedText.includes(tw)) {
        score += 2;
      }
    }

    if (score > highestScore && score >= 10) {
      highestScore = score;
      bestMatch = act;
    }
  }

  return bestMatch;
}
