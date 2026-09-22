import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";

export default function CalendarPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pt-8 sm:pt-10">
        <CalendarPageClient />
      </main>
      <Footer />
    </div>
  );
}
