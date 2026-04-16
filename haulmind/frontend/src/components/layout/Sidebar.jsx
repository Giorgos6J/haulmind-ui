import { NavLink } from "react-router";

const links = [
  { to: "/", label: "Dashboard", description: "Overview & forecast" },
  { to: "/vehicles", label: "Vehicles", description: "Fleet assets" },
  { to: "/trips", label: "Trips", description: "Bookings & prediction flow" },
  { to: "/deleted", label: "Deleted Items", description: "Restore records" },
  { to: "/analytics", label: "Analytics", description: "Accuracy & trends" },
];

function BrainMark() {
  return (
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[radial-gradient(circle_at_30%_30%,#A78BFA_0%,#7C3AED_45%,#5B21B6_100%)] shadow-[0_10px_24px_rgba(124,58,237,0.28)]">
      <svg
        viewBox="0 0 64 64"
        className="h-7 w-7"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M24 14C18.477 14 14 18.477 14 24C14 26.533 14.942 28.846 16.495 30.607C14.942 32.368 14 34.681 14 37.214C14 42.737 18.477 47.214 24 47.214H26.5V14H24Z"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M40 14H37.5V47.214H40C45.523 47.214 50 42.737 50 37.214C50 34.681 49.058 32.368 47.505 30.607C49.058 28.846 50 26.533 50 24C50 18.477 45.523 14 40 14Z"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M26.5 20C23.5 20 22 22 22 24.5C22 27 23.5 29 26.5 29"
          stroke="#7C3AED"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M37.5 20C40.5 20 42 22 42 24.5C42 27 40.5 29 37.5 29"
          stroke="#7C3AED"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M26.5 35C23.5 35 22 37 22 39.5C22 42 23.5 44 26.5 44"
          stroke="#7C3AED"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M37.5 35C40.5 35 42 37 42 39.5C42 42 40.5 44 37.5 44"
          stroke="#7C3AED"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M32 14V50"
          stroke="#7C3AED"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[292px] shrink-0 border-r border-[#E7EAF3] bg-white xl:flex xl:flex-col">
      <div className="border-b border-[#EEF1F7] px-6 py-6">
        <div className="flex items-center gap-3">
          <BrainMark />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#1D2433]">
              HaulMind
            </h1>
            <p className="mt-1 text-sm text-[#667085]">
              Logistics intelligence workspace
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              [
                "group block rounded-2xl border px-4 py-3.5 transition-all duration-200",
                isActive
                  ? "border-[#D8D2FF] bg-[#F5F3FF] shadow-sm"
                  : "border-transparent bg-transparent hover:border-[#ECE8FF] hover:bg-[#FAF9FF]",
              ].join(" ")
            }
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-[#1D2433]">{link.label}</div>
                <div className="mt-1 text-xs text-[#667085]">{link.description}</div>
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-[#D9D6FE] opacity-0 transition group-[.active]:opacity-100" />
            </div>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#EEF1F7] p-5">
        <div className="rounded-3xl border border-[#E7E3F8] bg-gradient-to-br from-[#F7F5FF] via-white to-[#FBFAFF] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8E77ED]">
              Prototype
            </p>
            <span className="rounded-full bg-[#6D5EF5] px-2.5 py-1 text-[11px] font-semibold text-white">
              v2
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-[#1D2433]">
            Fuel forecasting now live
          </p>
          <p className="mt-1 text-xs leading-5 text-[#667085]">
            Date-based diesel prediction and cost estimation are active in the backend.
          </p>
        </div>
      </div>
    </aside>
  );
}