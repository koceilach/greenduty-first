import { getHomeFeed } from "@/app/education/actions/social-engine";
import { MobileBottomNav } from "@/components/edu/MobileBottomNav";
import { EduNavbar } from "@/components/edu/Navbar";
import { EduSidebar } from "@/components/edu/Sidebar";
import { Feed } from "@/components/edu/social/Feed";

export const metadata = {
  title: "Education - Green Duty EDU",
  description:
    "AI-verified agronomy, climate, soil, and water knowledge feed powered by Green Duty.",
};

export default async function EducationPage() {
  const initialPage = await getHomeFeed(1);

  return (
    <div className="gd-edu min-h-screen bg-slate-50 text-slate-900">
      <EduNavbar />
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-4 px-3 pb-[calc(6.8rem+env(safe-area-inset-bottom,0px))] pt-4 sm:gap-5 sm:px-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:pb-8 lg:pt-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <EduSidebar side="left" />
        <Feed initialPage={initialPage} />
        <EduSidebar side="right" />
      </div>
      <MobileBottomNav />
    </div>
  );
}
