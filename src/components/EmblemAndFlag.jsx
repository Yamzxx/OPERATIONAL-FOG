import emblemImg from '../assets/emblem_of_india.png';

/**
 * Official State Emblem of India (Lion Capital of Ashoka)
 */
export const NationalEmblem = ({ height = 60, className = "", style = {} }) => {
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <img 
      src={emblemImg || '/assets/emblem_of_india.png'} 
      alt="State Emblem of India" 
      height={typeof height === 'number' ? height : undefined}
      className={`gov-emblem-svg ${className}`}
      style={{ 
        height: heightStyle, 
        width: 'auto', 
        objectFit: 'contain', 
        display: 'inline-block',
        flexShrink: 0,
        ...style 
      }}
      loading="eager"
    />
  );
};

/**
 * Official Indian National Flag (Tiranga) SVG
 * Standard official ratio 3:2 with 24-spoke Ashoka Chakra
 */
export const IndianFlag = ({ width = 36, height = 24, className = "", style = {} }) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 300 200" 
    className={`gov-flag-svg ${className}`}
    style={{ 
      border: '1px solid rgba(0,0,0,0.18)', 
      borderRadius: '1px', 
      flexShrink: 0, 
      display: 'inline-block',
      ...style 
    }}
    aria-label="Indian National Flag"
  >
    {/* Saffron Top Band */}
    <rect width="300" height="66.67" fill="#FF9933" />
    {/* White Middle Band */}
    <rect y="66.67" width="300" height="66.67" fill="#FFFFFF" />
    {/* Green Bottom Band */}
    <rect y="133.33" width="300" height="66.67" fill="#128807" />
    {/* 24-Spoke Ashoka Chakra */}
    <g transform="translate(150, 100)">
      <circle r="23" fill="none" stroke="#000080" strokeWidth="3" />
      <circle r="3.5" fill="#000080" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="0"
          y1="0"
          x2="0"
          y2="-23"
          stroke="#000080"
          strokeWidth="1.8"
          transform={`rotate(${i * 15})`}
        />
      ))}
    </g>
  </svg>
);

