// The assignment algorithm lives in the shared db package so the admin
// dashboard ("Run assignments" button) and this cron job use identical logic.
export { assignRidesForWeek } from "@church-rides/db";
