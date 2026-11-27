import { setTripsFlagged } from './travel/trips'

// Confirming someone clears the "not confirmed" flag on their trips for this event; unconfirming sets it.
// No trip rows are created here: a trip only exists once someone enters travel.
export async function confirmStaffMember({ supabase, eventId, staffId, confirm = true }) {
  try {
    await setTripsFlagged(supabase, eventId, staffId, !confirm)
    return { error: null }
  } catch (error) {
    return { error }
  }
}
