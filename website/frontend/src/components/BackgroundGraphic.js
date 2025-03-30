import React from 'react';

const BackgroundGraphic = () => {
    return (
        <div className="bg-gradient">
            <svg width="100%" height="100%" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, left: 0, zIndex: -2, opacity: 0.07 }}>
                {/* Grid lines */}
                <g stroke="#8547ff" strokeWidth="0.5" strokeOpacity="0.2">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <line key={`h-${i}`} x1="0" y1={i * 40} x2="1440" y2={i * 40} />
                    ))}
                    {Array.from({ length: 36 }).map((_, i) => (
                        <line key={`v-${i}`} x1={i * 40} y1="0" x2={i * 40} y2="800" />
                    ))}
                </g>

                {/* Stylized stock chart pattern */}
                <path
                    d="M0,400 Q180,350 360,430 T720,380 T1080,420 T1440,380"
                    stroke="#00c805"
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    fill="none"
                />
                <path
                    d="M0,420 Q180,500 360,450 T720,500 T1080,430 T1440,470"
                    stroke="#ff5252"
                    strokeWidth="2"
                    strokeOpacity="0.5"
                    fill="none"
                />
            </svg>
        </div>
    );
};

export default BackgroundGraphic;