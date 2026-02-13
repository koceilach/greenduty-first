import { EduNavbar } from "@/components/edu/Navbar";
import { EduSidebar } from "@/components/edu/Sidebar";
import { EduFeedClient } from "@/components/edu/EduFeedClient";
import { MobileBottomNav } from "@/components/edu/MobileBottomNav";

export const metadata = {
  title: "Education — Green Duty EDU",
  description:
    "AI-verified agronomy, climate, soil, and water knowledge feed powered by Green Duty.",
};

export default function EducationPage() {
  return (
    <div className="min-h-screen bg-[#F6F8F7] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <EduNavbar />
      <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-8 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:px-8">
        <EduSidebar side="left" />
        <EduFeedClient />
        <EduSidebar side="right" />
      </div>
      {/* Extra bottom space for mobile nav */}
      <div className="h-20 lg:hidden" />
      <MobileBottomNav />
    </div>
  );
}
