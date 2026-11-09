"use client";

import AgendaCalendar from "../components/AgendaCalendar";

export default function Home() {
  // A AgendaCalendar já possui o AppShell e o layout de tela cheia, 
  // então basta retorná-la diretamente sem nenhum wrapper de padding (p-10).
  return <AgendaCalendar />;
}