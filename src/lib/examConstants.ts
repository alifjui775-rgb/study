// Exam page constants to avoid magic numbers
export const QUESTIONS_PER_PAGE = 50;
export const QUESTIONS_PER_PAGE_MOBILE = 50;
export const RESULTS_PER_PAGE = 50;
export const MIN_SCORE = 0;

// Timer thresholds (in seconds)
export const CRITICAL_TIME_THRESHOLD = 60; // 1 minute
export const WARNING_TIME_THRESHOLD = 300; // 5 minutes

// CSS class names for consistent styling
export const TIMER_CLASSES = {
  critical:
    "bg-destructive text-destructive-foreground animate-pulse scale-110 shadow-lg shadow-destructive/50",
  warning:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 animate-pulse",
  normal: "bg-primary/10 text-primary border border-primary/20 backdrop-blur-md",
};

// Mobile breakpoints (in pixels)
export const BREAKPOINTS = {
  mobile: 640, // sm
  tablet: 768, // md
  desktop: 1024, // lg
  wide: 1280, // xl
};

// Touch target sizes (in pixels)
export const TOUCH_TARGETS = {
  small: 32, // minimum touch target
  normal: 44, // recommended touch target
  large: 56, // large touch target
};
