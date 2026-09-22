import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { PublicCourses } from "@/components/landing/PublicCourses";
import SimplePageHeader from "@/components/common/SimplePageHeader";

export default function CoursePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Header />
      <main className="grow flex flex-col pt-8 sm:pt-12">
        <SimplePageHeader
          title="আমাদের সকল কোর্স"
          description="আপনার প্রয়োজনীয় কোর্সটি বেছে নিন এবং আপনার প্রস্তুতি শুরু করুন"
        />

        <div>
          <PublicCourses hideHeader={true} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
