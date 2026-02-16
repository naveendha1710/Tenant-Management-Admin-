import React from 'react';

const InlineLoading = () => {
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
      case 'simple':
        return (
          <div className="flex flex-col items-center justify-end w-full h-full">
            <div className="w-14 h-24 bg-white border-[3px] border-blue-600 relative">
              <div className="absolute inset-0 bg-[linear-gradient(transparent_60%,#eff6ff_60%),linear-gradient(90deg,transparent_60%,#eff6ff_60%)] bg-[length:8px_8px]"></div>
            </div>
          </div>
        );
      case 'tower':
        return (
          <div className="flex flex-col items-center justify-end w-full h-full">
            <div className="w-10 h-36 bg-white border-[3px] border-blue-600 z-10 bg-[linear-gradient(#dbeafe_2px,transparent_2px)] bg-[length:100%_8px]"></div>
          </div>
        );
      default:
        return null;
    }
  };

  const cityContent = ['sidebar', 'simple', 'tower', 'sidebar', 'simple', 'tower'];

  return (
    <div className="flex items-center justify-center py-8">
      <style>{`
        @keyframes scrollCityInline { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-city-inline { animation: scrollCityInline 8s linear infinite; }
      `}</style>

      <div className="relative w-32 h-32 overflow-hidden">
        <div className="absolute bottom-0 left-0 h-full flex items-end animate-city-inline w-max">
          {cityContent.map((type, index) => (
            <div key={index} className="w-4 h-full flex-shrink-0 flex items-end justify-center scale-[0.3] origin-bottom">
              <BuildingRender type={type} />
            </div>
          ))}
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-blue-600"></div>
      </div>
    </div>
  );
};

export default InlineLoading;
