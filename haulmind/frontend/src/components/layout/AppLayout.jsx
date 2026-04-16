import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#1D2433]">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 py-6 xl:px-8 xl:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
