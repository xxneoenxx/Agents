import { CallbackProvider } from "@/components/callback/CallbackProvider";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Applications } from "@/components/Applications";
import { LayerExplainer } from "@/components/LayerExplainer";
import { Products } from "@/components/Products";
import { CallbackCTA } from "@/components/CallbackCTA";
import { About } from "@/components/About";
import { LocationMap } from "@/components/LocationMap";
import { Footer } from "@/components/Footer";
import { FloatingActions } from "@/components/FloatingActions";

export default function HomePage() {
  return (
    <CallbackProvider>
      <Navbar />
      <main>
        <Hero />
        <Applications />
        <LayerExplainer />
        <Products />
        <CallbackCTA />
        <About />
        <LocationMap />
      </main>
      <Footer />
      <FloatingActions />
    </CallbackProvider>
  );
}
