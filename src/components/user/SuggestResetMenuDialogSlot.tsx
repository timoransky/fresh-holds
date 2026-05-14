import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { SuggestResetMenuDialog } from "@/components/SuggestResetMenuDialog";

export async function SuggestResetMenuDialogSlot() {
  const gyms = await getActiveGymsWithSections();
  return <SuggestResetMenuDialog gyms={gyms} />;
}
