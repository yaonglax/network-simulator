import { TypeAnimation } from 'react-type-animation';
import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import React, { useEffect, useRef } from 'react';


const WelcomePage = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const squareSize = 10;
        const segmentLength = 50;
        const maxSegments = 15;
        const groupCount = 3;
        const linesPerGroup = 3;
        const highlightPurple = getComputedStyle(document.documentElement).getPropertyValue('--accent-purple').trim();

        const lines = [];
        let time = 0;

        // Инициализируем группы линий
        for (let g = 0; g < groupCount; g++) {
            const startX = Math.random() * width;
            const startY = Math.random() * height;
            for (let i = 0; i < linesPerGroup; i++) {
                lines.push({
                    segments: [{ x: startX, y: startY }],
                    currentX: startX,
                    currentY: startY,
                    currentSegment: 0,
                    direction: 0,
                    phase: 'blink1',
                    blinkTime: 0,
                    fadeTime: 0,
                });
            }
        }

        // Рисуем квадрат
        const drawSquare = (x, y, alpha) => {
            ctx.save();
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillStyle = highlightPurple;
            ctx.fillRect(x - squareSize / 2, y - squareSize / 2, squareSize, squareSize);
            ctx.restore();
        };

        // Рисуем ломаную линию с затуханием
        const drawLine = (segments, alpha) => {
            ctx.beginPath();
            ctx.strokeStyle = highlightPurple;
            ctx.lineWidth = 2;
            for (let i = 0; i < segments.length - 1; i++) {
                const segmentAlpha = alpha * (1 - i / segments.length) * 0.5;
                ctx.globalAlpha = segmentAlpha;
                ctx.moveTo(segments[i].x, segments[i].y);
                ctx.lineTo(segments[i + 1].x, segments[i + 1].y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        };

        // Генерируем следующий сегмент линии
        const addSegment = (line) => {
            const directions = [0, 1, 2, 3].filter(d => Math.abs(d - line.direction) !== 2);
            line.direction = directions[Math.floor(Math.random() * directions.length)];
            let newX = line.currentX;
            let newY = line.currentY;

            if (line.direction === 0) newX += segmentLength;
            else if (line.direction === 1) newY += segmentLength
            else if (line.direction === 2) newX -= segmentLength;
            else if (line.direction === 3) newY -= segmentLength;

            // Ограничиваем выход за пределы canvas
            newX = Math.max(squareSize, Math.min(width - squareSize, newX));
            newY = Math.max(squareSize, Math.min(height - squareSize, newY));

            line.segments.push({ x: newX, y: newY });
            line.currentX = newX;
            line.currentY = newY;
            line.currentSegment++;
        };

        // Анимация
        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            time += 0.1;

            lines.forEach((line) => {
                if (line.phase === 'done') return;

                line.blinkTime += 0.1;

                if (line.phase === 'blink1') {
                    const alpha = 0.3 + 0.6 * Math.sin(line.blinkTime * 4);
                    drawSquare(line.segments[0].x, line.segments[0].y, alpha);
                    if (line.blinkTime > 6) {
                        line.phase = 'drawLine';
                        line.blinkTime = 0;
                    }
                } else if (line.phase === 'drawLine') {
                    // Построение линии с начальным квадратом
                    drawSquare(line.segments[0].x, line.segments[0].y, 0.7);
                    if (line.currentSegment < maxSegments) {
                        if (line.blinkTime > 0.5) {
                            addSegment(line);
                            line.blinkTime = 0;
                        }
                    } else {
                        line.phase = 'fadeOut';
                        line.blinkTime = 0;
                        line.fadeTime = 0;
                    }
                    drawLine(line.segments, 0.5); // Базовая прозрачность линии
                } else if (line.phase === 'fadeOut') {
                    // Затухание линии и квадрата
                    line.fadeTime += 0.1;
                    const fadeAlpha = Math.max(0, 0.7 - line.fadeTime * 0.1); // Постепенное затухание от 0.7 до 0
                    if (fadeAlpha > 0) {
                        drawSquare(line.segments[0].x, line.segments[0].y, fadeAlpha);
                        drawLine(line.segments, fadeAlpha * 0.5); // Линия затухает быстрее
                    } else {
                        line.phase = 'done';
                    }
                }
            });

            // Перезапуск анимации, если все линии завершены
            if (lines.every(line => line.phase === 'done')) {
                lines.length = 0;
                for (let g = 0; g < groupCount; g++) {
                    const startX = Math.random() * width;
                    const startY = Math.random() * height;
                    for (let i = 0; i < linesPerGroup; i++) {
                        lines.push({
                            segments: [{ x: startX, y: startY }],
                            currentX: startX,
                            currentY: startY,
                            currentSegment: 0,
                            direction: 0,
                            phase: 'blink1',
                            blinkTime: 0,
                            fadeTime: 0,
                        });
                    }
                }
            }

            requestAnimationFrame(animate);
        };

        animate();
    }, []);

    return (
        <div className="welcomepage">
            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                style={{ position: 'absolute', left: 0, top: 0, zIndex: 1 }}
            />
            <div className="welcomepage__wrapper">
                <span className="welcomepage__wrapper-title">
                    <TypeAnimation
                        sequence={['Welcome', 1000, 'Welcome to the', 1000, 'Welcome', 1000, 'Welcome to the NetSim', 1000]}
                        wrapper="span"
                        cursor={true}
                        repeat={Infinity}
                    />
                </span>
                <span className="welcomepage__wrapper-subtitle">Придумай, смоделируй, реализуй</span>
                <Link to={'/theory'} style={{
                    textDecoration: 'none'
                }}>
                    <Button className='welcomepage__wrapper-btn'>
                        Начать
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default WelcomePage;