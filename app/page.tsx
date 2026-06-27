import { BookingProvider } from "@/components/booking/BookingContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CallWidget } from "@/components/widgets/CallWidget";
import { Hero } from "@/components/hero/Hero";
import { Leistungen } from "@/components/sections/Leistungen";
import { Prozess } from "@/components/sections/Prozess";
import { Materialien } from "@/components/sections/Materialien";
import { Fakten } from "@/components/sections/Fakten";
import { Service } from "@/components/sections/Service";
import { UeberUns } from "@/components/sections/UeberUns";
import { Kontakt } from "@/components/sections/Kontakt";

export default function Home() {
  return (
    <BookingProvider>
      <span id="top" />
      <Navbar />
      <main>
        <Hero />
        <Leistungen />
        <Prozess />
        <Materialien />
        <Fakten />
        <Service />
        <UeberUns />
        <Kontakt />
      </main>
      <Footer />
      <CallWidget />
    </BookingProvider>
  );
}
