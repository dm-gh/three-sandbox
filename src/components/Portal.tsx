import React, { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const Portal: React.FC<{ id: string }> = memo(({ id, children }) => {
    const el = useRef(document.getElementById(id) || document.createElement('div'));
    const [dynamic] = useState(!el.current.parentElement);

    useEffect(() => {
        const elCurrent = el.current;

        if (dynamic) {
            elCurrent.id = id;
            document.body.appendChild(elCurrent);
        }

        return () => {
            if (dynamic && elCurrent.parentElement) {
                elCurrent.parentElement.removeChild(elCurrent);
            }
        };
    }, [dynamic, id]);

    return createPortal(children, el.current);
});
