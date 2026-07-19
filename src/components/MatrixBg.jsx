import { useEffect, useRef } from 'react';
import './MatrixBg.css';

const WORDS = ['SKILL ISSUE', 'L', 'GIT GUD', 'BRUH', 'NOOB', 'BOZO', 'SLOW', '💀'];

export default function MatrixBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const fontSize = 16;
    const columns = Math.floor(width / fontSize);
    
    // Y coordinate of each column
    const drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // start offscreen
    }

    function draw() {
      // Semi-transparent black to create trailing effect
      ctx.fillStyle = 'rgba(10, 10, 12, 0.08)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px var(--font-mono, monospace)`;
      
      for (let i = 0; i < drops.length; i++) {
        const text = WORDS[Math.floor(Math.random() * WORDS.length)];
        
        // Occasional pink glitch, mostly dark grey
        const isPink = Math.random() > 0.98;
        ctx.fillStyle = isPink ? 'rgba(255, 32, 121, 0.4)' : 'rgba(255, 255, 255, 0.06)';
        
        ctx.fillText(text, i * fontSize * 6, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 50);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="matrix-bg" />;
}
