import { useEffect, useRef, useState } from 'react';

const BlinkingSquaresNetwork: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [squares, setSquares] = useState<{ x: number, y: number, size: number, color: string, alpha: number }[]>([]);
    const [lines, setLines] = useState<{ x1: number, y1: number, x2: number, y2: number }[]>([]);

    const getRandomPurple = () => {
        const shades = ['#9B5DE5', '#A450F4', '#C084FC', '#B388EB', '#D8B4FE'];
        return shades[Math.floor(Math.random() * shades.length)];
    };

    const generateRandomSquare = () => {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: 8 + Math.random() * 6,
            color: getRandomPurple(),
            alpha: 0.2 + Math.random() * 0.5,
        };
    };

    const repositionSquare = (square: { x: number, y: number, size: number, color: string, alpha: number }) => {
        square.x = Math.random() * window.innerWidth;
        square.y = Math.random() * window.innerHeight;
        square.size = 8 + Math.random() * 6;
        square.color = getRandomPurple();
        square.alpha = 0.2 + Math.random() * 0.5;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const squaresArray = Array.from({ length: 5 }, generateRandomSquare);
        setSquares(squaresArray);

        const updateSquares = () => {
            squaresArray.forEach(square => {
                square.alpha += (Math.random() - 0.5) * 0.1;
                square.alpha = Math.max(0, Math.min(1, square.alpha));

                if (square.alpha < 0.05) {
                    repositionSquare(square);
                    square.alpha = 0.2 + Math.random() * 0.5;
                }
            });

            const newLines: { x1: number, y1: number, x2: number, y2: number }[] = [];
            for (let i = 0; i < squaresArray.length; i++) {
                for (let j = i + 1; j < squaresArray.length; j++) {
                    newLines.push({
                        x1: squaresArray[i].x,
                        y1: squaresArray[i].y,
                        x2: squaresArray[j].x,
                        y2: squaresArray[j].y
                    });
                }
            }
            setLines(newLines);
            setSquares([...squaresArray]);
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Рисуем линии
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            lines.forEach(line => {
                ctx.moveTo(line.x1, line.y1);
                ctx.lineTo(line.x2, line.y2);
            });
            ctx.stroke();

            // Рисуем квадратики
            squares.forEach(square => {
                ctx.fillStyle = square.color;
                ctx.globalAlpha = square.alpha;
                ctx.fillRect(square.x - square.size / 2, square.y - square.size / 2, square.size, square.size);
            });
            ctx.globalAlpha = 1;

            requestAnimationFrame(draw);
        };

        const interval = setInterval(updateSquares, 1000);

        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            clearInterval(interval);
        };
    }, [squares, lines]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
            }}
        />
    );
};

export default BlinkingSquaresNetwork;
