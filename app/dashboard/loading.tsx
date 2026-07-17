// Renders inside the Studio shell (the dashboard layout stays mounted), so
// no theme bootstrap or full-viewport treatment is needed here.
import SegmentLoading from "@/app/_components/SegmentLoading";

export default function DashboardLoading() {
  return <SegmentLoading fullScreen={false} />;
}
