/** Brute-force check that the DB filter cutoffs agree with the waiting-period and age calculations. */
import { completionCutoff, ageCutoff, addDays } from "@/lib/domain/membership-filters";
import { addMonthsClamped, compareDates, toIso, ageOn, type CalendarDate } from "@/lib/waiting-period";

let failures = 0;
const start: CalendarDate = { year: 2023, month: 1, day: 1 };
for (let t = 0; t < 1200; t++) {
  const today = addDays(start, t);
  const cut = completionCutoff(today, 6);
  for (let e = -400; e <= 0; e++) {
    const eff = addDays(today, e);
    const completed = compareDates(today, addMonthsClamped(eff, 6)) >= 0;
    const byFilter = toIso(eff) <= cut;
    if (completed !== byFilter) { failures++; if (failures < 5) console.log("waiting mismatch", toIso(today), toIso(eff)); }
  }
  const ac = ageCutoff(today, 60);
  for (let b = -61 * 366; b <= -59 * 365; b += 1) {
    const dob = addDays(today, b);
    const eligible = ageOn(dob, today) < 60;
    if (eligible !== toIso(dob) > ac) { failures++; if (failures < 5) console.log("age mismatch", toIso(today), toIso(dob)); }
  }
}
console.log(failures === 0 ? "ALL PASS (1,200 days × 400 effective dates; age boundary across ~2 years)" : `${failures} FAILURES`);
process.exitCode = failures ? 1 : 0;
