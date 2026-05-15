import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { SuggestResetMenuDialog } from "@/components/SuggestResetMenuDialog";

export async function SuggestResetMenuDialogSlot() {
  // Intentionally re-fetches gyms instead of receiving them as a prop:
  // keeps this slot independent of the home page's data flow so the
  // header can stream without waiting on the gyms section. The "use cache"
  // directive on getActiveGymsWithSections dedupes intra-request calls.
  const gyms = await getActiveGymsWithSections();
  return <SuggestResetMenuDialog gyms={gyms} />;
}
