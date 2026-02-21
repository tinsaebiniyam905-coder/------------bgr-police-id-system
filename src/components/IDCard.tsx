import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Member } from '../types';
import { cn } from '../lib/utils';
import { Shield, UserPlus } from 'lucide-react';

interface IDCardProps {
  member: Member;
  preview?: boolean;
  onCardClick?: () => void;
  showOnlyFront?: boolean;
}

export const IDCard = forwardRef<HTMLDivElement, IDCardProps>(({ member, preview = false, onCardClick, showOnlyFront = false }, ref) => {
  const verificationUrl = `${window.location.origin}/verify/${member.id_number}`;

  // Basic screenshot protection: prevent context menu and add a CSS class that might deter some tools
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const CardFront = () => (
    <div 
      id="id-card-front"
      onClick={onCardClick}
      onContextMenu={handleContextMenu}
      className={cn(
        "relative w-[85.6mm] h-[54mm] rounded-xl overflow-hidden shadow-2xl flex flex-col border border-gray-300 print:shadow-none print:border-gray-400 print:break-inside-avoid transition-transform hover:scale-[1.02] cursor-pointer select-none no-screenshot",
        !preview && "hover:scale-100 cursor-default"
      )}
      style={{
        background: 'linear-gradient(135deg, #FFD700 0%, #1E40AF 100%)',
      }}
    >
      {/* Header with Flags and Logo */}
      <div className="flex justify-between items-start px-3 pt-2">
        <div className="w-12 h-8 border border-white/50 flex items-center justify-center overflow-hidden bg-slate-800 shadow-sm">
          {member.left_flag_url ? (
            <img src={member.left_flag_url} className="w-full h-full object-cover" />
          ) : (
            <div className="bg-gradient-to-b from-black via-red-600 to-green-600 w-full h-full flex items-center justify-center text-[6px] text-white font-bold">BGR</div>
          )}
        </div>
        
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center border-2 border-white shadow-md overflow-hidden">
            {member.center_logo_url ? (
              <img src={member.center_logo_url} className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-10 h-10 text-yellow-400" />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-[9px] font-black text-black leading-none drop-shadow-sm">ቤንሻንጉል ጉምዝ ክልል ፖሊስ ኮሚሽን</h1>
            <h2 className="text-[7px] font-bold text-black/90 uppercase tracking-tighter leading-none mt-0.5">BGR Police Commission</h2>
          </div>
        </div>

        <div className="w-12 h-8 border border-white/50 flex items-center justify-center overflow-hidden bg-slate-800 shadow-sm">
          {member.right_flag_url ? (
            <img src={member.right_flag_url} className="w-full h-full object-cover" />
          ) : (
            <div className="bg-gradient-to-b from-green-600 via-yellow-400 to-red-600 w-full h-full flex items-center justify-center text-[6px] text-black font-bold">ETH</div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 px-3 pb-3 pt-1 gap-3">
        {/* Details - Left Side */}
        <div className="flex-1 flex flex-col justify-between text-black">
          <div className="space-y-1 mt-1">
            <div className="flex flex-col">
              <span className="text-[6px] font-black uppercase opacity-80">ID No / መታወቂያ ቁጥር:</span>
              <span className="text-[10px] font-black tracking-tight">{member.id_number}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[6px] font-black uppercase opacity-80">Full Name / ሙሉ ስም:</span>
              <span className="text-[8px] font-bold leading-tight">{member.full_name}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[6px] font-black uppercase opacity-80">Rank / ማዕረግ:</span>
              <span className="text-[8px] font-bold leading-tight">{member.rank}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[6px] font-black uppercase opacity-80">Responsibility / ሀላፊነት:</span>
              <span className="text-[8px] font-bold leading-tight">{member.responsibility}</span>
            </div>
          </div>
          
          <div className="flex items-end justify-between mb-1">
             <div className="flex flex-col">
                <span className="text-[6px] font-black uppercase opacity-80">Phone / ስልክ:</span>
                <span className="text-[8px] font-bold">{member.phone_number}</span>
             </div>
             <div className="bg-white p-0.5 rounded-sm shadow-sm">
                <QRCodeSVG value={verificationUrl} size={32} />
             </div>
          </div>
        </div>

        {/* Photo - Right Side */}
        <div className="w-24 h-28 border-2 border-white rounded-lg overflow-hidden bg-slate-200 self-center shadow-xl">
          {member.photo_url ? (
            <img src={member.photo_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <UserPlus className="w-8 h-8 opacity-20" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const CardBack = () => (
    <div 
      id="id-card-back"
      onClick={onCardClick}
      className={cn(
        "relative w-[85.6mm] h-[54mm] rounded-xl overflow-hidden shadow-2xl flex flex-col border border-gray-300 bg-white print:shadow-none print:border-gray-400 print:break-inside-avoid transition-transform hover:scale-[1.02] cursor-pointer",
        !preview && "hover:scale-100 cursor-default"
      )}
    >
      {/* Watermark Logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none">
        {member.center_logo_url ? (
          <img src={member.center_logo_url} className="w-48 h-48 object-contain" alt="" />
        ) : (
          <Shield className="w-48 h-48 text-blue-900" />
        )}
      </div>

      <div className="relative z-10 p-4 flex flex-col h-full justify-between items-center text-center">
        <div className="space-y-3 w-full">
          <h3 className="text-[10px] font-black text-blue-900 border-b border-blue-100 pb-1 uppercase tracking-wider">ማሳሰቢያ / NOTICE</h3>
          
          <div className="space-y-2 text-left px-2">
            <div className="space-y-0.5">
              <p className="text-[9px] leading-tight text-gray-900 font-bold">
                ይህን መታወቂያ የያዘ የቤንሻንጉል ጉምዝ ክልል ፖሊስ አባል ነዉ፤ ህግን የማስከበር ስልጣንም ተሰጦታል፡፡
              </p>
              <p className="text-[8px] leading-tight text-gray-600 font-medium italic">
                The bearer of this ID is a member of the Benishangul Gumuz Region Police; authorized to enforce the law.
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[9px] leading-tight text-gray-900 font-bold">
                ህግን ሲያስከብሩ መታወቂያዉን የማሳየት ግዴታ አለበት፡፡
              </p>
              <p className="text-[8px] leading-tight text-gray-600 font-medium italic">
                Must present this ID while performing official duties.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
            <QRCodeSVG value={verificationUrl} size={50} />
          </div>
          <span className="text-[7px] font-black text-blue-900/40 uppercase tracking-[0.2em]">
            Verification System
          </span>
        </div>
        
        <div className="w-full h-1.5 bg-gradient-to-r from-blue-900 via-yellow-500 to-red-600"></div>
      </div>
    </div>
  );

  return (
    <div ref={ref} className={cn(
      "flex flex-col gap-8 p-4 items-center print:bg-white print:p-0 print:gap-8 print:block",
      preview ? "bg-transparent p-0" : "bg-gray-100 min-h-screen"
    )}>
      <div className={cn(
        "flex flex-col gap-8 print:flex-col print:gap-8 print:items-center",
        preview ? "md:flex-row md:gap-4" : "flex-col"
      )}>
        <CardFront />
        {!showOnlyFront && (
          <>
            <div className="print:h-8"></div> {/* Spacer for print */}
            <CardBack />
          </>
        )}
      </div>
    </div>
  );
});

IDCard.displayName = 'IDCard';
