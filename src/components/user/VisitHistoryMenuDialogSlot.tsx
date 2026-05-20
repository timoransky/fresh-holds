import { getActiveGymsWithSections } from "@/lib/db/gyms";
import { VisitHistoryDialog } from "@/components/VisitHistoryDialog";

type Props = {
  authed: boolean;
};

export async function VisitHistoryMenuDialogSlot({ authed }: Props) {
  const gyms = await getActiveGymsWithSections();
  const gymNames: Record<string, string> = {};
  for (const gym of gyms) {
    gymNames[gym.slug] = gym.name;
  }
  return <VisitHistoryDialog gymNames={gymNames} authed={authed} />;
}
