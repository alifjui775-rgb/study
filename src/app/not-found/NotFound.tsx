import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-16 text-center">
      {/* Lottie Animation */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto">
        <DotLottieReact
          src="/404-animation.lottie"
          loop
          autoplay
          style={{ width: "100%", height: "auto" }}
        />
      </div>

      {/* Heading */}
      <h1 className="mt-6 text-6xl font-extrabold tracking-tight text-primary">404</h1>
      <h2 className="mt-2 text-2xl font-semibold text-foreground">Page Not Found</h2>
      <p className="mt-3 max-w-md text-muted-foreground text-base leading-relaxed">
        Oops! The page you're looking for doesn't exist or has been moved. Let's get you back on
        track.
      </p>

      {/* Go Back Button */}
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:opacity-90 hover:scale-105 hover:shadow-lg active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Go Back to Home
      </Link>
    </div>
  );
}
