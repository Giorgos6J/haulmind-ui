import { useLocation } from "react-router";

const pageTitles = {
  "/": {
    title: "Dashboard",
    subtitle: "Operational overview, diesel forecast, and live fleet highlights",
  },
  "/vehicles": {
    title: "Vehicles",
    subtitle: "Manage fleet assets, consumption baselines, and availability",
  },
  "/trips": {
    title: "Trips",
    subtitle: "Create bookings, run predictions, and review trip outcomes",
  },
  "/deleted": {
    title: "Deleted Items",
    subtitle: "Recover or permanently clear archived records",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Track prediction quality, comparisons, and operating trends",
  },
};

export default function Topbar() {
  const location = useLocation();
  const current =
    pageTitles[location.pathname] || {
      title: "HaulMind",
      subtitle: "Fleet operations workspace",
    };

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-20 border-b border-[#E7EAF3] bg-white/90 px-6 py-5 backdrop-blur xl:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-[#1D2433]">
            {current.title}
          </h2>
          <p className="mt-1 text-sm text-[#667085]">{current.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-[#E7E3F8] bg-[#FAF9FF] px-3.5 py-2 text-sm text-[#5B4CF0] shadow-sm">
            {formattedDate}
          </div>
          <div className="rounded-full border border-[#D1FADF] bg-[#ECFDF3] px-3.5 py-2 text-sm font-medium text-[#027A48]">
            System Online
          </div>
          <div className="rounded-full border border-[#E7EAF3] bg-white px-3.5 py-2 text-sm text-[#667085]">
            HaulMind v2 UI
          </div>
        </div>
      </div>
    </header>
  );
}
