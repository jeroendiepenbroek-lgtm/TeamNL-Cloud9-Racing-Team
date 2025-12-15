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
    <div className="fixed bottom-8 right-8 z-40 animate-bounce-slow">
      <div className="relative group cursor-pointer hover:scale-110 transition-transform duration-300">
        {/* Santa Body */}
        <div className="relative">
          {/* Red Santa Suit */}
          <div className="w-32 h-40 bg-gradient-to-b from-red-600 to-red-700 rounded-t-full relative shadow-2xl border-4 border-white">
            {/* White fur trim */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-white rounded-full"></div>
            <div className="absolute top-0 left-0 right-0 h-6 bg-white rounded-t-full"></div>
            
            {/* Gold belt */}
            <div className="absolute bottom-8 left-0 right-0 h-4 bg-yellow-500 border-2 border-yellow-600">
              <div className="absolute left-1/2 -translate-x-1/2 w-6 h-6 bg-yellow-400 border-2 border-yellow-600 rounded-sm -top-1"></div>
            </div>

            {/* Rider Avatar as Santa's Head */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2">
              <div className="relative">
                {/* Santa Hat */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-16 h-20 bg-red-600 rounded-t-full border-4 border-white shadow-xl">
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-lg"></div>
                </div>
                
                {/* Rider Face */}
                {avatarUrl ? (
                  <img 
                    src={avatarUrl}
                    alt={`Rider ${riderId}`}
                    className="w-20 h-20 rounded-full border-4 border-white shadow-xl object-cover bg-gradient-to-br from-red-200 to-red-300"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=Santa&background=dc2626&color=fff`;
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                    <span className="text-4xl">🎅</span>
                  </div>
                )}

                {/* White beard */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-white rounded-b-full shadow-lg"></div>
              </div>
            </div>

            {/* Arms */}
            <div className="absolute top-12 -left-6 w-8 h-20 bg-red-600 rounded-full -rotate-45 border-2 border-white"></div>
            <div className="absolute top-12 -right-6 w-8 h-20 bg-red-600 rounded-full rotate-45 border-2 border-white"></div>
          </div>

          {/* Legs */}
          <div className="flex gap-2 justify-center mt-1">
            <div className="w-6 h-16 bg-red-700 rounded-b-lg border-2 border-white">
              <div className="absolute bottom-0 w-8 h-4 bg-black rounded-full -left-1"></div>
            </div>
            <div className="w-6 h-16 bg-red-700 rounded-b-lg border-2 border-white">
              <div className="absolute bottom-0 w-8 h-4 bg-black rounded-full -left-1"></div>
            </div>
          </div>
        </div>

        {/* Tooltip */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white px-4 py-2 rounded-lg shadow-xl whitespace-nowrap text-sm font-bold">
          🎅 Rider #{riderId} - Vrolijk Kerstfeest! 🎄
        </div>

        {/* Sparkles */}
        <div className="absolute -top-8 -left-8 text-4xl animate-pulse">✨</div>
        <div className="absolute -top-4 -right-8 text-3xl animate-pulse delay-150">⭐</div>
        <div className="absolute -bottom-4 left-1/2 text-2xl animate-pulse delay-300">❄️</div>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }

        .delay-150 {
          animation-delay: 150ms;
        }

        .delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
}
