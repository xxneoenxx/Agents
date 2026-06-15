import { BookingProvider } from "@/components/booking/BookingProvider";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { NowPlaying } from "@/components/NowPlaying";
import { Experience } from "@/components/Experience";
import { Events } from "@/components/Events";
import { LocationMap } from "@/components/LocationMap";
import { Footer } from "@/components/Footer";
import { FloatingActions } from "@/components/FloatingActions";

export default function HomePage() {
  return (
    <BookingProvider>
      <Navbar />
      <main>
        <Hero />
        <NowPlaying />
        <Experience />
        <Events />
        <LocationMap />
      </main>
      <Footer />
      <FloatingActions />
    </BookingProvider>
  );
}
