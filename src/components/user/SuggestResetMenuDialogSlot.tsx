import { getGymsWithSectionCatalog } from "@/lib/db/gyms";
import { SuggestResetMenuDialog } from "@/components/SuggestResetMenuDialog";

export async function SuggestResetMenuDialogSlot() {
  const gyms = await getGymsWithSectionCatalog();
  return <SuggestResetMenuDialog gyms={gyms} />;
}
