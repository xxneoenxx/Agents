import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Highlights } from "@/components/Highlights";
import { Menu } from "@/components/Menu";
import { OpeningHours } from "@/components/OpeningHours";
import { Reservation } from "@/components/Reservation";
import { LocationMap } from "@/components/LocationMap";
import { Footer } from "@/components/Footer";
import { FloatingActions } from "@/components/FloatingActions";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Highlights />
        <Menu />
        <OpeningHours />
        <Reservation />
        <LocationMap />
      </main>
      <Footer />
      <FloatingActions />
    </>
  );
}
