import React from 'react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange }) => {
    return (
        <textarea
            className="w-full min-h-[200px] p-4 bg-transparent outline-none resize-y"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer here..."
        />
    );
};

export default RichTextEditor;
