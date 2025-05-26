import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Box, CircularProgress } from '@mui/material';

interface TheoryMarkdownViewerProps {
    mdFile: string;
    anchor?: string;
}

const TheoryMarkdownViewer: React.FC<TheoryMarkdownViewerProps> = ({ mdFile, anchor }) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!mdFile) return;
        setLoading(true);
        setError(null);
        const url = `/theory/${mdFile}`;
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Файл не найден');
                return res.text();
            })
            .then(setContent)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [mdFile]);

    useEffect(() => {
        if (!anchor) return;
        // Ждём, пока DOM обновится
        setTimeout(() => {
            const el = document.getElementById(anchor);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }, [content, anchor]);

    if (loading) return <CircularProgress />;
    if (error) return <Box color="error.main">Ошибка: {error}</Box>;

    return (
        <Box sx={{ background: 'var(--bg-dark-gray)', borderRadius: 2, p: 2, boxShadow: 1, color: 'var(--text-gray)' }}>
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
        </Box>
    );
};

export default TheoryMarkdownViewer;