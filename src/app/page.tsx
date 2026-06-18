import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Process } from "@/components/sections/Process";
import { WhyUs } from "@/components/sections/WhyUs";
import { Gallery } from "@/components/sections/Gallery";
import { Faq } from "@/components/sections/Faq";
import { BookingForm } from "@/components/sections/BookingForm";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";
import { StickyCallButton } from "@/components/ui/StickyCallButton";
import { CookieConsent } from "@/components/ui/CookieConsent";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services />
        <Process />
        <WhyUs />
        <Gallery />
        <Faq />
        <BookingForm />
        <Contact />
      </main>
      <Footer />
      <StickyCallButton />
      <CookieConsent />
    </>
  );
}
