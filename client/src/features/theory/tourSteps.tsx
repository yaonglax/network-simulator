import React from 'react';
import { Step } from 'react-joyride';

export const tourSteps: Step[] = [
    {
        target: 'body',
        title: 'Добро пожаловать!',
        content: (
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <img src="/cat4.svg" alt="Маскот" style={{ width: '140px', position: 'absolute', bottom: '75%', left: '-30%', rotate: '-15deg' }} />
                <span>Это обучающий тур по интерфейсу теории. Нажмите "Далее", чтобы начать!</span>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '#theory-accordion',
        title: 'Список тем',
        content: (
            <span>Здесь находится список с темами. Выберите интересующую тему для просмотра теории.</span>
        ),
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '#theory-md-viewer',
        title: 'Просмотр теории',
        content: (
            <span>В этой области отображается выбранная теория. Мы открыли первую тему автоматически.</span>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '#mui-button-to-editor',
        title: 'Перейти к практике',
        content: (
            <span>Нажмите эту кнопку, чтобы перейти к редактору топологий и начать практиковаться!</span>
        ),
        placement: 'top',
        disableBeacon: true,
    },

    {
        target: 'body',
        title: 'Добро пожаловать в редактор сети!',
        content: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="/cat4.svg" alt="Маскот" style={{ width: '50px', marginRight: '15px' }} />
                <span>Это визуальный редактор топологии сети. Давайте познакомимся с его возможностями!</span>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '.devices-panel-root',
        title: 'Панель устройств',
        content: (
            <span>
                Здесь находятся все доступные устройства. Перетащите нужное устройство на рабочее поле для добавления в топологию.
            </span>
        ),
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '#network-canvas',
        title: 'Рабочее поле',
        content: (
            <span>
                Это основное поле для построения вашей сети. Сюда можно перетаскивать устройства, соединять их и запускать симуляцию.
            </span>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '#start-simulation-btn',
        title: 'Кнопка запуска симуляции',
        content: (
            <span>
                После построения топологии нажмите эту кнопку, чтобы запустить симуляцию передачи пакетов.
            </span>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '#navbar',
        title: 'Панель управления',
        content: (
            <div>
                <p>Это панель управления с основными функциями:</p>
                <ul style={{ paddingLeft: '20px' }}>
                    <li><b>Вернуться к теории</b>: Перейти к разделу теории.</li>
                    <li><b>Загрузить файл</b>: Загрузить сохранённую топологию.</li>
                    <li><b>Сохранить файл</b>: Сохранить текущую топологию.</li>
                    <li><b>Очистить пакеты</b>: Удалить все пакеты из симуляции.</li>
                    <li><b>Очистить топологию</b>: Очистить текущую топологию.</li>
                    <li><b>Показать/Скрыть логи</b>: Отобразить или скрыть окно логов.</li>
                </ul>
            </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '#network-canvas',
        title: 'Соединение устройств и контекстное меню',
        content: (
            <div>
                <div style={{ marginBottom: 8 }}>
                    <b>Двойной клик</b> по устройству — активирует режим соединения устройств.
                </div>
                <div>
                    <b>Правая кнопка мыши</b> по устройству — открывает контекстное меню для управления портами и настройками.
                </div>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: 'body',
        title: 'Удачи!',
        content: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="/cat4.svg" alt="Маскот" style={{ width: '50px', marginRight: '15px' }} />
                <span>Желаем удачи в построении и исследовании компьютерных сетей!</span>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
];

export const GLOBAL_TOUR_KEY = 'globalTourState';