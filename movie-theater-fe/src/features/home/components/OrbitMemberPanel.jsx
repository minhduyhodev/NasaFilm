import React from 'react';
import { Users, Crown } from 'lucide-react';
import { getOrbitMemberColor, resolveSeatLabels } from '../../../shared/utils/orbitUtils';

const OrbitMemberPanel = ({
  members = [],
  maxMembers = 8,
  currentUserUuid,
  seatRows,
  totalRoomSeats,
  maxSeatsPerBooking,
  canEditSeats,
  isGroupSeatLimitOk,
}) => (
  <div className="orbit-booking__panel p-5">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
        <Users className="w-4 h-4 text-red-400" />
        Thành viên (
        {members.length}
        /
        {maxMembers}
        )
      </h2>
    </div>
    {members.length < 2 && canEditSeats && (
      <p className="text-xs text-amber-400 mb-3">
        Mời thêm
        {' '}
        {Math.max(0, 2 - members.length)}
        {' '}
        thành viên để host có thể thanh toán nhóm.
      </p>
    )}
    <ul className="space-y-2">
      {members.map((member, index) => {
        const isSelf = member.userUuid === currentUserUuid;
        const seatLabels = resolveSeatLabels(member.seatUuids, seatRows);
        const color = getOrbitMemberColor(index);
        return (
          <li
            key={member.userUuid}
            className={`orbit-booking__member ${isSelf ? 'orbit-booking__member--self' : ''}`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <span
                className={`orbit-booking__member-dot ${color.cssClass}`}
                style={{ backgroundColor: color.hex }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="orbit-booking__member-name text-sm font-bold text-white truncate">
                  {member.displayName}
                  {member.host && (
                    <Crown className="inline w-3.5 h-3.5 ml-1 text-amber-400" aria-hidden />
                  )}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {seatLabels.length > 0
                    ? `Ghế ${seatLabels.join(', ')}`
                    : 'Chưa chọn ghế'}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
    <p className="text-xs text-zinc-500 mt-4">
      Tổng
      {' '}
      {totalRoomSeats}
      /
      {maxSeatsPerBooking}
      {' '}
      ghế nhóm · Host trả toàn bộ vé
    </p>
    {!isGroupSeatLimitOk && canEditSeats && (
      <p className="text-xs text-amber-400 mt-2 font-semibold">
        Tổng ghế nhóm vượt giới hạn
        {' '}
        {maxSeatsPerBooking}
        .
      </p>
    )}
  </div>
);

export default React.memo(OrbitMemberPanel);
