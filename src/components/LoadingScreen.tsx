import React from 'react';

const LoadingScreen = () => {
  const BuildingRender = ({ type }: { type: string }) => {
    switch (type) {
      case 'sidebar':
        return (
          <div className="flex items-end justify-center w-full h-full relative">
            <div className="w-2 h-20 bg-white border-[3px] border-r-0 border-blue-600 mb-8 bg-[linear-gradient(#dbeafe_1px,transparent_1px)] bg-[length:100%_4px]"></div>
            <div className="w-12 h-40 bg-white border-[3px] border-blue-600 z-10 relative flex items-end justify-center bg-[linear-gradient(90deg,transparent_50%,#eff6ff_50%)] bg-[length:6px_100%]">
              <div className="w-6 h-8 border-t-[3px] border-x-[3px] border-blue-600"></div>
            </div>
            <div className="w-2 h-16 bg-white border-[3px] border-l-0 border-blue-600 mb-24 bg-[linear-gradient(#dbeafe_1px,transparent_1px)] bg-[length:100%_4px]"></div>
          </div>
        );
      case 'podium':
        return (
          <div className="flex flex-col items-center justify-end w-full h-full">
            <div className="w-12 h-24 bg-white border-[3px] border-b-0 border-blue-600 z-10 relative bg-[linear-gradient(#dbeafe_2px,transparent_2px)] bg-[length:100%_8px]"></div>
            <div className="w-20 h-14 bg-white border-[3px] border-blue-600 z-20 relative flex items-end justify-center bg-[radial-gradient(#dbeafe_1px,transparent_1px)] bg-[length:6px_6px]">
              <div className="w-8 h-6 border-t-[3px] border-x-[3px] border-blue-600 bg-blue-50"></div>
            </div>
          </div>
        );
      case 'stepped':
        return (
          <div className="flex items-end justify-center w-full h-full relative">
            <div className="w-10 h-20 bg-white border-[3px] border-r-0 border-blue-600 z-10 bg-[linear-gradient(transparent_50%,#dbeafe_50%),linear-gradient(90deg,transparent_50%,#dbeafe_50%)] bg-[length:5px_5px]"></div>
            <div className="w-10 h-32 bg-white border-[3px] border-blue-600 z-10 bg-[linear-gradient(transparent_50%,#dbeafe_50%),linear-gradient(90deg,transparent_50%,#dbeafe_50%)] bg-[length:5px_5px]"></div>
            <div className="absolute bottom-0 w-20 h-12 border-[3px] border-t-0 border-blue-600 z-20 pointer-events-none flex items-end justify-center">
              <div className="w-8 h-6 border-t-[3px] border-x-[3px] border-blue-600 bg-white"></div>
            </div>
          </div>
        );
      case 'spires':
        return (
          <div className="flex items-end justify-center gap-1 w-full h-full">
            <div className="w-6 h-36 bg-white border-[3px] border-blue-600 rounded-t-full"></div>
            <div className="w-8 h-24 bg-white border-[3px] border-blue-600 rounded-t-lg"></div>
          </div>
        );
      case 'cubes':
        return (
          <div className="flex flex-col items-center justify-end w-full h-full relative">
            <div className="w-10 h-10 bg-white border-[3px] border-blue-600 z-20 translate-x-3 translate-y-1 bg-[radial-gradient(#dbeafe_1px,transparent_1px)] bg-[length:4px_4px]"></div>
            <div className="w-14 h-20 bg-white border-[3px] border-blue-600 z-10 relative"></div>
          </div>
        );
      case 'tower':
        return (
          <div className="flex flex-col items-center justify-end w-full h-full">
            <div className="w-10 h-36 bg-white border-[3px] border-blue-600 z-10 bg-[linear-gradient(#dbeafe_2px,transparent_2px)] bg-[length:100%_8px]"></div>
          </div>
        );
      case 'lshape':
        return (
          <div className="flex items-end justify-start w-full h-full">
            <div className="w-8 h-28 bg-white border-[3px] border-blue-600 z-10 bg-[linear-gradient(#dbeafe_2px,transparent_2px)] bg-[length:100%_7px]"></div>
            <div className="w-10 h-16 bg-white border-[3px] border-l-0 border-blue-600 z-10 bg-[linear-gradient(#dbeafe_2px,transparent_2px)] bg-[length:100%_7px]"></div>
          </div>
        );
      case 'simple':
        return (
          <div className="flex flex-col items-center justify-end w-full h-full">
            <div className="w-14 h-24 bg-white border-[3px] border-blue-600 relative">
              <div className="absolute inset-0 bg-[linear-gradient(transparent_60%,#eff6ff_60%),linear-gradient(90deg,transparent_60%,#eff6ff_60%)] bg-[length:8px_8px]"></div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const buildingPattern = ['sidebar', 'simple', 'podium', 'spires', 'stepped', 'cubes', 'tower', 'lshape'];
  const cityContent = [...buildingPattern, ...buildingPattern];

  return (
    <div className="flex flex-col items-center justify-center font-sans">
      <style>{`
        @keyframes scrollCity { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes scrollLandscape { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-city { animation: scrollCity 10s linear infinite; }
        .animate-landscape { animation: scrollLandscape 20s linear infinite; }
      `}</style>

      <div className="relative">
        <div className="relative w-48 h-48 overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-10 flex items-end animate-landscape w-[200%] opacity-40">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-10 flex items-end justify-center">
                <div className="w-4 h-4 bg-blue-200 rounded-full -mb-1"></div>
                <div className="w-3 h-5 bg-blue-200 rounded-full -ml-1"></div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 h-full flex items-end animate-city w-max z-10">
            {cityContent.map((type, index) => (
              <div key={index} className="w-6 h-full flex-shrink-0 flex items-end justify-center -ml-0.5 scale-[0.35] origin-bottom">
                <BuildingRender type={type} />
              </div>
            ))}
          </div>

          <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-blue-600 z-20"></div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-blue-600 font-semibold">Loading</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
