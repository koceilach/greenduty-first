import { Suspense } from "react";
import { ReelsFeed } from "@/components/edu/ReelsFeed";

export const metadata = {
  title: "Education Reels - GreenDuty",
  description: "Short-form eco learning reels powered by GreenDuty.",
};

function ReelsPageFallback() {
  return (
    <div className="grid h-[100dvh] place-items-center bg-slate-950 text-white">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur">
        Loading reels...
      </div>
    </div>
  );
}

export default function EducationReelsPage() {
  return (
    <Suspense fallback={<ReelsPageFallback />}>
      <ReelsFeed />
    </Suspense>
  );
}
