/**
 * Performance monitoring utilities
 * Use to track and improve app performance
 */

export const performanceMonitor = {
  // Track page load time
  logPageLoad: () => {
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const connectTime = perfData.responseEnd - perfData.requestStart;
        const renderTime = perfData.domComplete - perfData.domLoading;
        
        console.log('Performance Metrics:', {
          pageLoadTime: `${pageLoadTime}ms`,
          connectTime: `${connectTime}ms`,
          renderTime: `${renderTime}ms`,
        });
      });
    }
  },

  // Measure component render time
  measureRender: (componentName: string, callback: () => void) => {
    const start = performance.now();
    callback();
    const end = performance.now();
    console.log(`${componentName} rendered in ${(end - start).toFixed(2)}ms`);
  },

  // Report Web Vitals (simplified)
  reportWebVitals: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          console.log('FID:', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift (CLS)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        });
        console.log('CLS:', clsScore);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    }
  },
};

// Initialize performance monitoring in development
if (import.meta.env.DEV) {
  performanceMonitor.logPageLoad();
  performanceMonitor.reportWebVitals();
}
