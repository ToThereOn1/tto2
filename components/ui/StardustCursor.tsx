'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    life: number;
    maxLife: number;
    color: string;
}

export function StardustCursor() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);
    const mouse = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current = { x: e.clientX, y: e.clientY };
            createParticles(2); // Create fewer particles per move for subtlety
        };

        window.addEventListener('mousemove', handleMouseMove);

        function createParticles(count: number) {
            for (let i = 0; i < count; i++) {
                const size = Math.random() * 2 + 0.5; // Tiny particles
                const color = Math.random() > 0.5 ? 'rgba(147, 197, 253, ' : 'rgba(167, 139, 250, '; // blue-300 or purple-400
                const opacity = Math.random() * 0.5 + 0.2;

                particles.current.push({
                    x: mouse.current.x + (Math.random() - 0.5) * 20,
                    y: mouse.current.y + (Math.random() - 0.5) * 20,
                    size,
                    speedX: (Math.random() - 0.5) * 0.5, // Slow drift
                    speedY: (Math.random() - 0.5) * 0.5,
                    life: 0,
                    maxLife: Math.random() * 50 + 50, // Longer life but slow fade
                    color: color + opacity + ')'
                });
            }
        }

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particles.current.length; i++) {
                const p = particles.current[i];
                p.life++;

                // Gentle movement
                p.x += p.speedX;
                p.y += p.speedY;

                // Mouse attraction/repulsion (subtle)
                const dx = mouse.current.x - p.x;
                const dy = mouse.current.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    const force = (100 - distance) / 1000; // Very weak force
                    p.x -= dx * force;
                    p.y -= dy * force;
                }

                const opacity = 1 - (p.life / p.maxLife);
                const currentColor = p.color.replace(/, [\d.]+\)$/, `, ${opacity})`);

                ctx.fillStyle = currentColor;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                if (p.life >= p.maxLife) {
                    particles.current.splice(i, 1);
                    i--;
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[1]" // z-1 to sit above background but below content
            style={{ mixBlendMode: 'normal' }} // Normal blend for visibility on white
        />
    );
}
