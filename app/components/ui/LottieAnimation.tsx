'use client';

import Lottie from 'lottie-react';

interface LottieAnimationProps {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function LottieAnimation({ 
  animationData, 
  loop = true, 
  autoplay = true, 
  className = '',
  width,
  height
}: LottieAnimationProps) {
  return (
    <div className={className} style={{ width, height }}>
      <Lottie 
        animationData={animationData} 
        loop={loop} 
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
