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
      <div className="relative group cursor-pointer hover:scale-105 transition-all duration-300">
        {/* Kerstman Hoofd Container */}
        <div className="relative w-24 h-32">
          {/* Rode Kerstmuts */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-16">
            {/* Muts zelf */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 rounded-t-full transform -skew-x-3 shadow-xl"></div>
            {/* Witte rand onderaan muts */}
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-white rounded-full shadow-md"></div>
            {/* Witte pompon bovenop */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-7 h-7 bg-white rounded-full shadow-lg animate-pulse"></div>
          </div>
          
          {/* Rider Avatar Gezicht */}
          <div className="absolute top-14 left-1/2 -translate-x-1/2">
            {avatarUrl ? (
              <img 
                src={avatarUrl}
                alt={`Rider ${riderId}`}
                className="w-20 h-20 rounded-full border-3 border-white shadow-2xl object-cover ring-2 ring-red-600"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=Santa&background=dc2626&color=fff&size=128`;
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-3 border-white shadow-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center ring-2 ring-red-600">
                <span className="text-4xl">🎅</span>
              </div>
            )}
          </div>

          {/* Witte Baard */}
          <div className="absolute top-28 left-1/2 -translate-x-1/2 w-16 h-8 bg-white rounded-b-full shadow-lg">
            {/* Baard krullen */}
            <div className="absolute -top-1 left-1 w-3 h-3 bg-white rounded-full"></div>
            <div className="absolute -top-1 right-1 w-3 h-3 bg-white rounded-full"></div>
          </div>
        </div>

        {/* Hover Tooltip */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-600 text-white px-3 py-1.5 rounded-full shadow-xl whitespace-nowrap text-xs font-bold">
          🎅 Rider #{riderId}
        </div>

        {/* Sparkles */}
        <div className="absolute -top-3 -left-3 text-xl animate-pulse">✨</div>
        <div className="absolute -top-1 -right-3 text-lg animate-pulse delay-300">⭐</div>
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
