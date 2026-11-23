/**
 * Who says their line, for the label above it in Practice: "The waiter asks",
 * "Your friend says", "They ask".
 *
 * Read off the English `situation`, which almost always names the person ("The
 * bartender asks what you're drinking", "A friend drops onto the stool next to
 * you"). People with a job in the scene win over relations, and relations over
 * anyone at all, because a situation can name both: "Seated with friends, the
 * waiter offers drinks" is the waiter talking. Where nobody is named it is
 * "They", which is never wrong.
 *
 * An exchange whose reading would name the wrong person carries `who` instead
 * ("Someone suggests you ring the landlord" is not the landlord talking).
 *
 * English only. Nothing here touches the target-language line.
 */

type Role = [RegExp, string];

const JOBS: Role[] = [
  [/taxi driver|cab driver|\bdriver\b/, "The driver"],
  [/bartender|barman|barmaid|bar staff/, "The bartender"],
  [/barista/, "The barista"],
  [/waiter|waitress|\bserver\b/, "The waiter"],
  [/customs/, "The customs officer"],
  [/passport control|border officer|police officer|\bofficer\b|\bpolice\b/, "The officer"],
  [/receptionist|front desk|\breception\b/, "The receptionist"],
  [/\bhost\b|hostess/, "The host"],
  [/cashier|checkout/, "The cashier"],
  [/stallholder|stall holder|\bvendor\b/, "The stallholder"],
  [/shop assistant|sales assistant|\bassistant\b|shopkeeper/, "The shop assistant"],
  [/pharmacist/, "The pharmacist"],
  [/doctor/, "The doctor"],
  [/\bnurse\b/, "The nurse"],
  [/bouncer|doorman|door staff|security guard|\bsecurity\b/, "The bouncer"],
  [/\bowner\b/, "The owner"],
  [/landlord|landlady/, "The landlord"],
  [/conductor|inspector|ticket checker/, "The inspector"],
  [/\bguard\b/, "The guard"],
  [/\bclerk\b|attendant|\bstaff\b/, "The staff"],
];

const RELATIONS: Role[] = [
  [/\bmother\b|\bmum\b|\bmom\b/, "Their mother"],
  [/\bfather\b|\bdad\b/, "Their father"],
  [/\baunt\b/, "Their aunt"],
  [/flatmate|roommate/, "Your roommate"],
  [/\bdate\b/, "Your date"],
  [/\bneighbou?rs?\b/, "Your neighbor"],
  // "Their friends have arrived" is not your friend talking.
  [/(?<!their )\bfriends?\b|(?<!their )\bmates?\b/, "Your friend"],
];

const ANYONE: Role[] = [
  [/stranger|\ba man\b|\ba woman\b|\ba guy\b|someone|somebody|\ba local\b/, "Someone"],
];

function firstNamed(text: string, roles: Role[]): string | null {
  let best: { at: number; label: string } | null = null;
  for (const [pattern, label] of roles) {
    const match = pattern.exec(text);
    if (match && (best === null || match.index < best.at)) best = { at: match.index, label };
  }
  return best?.label ?? null;
}

/** The person, without the verb: "The waiter", "They". */
export function whoFromSituation(situation: string): string {
  const text = situation.toLowerCase();
  return firstNamed(text, JOBS) ?? firstNamed(text, RELATIONS) ?? firstNamed(text, ANYONE) ?? "They";
}

/**
 * The whole label: the person and whether they ask or say. A line with a
 * question mark anywhere in it is asked ("¿La cuenta? / ¿Queréis la cuenta?").
 */
export function whoSays(situation: string, line: string, override?: string | null): string {
  const who = override?.trim() || whoFromSituation(situation);
  const asks = line.includes("?");
  const plural = who === "They";
  return `${who} ${asks ? (plural ? "ask" : "asks") : plural ? "say" : "says"}`;
}
