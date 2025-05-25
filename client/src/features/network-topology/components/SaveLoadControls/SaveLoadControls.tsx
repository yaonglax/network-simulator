import React from 'react';
import Button from '@mui/material/Button';
import { useNetworkStore, NetworkTopology } from '../../store/network-store';
import { fileStorage } from '../../store/electronStorage';
import { purple } from '@mui/material/colors';
import { bgcolor } from '@mui/system';


export function SaveLoadControls() {
    const handleSave = async () => {
        try {
            const state = useNetworkStore.getState();
            const topology: NetworkTopology = {
                devices: state.devices,
                connections: state.connections,
                packets: state.packets
            };

            const filePath = await fileStorage.saveNetworkState(topology);
            console.log('Топология сохранена:', filePath);
            alert(`Топология успешно сохранена в файл:\n${filePath}`);
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            if (error instanceof Error) {
                alert(`Ошибка при сохранении: ${error.message}`);
            } else {
                alert('Произошла неизвестная ошибка при сохранении');
            }
        }
    };

    const handleLoad = async () => {
        try {
            // 1. Сначала сбрасываем фокус
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }

            // 2. Загружаем данные
            const { devices, connections } = await fileStorage.loadNetworkState();

            // 3. Очищаем состояние
            useNetworkStore.setState({ devices: {}, connections: [], packets: {} });

            // 4. Даем время на рендер
            await new Promise(resolve => setTimeout(resolve, 100));

            // 5. Устанавливаем новые данные
            useNetworkStore.setState({ devices, connections });

            // 6. Форсируем фокус через Electron
            window.electronAPI?.focus?.forceFocus();

            // 7. Дополнительные хаки для Windows
            if (navigator.platform.includes('Win')) {
                setTimeout(() => {
                    // Создаем временный элемент для фокуса
                    const tempInput = document.createElement('input');
                    tempInput.style.position = 'absolute';
                    tempInput.style.opacity = '0';
                    tempInput.style.height = '0';
                    tempInput.style.width = '0';
                    tempInput.style.pointerEvents = 'none';
                    document.body.appendChild(tempInput);
                    tempInput.focus();

                    setTimeout(() => {
                        document.body.removeChild(tempInput);
                        // Фокусируем реальный элемент
                        const firstInput = document.querySelector('input');
                        firstInput?.focus();
                    }, 50);
                }, 200);
            }

            alert(`Успешно загружено: ${Object.keys(devices).length} устройств`);
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            alert(`Ошибка загрузки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'row' }}>
            <Button
                variant="contained"
                onClick={handleSave}
                sx={{
                    backgroundColor: 'var(--detail-gray)',
                    color: 'var(--contrast-white)',
                    minWidth: '20px',
                    minHeight: '12px',
                    width: '210px',
                    height: '50px',
                    borderRadius: '0.5rem',
                    '&:hover': { bgcolor: 'var(--hover-purple)', border: '1px solid var(--highlight-purple)', boxShadow: '0px 0px 1px var(--highlight-purple)' },
                }}
            >
                Сохранить топологию
            </Button>
            <Button
                onClick={handleLoad}
                sx={{
                    backgroundColor: 'var(--detail-gray)',
                    color: 'var(--contrast-white)',
                    minWidth: '20px',
                    minHeight: '12px',
                    width: '210px',
                    height: '50px',
                    borderRadius: '0.5rem',
                    '&:hover': { bgcolor: 'var(--hover-purple)', border: '1px solid var(--highlight-purple)', boxShadow: '0px 0px 1px var(--highlight-purple)' },
                }}
            >
                Загрузить топологию
            </Button>
        </div>
    );
}