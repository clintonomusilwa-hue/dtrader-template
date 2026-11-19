import React from 'react';
import { observer } from '@deriv/stores';

type TBrandLogoProps = {
    className?: string;
    width?: number | string;
    height?: number | string;
    is_mobile?: boolean;
};

const BrandLogo = observer(({ className, height = 34, is_mobile = false }: TBrandLogoProps) => {
    return (
        <div
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: is_mobile ? '6px' : '10px',
                height: typeof height === 'number' ? ${height}px : height,
                userSelect: 'none',
                cursor: 'pointer',
            }}
        >
            <svg
                width={is_mobile ? '28' : '34'}
                height={is_mobile ? '28' : '34'}
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://w3.org"
            >
                {/* Left interlocking D in vibrant Green (#10B981) */}
                <path
                    d="M8 10H24C35.0457 10 44 18.9543 44 30V34C44 45.0457 35.0457 54 24 54H8V10Z"
                    stroke="#10B981"
                    strokeWidth="5.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M16 19H23C29.6274 19 35 24.3726 35 31V33C35 39.6274 29.6274 45 23 45H16V19Z"
                    stroke="#10B981"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                />
                {/* Right interlocking P in crisp Red (#EF4444) */}
                <path
                    d="M27 16H43C51.2843 16 58 22.7157 58 31C58 39.2843 51.2843 46 43 46H34V58H27V16Z"
                    stroke="#EF4444"
                    strokeWidth="5.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M34 24H42C45.866 24 49 27.134 49 31C49 34.866 45.866 38 42 38H34V24Z"
                    fill="#EF4444"
                    fillOpacity="0.25"
                />
            </svg>
            <span
                style={{
                    fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
                    fontWeight: 800,
                    fontSize: is_mobile ? '16px' : '20px',
                    letterSpacing: '-0.4px',
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                }}
            >
                <span style={{ color: '#10B981' }}>DPtraders</span>
                <span style={{ color: '#EF4444' }}>hub</span>
            </span>
        </div>
    );
});

BrandLogo.displayName = 'BrandLogo';

export default BrandLogo;
