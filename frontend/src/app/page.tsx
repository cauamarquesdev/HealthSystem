import AgendaCalendar from "../components/AgendaCalendar";
import { Search, Bell, Plus } from "lucide-react";

export default function Home() {
  return (
    <div className="h-full p-10 flex flex-col gap-10">
      {/* ÁREA DA AGENDA */}
      <div className="flex-1 bg-white rounded-3xl border border-zinc-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
        <AgendaCalendar />
      </div>
    </div>
  );
}
