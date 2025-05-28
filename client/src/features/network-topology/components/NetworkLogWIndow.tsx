import React, { createContext, useContext, useState, ReactNode } from "react";

// Тип лог-сообщения
export interface NetworkLogEntry {
    timestamp: number;
    type: string;
    message: string;
    details?: any;
}

// Контекст и провайдер
const NetworkLoggerContext = createContext<{
    logs: NetworkLogEntry[];
    addLog: (entry: Omit<NetworkLogEntry, "timestamp">) => void;
    clearLogs: () => void;
} | null>(null);

export const NetworkLoggerProvider = ({ children }: { children: ReactNode }) => {
    const [logs, setLogs] = useState<NetworkLogEntry[]>([]);

    const addLog = (entry: Omit<NetworkLogEntry, "timestamp">) => {
        setLogs((prev) => [
            ...prev,
            { ...entry, timestamp: Date.now() }
        ]);
    };

    const clearLogs = () => setLogs([]);

    return (
        <NetworkLoggerContext.Provider value={{ logs, addLog, clearLogs }}>
            {children}
        </NetworkLoggerContext.Provider>
    );
};

export const useNetworkLogger = () => {
    const ctx = useContext(NetworkLoggerContext);
    if (!ctx) throw new Error("useNetworkLogger must be used within NetworkLoggerProvider");
    return ctx;
};

// Компонент окна логов
import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export const NetworkLogWindow: React.FC<{
    open: boolean;
    onClose: () => void;
}> = ({ open, onClose }) => {
    const { logs, clearLogs } = useNetworkLogger();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
            sx: {
                background: "var(--bg-dark-gray)",
                color: "var(--text-gray)",
                borderRadius: 3,
            }
        }}>
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                Логи симуляции
                <IconButton onClick={onClose} size="small" sx={{ color: "var(--text-gray)" }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ maxHeight: 500, overflowY: "auto" }}>
                <Box>
                    {logs.length === 0 && (
                        <Typography color="text.secondary">Нет логов</Typography>
                    )}
                    {logs.map((log, idx) => (
                        <Box key={idx} sx={{ mb: 1, p: 1, borderRadius: 1, bgcolor: "var(--element-gray)" }}>
                            <Typography variant="caption" sx={{ color: "var(--highlight-purple)", mr: 1 }}>
                                [{new Date(log.timestamp).toLocaleTimeString()}]
                            </Typography>
                            <Typography component="span" sx={{ fontWeight: 600, mr: 1 }}>
                                {log.type}
                            </Typography>
                            <Typography component="span">{log.message}</Typography>
                            {log.details && (
                                <pre style={{ fontSize: 12, margin: 0, color: "#aaa" }}>
                                    {typeof log.details === "string"
                                        ? log.details
                                        : JSON.stringify(log.details, null, 2)}
                                </pre>
                            )}
                        </Box>
                    ))}
                </Box>
            </DialogContent>
            <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
                <Button onClick={clearLogs} sx={{ color: "var(--highlight-purple)" }}>Очистить</Button>
            </Box>
        </Dialog>
    );
};