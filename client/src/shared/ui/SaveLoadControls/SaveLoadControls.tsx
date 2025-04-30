import React from 'react';
import Button from '@mui/material/Button';
import { useNetworkStore } from '../../../features/network-topology/store/network-store';
import { fileStorage } from '../../../features/network-topology/store/electronStorage';

export function SaveLoadControls() {
    const handleSave = async () => {
        try {
            const state = useNetworkStore.getState();
            const snapshot = {
                devices: state.devices,
                connections: state.connections
            };

            const filePath = await fileStorage.saveNetworkState(snapshot);
            console.log('Топология сохранена:', filePath);
            alert(`Топология успешно сохранена в файл:\n${filePath}`);
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка при сохранении топологии');
        }
    };

    const handleLoad = async () => {
        try {
            const data = await fileStorage.loadNetworkState();
            if (!data) return;

            // Валидация загруженных данных
            if (!data.devices || !data.connections) {
                throw new Error('Файл не содержит валидных данных топологии');
            }

            useNetworkStore.setState({
                devices: data.devices || {},
                connections: data.connections || []
            });

            console.log('Топология загружена:', data);
            alert('Топология успешно загружена');
        } catch (error: any) {
            console.error('Ошибка загрузки:', error);
            alert(`Ошибка при загрузке топологии:\n${error.message}`);
        }
    };

    return (
        <div style={{ margin: '16px 0', display: 'flex', gap: '8px' }}>
            <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
            >
                Сохранить топологию
            </Button>
            <Button
                variant="outlined"
                color="primary"
                onClick={handleLoad}
            >
                Загрузить топологию
            </Button>
        </div>
    );
}