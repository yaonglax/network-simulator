import { TypeAnimation } from 'react-type-animation';
import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import { useEffect, useRef } from 'react';
import '../../styles/main.css';

const WelcomePage = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 4; // Сдвигаем начальный квадрат влево
        const centerY = canvas.height / 2;
        const squareSize = 20; // Размер квадрата
        const segmentLength = 30; // Длина сегмента ломаной линии
        const maxSegments = 10; // Количество сегментов до появления второго квадрата
        let phase = 'blink1'; // Фазы: 'blink1' (первый квадрат мигает), 'drawLine' (рисуем линию), 'blink2' (оба квадрата мигают), 'done' (конец)
        let blinkTime = 0; // Время для мигания
        let segments = []; // Массив точек ломаной линии
        let currentSegment = 0; // Текущий сегмент
        let currentX = centerX; // Текущая позиция конца линии
        let currentY = centerY;
        let direction = 0; // Направление: 0 (вправо), 1 (вниз), 2 (влево), 3 (вверх)

        // Инициализируем начальную точку линии
        segments.push({ x: centerX, y: centerY });

        // Рисуем квадрат
        const drawSquare = (x, y, alpha) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x - squareSize / 2, y - squareSize / 2, squareSize, squareSize);
            ctx.restore();
        };

        // Рисуем ломаную линию
        const drawLine = () => {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            for (let i = 0; i < segments.length - 1; i++) {
                ctx.moveTo(segments[i].x, segments[i].y);
                ctx.lineTo(segments[i + 1].x, segments[i + 1].y);
            }
            ctx.stroke();
        };

        // Генерируем следующую точку линии
        const addSegment = () => {
            // Выбираем случайное направление (0: вправо, 1: вниз, 2: влево, 3: вверх)
            const directions = [0, 1, 2, 3].filter(d => Math.abs(d - direction) !== 2); // Исключаем противоположное направление
            direction = directions[Math.floor(Math.random() * directions.length)];
            let newX = currentX;
            let newY = currentY;

            if (direction === 0) newX += segmentLength; // Вправо
            else if (direction === 1) newY += segmentLength; // Вниз
            else if (direction === 2) newX -= segmentLength; // Влево
            else if (direction === 3) newY -= segmentLength; // Вверх

            segments.push({ x: newX, y: newY });
            currentX = newX;
            currentY = newY;
            currentSegment++;
        };

        // Анимация
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            blinkTime += 0.1;

            if (phase === 'blink1') {
                // Первый квадрат мигает
                const alpha = 0.5 + 0.5 * Math.sin(blinkTime); // Прозрачность от 0.5 до 1
                drawSquare(centerX, centerY, alpha);
                if (blinkTime > 6) { // Мигаем ~2 секунды (6 радиан)
                    phase = 'drawLine';
                    blinkTime = 0;
                }
            } else if (phase === 'drawLine') {
                // Рисуем первый квадрат (без мигания) и линию
                drawSquare(centerX, centerY, 1);
                if (currentSegment < maxSegments) {
                    if (blinkTime > 0.5) { // Добавляем сегмент каждые ~0.5 секунды
                        addSegment();
                        blinkTime = 0;
                    }
                } else {
                    phase = 'blink2';
                    blinkTime = 0;
                }
                drawLine();
            } else if (phase === 'blink2') {
                // Оба квадрата мигают
                const alpha = 0.5 + 0.5 * Math.sin(blinkTime); // Прозрачность от 0.5 до 1
                drawSquare(centerX, centerY, alpha);
                drawSquare(currentX, currentY, alpha);
                drawLine();
                if (blinkTime > 6) { // Мигаем ~2 секунды
                    phase = 'done';
                }
            } else if (phase === 'done') {
                // Анимация завершена, ничего не рисуем
                return;
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
                <Link to={'/editor'} style={{ textDecoration: 'none' }}>
                    <Button className='welcomepage__wrapper-btn'>
                        Начать
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default WelcomePage;