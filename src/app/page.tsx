import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Footer } from "@/components/landing/Footer";
import { HomeCourses } from "@/components/landing/HomeCourses";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Header />
      <main className="grow flex flex-col pt-2 sm:pt-6">
        <Hero />
        <HomeCourses />
      </main>
      <Footer />
    </div>
  );
}
