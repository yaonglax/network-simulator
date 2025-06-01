import React from 'react';
import Button from '@mui/material/Button';
import { useNetworkStore, NetworkTopology } from '../../store/network-store';
import { fileStorage } from '../../store/electronStorage';
import { purple } from '@mui/material/colors';
import { bgcolor } from '@mui/system';


export const handleSave = async () => {
    try {
        const state = useNetworkStore.getState();
        const topology: NetworkTopology = {
            devices: state.devices,
            connections: state.connections,
            packets: state.packets,
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

export const handleLoad = async () => {
    try {

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        const { devices, connections } = await fileStorage.loadNetworkState();
        useNetworkStore.setState({ devices: {}, connections: [], packets: {} });
        await new Promise(resolve => setTimeout(resolve, 100));
        useNetworkStore.setState({ devices, connections });
        window.electronAPI?.focus?.forceFocus();
        if (navigator.platform.includes('Win')) {
            setTimeout(() => {
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

export function SaveLoadControls() {
    return (
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'row' }} className='save-load-controls-root'>
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