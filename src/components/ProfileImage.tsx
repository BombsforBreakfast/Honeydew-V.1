import React from 'react';

type ProfileImageProps = {
  imageUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export default function ProfileImage({ imageUrl, size = 'md', className = '' }: ProfileImageProps) {
  const sizeClass = sizeClasses[size];
  
  return (
    <div className={`${sizeClass} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-xs text-gray-500">No Image</span>
      )}
    </div>
  );
}