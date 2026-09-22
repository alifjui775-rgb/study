"use client";

import React from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/landing/Header";
import { GraphCalculator } from "@/components/graph/GraphCalculator";

export default function GraphPage() {
  return (
    <div className="relative h-screen bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
      <Helmet>
        <title>Interactive Graphing Calculator (2D & 3D) | MNR Study</title>
        <meta
          name="description"
          content="Interactive 2D & 3D graphing calculator powered by math.js and Three.js. Render equations live, adjust dynamic parameters, overlay derivatives, and explore 3D surfaces."
        />
      </Helmet>

      {/* Floating header overlay — pill centers over the stage (right of the 380px panel) */}
      <div className="absolute top-2 right-0 left-0 z-40 flex justify-center md:left-[380px]">
        <Header />
      </div>

      <main className="h-screen w-full p-0 m-0 overflow-hidden">
        <section
          id="graphing-calculator-container"
          className="h-full w-full overflow-hidden"
        >
          <GraphCalculator />
        </section>
      </main>
    </div>
  );
}
