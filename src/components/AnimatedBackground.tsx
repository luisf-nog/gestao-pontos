import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const scrollYRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const setupCanvas = () => {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;

      // Set the display size (css pixels)
      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';

      // Set the internal size (scaled for DPR)
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);

      // Reset transform and apply DPR scaling so we can draw using CSS pixels
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const initParticles = () => {
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;
      const density = 2000; // smaller = denser
      const particleCount = Math.floor((cssWidth * cssHeight) / density);
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      }));
    };

    const resizeCanvas = () => {
      setupCanvas();
      initParticles();
    };

    setupCanvas();
    initParticles();
    window.addEventListener('resize', resizeCanvas);

    // Track scroll for parallax
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    let running = true;

    const animate = () => {
      if (!ctx || !canvas || !running) return;

      // Clear the full canvas safely with DPR transforms
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Apply parallax offset
      const parallaxOffset = scrollYRef.current * 0.3;
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;

      particlesRef.current.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges (CSS pixel space)
        if (particle.x < 0) particle.x = cssWidth;
        if (particle.x > cssWidth) particle.x = 0;
        if (particle.y < 0) particle.y = cssHeight;
        if (particle.y > cssHeight) particle.y = 0;

        // Draw particle with parallax
        const yPos = particle.y - parallaxOffset;
        ctx.fillStyle = `rgba(148, 163, 184, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, yPos, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        particlesRef.current.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = (particle.y - parallaxOffset) - (otherParticle.y - parallaxOffset);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            const opacity = (1 - distance / 120) * 0.15;
            ctx.strokeStyle = `rgba(100, 116, 139, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y - parallaxOffset);
            ctx.lineTo(otherParticle.x, otherParticle.y - parallaxOffset);
            ctx.stroke();
          }
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      } else {
        running = true;
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    />
  );
};
