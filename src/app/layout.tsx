import type { Metadata, Viewport } from "next";
import { Archivo_Narrow, Instrument_Sans } from "next/font/google";
import { StoreProvider } from "@/components/StoreProvider";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { TryOnHost } from "@/components/TryOnHost";
import { Toast } from "@/components/Toast";
import "./globals.css";

const display = Archivo_Narrow({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700"], style: ["normal", "italic"] });
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Thira · Try it on before you buy",
  description: "Demo clothing store with a live AR fitting room, built by Fyntrictech IT Solutions.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <StoreProvider>
          <Header />
          <main>{children}</main>
          <footer className="site-footer">
            <p>
              Demo store built by <strong>Fyntrictech IT Solutions</strong>, Calicut. Thira is a fictional label;
              products and prices are samples.
            </p>
            <p className="muted small">
              The fitting room runs in the browser with Google MediaPipe body tracking. No app install, and no images leave the device.
            </p>
          </footer>
          <CartDrawer />
          <TryOnHost />
          <Toast />
        </StoreProvider>
      </body>
    </html>
  );
}
