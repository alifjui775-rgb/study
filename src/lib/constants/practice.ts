/** Virtual standard groups that map to multiple underlying short_codes. */
export const VIRTUAL_STANDARDS: { label: string; codes: string[] }[] = [
  { label: "ইঞ্জিনিয়ারিং", codes: ["engineering", "sandt"] },
  { label: "বিশ্ববিদ্যালয়", codes: ["general", "special", "sandt", "agri"] },
];

/** Hard cap on the number of topic IDs sent to the RPC in a single request. */
export const MAX_TOPICS_PER_EXAM = 1000;
