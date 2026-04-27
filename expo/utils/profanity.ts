const BLOCKED_WORDS: string[] = [
  "fuck",
  "fuk",
  "fck",
  "shit",
  "sh1t",
  "bitch",
  "b1tch",
  "biatch",
  "cunt",
  "cvnt",
  "dick",
  "d1ck",
  "pussy",
  "asshole",
  "a55hole",
  "bastard",
  "slut",
  "whore",
  "wh0re",
  "nigger",
  "nigga",
  "n1gger",
  "n1gga",
  "faggot",
  "fag",
  "f4g",
  "retard",
  "retarded",
  "tard",
  "cock",
  "c0ck",
  "twat",
  "wanker",
  "jerkoff",
  "jackoff",
  "motherfucker",
  "mofo",
  "piss",
  "pi55",
  "kike",
  "spic",
  "chink",
  "gook",
  "tranny",
  "dyke",
  "homo",
  "queer",
  "rape",
  "rapist",
  "molest",
  "pedo",
  "pedophile",
  "nazi",
  "hitler",
  "kkk",
  "anal",
  "anus",
  "boner",
  "ballsack",
  "ballsac",
  "bollock",
  "bollocks",
  "cum",
  "jizz",
  "semen",
  "ejaculate",
  "masturbate",
  "masturbat",
  "blowjob",
  "bj",
  "handjob",
  "rimjob",
  "dildo",
  "butthole",
  "buttfuck",
  "fisting",
  "milf",
  "dilf",
  "incest",
  "bestiality",
  "porn",
  "pornography",
  "xxx",
  "hentai",
  "camwhore",
  "slvt",
  "5lut",
  "arse",
  "arsehole",
  "shithead",
  "dumbass",
  "jackass",
  "badass",
  "shagger",
  "tosser",
  "prick",
  "douche",
  "douchebag",
  "scumbag",
];

function normalize(input: string): string {
  const lowered = input.toLowerCase();
  const substitutions: Record<string, string> = {
    "0": "o",
    "1": "i",
    "!": "i",
    "3": "e",
    "4": "a",
    "@": "a",
    "5": "s",
    "$": "s",
    "7": "t",
    "+": "t",
    "8": "b",
    "9": "g",
  };
  let out = "";
  for (const ch of lowered) {
    out += substitutions[ch] ?? ch;
  }
  return out.replace(/[^a-z]/g, "");
}

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const raw = text.toLowerCase();
  const normalized = normalize(text);
  for (const word of BLOCKED_WORDS) {
    if (!word) continue;
    if (raw.includes(word)) return true;
    if (normalized.includes(word)) return true;
  }
  return false;
}

export function getProfanityError(kind: "username" | "group"): string {
  if (kind === "group") {
    return "Please choose a group name that doesn't contain offensive language.";
  }
  return "Please choose a name that doesn't contain offensive language.";
}
