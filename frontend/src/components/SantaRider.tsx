// Santa Claus with Rider 396624's face
import { useState, useEffect } from 'react';

interface SantaRiderProps {
  riderId?: number;
}

export default function SantaRider({ riderId = 396624 }: SantaRiderProps) {
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  useEffect(() => {
    // Fetch rider avatar from API
    fetch(`/api/riders`)
      .then(res => res.json())
      .then(data => {
        const rider = data.riders?.find((r: any) => r.rider_id === riderId);
        if (rider?.avatar_url || rider?.image_src) {
          setAvatarUrl(rider.avatar_url || rider.image_src);
        }
      })
      .catch(err => console.error('Failed to fetch rider:', err));
  }, [riderId]);

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-gentle-bounce">
      <div className="relative cursor-pointer hover:scale-105 transition-all duration-300">
        {/* Trekpop Kerstman - Klein formaat */}
        <div className="relative w-16 h-20">
          {/* Touwtje bovenaan */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gray-400 opacity-50"></div>
          
          {/* Muts */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-8 bg-red-600 rounded-t-full border-2 border-red-700"></div>
          <div className="absolute top-7 left-1/2 -translate-x-1/2 w-12 h-2 bg-white rounded-full"></div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full"></div>
          
          {/* Hoofd met rider contour */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2">
            {avatarUrl ? (
              <img 
                src={avatarUrl}
                alt="Santa"
                className="w-10 h-10 rounded-full border-2 border-amber-900 object-cover opacity-90"
                style={{
                  filter: 'contrast(1.2) brightness(1.1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-amber-900 bg-amber-200"></div>
            )}
          </div>

          {/* Baard */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-8 h-4 bg-white rounded-b-full border-2 border-gray-200"></div>
          
          {/* Lijf (rood pak) */}
          <div className="absolute top-19 left-1/2 -translate-x-1/2 w-8 h-10 bg-red-600 rounded-sm border-2 border-red-700">
            {/* Zwarte riem */}
            <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-black"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rounded-sm"></div>
          </div>

          {/* Armen met touwtjes */}
          <div className="absolute top-20 left-0 w-0.5 h-3 bg-gray-400 opacity-30"></div>
          <div className="absolute top-20 right-0 w-0.5 h-3 bg-gray-400 opacity-30"></div>
          <div className="absolute top-23 -left-1 w-4 h-2 bg-red-600 rounded-full border border-red-700"></div>
          <div className="absolute top-23 -right-1 w-4 h-2 bg-red-600 rounded-full border border-red-700"></div>
          
          {/* Benen met touwtjes */}
          <div className="absolute top-29 left-2 w-0.5 h-3 bg-gray-400 opacity-30"></div>
          <div className="absolute top-29 right-2 w-0.5 h-3 bg-gray-400 opacity-30"></div>
          <div className="absolute top-32 left-1 w-3 h-4 bg-black rounded-sm border border-gray-800"></div>
          <div className="absolute top-32 right-1 w-3 h-4 bg-black rounded-sm border border-gray-800"></div>
        </div>
      </div>

      <style>{`
        @keyframes gentle-bounce {
          0%, 100% {
            transform: translateY(0) rotate(-2deg);
          }
          50% {
            transform: translateY(-12px) rotate(2deg);
          }
        }
        
        .animate-gentle-bounce {
          animation: gentle-bounce 3.5s ease-in-out infinite;
        }

        .delay-150 {
          animation-delay: 150ms;
        }

        .delay-300 {
          animation-delay: 300ms;
        }

        .delay-500 {
          animation-delay: 500ms;
        }
      `}</style>
    </div>
  );
}
