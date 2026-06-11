import { upcomingSunday } from "@church-rides/types";
import { assignRidesForWeek } from "../lib/assign";

/** Saturday 11:45 AM — generate this Sunday's ride assignments. */
export async function runAssignmentJob() {
  const sunday = upcomingSunday();
  const result = await assignRidesForWeek(sunday);
  console.log(
    `Assignments for ${sunday.toISOString().slice(0, 10)}: ` +
      `${result.assigned} assigned, ${result.unassigned} unassigned across ${result.drivers} drivers`
  );
}
