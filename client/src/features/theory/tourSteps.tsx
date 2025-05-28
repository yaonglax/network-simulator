import { Step } from 'react-joyride';

const tourSteps: Step[] = [
    {
        target: 'body',
        title: 'Добро пожаловать в тур!',
        content: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="./cat4.svg" alt="Маскот" style={{ width: '50px', marginRight: '15px' }} />
                <p>Давай познакомимся с интерфейсом! Нажми "Далее", чтобы начать.</p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '#theory-accordion',
        title: 'Список тем',
        content: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="./cat4.svg" alt="Маскот" style={{ width: '50px', marginRight: '15px' }} />
                <p>Здесь находится аккордеон с темами. Мы открыли раздел "Введение в компьютерные сети".</p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '#theory-md-viewer',
        title: 'Просмотр теории',
        content: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="./cat4.svg" alt="Маскот" style={{ width: '50px', marginRight: '15px' }} />
                <p>Это область, где отображается теория. Мы открыли первую тему.</p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '.navigation-arrows',
        title: 'Навигация по разделам',
        content: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="./cat4.svg" alt="Маскот" style={{ width: '50px', marginRight: '15px' }} />
                <p>Используй эти стрелки, чтобы переключаться между разделами теории.</p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '#mui-button-to-editor',
        title: 'Перейти к практике',
        content: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="/cat4.svg" alt="Маскот" style={{ width: '50px', marginRight: '15px' }} />
                <p>Нажми эту кнопку, чтобы перейти к редактору кода и начать практиковаться!</p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
];

export default tourSteps;