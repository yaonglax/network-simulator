import React, { useEffect } from "react";
import { useNetworkStore } from '../store/network-store'
import { Snackbar, Alert } from "@mui/material";

const AUTO_HIDE_DURATION = 4000;

export const FloodNotification = () => {
    const notifications = useNetworkStore((s) => s.notifications);
    const removeNotification = useNetworkStore((s) => s.removeNotification);

    const latest = notifications[0];

    useEffect(() => {
        if (latest) {
            const timer = setTimeout(() => {
                removeNotification(latest.id);
            }, AUTO_HIDE_DURATION);
            return () => clearTimeout(timer);
        }
    }, [latest, removeNotification]);
    return (
        <Snackbar
            open={!!latest}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
            <Alert
                severity="success"
                variant="filled"
                onClose={() => latest && removeNotification(latest.id)}
                sx={{ minWidth: 300, zIndex: 4000 }}
            >
                {latest?.message}
            </Alert>
        </Snackbar>
    );
};

export default FloodNotification;